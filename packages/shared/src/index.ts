import { z } from "zod";

export const idSchema = z.string().min(1);
export const isoDateSchema = z.string().datetime();

export const awesomeSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  path: z.string().min(1),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema
});

export const registryRecordSchema = awesomeSchema.pick({
  id: true,
  name: true,
  slug: true,
  path: true,
  createdAt: true
}).extend({
  lastOpenedAt: isoDateSchema.optional(),
  availability: z.enum(["available", "missing", "corrupt"])
});

export const ultraworkSchema = z.object({
  id: idSchema,
  awesomeId: idSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  sourcePath: z.string().min(1),
  destinationPath: z.string().min(1),
  cloneStrategy: z.enum(["clone", "worktree"]).default("clone"),
  defaultBranch: z.string().nullable(),
  headSha: z.string().nullable(),
  createdAt: isoDateSchema
});

export const geekTaskStatusSchema = z.enum([
  "created",
  "queued",
  "running",
  "claimed",
  "interrupted",
  "terminated",
  "rejected",
  "exited",
  "failed",
  "unknown",
  "orphaned"
]);

export const geekTaskSchema = z.object({
  id: idSchema,
  awesomeId: idSchema,
  title: z.string().min(1),
  prompt: z.string().min(1),
  command: z.array(z.string().min(1)).min(1),
  cwd: z.string().min(1),
  status: geekTaskStatusSchema,
  exitCode: z.number().int().nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  startedAt: isoDateSchema.nullable(),
  endedAt: isoDateSchema.nullable(),
  claimedAt: isoDateSchema.nullable(),
  claimedBy: z.string().nullable()
});

export const geekTaskUltraworkSchema = z.object({
  taskId: idSchema,
  ultraworkId: idSchema,
  createdAt: isoDateSchema
});

export const taskEventSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  type: z.enum(["status", "log", "error", "policy", "takeover"]),
  message: z.string(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  createdAt: isoDateSchema
});

export const takeoverEventSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  claimedBy: z.string().min(1),
  action: z.enum(["claim", "interrupt", "terminate", "follow_up"]),
  note: z.string().nullable(),
  createdAt: isoDateSchema
});

export const runtimeSessionSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  pid: z.number().int().nullable(),
  status: z.enum(["live", "exited", "unknown", "orphaned"]),
  startedAt: isoDateSchema,
  endedAt: isoDateSchema.nullable()
});

export const highRiskActionSchema = z.enum([
  "out_of_scope_write",
  "broad_delete",
  "remote_push",
  "global_install",
  "system_config",
  "sensitive_file_access",
  "secret_exfiltration"
]);

export const policyDecisionSchema = z.object({
  allowed: z.boolean(),
  action: highRiskActionSchema.nullable(),
  reason: z.string(),
  requiresApproval: z.boolean()
});

export const approvalDecisionStatusSchema = z.enum(["pending", "approved", "rejected", "expired", "bypassed"]);

export const approvalRecordSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  status: approvalDecisionStatusSchema,
  action: highRiskActionSchema,
  reason: z.string(),
  requestedBy: z.string().min(1),
  decidedBy: z.string().nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  decidedAt: isoDateSchema.nullable(),
  expiresAt: isoDateSchema.nullable()
});

export const taskRecoverySchema = z.object({
  awesome: awesomeSchema,
  ultraworks: z.array(ultraworkSchema),
  tasks: z.array(geekTaskSchema),
  taskUltraworks: z.array(geekTaskUltraworkSchema),
  approvals: z.array(approvalRecordSchema),
  takeoverEvents: z.array(takeoverEventSchema),
  latestEvents: z.array(taskEventSchema)
});

export type Awesome = z.infer<typeof awesomeSchema>;
export type RegistryRecord = z.infer<typeof registryRecordSchema>;
export type Ultrawork = z.infer<typeof ultraworkSchema>;
export type GeekTaskStatus = z.infer<typeof geekTaskStatusSchema>;
export type GeekTask = z.infer<typeof geekTaskSchema>;
export type GeekTaskUltrawork = z.infer<typeof geekTaskUltraworkSchema>;
export type TaskEvent = z.infer<typeof taskEventSchema>;
export type TakeoverEvent = z.infer<typeof takeoverEventSchema>;
export type RuntimeSession = z.infer<typeof runtimeSessionSchema>;
export type HighRiskAction = z.infer<typeof highRiskActionSchema>;
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type ApprovalDecisionStatus = z.infer<typeof approvalDecisionStatusSchema>;
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type TaskRecovery = z.infer<typeof taskRecoverySchema>;

const sensitiveFilePattern = /(^|[/\\])(\.env(\..*)?|id_rsa|id_ed25519|.*private.*key.*|.*credential.*|.*secret.*)([/\\]|$)/i;
const codexExecAliases = new Set(["exec", "e"]);

