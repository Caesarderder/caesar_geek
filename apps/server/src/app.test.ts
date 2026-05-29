import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { appRouter, buildServer } from "./app.js";

const execFileAsync = promisify(execFile);

describe("server acceptance path", () => {
  it("scans the local repo root and creates an issue with selected repos under the issue root", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "cg-home-"));
    const repoRoot = await mkdtemp(path.join(tmpdir(), "cg-repos-"));
    const issueRoot = await mkdtemp(path.join(tmpdir(), "cg-issues-"));
    process.env.CAESAR_GEEK_HOME = home;
    process.env.CAESAR_REPO_ROOT = repoRoot;
    process.env.CAESAR_ISSUE_ROOT = issueRoot;
    const { fastify, ctx } = await buildServer();
    const caller = appRouter.createCaller(ctx);

    const sourceRepo = path.join(repoRoot, "fixture");
    await createFixtureRepo(sourceRepo);
    const sourceRepoRealPath = await realpath(sourceRepo);
    const scannedRepos = await caller.repos.scan();
    expect(scannedRepos).toEqual([expect.objectContaining({ name: "fixture", path: sourceRepoRealPath })]);

    const created = await caller.issues.create({ title: "Fix selected repo", repoPaths: [sourceRepoRealPath] });
    expect(created.record.path).toContain(issueRoot);
    expect(created.repos).toEqual([expect.objectContaining({ name: "fixture", destinationPath: path.join(created.record.path, "repos", "fixture") })]);

    const recovery = await caller.tasks.recovery();
    expect(recovery.awesome.path).toBe(created.record.path);
    expect(recovery.ultraworks[0]?.destinationPath).toContain(path.join("repos", "fixture"));

    const repoAgent = await caller.tasks.create({
      title: "Repo scoped agent",
      prompt: "Inspect only this repo",
      command: [process.execPath, "-e", "console.log(process.cwd())"],
      ultraworkIds: [recovery.ultraworks[0]!.id],
      cwd: recovery.ultraworks[0]!.destinationPath,
      launch: false
    });
    expect(repoAgent.task?.cwd).toBe(recovery.ultraworks[0]!.destinationPath);
    await expect(
      caller.tasks.create({
        title: "Escaped agent",
        prompt: "Reject outside cwd",
        command: [process.execPath, "-e", "console.log(process.cwd())"],
        ultraworkIds: [recovery.ultraworks[0]!.id],
        cwd: repoRoot,
        launch: false
      })
    ).rejects.toThrow("Agent cwd must be the active issue path");
    await fastify.close();
  });

  it("persists awesome, clone-first ultrawork, task associations, takeover, and recovery state", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "cg-home-"));
    process.env.CAESAR_GEEK_HOME = home;
    const { fastify, ctx } = await buildServer();
    const caller = appRouter.createCaller(ctx);

    const awesomeRoot = await mkdtemp(path.join(tmpdir(), "awesome-root-"));
    const created = await caller.awesomes.create({ name: "Ops Console", path: awesomeRoot });
    expect(created.awesome.path).toBe(awesomeRoot);

    const sourceRepo = await mkdtemp(path.join(tmpdir(), "source-repo-"));
    await execFileAsync("git", ["init"], { cwd: sourceRepo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: sourceRepo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: sourceRepo });
    await writeFile(path.join(sourceRepo, "README.md"), "hello\n");
    await execFileAsync("git", ["add", "README.md"], { cwd: sourceRepo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: sourceRepo });

    const ultrawork = await caller.ultraworks.add({ sourcePath: sourceRepo });
    expect(ultrawork.destinationPath).toContain(path.join("ultraworks", ultrawork.slug));

    const result = await caller.tasks.create({
      title: "Stub Codex",
      prompt: "Assert cwd",
      command: [process.execPath, "-e", "console.log(process.cwd())"],
      ultraworkIds: [ultrawork.id],
      launch: true
    });
    expect(result.task?.cwd).toBe(created.awesome.path);
    await waitForTaskStatus(caller, result.task!.id, "exited");

    const takeover = await caller.tasks.claim({ taskId: result.task!.id, claimedBy: "operator" });
    expect(takeover.action).toBe("claim");

    const followUp = await caller.tasks.followUp({
      taskId: result.task!.id,
      claimedBy: "operator",
      prompt: "Continue with manual context",
      command: [process.execPath, "-e", "console.log('follow up')"],
      launch: false
    });
    expect(followUp.cwd).toBe(created.awesome.path);

    await expect(
      caller.tasks.create({
        title: "Bad association",
        prompt: "Reject unknown ultrawork",
        command: [process.execPath, "-e", "console.log('bad')"],
        ultraworkIds: ["ultrawork_missing"],
        launch: false
      })
    ).rejects.toThrow("Unknown ultrawork ids");

    const recovery = await caller.tasks.recovery();
    expect(recovery.awesome.id).toBe(created.awesome.id);
    expect(recovery.ultraworks).toHaveLength(1);
    expect(recovery.taskUltraworks).toEqual(
      expect.arrayContaining([expect.objectContaining({ taskId: result.task!.id, ultraworkId: ultrawork.id })])
    );
    expect(recovery.tasks.find((task) => task.id === result.task!.id)?.status).toBe("claimed");
    expect(recovery.latestEvents.some((event) => event.message.includes(created.awesome.path))).toBe(true);
    expect(recovery.takeoverEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "claim" }),
        expect.objectContaining({ action: "follow_up" })
      ])
    );

    await fastify.close();

    const restarted = await buildServer();
    const restartedCaller = appRouter.createCaller(restarted.ctx);
    const knownAwesomes = await restartedCaller.awesomes.list();
    expect(knownAwesomes).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.awesome.id, availability: "available" })]));
    await restartedCaller.awesomes.select({ id: created.awesome.id });
    const restartedRecovery = await restartedCaller.tasks.recovery();
    expect(restartedRecovery.tasks.map((task) => task.id)).toContain(result.task!.id);
    expect(restartedRecovery.taskUltraworks).toEqual(
      expect.arrayContaining([expect.objectContaining({ taskId: result.task!.id, ultraworkId: ultrawork.id })])
    );
    await restarted.fastify.close();
  });

  it("tears down active runtime when switching awesomes", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "cg-home-"));
    process.env.CAESAR_GEEK_HOME = home;
    const { fastify, ctx } = await buildServer();
    const caller = appRouter.createCaller(ctx);

    const firstRoot = await mkdtemp(path.join(tmpdir(), "awesome-first-"));
    const secondRoot = await mkdtemp(path.join(tmpdir(), "awesome-second-"));
    const marker = path.join(firstRoot, "marker.txt");
    const first = await caller.awesomes.create({ name: "First", path: firstRoot });
    const running = await caller.tasks.create({
      title: "Long task",
      prompt: "Wait long enough to be switched away",
      command: [process.execPath, "-e", `setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'late'), 4000)`],
      ultraworkIds: [],
      launch: true
    });

    await caller.awesomes.create({ name: "Second", path: secondRoot });
    await caller.awesomes.select({ id: first.awesome.id });
    const recovery = await caller.tasks.recovery();
    expect(recovery.tasks.find((task) => task.id === running.task!.id)?.status).toBe("orphaned");
    expect(recovery.latestEvents.some((event) => event.message.includes("awesome create"))).toBe(true);
    await expect(readFile(marker, "utf8")).rejects.toThrow();
    await fastify.close();
  });

  it("recovers a persisted live runtime session as unknown after restart", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "cg-home-"));
    process.env.CAESAR_GEEK_HOME = home;
    const { fastify, ctx } = await buildServer();
    const caller = appRouter.createCaller(ctx);
    const awesomeRoot = await mkdtemp(path.join(tmpdir(), "awesome-recovery-"));
    const created = await caller.awesomes.create({ name: "Recovery", path: awesomeRoot });
    const running = await caller.tasks.create({
      title: "Recovered task",
      prompt: "Simulate process lost on gateway restart",
      command: [process.execPath, "-e", "setTimeout(() => {}, 4000)"],
      ultraworkIds: [],
      launch: true
    });
    expect(running.task?.cwd).toBe(created.awesome.path);
    await fastify.close();

    const restarted = await buildServer();
    const restartedCaller = appRouter.createCaller(restarted.ctx);
    await restartedCaller.awesomes.select({ id: created.awesome.id });
    const recovery = await restartedCaller.tasks.recovery();
    expect(recovery.tasks.find((task) => task.id === running.task!.id)?.status).toBe("unknown");
    expect(recovery.latestEvents.some((event) => event.message.includes("runtime state"))).toBe(true);
    await restarted.fastify.close();
  });

  it("builds Codex CLI commands for default geek tasks", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "cg-home-"));
    process.env.CAESAR_GEEK_HOME = home;
    const { fastify, ctx } = await buildServer();
    const caller = appRouter.createCaller(ctx);
    const awesomeRoot = await mkdtemp(path.join(tmpdir(), "awesome-codex-"));
    await caller.awesomes.create({ name: "Codex", path: awesomeRoot });

    const result = await caller.tasks.create({
      title: "Ask Codex",
      prompt: "Inspect whether git push is needed; do not run sudo.",
      ultraworkIds: [],
      launch: false
    });

    expect(result.policy.allowed).toBe(true);
    expect(result.task.command).toEqual([
      "codex",
      "exec",
      "--json",
      "--color",
      "never",
      "--sandbox",
      "workspace-write",
      "--skip-git-repo-check",
      "Inspect whether git push is needed; do not run sudo."
    ]);
    expect(result.task.cwd).toBe(awesomeRoot);
    await fastify.close();
  });

  it("persists high-risk task approvals and launches only after approval", async () => {
    const home = await mkdtemp(path.join(tmpdir(), "cg-home-"));
    process.env.CAESAR_GEEK_HOME = home;
    const { fastify, ctx } = await buildServer();
    const caller = appRouter.createCaller(ctx);
    const awesomeRoot = await mkdtemp(path.join(tmpdir(), "awesome-approval-"));
    const created = await caller.awesomes.create({ name: "Approvals", path: awesomeRoot });

    const pending = await caller.tasks.create({
      title: "High risk launch",
      prompt: "Requires approval",
      command: ["sh", "-c", "echo sudo systemctl"],
      ultraworkIds: [],
      launch: true
    });
    expect(pending.task.status).toBe("queued");
    expect(pending.approval?.status).toBe("pending");

    let recovery = await caller.tasks.recovery();
    expect(recovery.approvals).toEqual([expect.objectContaining({ id: pending.approval!.id, status: "pending" })]);
    expect(recovery.tasks.find((task) => task.id === pending.task.id)?.status).toBe("queued");

    await fastify.close();
    const restarted = await buildServer();
    const restartedCaller = appRouter.createCaller(restarted.ctx);
    await restartedCaller.awesomes.select({ id: created.awesome.id });
    expect(await restartedCaller.approvals.listPending()).toEqual([
      expect.objectContaining({ id: pending.approval!.id, taskId: pending.task.id })
    ]);

    const approved = await restartedCaller.approvals.approve({ approvalId: pending.approval!.id, decidedBy: "operator" });
    expect(approved.status).toBe("approved");
    await waitForTaskStatus(restartedCaller, pending.task.id, "exited");

    const rejected = await restartedCaller.tasks.create({
      title: "Rejected high risk launch",
      prompt: "Should not run",
      command: ["git", "push"],
      ultraworkIds: [],
      launch: true
    });
    await restartedCaller.approvals.reject({ approvalId: rejected.approval!.id, decidedBy: "operator" });
    recovery = await restartedCaller.tasks.recovery();
    expect(recovery.tasks.find((task) => task.id === rejected.task.id)?.status).toBe("rejected");
    expect(recovery.approvals.find((approval) => approval.id === rejected.approval!.id)?.status).toBe("rejected");
    await restarted.fastify.close();
  });
});

async function createFixtureRepo(repoPath: string): Promise<void> {
  await execFileAsync("git", ["init", "--initial-branch=main", repoPath]);
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repoPath });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repoPath });
  await writeFile(path.join(repoPath, "README.md"), "hello\n");
  await execFileAsync("git", ["add", "README.md"], { cwd: repoPath });
  await execFileAsync("git", ["commit", "-m", "init"], { cwd: repoPath });
}

async function waitForTaskStatus(
  caller: ReturnType<typeof appRouter.createCaller>,
  taskId: string,
  status: string
): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const recovery = await caller.tasks.recovery();
    const task = recovery.tasks.find((candidate) => candidate.id === taskId);
    if (task?.status === status) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for task ${taskId} to reach ${status}`);
}
