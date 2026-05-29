import { execFile, type ExecFileException } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { CodexSessionManager, type CodexSessionRecord, type TmuxRunner } from "@caesar-geek/agent-runtime";
import {
  cloudProtocolVersion,
  parseCloudProtocolMessage as parseSharedCloudProtocolMessage,
  type CloudMessageType,
  type CloudProtocolMessage
} from "@caesar-geek/shared";
import {
  createIssueWorktree,
  createWorldIssueLayout,
  importGitRepository,
  listGitBranches,
  type WorldRepoRecord
} from "@caesar-geek/workspace";

const execFileAsync = promisify(execFile);
const protocolVersion = cloudProtocolVersion;

export type AgentCommand = {
  version: typeof protocolVersion;
  type: "command";
  requestId: string;
  commandId: string;
  command: string;
};

export type AgentResult = {
  version: typeof protocolVersion;
  type: "command_result";
  requestId: string;
  commandId: string;
  status: "completed" | "failed";
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

export type WorldRuntimeHandler = {
  status(): CloudProtocolMessage;
  handle(message: CloudProtocolMessage): Promise<CloudProtocolMessage[]>;
};

export type CloudAgentOptions = {
  gatewayUrl: string;
  token: string;
  agentId?: string;
  worldId?: string;
  cwd?: string;
  WebSocketImpl?: typeof WebSocket;
  worldRuntime?: WorldRuntimeHandler;
  log?: Pick<Console, "log" | "error">;
  reconnectDelayMs?: number;
};

export class CloudAgent {
  private socket: WebSocket | null = null;
  private readonly worldRuntime: WorldRuntimeHandler;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;

  constructor(private readonly options: CloudAgentOptions) {
    const worldId = options.worldId ?? options.agentId ?? "mac-mini";
    this.worldRuntime = options.worldRuntime ?? new InMemoryWorldRuntime({ worldId });
  }

  connect(): WebSocket {
    this.closedByUser = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const WebSocketCtor = this.options.WebSocketImpl ?? WebSocket;
    const worldId = this.options.worldId ?? this.options.agentId ?? "mac-mini";
    const url = normalizeGatewayAgentUrl(this.options.gatewayUrl, this.options.token, worldId);
    this.socket = new WebSocketCtor(url);
    this.socket.addEventListener("open", () => {
      this.options.log?.log(`Connected Caesar World runtime ${worldId} to ${url.origin}`);
      this.socket?.send(JSON.stringify(this.worldRuntime.status()));
    });
    this.socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });
    this.socket.addEventListener("error", (event) => {
      this.options.log?.error("Cloud World runtime websocket error", event);
    });
    this.socket.addEventListener("close", () => {
      if (!this.closedByUser) this.scheduleReconnect();
    });
    return this.socket;
  }

  async handleMessage(raw: unknown): Promise<void> {
    const worldMessage = parseCloudProtocolMessage(raw);
    if (worldMessage) {
      const responses = await this.worldRuntime.handle(worldMessage).catch((error: unknown) => [
        createWorldError(worldMessage, error instanceof Error ? error.message : String(error), this.options.worldId ?? this.options.agentId ?? "mac-mini")
      ]);
      for (const response of responses) {
        this.socket?.send(JSON.stringify(response));
      }
      return;
    }

    const command = parseCommand(raw);
    if (!command) return;
    const result = await runConstrainedCommand(command, this.options.cwd ?? process.cwd());
    this.socket?.send(JSON.stringify(result));
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delayMs = this.options.reconnectDelayMs ?? 3_000;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      try {
        this.connect();
      } catch (error) {
        this.options.log?.error("Failed to reconnect Caesar World runtime", error);
        this.scheduleReconnect();
      }
    }, delayMs);
  }
}

export function normalizeGatewayAgentUrl(gatewayUrl: string, token: string, agentId: string): URL {
  const url = new URL(gatewayUrl);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  url.pathname = "/world";
  url.searchParams.set("token", token);
  url.searchParams.set("agentId", agentId);
  url.searchParams.set("worldId", agentId);
  return url;
}