export function buildCodexExecCommand(prompt: string): string[] {
  return [
    "codex",
    "exec",
    "--json",
    "--color",
    "never",
    "--sandbox",
    "workspace-write",
    "--skip-git-repo-check",
    prompt
  ];
}

export function classifyHighRiskAction(input: {
  command?: string[];
  targetPath?: string;
  scopePath?: string;
  externalDestination?: string;
}): PolicyDecision {
  const commandText = directCommandText(input.command);
  const targetPath = input.targetPath ?? "";

  if (input.scopePath && targetPath && !isPathWithinScope(targetPath, input.scopePath)) {
    return {
      allowed: false,
      action: "out_of_scope_write",
      reason: "Target path is outside the selected awesome or ultrawork scope.",
      requiresApproval: true
    };
  }

  if (/\brm\s+-rf\s+(\/|\*|\.{1,2}(\/|$))/i.test(commandText)) {
    return {
      allowed: false,
      action: "broad_delete",
      reason: "Broad recursive deletion is a high-risk operation.",
      requiresApproval: true
    };
  }

  if (/\bgit\s+push\b/i.test(commandText)) {
    return {
      allowed: false,
      action: "remote_push",
      reason: "Remote pushes require explicit approval.",
      requiresApproval: true
    };
  }

  if (/\b(npm|pnpm|yarn)\s+(install|add)\b.*\s-g\b|\b(global|--global)\b/i.test(commandText)) {
    return {
      allowed: false,
      action: "global_install",
      reason: "Global tool installation is not allowed silently.",
      requiresApproval: true
    };
  }

  if (/\b(sudo|launchctl|systemctl|defaults\s+write)\b/i.test(commandText)) {
    return {
      allowed: false,
      action: "system_config",
      reason: "System configuration changes require explicit approval.",
      requiresApproval: true
    };
  }

  if (targetPath && sensitiveFilePattern.test(targetPath)) {
    return {
      allowed: false,
      action: input.externalDestination ? "secret_exfiltration" : "sensitive_file_access",
      reason: input.externalDestination
        ? "Sensitive files cannot be sent to external services without approval."
        : "Sensitive files require explicit policy handling.",
      requiresApproval: true
    };
  }

  return {
    allowed: true,
    action: null,
    reason: "Action is within local MVP policy.",
    requiresApproval: false
  };
}

function directCommandText(command: string[] | undefined): string {
  if (!command || command.length === 0) {
    return "";
  }
  if (command[0] === "codex" && command[1] && codexExecAliases.has(command[1])) {
    return command.slice(0, -1).join(" ");
  }
  return command.join(" ");
}

export function nowIso(): string {
  return new Date().toISOString();
}

function isPathWithinScope(targetPath: string, scopePath: string): boolean {
  const resolvedTarget = canonicalPath(targetPath);
  const resolvedScope = canonicalPath(scopePath);
  return resolvedTarget === resolvedScope || resolvedTarget.startsWith(`${resolvedScope}/`);
}

