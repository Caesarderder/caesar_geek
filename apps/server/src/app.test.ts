import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { appRouter, buildServer } from "./app.js";

const execFileAsync = promisify(execFile);

describe("server acceptance path", () => {
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
});

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
