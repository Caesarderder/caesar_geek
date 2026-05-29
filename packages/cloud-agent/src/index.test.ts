import { describe, expect, it } from "vitest";
import { CodexSessionManager, type TmuxRunner } from "@caesar-geek/agent-runtime";
import {
  CloudAgent,
  InMemoryWorldRuntime,
  normalizeGatewayAgentUrl,
  parseCloudProtocolMessage,
  parseAllowedProbe,
  runConstrainedCommand,
  type AgentCommand,
  type CloudProtocolMessage
} from "./index.js";

const command: AgentCommand = { version: 1, type: "command", requestId: "req_1", commandId: "cmd_1", command: "pwd" };

function fakeRunner(outputs: string[] = []): TmuxRunner & { calls: Array<{ file: string; args: string[] }> } {
  const calls: Array<{ file: string; args: string[] }> = [];
  return {
    calls,
    async run(file, args) {
      calls.push({ file, args });
      return { stdout: args[0] === "capture-pane" ? outputs.shift() ?? "" : "", stderr: "" };
    }
  };
}

function fakeWorkspaceOps(repoId = "repo-1") {
  return {
    createIssue: async (input: { worldRootPath: string; title: string; id?: string }) => ({
      id: input.id ?? "issue-1",
      title: input.title,
      slug: "issue",
      path: `${input.worldRootPath}/issues/${input.id ?? "issue-1"}`,
      worktreesPath: `${input.worldRootPath}/issues/${input.id ?? "issue-1"}/worktrees`,
      createdAt: "2026-05-28T17:00:00.000Z"
    }),
    importRepo: async () => ({
      id: repoId,
      name: "repo",
      path: "/tmp/world/repos/repo",
      defaultBranch: "main",
      headSha: "abc123"
    }),
    listBranches: async () => ["main"],
    createWorktree: async (input: { issue: { id: string; worktreesPath: string }; repo: { id: string }; branch: string; id?: string }) => ({
      id: input.id ?? "wt-1",
      issueId: input.issue.id,
      repoId: input.repo.id,
      name: input.branch,
      branch: input.branch,
      path: `${input.issue.worktreesPath}/${input.branch}`,
      createdAt: "2026-05-28T17:00:00.000Z"
    })
  };
}

