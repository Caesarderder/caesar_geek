import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const awesomes = sqliteTable("awesomes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  path: text("path").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const ultraworks = sqliteTable("ultraworks", {
  id: text("id").primaryKey(),
  awesomeId: text("awesome_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sourcePath: text("source_path").notNull(),
  destinationPath: text("destination_path").notNull(),
  cloneStrategy: text("clone_strategy").notNull(),
  defaultBranch: text("default_branch"),
  headSha: text("head_sha"),
  createdAt: text("created_at").notNull()
});

export const geekTasks = sqliteTable("geek_tasks", {
  id: text("id").primaryKey(),
  awesomeId: text("awesome_id").notNull(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  commandJson: text("command_json").notNull(),
  cwd: text("cwd").notNull(),
  status: text("status").notNull(),
  exitCode: integer("exit_code"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  claimedAt: text("claimed_at"),
  claimedBy: text("claimed_by")
});

export const geekTaskUltraworks = sqliteTable("geek_task_ultraworks", {
  taskId: text("task_id").notNull(),
  ultraworkId: text("ultrawork_id").notNull(),
  createdAt: text("created_at").notNull()
});

export const taskEvents = sqliteTable("task_events", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  payloadJson: text("payload_json"),
  createdAt: text("created_at").notNull()
});

export const takeoverEvents = sqliteTable("takeover_events", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  claimedBy: text("claimed_by").notNull(),
  action: text("action").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull()
});

export const runtimeSessions = sqliteTable("runtime_sessions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  pid: integer("pid"),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at")
});