export async function runConstrainedCommand(command: AgentCommand, cwd: string): Promise<AgentResult> {
  const parsed = parseAllowedProbe(command.command);
  if (!parsed.allowed) {
    return {
      version: protocolVersion,
      type: "command_result",
      requestId: command.requestId,
      commandId: command.commandId,
      status: "failed",
      stdout: "",
      stderr: parsed.reason,
      exitCode: 2
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync(parsed.file, parsed.args, { cwd, timeout: 10_000 });
    return {
      version: protocolVersion,
      type: "command_result",
      requestId: command.requestId,
      commandId: command.commandId,
      status: "completed",
      stdout,
      stderr,
      exitCode: 0
    };
  } catch (error) {
    const execError = error as ExecFileException & { stdout?: string; stderr?: string };
    return {
      version: protocolVersion,
      type: "command_result",
      requestId: command.requestId,
      commandId: command.commandId,
      status: "failed",
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? execError.message,
      exitCode: execError.code === undefined || typeof execError.code === "string" ? 1 : execError.code
    };
  }
}

export function parseAllowedProbe(input: string): { allowed: true; file: string; args: string[] } | { allowed: false; reason: string } {
  const command = input.trim();
  if (command === "pwd") return { allowed: true, file: "pwd", args: [] };
  if (command === "whoami") return { allowed: true, file: "whoami", args: [] };
  if (command === "codex" || command === "codex probe" || command === "codex --version") return { allowed: true, file: "codex", args: ["--version"] };
  return { allowed: false, reason: "Only pwd, whoami, and codex probe are allowed in the MVP Mac Agent." };
}

export type WorldIssue = { id: string; title: string; rootPath: string; worktreesPath: string; worktreeIds: string[] };
export type WorldRepo = WorldRepoRecord & { gitUrl: string; branches: string[] };
export type WorldWorktree = { id: string; issueId: string; repoId: string; branch: string; path: string };
type WorldWorkspaceOps = {
  createIssue: typeof createWorldIssueLayout;
  importRepo: typeof importGitRepository;
  listBranches: typeof listGitBranches;
  createWorktree: typeof createIssueWorktree;
};

const defaultWorkspaceOps: WorldWorkspaceOps = {
  createIssue: createWorldIssueLayout,
  importRepo: importGitRepository,
  listBranches: listGitBranches,
  createWorktree: createIssueWorktree
};

export class InMemoryWorldRuntime implements WorldRuntimeHandler {
  private readonly issues = new Map<string, WorldIssue>();
  private readonly repos = new Map<string, WorldRepo>();
  private readonly worktrees = new Map<string, WorldWorktree>();
  private readonly sessionManager: CodexSessionManager;
  private selectedIssueId: string | null = null;

  constructor(private readonly options: { worldId: string; workspaceRoot?: string; runner?: TmuxRunner; sessionManager?: CodexSessionManager; workspaceOps?: Partial<WorldWorkspaceOps> }) {
    const runner = options.runner ?? { run: (file, args, runOptions) => execFileAsync(file, args, { cwd: runOptions?.cwd }) };
    this.sessionManager = options.sessionManager ?? new CodexSessionManager({ runner });
  }

  status(): CloudProtocolMessage {
    return this.message("world.status", {
      status: "connected",
      capabilities: ["issues", "repo-import", "worktree-create", "tmux-codex-session"],
      issueCount: this.issues.size,
      sessionCount: this.sessionManager.list().length
    });
  }

  async handle(message: CloudProtocolMessage): Promise<CloudProtocolMessage[]> {
    if (message.worldId && message.worldId !== this.options.worldId) {
      return [createWorldError(message, `Unknown World runtime: ${message.worldId}.`, this.options.worldId)];
    }

    try {
      switch (message.type) {
      case "issue.list.request":
        return [this.reply(message, "issue.list.result", { issues: [...this.issues.values()] })];
      case "issue.create.request":
        return [await this.createIssue(message)];
      case "issue.select.request":
        this.requireIssue(message.issueId);
        this.selectedIssueId = message.issueId ?? null;
        return [this.reply(message, "world.audit", { selectedIssueId: this.selectedIssueId })];
      case "repo.scan.request":
        return [this.reply(message, "repo.scan.result", { repos: [...this.repos.values()] })];
      case "repo.import.request":
        return [await this.importRepo(message)];
      case "branch.list.request":
        return [this.reply(message, "branch.list.result", { branches: this.requireRepo(message.repoId).branches })];
      case "worktree.create.request":
        return [await this.createWorktree(message)];
      case "session.start.request":
        return [this.reply(message, "session.started", { session: await this.startSession(message) })];
      case "session.list.request":
        return [this.reply(message, "session.list.result", { sessions: this.sessionManager.list() })];
      case "session.select.request":
        return [this.reply(message, "session.status", { session: this.requireSession(message.sessionId) })];
      case "session.input.request":
        await this.sessionManager.sendInput(required(message.sessionId, "sessionId"), readSessionInput(message));
        return this.captureSessionInputResult(message);
      case "session.interrupt.request":
        return [this.reply(message, "session.status", { session: await this.sessionManager.interrupt(required(message.sessionId, "sessionId")) })];
      case "session.terminate.request":
        return [this.reply(message, "session.status", { session: await this.sessionManager.terminate(required(message.sessionId, "sessionId")) })];
      default:
        return [createWorldError(message, `Unsupported World request: ${message.type}.`, this.options.worldId)];
      }
    } catch (error) {
      return [createWorldError(message, error instanceof Error ? error.message : String(error), this.options.worldId)];
    }
  }

  private async createIssue(message: CloudProtocolMessage): Promise<CloudProtocolMessage> {
    return this.reply(message, "issue.create.result", {
      issue: await this.createIssueRecord(message)
    });
  }

  private async createIssueRecord(message: CloudProtocolMessage): Promise<WorldIssue> {
    const id = String(message.payload?.issueId ?? `issue_${randomUUID()}`);
    const title = String(message.payload?.title ?? "Untitled Issue");
    const issue = await this.workspaceOps().createIssue({
      worldRootPath: this.worldRootPath(),
      title,
      id
    });
    const record: WorldIssue = { id: issue.id, title: issue.title, rootPath: issue.path, worktreesPath: issue.worktreesPath, worktreeIds: [] };
    this.issues.set(id, record);
    return record;
  }

  private async importRepo(message: CloudProtocolMessage): Promise<CloudProtocolMessage> {
    const gitUrl = String(message.payload?.gitUrl ?? "");
    if (!gitUrl || hasUrlCredentials(gitUrl) || containsCredentialKey(message.payload)) {
      return createWorldError(message, "A credential-free gitUrl is required.", this.options.worldId);
    }
    const imported = await this.workspaceOps().importRepo({
      worldRootPath: this.worldRootPath(),
      gitUrl,
      ...(typeof message.payload?.ref === "string" && message.payload.ref ? { ref: message.payload.ref } : {}),
      ...(typeof message.payload?.name === "string" && message.payload.name ? { name: message.payload.name } : {})
    });
    const branches = await this.workspaceOps().listBranches({ repoPath: imported.path });
    const repo: WorldRepo = { ...imported, gitUrl, branches };
    this.repos.set(repo.id, repo);
    return this.reply(message, "repo.import.result", { repo });
  }

  private async createWorktree(message: CloudProtocolMessage): Promise<CloudProtocolMessage> {
    const issue = this.requireIssue(message.issueId);
    const repo = this.requireRepo(message.repoId);
    const branch = String(message.payload?.branch ?? repo.branches[0] ?? "main");
    const id = String(message.payload?.worktreeId ?? `worktree_${randomUUID()}`);
    const created = await this.workspaceOps().createWorktree({ issue, repo, branch, id });
    const worktree: WorldWorktree = { id: created.id, issueId: created.issueId, repoId: created.repoId, branch: created.branch, path: created.path };
    this.worktrees.set(id, worktree);
    issue.worktreeIds.push(id);
    return this.reply(message, "worktree.create.result", { worktree });
  }

  private async captureSessionInputResult(message: CloudProtocolMessage): Promise<CloudProtocolMessage[]> {
    const session = this.requireSession(message.sessionId);
    const output = await this.sessionManager.captureOutput(session.id);
    const responses = [this.reply(message, "session.status", { session, inputAccepted: true })];
    if (output.length > 0) {
      responses.push(this.reply(message, "session.output", { text: output }));
    }
    return responses;
  }

  private async startSession(message: CloudProtocolMessage): Promise<CodexSessionRecord> {
    const issue = this.requireIssue(message.issueId);
    const requestedWorktreeId = required(message.worktreeId, "worktreeId");
    const worktree = this.worktrees.get(requestedWorktreeId);
    if (!worktree || worktree.issueId !== issue.id) {
      throw new Error(`Unknown Issue worktree: ${requestedWorktreeId}`);
    }
    return this.sessionManager.start({
      worldId: this.options.worldId,
      issueId: issue.id,
      issueRoot: issue.rootPath,
      worktreePaths: issue.worktreeIds.map((id) => this.worktrees.get(id)?.path).filter((value): value is string => Boolean(value)),
      cwd: typeof message.payload?.cwd === "string" ? message.payload.cwd : worktree.path,
      ...(message.sessionId ? { sessionId: message.sessionId } : {})
    });
  }

  private requireIssue(issueId: string | undefined): WorldIssue {
    const issue = issueId ? this.issues.get(issueId) : null;
    if (!issue) throw new Error(`Unknown Issue: ${issueId ?? "<missing>"}`);
    return issue;
  }

  private requireRepo(repoId: string | undefined): WorldRepo {
    const repo = repoId ? this.repos.get(repoId) : null;
    if (!repo) throw new Error(`Unknown repo: ${repoId ?? "<missing>"}`);
    return repo;
  }

  private requireSession(sessionId: string | undefined): CodexSessionRecord {
    const session = sessionId ? this.sessionManager.get(sessionId) : null;
    if (!session) throw new Error(`Unknown session: ${sessionId ?? "<missing>"}`);
    return session;
  }

  private worldRootPath(): string {
    return this.options.workspaceRoot ?? path.join(tmpdir(), "caesar-geek-world", this.options.worldId);
  }

  private workspaceOps(): WorldWorkspaceOps {
    return { ...defaultWorkspaceOps, ...this.options.workspaceOps };
  }

  private reply(request: CloudProtocolMessage, type: CloudMessageType, payload: Record<string, unknown>): CloudProtocolMessage {
    return this.message(type, payload, request);
  }

  private message(type: CloudMessageType, payload: Record<string, unknown>, request?: CloudProtocolMessage): CloudProtocolMessage {
    return {
      version: protocolVersion,
      type,
      ...(request?.requestId ? { requestId: request.requestId } : {}),
      worldId: this.options.worldId,
      ...(request?.issueId ? { issueId: request.issueId } : {}),
      ...(request?.repoId ? { repoId: request.repoId } : {}),
      ...(request?.worktreeId ? { worktreeId: request.worktreeId } : {}),
      ...(request?.sessionId ? { sessionId: request.sessionId } : {}),
      createdAt: new Date().toISOString(),
      payload
    };
  }
}

export function parseCloudProtocolMessage(raw: unknown): CloudProtocolMessage | null {
  let value: unknown;
  try {
    value = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  try {
    return parseSharedCloudProtocolMessage(value);
  } catch {
    return null;
  }
}

function createWorldError(request: CloudProtocolMessage, reason: string, worldId: string): CloudProtocolMessage {
  return {
    version: protocolVersion,
    type: "world.error",
    ...(request.requestId ? { requestId: request.requestId } : {}),
    worldId,
    ...(request.issueId ? { issueId: request.issueId } : {}),
    ...(request.repoId ? { repoId: request.repoId } : {}),
    ...(request.worktreeId ? { worktreeId: request.worktreeId } : {}),
    ...(request.sessionId ? { sessionId: request.sessionId } : {}),
    createdAt: new Date().toISOString(),
    payload: { reason, requestType: request.type }
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function readSessionInput(message: CloudProtocolMessage): string {
  const input = message.payload?.input ?? message.payload?.text;
  return typeof input === "string" ? input : "";
}

function parseCommand(raw: unknown): AgentCommand | null {
  let value: unknown;
  try {
    value = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AgentCommand>;
  if (
    candidate.version !== protocolVersion ||
    candidate.type !== "command" ||
    typeof candidate.requestId !== "string" ||
    typeof candidate.commandId !== "string" ||
    typeof candidate.command !== "string"
  ) {
    return null;
  }
  return candidate as AgentCommand;
}

function containsCredentialKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => /token|password|passwd|privatekey|private_key|credential|secret|sshkey|ssh_key/i.test(key) || containsCredentialKey(nested));
}

function hasUrlCredentials(value: string): boolean {
  try {
    const url = new URL(value);
    return url.username.length > 0 || url.password.length > 0;
  } catch {
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const gatewayUrl = process.env.CAESAR_GATEWAY_URL ?? process.env.CAESAR_GATEWAY_AGENT_URL;
  const token = process.env.CAESAR_GATEWAY_TOKEN;
  const worldId = process.env.CAESAR_WORLD_ID ?? process.env.CAESAR_AGENT_ID ?? "mac-mini";
  if (!gatewayUrl || !token) throw new Error("CAESAR_GATEWAY_URL and CAESAR_GATEWAY_TOKEN are required.");
  new CloudAgent({ gatewayUrl, token, worldId, log: console }).connect();
}
