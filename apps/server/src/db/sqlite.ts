import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  Awesome,
  GeekTask,
  GeekTaskUltrawork,
  RegistryRecord,
  RuntimeSession,
  TakeoverEvent,
  TaskEvent,
  Ultrawork
} from "@caesar-geek/shared";
import { nowIso } from "@caesar-geek/shared";

type Row = Record<string, unknown>;

export class RegistryStore {
  private readonly db: DatabaseSync;

  private constructor(db: DatabaseSync) {
    this.db = db;
  }

  static async open(dbPath: string): Promise<RegistryStore> {
    await mkdir(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS known_awesomes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_opened_at TEXT,
        availability TEXT NOT NULL
      );
    `);
    return new RegistryStore(db);
  }

  upsert(record: RegistryRecord): void {
    this.db
      .prepare(
        `INSERT INTO known_awesomes (id, name, slug, path, created_at, last_opened_at, availability)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           slug = excluded.slug,
           path = excluded.path,
           last_opened_at = excluded.last_opened_at,
           availability = excluded.availability`
      )
      .run(record.id, record.name, record.slug, record.path, record.createdAt, record.lastOpenedAt ?? null, record.availability);
  }

  list(): RegistryRecord[] {
    return this.db
      .prepare("SELECT * FROM known_awesomes ORDER BY COALESCE(last_opened_at, created_at) DESC")
      .all()
      .map((row) => ({
        id: String((row as Row).id),
        name: String((row as Row).name),
        slug: String((row as Row).slug),
        path: String((row as Row).path),
        createdAt: String((row as Row).created_at),
        lastOpenedAt: (row as Row).last_opened_at ? String((row as Row).last_opened_at) : undefined,
        availability: (row as Row).availability as RegistryRecord["availability"]
      }));
  }

  get(id: string): RegistryRecord | null {
    return this.list().find((record) => record.id === id) ?? null;
  }
}

export class AwesomeStore {
  private readonly db: DatabaseSync;

  private constructor(db: DatabaseSync) {
    this.db = db;
  }

  static async open(awesomePath: string): Promise<AwesomeStore> {
    await mkdir(path.join(awesomePath, ".caesar-geek"), { recursive: true });
    const db = new DatabaseSync(path.join(awesomePath, ".caesar-geek", "db.sqlite"));
    db.exec(`
      CREATE TABLE IF NOT EXISTS awesomes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ultraworks (
        id TEXT PRIMARY KEY,
        awesome_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        source_path TEXT NOT NULL,
        destination_path TEXT NOT NULL,
        clone_strategy TEXT NOT NULL,
        default_branch TEXT,
        head_sha TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS geek_tasks (
        id TEXT PRIMARY KEY,
        awesome_id TEXT NOT NULL,
        title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        command_json TEXT NOT NULL,
        cwd TEXT NOT NULL,
        status TEXT NOT NULL,
        exit_code INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        ended_at TEXT,
        claimed_at TEXT,
        claimed_by TEXT
      );
      CREATE TABLE IF NOT EXISTS geek_task_ultraworks (
        task_id TEXT NOT NULL,
        ultrawork_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (task_id, ultrawork_id)
      );
      CREATE TABLE IF NOT EXISTS task_events (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS takeover_events (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        claimed_by TEXT NOT NULL,
        action TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runtime_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        pid INTEGER,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT
      );
    `);
    return new AwesomeStore(db);
  }

  saveAwesome(awesome: Awesome): void {
    this.db
      .prepare(
        `INSERT INTO awesomes (id, name, slug, path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, path = excluded.path, updated_at = excluded.updated_at`
      )
      .run(awesome.id, awesome.name, awesome.slug, awesome.path, awesome.createdAt, awesome.updatedAt);
  }

  getAwesome(): Awesome | null {
    const row = this.db.prepare("SELECT * FROM awesomes LIMIT 1").get() as Row | undefined;
    return row
      ? {
          id: String(row.id),
          name: String(row.name),
          slug: String(row.slug),
          path: String(row.path),
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at)
        }
      : null;
  }

  saveUltrawork(ultrawork: Ultrawork): void {
    this.db
      .prepare(
        `INSERT INTO ultraworks
         (id, awesome_id, name, slug, source_path, destination_path, clone_strategy, default_branch, head_sha, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ultrawork.id,
        ultrawork.awesomeId,
        ultrawork.name,
        ultrawork.slug,
        ultrawork.sourcePath,
        ultrawork.destinationPath,
        ultrawork.cloneStrategy,
        ultrawork.defaultBranch,
        ultrawork.headSha,
        ultrawork.createdAt
      );
  }

  listUltraworks(): Ultrawork[] {
    return this.db.prepare("SELECT * FROM ultraworks ORDER BY created_at DESC").all().map((row) => ({
      id: String((row as Row).id),
      awesomeId: String((row as Row).awesome_id),
      name: String((row as Row).name),
      slug: String((row as Row).slug),
      sourcePath: String((row as Row).source_path),
      destinationPath: String((row as Row).destination_path),
      cloneStrategy: (row as Row).clone_strategy as Ultrawork["cloneStrategy"],
      defaultBranch: (row as Row).default_branch ? String((row as Row).default_branch) : null,
      headSha: (row as Row).head_sha ? String((row as Row).head_sha) : null,
      createdAt: String((row as Row).created_at)
    }));
  }

  createTask(task: GeekTask, ultraworkIds: string[]): void {
    const insertTask = this.db.prepare(
      `INSERT INTO geek_tasks
       (id, awesome_id, title, prompt, command_json, cwd, status, exit_code, created_at, updated_at, started_at, ended_at, claimed_at, claimed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertJoin = this.db.prepare(
      "INSERT INTO geek_task_ultraworks (task_id, ultrawork_id, created_at) VALUES (?, ?, ?)"
    );
    const createdAt = nowIso();
    this.db.exec("BEGIN");
    try {
      insertTask.run(
        task.id,
        task.awesomeId,
        task.title,
        task.prompt,
        JSON.stringify(task.command),
        task.cwd,
        task.status,
        task.exitCode,
        task.createdAt,
        task.updatedAt,
        task.startedAt,
        task.endedAt,
        task.claimedAt,
        task.claimedBy
      );
      for (const ultraworkId of ultraworkIds) {
        insertJoin.run(task.id, ultraworkId, createdAt);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  updateTaskStatus(taskId: string, patch: Partial<Pick<GeekTask, "status" | "exitCode" | "startedAt" | "endedAt" | "claimedAt" | "claimedBy">>): void {
    const current = this.getTask(taskId);
    if (!current) {
      throw new Error(`Unknown geek task: ${taskId}`);
    }
    const next = { ...current, ...patch, updatedAt: nowIso() };
    this.db
      .prepare(
        `UPDATE geek_tasks
         SET status = ?, exit_code = ?, updated_at = ?, started_at = ?, ended_at = ?, claimed_at = ?, claimed_by = ?
         WHERE id = ?`
      )
      .run(next.status, next.exitCode, next.updatedAt, next.startedAt, next.endedAt, next.claimedAt, next.claimedBy, taskId);
  }

  getTask(taskId: string): GeekTask | null {
    const row = this.db.prepare("SELECT * FROM geek_tasks WHERE id = ?").get(taskId) as Row | undefined;
    return row ? mapTask(row) : null;
  }

  listTasks(): GeekTask[] {
    return this.db.prepare("SELECT * FROM geek_tasks ORDER BY created_at DESC").all().map((row) => mapTask(row as Row));
  }

  listTaskUltraworks(): GeekTaskUltrawork[] {
    return this.db.prepare("SELECT * FROM geek_task_ultraworks").all().map((row) => ({
      taskId: String((row as Row).task_id),
      ultraworkId: String((row as Row).ultrawork_id),
      createdAt: String((row as Row).created_at)
    }));
  }

  appendEvent(event: TaskEvent): void {
    this.db
      .prepare("INSERT INTO task_events (id, task_id, type, message, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(event.id, event.taskId, event.type, event.message, event.payload ? JSON.stringify(event.payload) : null, event.createdAt);
  }

  listEvents(limit = 200): TaskEvent[] {
    return this.db
      .prepare("SELECT * FROM task_events ORDER BY created_at DESC LIMIT ?")
      .all(limit)
      .reverse()
      .map((row) => ({
        id: String((row as Row).id),
        taskId: String((row as Row).task_id),
        type: (row as Row).type as TaskEvent["type"],
        message: String((row as Row).message),
        payload: (row as Row).payload_json ? JSON.parse(String((row as Row).payload_json)) : null,
        createdAt: String((row as Row).created_at)
      }));
  }

  appendTakeover(event: TakeoverEvent): void {
    this.db
      .prepare("INSERT INTO takeover_events (id, task_id, claimed_by, action, note, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(event.id, event.taskId, event.claimedBy, event.action, event.note, event.createdAt);
  }

  listTakeovers(): TakeoverEvent[] {
    return this.db.prepare("SELECT * FROM takeover_events ORDER BY created_at DESC").all().map((row) => ({
      id: String((row as Row).id),
      taskId: String((row as Row).task_id),
      claimedBy: String((row as Row).claimed_by),
      action: (row as Row).action as TakeoverEvent["action"],
      note: (row as Row).note ? String((row as Row).note) : null,
      createdAt: String((row as Row).created_at)
    }));
  }

  saveRuntimeSession(session: RuntimeSession): void {
    this.db
      .prepare("INSERT INTO runtime_sessions (id, task_id, pid, status, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(session.id, session.taskId, session.pid, session.status, session.startedAt, session.endedAt);
  }

  updateRuntimeSession(taskId: string, patch: Pick<RuntimeSession, "status" | "endedAt">): void {
    this.db
      .prepare(
        `UPDATE runtime_sessions
         SET status = ?, ended_at = ?
         WHERE id = (
           SELECT id FROM runtime_sessions WHERE task_id = ? ORDER BY started_at DESC LIMIT 1
         )`
      )
      .run(patch.status, patch.endedAt, taskId);
  }

  listRuntimeSessions(): RuntimeSession[] {
    return this.db.prepare("SELECT * FROM runtime_sessions ORDER BY started_at DESC").all().map((row) => ({
      id: String((row as Row).id),
      taskId: String((row as Row).task_id),
      pid: (row as Row).pid === null || (row as Row).pid === undefined ? null : Number((row as Row).pid),
      status: (row as Row).status as RuntimeSession["status"],
      startedAt: String((row as Row).started_at),
      endedAt: (row as Row).ended_at ? String((row as Row).ended_at) : null
    }));
  }

  markRunningTasksRecovered(): void {
    const latestSessions = new Map<string, RuntimeSession>();
    for (const session of this.listRuntimeSessions()) {
      if (!latestSessions.has(session.taskId)) {
        latestSessions.set(session.taskId, session);
      }
    }
    const tasks = this.listTasks().filter((task) => task.status === "running" || task.status === "queued");
    for (const task of tasks) {
      const session = latestSessions.get(task.id);
      const recoveredStatus = session?.status === "exited" ? "exited" : session?.status === "orphaned" ? "orphaned" : "unknown";
      this.updateTaskStatus(task.id, { status: recoveredStatus, endedAt: nowIso() });
      this.appendEvent({
        id: `event_${crypto.randomUUID()}`,
        taskId: task.id,
        type: "status",
        message: `Gateway restarted; task marked ${recoveredStatus} from persisted runtime state.`,
        payload: { recovered: true, runtimeSessionStatus: session?.status ?? null },
        createdAt: nowIso()
      });
    }
  }
}

function mapTask(row: Row): GeekTask {
  return {
    id: String(row.id),
    awesomeId: String(row.awesome_id),
    title: String(row.title),
    prompt: String(row.prompt),
    command: JSON.parse(String(row.command_json)) as string[],
    cwd: String(row.cwd),
    status: row.status as GeekTask["status"],
    exitCode: row.exit_code === null || row.exit_code === undefined ? null : Number(row.exit_code),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    endedAt: row.ended_at ? String(row.ended_at) : null,
    claimedAt: row.claimed_at ? String(row.claimed_at) : null,
    claimedBy: row.claimed_by ? String(row.claimed_by) : null
  };
}