function canonicalPath(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  const absolutePrefix = normalized.startsWith("/") ? "/" : "";
  const parts: string[] = [];
  for (const part of normalized.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `${absolutePrefix}${parts.join("/")}`.replace(/\/$/, "");
}


export const cloudProtocolVersion = 1 as const;

export const cloudMessageTypeSchema = z.enum([
  "world.status",
  "world.error",
  "world.audit",
  "issue.list.request",
  "issue.list.result",
  "issue.create.request",
  "issue.create.result",
  "issue.select.request",
  "repo.scan.request",
  "repo.scan.result",
  "repo.import.request",
  "repo.import.result",
  "branch.list.request",
  "branch.list.result",
  "worktree.create.request",
  "worktree.create.result",
  "session.start.request",
  "session.started",
  "session.list.request",
  "session.list.result",
  "session.select.request",
  "session.input.request",
  "session.output",
  "session.status",
  "session.interrupt.request",
  "session.terminate.request"
]);

const cloudRequestTypes = new Set<string>([
  "issue.list.request",
  "issue.create.request",
  "issue.select.request",
  "repo.scan.request",
  "repo.import.request",
  "branch.list.request",
  "worktree.create.request",
  "session.start.request",
  "session.list.request",
  "session.select.request",
  "session.input.request",
  "session.interrupt.request",
  "session.terminate.request"
]);

const cloudRequiredScopes: Partial<Record<CloudMessageType, readonly (keyof CloudProtocolMessage)[]>> = {
  "issue.select.request": ["worldId", "issueId"],
  "repo.scan.request": ["worldId"],
  "repo.import.request": ["worldId"],
  "branch.list.request": ["worldId", "repoId"],
  "worktree.create.request": ["worldId", "issueId", "repoId"],
  "session.start.request": ["worldId", "issueId", "worktreeId"],
  "session.select.request": ["worldId", "issueId", "sessionId"],
  "session.input.request": ["worldId", "issueId", "sessionId"],
  "session.interrupt.request": ["worldId", "issueId", "sessionId"],
  "session.terminate.request": ["worldId", "issueId", "sessionId"],
  "session.output": ["worldId", "issueId", "sessionId"],
  "session.status": ["worldId", "issueId", "sessionId"]
};

const cloudCredentialKeyPattern = /token|password|passwd|privatekey|private_key|credential|secret|sshkey|ssh_key/i;

export const cloudProtocolMessageBaseSchema = z.object({
  version: z.literal(cloudProtocolVersion),
  type: cloudMessageTypeSchema,
  requestId: z.string().min(1).optional(),
  worldId: z.string().min(1).optional(),
  issueId: z.string().min(1).optional(),
  repoId: z.string().min(1).optional(),
  worktreeId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  createdAt: isoDateSchema.optional(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export const cloudProtocolMessageSchema = cloudProtocolMessageBaseSchema.superRefine((message, context) => {
  if (cloudRequestTypes.has(message.type) && !message.requestId) {
    context.addIssue({ code: "custom", path: ["requestId"], message: "requestId is required for requests." });
  }
  if (!message.type.startsWith("world.") && !message.worldId) {
    context.addIssue({ code: "custom", path: ["worldId"], message: "worldId is required." });
  }
  for (const scope of cloudRequiredScopes[message.type] ?? []) {
    if (!message[scope]) {
      context.addIssue({ code: "custom", path: [scope], message: `${String(scope)} is required for ${message.type}.` });
    }
  }
  if (message.type === "repo.import.request") {
    const payload = message.payload ?? {};
    const allowed = new Set(["gitUrl", "ref", "name"]);
    for (const key of Object.keys(payload)) {
      if (!allowed.has(key)) {
        context.addIssue({ code: "custom", path: ["payload", key], message: `Unsupported repo import field: ${key}.` });
      }
    }
    if (containsCloudCredentialKey(payload)) {
      context.addIssue({ code: "custom", path: ["payload"], message: "Browser-supplied git credentials are not allowed." });
    }
    if (typeof payload.gitUrl !== "string" || !isAllowedCloudGitUrl(payload.gitUrl)) {
      context.addIssue({ code: "custom", path: ["payload", "gitUrl"], message: "A valid gitUrl is required." });
    } else if (hasCloudUrlCredentials(payload.gitUrl)) {
      context.addIssue({ code: "custom", path: ["payload", "gitUrl"], message: "gitUrl must not contain credentials." });
    }
  }
  if (message.type === "session.start.request") {
    const payload = message.payload ?? {};
    const allowed = new Set(["cwd"]);
    for (const key of Object.keys(payload)) {
      if (!allowed.has(key)) {
        context.addIssue({ code: "custom", path: ["payload", key], message: `Unsupported session start field: ${key}.` });
      }
    }
    if (payload.cwd !== undefined && typeof payload.cwd !== "string") {
      context.addIssue({ code: "custom", path: ["payload", "cwd"], message: "cwd must be a string when provided." });
    }
  }
  if (message.type === "worktree.create.request") {
    const payload = message.payload ?? {};
    const allowed = new Set(["branch", "worktreeId"]);
    for (const key of Object.keys(payload)) {
      if (!allowed.has(key)) {
        context.addIssue({ code: "custom", path: ["payload", key], message: `Unsupported worktree create field: ${key}.` });
      }
    }
    if (payload.branch !== undefined && typeof payload.branch !== "string") {
      context.addIssue({ code: "custom", path: ["payload", "branch"], message: "branch must be a string when provided." });
    }
    if (payload.worktreeId !== undefined && typeof payload.worktreeId !== "string") {
      context.addIssue({ code: "custom", path: ["payload", "worktreeId"], message: "worktreeId must be a string when provided." });
    }
  }
});

export type CloudMessageType = z.infer<typeof cloudMessageTypeSchema>;
export type CloudProtocolMessage = z.infer<typeof cloudProtocolMessageBaseSchema>;

export function parseCloudProtocolMessage(value: unknown): CloudProtocolMessage {
  return cloudProtocolMessageSchema.parse(value) as CloudProtocolMessage;
}

export function isCloudProtocolMessage(value: unknown): value is CloudProtocolMessage {
  return cloudProtocolMessageSchema.safeParse(value).success;
}

function containsCloudCredentialKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => cloudCredentialKeyPattern.test(key) || containsCloudCredentialKey(nested));
}

function isAllowedCloudGitUrl(value: string): boolean {
  if (/^git@[^:]+:[^\s]+\.git$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:" || url.protocol === "ssh:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function hasCloudUrlCredentials(value: string): boolean {
  try {
    const url = new URL(value);
    return url.username.length > 0 || url.password.length > 0;
  } catch {
    return false;
  }
}