describe("cloud Mac Agent", () => {
  it("normalizes public Gateway URLs to the outbound /world websocket endpoint", () => {
    expect(normalizeGatewayAgentUrl("http://47.93.141.241:8787", "secret", "mac-mini").toString()).toBe(
      "ws://47.93.141.241:8787/world?token=secret&agentId=mac-mini&worldId=mac-mini"
    );
    expect(normalizeGatewayAgentUrl("https://example.test/base", "secret", "mac-mini").toString()).toBe(
      "wss://example.test/world?token=secret&agentId=mac-mini&worldId=mac-mini"
    );
  });

  it("returns constrained local command output through the legacy websocket client", async () => {
    const sent: unknown[] = [];
    const agent = new CloudAgent({ gatewayUrl: "ws://localhost:8787/agent", token: "secret", agentId: "mac-mini-test", cwd: process.cwd() });
    Reflect.set(agent, "socket", { send: (value: string) => sent.push(JSON.parse(value)) });

    await agent.handleMessage(JSON.stringify(command));

    expect(sent).toEqual([
      expect.objectContaining({ version: 1, type: "command_result", requestId: "req_1", commandId: "cmd_1", status: "completed" })
    ]);
    expect(String((sent[0] as { stdout: string }).stdout)).toContain(process.cwd());
  });

  it("allows only pwd, whoami, and codex probe commands in legacy mode", async () => {
    expect(parseAllowedProbe("pwd")).toMatchObject({ allowed: true, file: "pwd" });
    expect(parseAllowedProbe("whoami")).toMatchObject({ allowed: true, file: "whoami" });
    expect(parseAllowedProbe("codex")).toMatchObject({ allowed: true, file: "codex", args: ["--version"] });
    expect(parseAllowedProbe("echo hi")).toMatchObject({ allowed: false });
    expect(parseAllowedProbe("cat ~/.ssh/id_rsa")).toMatchObject({ allowed: false });
    expect(parseAllowedProbe("rm -rf /")).toMatchObject({ allowed: false });

    await expect(runConstrainedCommand({ ...command, command: "echo hi" }, process.cwd())).resolves.toMatchObject({
      status: "failed",
      exitCode: 2,
      stderr: expect.stringContaining("Only pwd")
    });
  });

  it("handles World issue, repo, worktree, and tmux session requests with correlated responses", async () => {
    const runner = fakeRunner(["hello from tmux"]);
    const runtime = new InMemoryWorldRuntime({
      worldId: "world-1",
      workspaceRoot: "/tmp/world",
      sessionManager: new CodexSessionManager({
        runner,
        idFactory: () => "fixed",
        now: () => "2026-05-28T17:00:00.000Z",
        pathResolver: async (targetPath) => targetPath
      }),
      workspaceOps: fakeWorkspaceOps("repo_repo")
    });
    const sent: CloudProtocolMessage[] = [];
    const agent = new CloudAgent({ gatewayUrl: "ws://localhost:8787/agent", token: "secret", worldId: "world-1", worldRuntime: runtime });
    Reflect.set(agent, "socket", { send: (value: string) => sent.push(JSON.parse(value) as CloudProtocolMessage) });

    await agent.handleMessage(JSON.stringify({ version: 1, type: "issue.create.request", requestId: "req_issue", worldId: "world-1", payload: { issueId: "issue-1", title: "Fix bug" } }));
    await agent.handleMessage(JSON.stringify({ version: 1, type: "repo.import.request", requestId: "req_repo", worldId: "world-1", payload: { gitUrl: "https://example.test/repo.git", ref: "main", name: "repo" } }));
    const importedRepo = sent[1]?.payload?.repo as { id: string } | undefined;
    await agent.handleMessage(JSON.stringify({ version: 1, type: "worktree.create.request", requestId: "req_wt", worldId: "world-1", issueId: "issue-1", repoId: importedRepo?.id, payload: { worktreeId: "wt-1", branch: "main" } }));
    await agent.handleMessage(JSON.stringify({ version: 1, type: "session.start.request", requestId: "req_session", worldId: "world-1", issueId: "issue-1", worktreeId: "wt-1", sessionId: "session-1" }));
    await agent.handleMessage(JSON.stringify({ version: 1, type: "session.input.request", requestId: "req_input", worldId: "world-1", issueId: "issue-1", sessionId: "session-1", payload: { input: "hello" } }));

    expect(sent.map((message) => [message.requestId, message.type])).toEqual([
      ["req_issue", "issue.create.result"],
      ["req_repo", "repo.import.result"],
      ["req_wt", "worktree.create.result"],
      ["req_session", "session.started"],
      ["req_input", "session.status"],
      ["req_input", "session.output"]
    ]);
    expect(sent.at(-1)?.payload).toMatchObject({ text: "hello from tmux" });
    expect(runner.calls[0]).toMatchObject({ file: "tmux", args: expect.arrayContaining(["new-session", "cg_world-1_issue-1_session-1"]) });
    expect(runner.calls[1]).toMatchObject({ file: "tmux", args: expect.arrayContaining(["send-keys", "hello", "Enter"]) });
  });

  it("rejects browser-supplied git credentials and session cwd escapes", async () => {
    const runtime = new InMemoryWorldRuntime({
      worldId: "world-1",
      workspaceRoot: "/tmp/world",
      runner: fakeRunner(),
      workspaceOps: fakeWorkspaceOps()
    });

    await expect(
      runtime.handle({ version: 1, type: "repo.import.request", requestId: "req_bad", worldId: "world-1", payload: { gitUrl: "https://user:pass@example.test/repo.git" } })
    ).resolves.toEqual([expect.objectContaining({ type: "world.error", payload: expect.objectContaining({ reason: expect.stringContaining("credential-free") }) })]);

    await runtime.handle({ version: 1, type: "issue.create.request", requestId: "req_issue", worldId: "world-1", payload: { issueId: "issue-1" } });
    await runtime.handle({ version: 1, type: "repo.import.request", requestId: "req_repo", worldId: "world-1", payload: { repoId: "repo-1", gitUrl: "https://example.test/repo.git" } });
    await runtime.handle({ version: 1, type: "worktree.create.request", requestId: "req_wt", worldId: "world-1", issueId: "issue-1", repoId: "repo-1", payload: { worktreeId: "wt-1" } });

    await expect(
      runtime.handle({ version: 1, type: "session.start.request", requestId: "req_escape", worldId: "world-1", issueId: "issue-1", worktreeId: "wt-1", payload: { cwd: "/tmp/escape" } })
    ).resolves.toEqual([expect.objectContaining({ type: "world.error", payload: expect.objectContaining({ reason: expect.stringContaining("outside Issue root") }) })]);
  });

  it("uses shared protocol validation to reject browser session command payloads", () => {
    expect(
      parseCloudProtocolMessage({
        version: 1,
        type: "session.start.request",
        requestId: "req_session",
        worldId: "world-1",
        issueId: "issue-1",
        worktreeId: "wt-1",
        payload: { command: ["node", "-e", "console.log(process.cwd())"] }
      })
    ).toBeNull();
  });
});
