import { describe, expect, it } from "vitest";
import { CodexSessionManager, type TmuxRunner } from "./index.js";

function createFakeRunner(outputs: string[] = []): TmuxRunner & { calls: Array<{ file: string; args: string[]; cwd?: string }> } {
  const calls: Array<{ file: string; args: string[]; cwd?: string }> = [];
  return {
    calls,
    async run(file, args, options) {
      calls.push({ file, args, ...(options?.cwd ? { cwd: options.cwd } : {}) });
      return { stdout: args[0] === "capture-pane" ? outputs.shift() ?? "" : "", stderr: "" };
    }
  };
}

describe("CodexSessionManager", () => {
  it("starts named tmux Codex sessions in an Issue worktree cwd", async () => {
    const runner = createFakeRunner();
    const events: unknown[] = [];
    const manager = new CodexSessionManager({ runner, idFactory: () => "fixed", now: () => "2026-05-28T17:00:00.000Z", onEvent: (event) => events.push(event) });

    const session = await manager.start({
      worldId: "world/main",
      issueId: "issue:1",
      issueRoot: "/world/issues/issue-1",
      worktreePaths: ["/world/issues/issue-1/worktrees/repo"],
      cwd: "/world/issues/issue-1/worktrees/repo",
      command: ["codex", "--version"],
      sessionId: "session:1"
    });

    expect(session.tmuxSessionName).toBe("cg_world_main_issue_1_session_1");
    expect(runner.calls[0]).toEqual({
      file: "tmux",
      args: ["new-session", "-d", "-s", "cg_world_main_issue_1_session_1", "-c", "/world/issues/issue-1/worktrees/repo", "'codex' '--version'"],
      cwd: "/world/issues/issue-1/worktrees/repo"
    });
    expect(events).toEqual([expect.objectContaining({ type: "session.started", worldId: "world/main", issueId: "issue:1", sessionId: "session:1" })]);
  });

  it("sends input, captures incremental output, and keeps a switchable buffer", async () => {
    const runner = createFakeRunner(["hello", "hello world"]);
    const manager = new CodexSessionManager({ runner, maxBufferedEvents: 2 });
    const session = await manager.start({
      worldId: "world",
      issueId: "issue",
      issueRoot: "/world/issues/issue",
      worktreePaths: ["/world/issues/issue/worktrees/repo"],
      sessionId: "session"
    });

    await manager.sendInput(session.id, "continue");
    await expect(manager.captureOutput(session.id)).resolves.toBe("hello");
    await expect(manager.captureOutput(session.id)).resolves.toBe(" world");

    expect(runner.calls.map((call) => call.args.slice(0, 3))).toEqual(
      expect.arrayContaining([
        ["send-keys", "-t", session.tmuxTarget],
        ["capture-pane", "-p", "-t"]
      ])
    );
    expect(manager.get(session.id)?.outputBuffer.join("")).toBe("hello world");
  });

  it("rejects empty-Issue launch and cwd escapes", async () => {
    const manager = new CodexSessionManager({ runner: createFakeRunner() });
    await expect(
      manager.start({ worldId: "world", issueId: "issue", issueRoot: "/world/issues/issue", worktreePaths: [] })
    ).rejects.toThrow("at least one worktree");
    await expect(
      manager.start({
        worldId: "world",
        issueId: "issue",
        issueRoot: "/world/issues/issue",
        worktreePaths: ["/world/issues/issue/worktrees/repo"],
        cwd: "/tmp/escape"
      })
    ).rejects.toThrow("outside Issue root");
  });
});
