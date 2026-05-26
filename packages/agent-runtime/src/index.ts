import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { GeekTask, RuntimeSession, TakeoverEvent, TaskEvent } from "@caesar-geek/shared";
import { nowIso } from "@caesar-geek/shared";

export type RuntimePersistence = {
  updateTaskStatus(taskId: string, patch: Partial<Pick<GeekTask, "status" | "exitCode" | "startedAt" | "endedAt" | "claimedAt" | "claimedBy">>): void;
  appendEvent(event: TaskEvent): void;
  appendTakeover(event: TakeoverEvent): void;
  saveRuntimeSession(session: RuntimeSession): void;
  updateRuntimeSession(taskId: string, patch: Pick<RuntimeSession, "status" | "endedAt">): void;
};

export class GeekRuntime {
  private readonly processes = new Map<string, ChildProcessWithoutNullStreams>();
  private readonly shuttingDownTasks = new Set<string>();
  private readonly subscribers = new Set<(event: TaskEvent) => void>();

  constructor(private readonly persistence: RuntimePersistence) {}

  createTaskDraft(input: {
    awesomeId: string;
    title: string;
    prompt: string;
    command: string[];
    cwd: string;
  }): GeekTask {
    const createdAt = nowIso();
    return {
      id: `task_${randomUUID()}`,
      awesomeId: input.awesomeId,
      title: input.title,
      prompt: input.prompt,
      command: input.command,
      cwd: input.cwd,
      status: "created",
      exitCode: null,
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      endedAt: null,
      claimedAt: null,
      claimedBy: null
    };
  }

  launch(task: GeekTask): void {
    if (task.command.length === 0) {
      throw new Error("Cannot launch a geek task with an empty command.");
    }
    const [command, ...args] = task.command;
    if (!command) {
      throw new Error("Cannot launch a geek task without a command.");
    }
    const startedAt = nowIso();
    this.persistence.updateTaskStatus(task.id, { status: "running", startedAt });
    this.emit({
      id: `event_${randomUUID()}`,
      taskId: task.id,
      type: "status",
      message: `Started ${task.command.join(" ")}`,
      payload: { cwd: task.cwd },
      createdAt: startedAt
    });

    const child = spawn(command, args, {
      cwd: task.cwd,
      env: process.env
    });
    this.processes.set(task.id, child);
    this.persistence.saveRuntimeSession({
      id: `session_${randomUUID()}`,
      taskId: task.id,
      pid: child.pid ?? null,
      status: "live",
      startedAt,
      endedAt: null
    });

    child.stdout.on("data", (chunk: Buffer) => {
      this.emit({
        id: `event_${randomUUID()}`,
        taskId: task.id,
        type: "log",
        message: chunk.toString(),
        payload: { stream: "stdout" },
        createdAt: nowIso()
      });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      this.emit({
        id: `event_${randomUUID()}`,
        taskId: task.id,
        type: "log",
        message: chunk.toString(),
        payload: { stream: "stderr" },
        createdAt: nowIso()
      });
    });
    child.on("error", (error) => {
      if (this.shuttingDownTasks.has(task.id)) {
        return;
      }
      this.emit({
        id: `event_${randomUUID()}`,
        taskId: task.id,
        type: "error",
        message: error.message,
        payload: null,
        createdAt: nowIso()
      });
      this.persistence.updateTaskStatus(task.id, { status: "failed", endedAt: nowIso() });
      this.persistence.updateRuntimeSession(task.id, { status: "exited", endedAt: nowIso() });
      this.processes.delete(task.id);
    });
    child.on("exit", (code) => {
      if (this.shuttingDownTasks.has(task.id)) {
        this.processes.delete(task.id);
        this.shuttingDownTasks.delete(task.id);
        return;
      }
      const status = code === 0 ? "exited" : "failed";
      const endedAt = nowIso();
      this.persistence.updateTaskStatus(task.id, { status, exitCode: code, endedAt });
      this.persistence.updateRuntimeSession(task.id, { status: "exited", endedAt });
      this.emit({
        id: `event_${randomUUID()}`,
        taskId: task.id,
        type: "status",
        message: `Process ${status} with code ${code ?? "unknown"}`,
        payload: { exitCode: code },
        createdAt: nowIso()
      });
      this.processes.delete(task.id);
    });
  }

  claim(task: GeekTask, claimedBy: string, note?: string): TakeoverEvent {
    const event: TakeoverEvent = {
      id: `takeover_${randomUUID()}`,
      taskId: task.id,
      claimedBy,
      action: "claim",
      note: note ?? null,
      createdAt: nowIso()
    };
    this.persistence.appendTakeover(event);
    this.persistence.updateTaskStatus(task.id, { status: "claimed", claimedAt: event.createdAt, claimedBy });
    this.emit({
      id: `event_${randomUUID()}`,
      taskId: task.id,
      type: "takeover",
      message: `${claimedBy} claimed this geek task.`,
      payload: { takeoverEventId: event.id },
      createdAt: event.createdAt
    });
    return event;
  }

  recordFollowUp(task: GeekTask, claimedBy: string, note: string): TakeoverEvent {
    const event: TakeoverEvent = {
      id: `takeover_${randomUUID()}`,
      taskId: task.id,
      claimedBy,
      action: "follow_up",
      note,
      createdAt: nowIso()
    };
    this.persistence.appendTakeover(event);
    this.emit({
      id: `event_${randomUUID()}`,
      taskId: task.id,
      type: "takeover",
      message: `${claimedBy} created a follow-up geek task.`,
      payload: { takeoverEventId: event.id },
      createdAt: event.createdAt
    });
    return event;
  }

  interrupt(taskId: string): boolean {
    const child = this.processes.get(taskId);
    if (!child) {
      return false;
    }
    child.kill("SIGINT");
    const endedAt = nowIso();
    this.persistence.updateTaskStatus(taskId, { status: "interrupted", endedAt });
    this.persistence.updateRuntimeSession(taskId, { status: "exited", endedAt });
    return true;
  }

  terminate(taskId: string): boolean {
    const child = this.processes.get(taskId);
    if (!child) {
      return false;
    }
    child.kill("SIGTERM");
    const endedAt = nowIso();
    this.persistence.updateTaskStatus(taskId, { status: "terminated", endedAt });
    this.persistence.updateRuntimeSession(taskId, { status: "exited", endedAt });
    return true;
  }

  shutdown(reason: string): void {
    for (const [taskId, child] of this.processes) {
      this.shuttingDownTasks.add(taskId);
      child.kill("SIGTERM");
      const endedAt = nowIso();
      this.persistence.updateTaskStatus(taskId, { status: "orphaned", endedAt });
      this.persistence.updateRuntimeSession(taskId, { status: "orphaned", endedAt });
      this.emit({
        id: `event_${randomUUID()}`,
        taskId,
        type: "status",
        message: `Runtime detached during ${reason}; process was terminated by gateway.`,
        payload: { reason },
        createdAt: endedAt
      });
    }
    this.processes.clear();
    this.subscribers.clear();
  }

  subscribe(handler: (event: TaskEvent) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  private emit(event: TaskEvent): void {
    this.persistence.appendEvent(event);
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }
}
