import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";
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

export type CodexSessionStatus = "starting" | "live" | "interrupted" | "terminated" | "exited" | "unknown";

export type CodexSessionRecord = {
  id: string;
  worldId: string;
  issueId: string;
  tmuxSessionName: string;
  tmuxTarget: string;
  cwd: string;
  command: string[];
  status: CodexSessionStatus;
  startedAt: string;
  endedAt: string | null;
  outputBuffer: string[];
};

export type CodexSessionEvent = {
  id: string;
  type: "session.started" | "session.output" | "session.status";
  worldId: string;
  issueId: string;
  sessionId: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type TmuxRunner = {
  run(file: string, args: string[], options?: { cwd?: string }): Promise<{ stdout: string; stderr: string }>;
};

export type CodexSessionManagerOptions = {
  runner: TmuxRunner;
  now?: () => string;
  idFactory?: () => string;
  pathResolver?: (targetPath: string) => Promise<string>;
  maxBufferedEvents?: number;
  onEvent?: (event: CodexSessionEvent) => void;
};

export type StartCodexSessionInput = {
  worldId: string;
  issueId: string;
  issueRoot: string;
  worktreePaths: string[];
  cwd?: string;
  command?: string[];
  sessionId?: string;
};

export class CodexSessionManager {
  private readonly sessions = new Map<string, CodexSessionRecord>();
  private readonly capturedOutput = new Map<string, string>();
  private readonly now: () => string;
  private readonly idFactory: () => string;
  private readonly pathResolver: (targetPath: string) => Promise<string>;
  private readonly maxBufferedEvents: number;

  constructor(private readonly options: CodexSessionManagerOptions) {
    this.now = options.now ?? nowIso;
    this.idFactory = options.idFactory ?? (() => randomUUID());
    this.pathResolver = options.pathResolver ?? resolveRealPath;
    this.maxBufferedEvents = options.maxBufferedEvents ?? 200;
  }

  async start(input: StartCodexSessionInput): Promise<CodexSessionRecord> {
    if (input.worktreePaths.length === 0) {
      throw new Error("Cannot start an Issue-scope Codex session before the Issue has at least one worktree repo.");
    }
    const cwd = await this.resolveScopePath(input.cwd ?? input.worktreePaths[0] ?? input.issueRoot);
    const issueRoot = await this.resolveScopePath(input.issueRoot);
    if (!isPathInside(cwd, issueRoot)) {
      throw new Error(`Codex session cwd ${cwd} is outside Issue root ${issueRoot}.`);
    }
    const worktreePaths = await Promise.all(input.worktreePaths.map((worktreePath) => this.resolveScopePath(worktreePath)));
    const knownScope = worktreePaths.some((worktreePath) => isPathInside(cwd, worktreePath)) || cwd === issueRoot;
    if (!knownScope) {
      throw new Error("Codex session cwd must be the Issue root or a directory inside one of the Issue worktrees.");
    }

    const sessionId = input.sessionId ?? `session_${this.idFactory()}`;
    const tmuxSessionName = buildTmuxSessionName(input.worldId, input.issueId, sessionId);
    const command = normalizeCodexSessionCommand(input.command);
    await this.options.runner.run("tmux", ["new-session", "-d", "-s", tmuxSessionName, "-c", cwd, shellCommand(command)], { cwd });
    const startedAt = this.now();
    const record: CodexSessionRecord = {
      id: sessionId,
      worldId: input.worldId,
      issueId: input.issueId,
      tmuxSessionName,
      tmuxTarget: `${tmuxSessionName}:0.0`,
      cwd,
      command,
      status: "live",
      startedAt,
      endedAt: null,
      outputBuffer: []
    };
    this.sessions.set(sessionId, record);
    this.emit(record, "session.started", `Started tmux Codex session ${sessionId}.`, {
      tmuxSessionName,
      cwd,
      command
    });
    return cloneSession(record);
  }

  async sendInput(sessionId: string, input: string): Promise<CodexSessionRecord> {
    const session = this.requireSession(sessionId);
    await this.options.runner.run("tmux", ["send-keys", "-t", session.tmuxTarget, input, "Enter"]);
    this.emit(session, "session.status", "Sent input to tmux Codex session.", { inputLength: input.length });
    return cloneSession(session);
  }

  async captureOutput(sessionId: string): Promise<string> {
    const session = this.requireSession(sessionId);
    const { stdout } = await this.options.runner.run("tmux", ["capture-pane", "-p", "-t", session.tmuxTarget]);
    const previous = this.capturedOutput.get(sessionId) ?? "";
    const nextChunk = stdout.startsWith(previous) ? stdout.slice(previous.length) : stdout;
    this.capturedOutput.set(sessionId, stdout);
    if (nextChunk.length > 0) {
      this.appendOutput(session, nextChunk);
      this.emit(session, "session.output", nextChunk, { bufferedLines: session.outputBuffer.length });
    }
    return nextChunk;
  }

  async interrupt(sessionId: string): Promise<CodexSessionRecord> {
    const session = this.requireSession(sessionId);
    await this.options.runner.run("tmux", ["send-keys", "-t", session.tmuxTarget, "C-c"]);
    this.mark(session, "interrupted", "Interrupted tmux Codex session.");
    return cloneSession(session);
  }

  async terminate(sessionId: string): Promise<CodexSessionRecord> {
    const session = this.requireSession(sessionId);
    await this.options.runner.run("tmux", ["kill-session", "-t", session.tmuxSessionName]);
    this.mark(session, "terminated", "Terminated tmux Codex session.");
    return cloneSession(session);
  }

  list(): CodexSessionRecord[] {
    return [...this.sessions.values()].map((session) => cloneSession(session));
  }

  get(sessionId: string): CodexSessionRecord | null {
    const session = this.sessions.get(sessionId);
    return session ? cloneSession(session) : null;
  }

  recover(records: CodexSessionRecord[]): void {
    for (const record of records) {
      this.sessions.set(record.id, cloneSession({ ...record, status: record.status === "live" ? "unknown" : record.status }));
      this.capturedOutput.set(record.id, record.outputBuffer.join(""));
    }
  }

  private requireSession(sessionId: string): CodexSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown Codex session: ${sessionId}`);
    }
    return session;
  }

  private mark(session: CodexSessionRecord, status: CodexSessionStatus, message: string): void {
    session.status = status;
    session.endedAt = this.now();
    this.emit(session, "session.status", message, { status });
  }

  private appendOutput(session: CodexSessionRecord, chunk: string): void {
    session.outputBuffer.push(chunk);
    if (session.outputBuffer.length > this.maxBufferedEvents) {
      session.outputBuffer.splice(0, session.outputBuffer.length - this.maxBufferedEvents);
    }
  }

  private emit(session: CodexSessionRecord, type: CodexSessionEvent["type"], message: string, payload: Record<string, unknown> | null): void {
    this.options.onEvent?.({
      id: `event_${this.idFactory()}`,
      type,
      worldId: session.worldId,
      issueId: session.issueId,
      sessionId: session.id,
      message,
      payload,
      createdAt: this.now()
    });
  }

  private async resolveScopePath(targetPath: string): Promise<string> {
    return normalizePath(await this.pathResolver(targetPath));
  }
}

function buildTmuxSessionName(worldId: string, issueId: string, sessionId: string): string {
  return ["cg", worldId, issueId, sessionId].map((part) => part.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48)).join("_");
}

function shellCommand(command: string[]): string {
  return command.map((part) => `'${part.replace(/'/g, `'\\''`)}'`).join(" ");
}

function cloneSession(session: CodexSessionRecord): CodexSessionRecord {
  return { ...session, command: [...session.command], outputBuffer: [...session.outputBuffer] };
}

async function resolveRealPath(targetPath: string): Promise<string> {
  const resolved = path.resolve(targetPath);
  try {
    return await realpath(resolved);
  } catch {
    return resolved;
  }
}

function normalizeCodexSessionCommand(command: string[] | undefined): string[] {
  const normalized = command ?? ["codex"];
  const [file, ...args] = normalized;
  const allowed =
    file === "codex" &&
    (args.length === 0 || (args.length === 1 && args[0] === "--version") || (args.length === 1 && args[0] === "probe"));
  if (!allowed) {
    throw new Error("Codex sessions may only launch the server-side Codex command allowlist.");
  }
  return [file, ...args];
}

function normalizePath(value: string): string {
  return path.resolve(value).replace(/\\/g, "/").replace(/\/+$/g, "") || "/";
}

function isPathInside(candidate: string, scope: string): boolean {
  const normalizedCandidate = normalizePath(candidate);
  const normalizedScope = normalizePath(scope);
  return normalizedCandidate === normalizedScope || normalizedCandidate.startsWith(`${normalizedScope}/`);
}
