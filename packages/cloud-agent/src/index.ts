import { execFile, type ExecFileException } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const protocolVersion = 1 as const;

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

export type CloudAgentOptions = {
  gatewayUrl: string;
  token: string;
  agentId: string;
  cwd?: string;
  WebSocketImpl?: typeof WebSocket;
  log?: Pick<Console, "log" | "error">;
};

export class CloudAgent {
  private socket: WebSocket | null = null;

  constructor(private readonly options: CloudAgentOptions) {}

  connect(): WebSocket {
    const WebSocketCtor = this.options.WebSocketImpl ?? WebSocket;
    const url = normalizeGatewayAgentUrl(this.options.gatewayUrl, this.options.token, this.options.agentId);
    this.socket = new WebSocketCtor(url);
    this.socket.addEventListener("open", () => {
      this.options.log?.log(`Connected Caesar Cloud Chat agent ${this.options.agentId} to ${url.origin}`);
    });
    this.socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });
    this.socket.addEventListener("error", (event) => {
      this.options.log?.error("Cloud Chat agent websocket error", event);
    });
    return this.socket;
  }

  async handleMessage(raw: unknown): Promise<void> {
    const command = parseCommand(raw);
    if (!command) return;
    const result = await runConstrainedCommand(command, this.options.cwd ?? process.cwd());
    this.socket?.send(JSON.stringify(result));
  }

  close(): void {
    this.socket?.close();
  }
}

export function normalizeGatewayAgentUrl(gatewayUrl: string, token: string, agentId: string): URL {
  const url = new URL(gatewayUrl);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  url.pathname = "/agent";
  url.searchParams.set("token", token);
  url.searchParams.set("agentId", agentId);
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const gatewayUrl = process.env.CAESAR_GATEWAY_URL ?? process.env.CAESAR_GATEWAY_AGENT_URL;
  const token = process.env.CAESAR_GATEWAY_TOKEN;
  const agentId = process.env.CAESAR_AGENT_ID ?? "mac-mini";
  if (!gatewayUrl || !token) throw new Error("CAESAR_GATEWAY_URL and CAESAR_GATEWAY_TOKEN are required.");
  new CloudAgent({ gatewayUrl, token, agentId, log: console }).connect();
}
