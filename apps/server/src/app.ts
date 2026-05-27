import cors from "@fastify/cors";
import { initTRPC } from "@trpc/server";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { GeekRuntime } from "@caesar-geek/agent-runtime";
import {
  buildCodexExecCommand,
  classifyHighRiskAction,
  nowIso,
  type ApprovalRecord,
  type Awesome,
  type RegistryRecord,
  type TaskEvent
} from "@caesar-geek/shared";
import {
  cloneUltrawork,
  createAwesomeLayout,
  defaultWorkspacePaths,
  detectAwesomeAvailability
} from "@caesar-geek/workspace";
import { AwesomeStore, RegistryStore } from "./db/sqlite.js";

type ActiveAwesome = {
  awesome: Awesome;
  store: AwesomeStore;
  runtime: GeekRuntime;
};

export type AppContext = {
  registry: RegistryStore;
  activeAwesome: ActiveAwesome | null;
  events: Set<(event: TaskEvent) => void>;
};

const t = initTRPC.context<AppContext>().create();
const publicProcedure = t.procedure;

async function openActiveAwesome(awesomePath: string, ctx: AppContext): Promise<ActiveAwesome> {
  const store = await AwesomeStore.open(awesomePath);
  store.markRunningTasksRecovered();
  const awesome = store.getAwesome();
  if (!awesome) {
    throw new Error(`No awesome metadata exists at ${awesomePath}`);
  }
  const runtime = createRuntime(store, ctx);
  return { awesome, store, runtime };
}

function requireActive(ctx: AppContext): ActiveAwesome {
  if (!ctx.activeAwesome) {
    throw new Error("Select or create an awesome first.");
  }
  return ctx.activeAwesome;
}

function setActiveAwesome(ctx: AppContext, next: ActiveAwesome, reason: string): void {
  ctx.activeAwesome?.runtime.shutdown(reason);
  ctx.activeAwesome = next;
}

function createRuntime(store: AwesomeStore, ctx: AppContext): GeekRuntime {
  return new GeekRuntime({
    updateTaskStatus: (...args) => store.updateTaskStatus(...args),
    appendEvent: (event) => publishEvent(store, ctx, event),
    appendTakeover: (...args) => store.appendTakeover(...args),
    saveRuntimeSession: (...args) => store.saveRuntimeSession(...args),
    updateRuntimeSession: (...args) => store.updateRuntimeSession(...args)
  });
}

function publishEvent(store: AwesomeStore, ctx: AppContext, event: TaskEvent): void {
  store.appendEvent(event);
  for (const listener of ctx.events) {
    listener(event);
  }
}

export const appRouter = t.router({
  awesomes: t.router({
    list: publicProcedure.query(async ({ ctx }) => {
      const records = await Promise.all(ctx.registry.list().map((record) => detectAwesomeAvailability(record)));
      for (const record of records) {
        ctx.registry.upsert(record);
      }
      return records;
    }),
    create: publicProcedure
      .input(z.object({ name: z.string().min(1), path: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const awesome = await createAwesomeLayout({ name: input.name, rootPath: input.path });
        const store = await AwesomeStore.open(awesome.path);
        store.saveAwesome(awesome);
        const record: RegistryRecord = {
          id: awesome.id,
          name: awesome.name,
          slug: awesome.slug,
          path: awesome.path,
          createdAt: awesome.createdAt,
          lastOpenedAt: nowIso(),
          availability: "available"
        };
        ctx.registry.upsert(record);
        const runtime = createRuntime(store, ctx);
        setActiveAwesome(ctx, { awesome, store, runtime }, "awesome create");
        return { awesome, record };
      }),
    select: publicProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const record = ctx.registry.get(input.id);
      if (!record) {
        throw new Error(`Unknown awesome: ${input.id}`);
      }
      const availability = await detectAwesomeAvailability(record);
      ctx.registry.upsert({ ...availability, lastOpenedAt: nowIso() });
      if (availability.availability !== "available") {
        throw new Error(`Awesome is ${availability.availability}: ${record.path}`);
      }
      const next = await openActiveAwesome(record.path, ctx);
      setActiveAwesome(ctx, next, "awesome select");
      return next.awesome;
    }),
    active: publicProcedure.query(({ ctx }) => ctx.activeAwesome?.awesome ?? null)
  }),
  ultraworks: t.router({
    list: publicProcedure.query(({ ctx }) => requireActive(ctx).store.listUltraworks()),
    add: publicProcedure
      .input(z.object({ sourcePath: z.string().min(1), name: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const active = requireActive(ctx);
        const ultrawork = await cloneUltrawork({
          awesome: active.awesome,
          sourcePath: input.sourcePath,
          ...(input.name ? { name: input.name } : {})
        });
        active.store.saveUltrawork(ultrawork);
        return ultrawork;
      })
  }),
  tasks: t.router({
    recovery: publicProcedure.query(({ ctx }) => {
      const active = requireActive(ctx);
      return {
        awesome: active.awesome,
        ultraworks: active.store.listUltraworks(),
        tasks: active.store.listTasks(),
        taskUltraworks: active.store.listTaskUltraworks(),
        approvals: active.store.listApprovals(),
        takeoverEvents: active.store.listTakeovers(),
        latestEvents: active.store.listEvents()
      };
    }),
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          prompt: z.string().min(1),
          command: z.array(z.string().min(1)).min(1).optional(),
          ultraworkIds: z.array(z.string()).default([]),
          launch: z.boolean().default(true)
        })
      )
      .mutation(({ ctx, input }) => {
        const active = requireActive(ctx);
        const command = input.command ?? buildCodexExecCommand(input.prompt);
        const policy = classifyHighRiskAction({ command, scopePath: active.awesome.path });
        const validUltraworkIds = new Set(active.store.listUltraworks().map((ultrawork) => ultrawork.id));
        const unknownUltraworkIds = input.ultraworkIds.filter((id) => !validUltraworkIds.has(id));
        if (unknownUltraworkIds.length > 0) {
          throw new Error(`Unknown ultrawork ids for active awesome: ${unknownUltraworkIds.join(", ")}`);
        }
        const task = active.runtime.createTaskDraft({
          awesomeId: active.awesome.id,
          title: input.title,
          prompt: input.prompt,
          command,
          cwd: active.awesome.path
        });
        if (!policy.allowed) {
          task.status = "queued";
        }
        active.store.createTask(task, input.ultraworkIds);
        const persistedEvent: TaskEvent = {
          id: `event_${randomUUID()}`,
          taskId: task.id,
          type: "status",
          message: "Geek task persisted before launch.",
          payload: { ultraworkIds: input.ultraworkIds },
          createdAt: nowIso()
        };
        publishEvent(active.store, ctx, persistedEvent);
        let approval: ApprovalRecord | null = null;
        if (!policy.allowed && policy.action) {
          const createdAt = nowIso();
          approval = {
            id: `approval_${randomUUID()}`,
            taskId: task.id,
            status: "pending",
            action: policy.action,
            reason: policy.reason,
            requestedBy: "operator",
            decidedBy: null,
            createdAt,
            updatedAt: createdAt,
            decidedAt: null,
            expiresAt: null
          };
          active.store.createApproval(approval);
          const approvalEvent: TaskEvent = {
            id: `event_${randomUUID()}`,
            taskId: task.id,
            type: "policy",
            message: "High-risk task is pending persisted approval.",
            payload: { approvalId: approval.id, action: approval.action, reason: approval.reason },
            createdAt
          };
          publishEvent(active.store, ctx, approvalEvent);
          return { task, policy, approval };
        }
        if (input.launch) {
          active.runtime.launch(task);
        }
        return { task, policy, approval };
      }),
    followUp: publicProcedure
      .input(
        z.object({
          taskId: z.string().min(1),
          claimedBy: z.string().min(1).default("operator"),
          title: z.string().min(1).optional(),
          prompt: z.string().min(1),
          command: z.array(z.string().min(1)).min(1),
          launch: z.boolean().default(true)
        })
      )
      .mutation(({ ctx, input }) => {
        const active = requireActive(ctx);
        const sourceTask = active.store.getTask(input.taskId);
        if (!sourceTask) {
          throw new Error(`Unknown geek task: ${input.taskId}`);
        }
        const ultraworkIds = active.store
          .listTaskUltraworks()
          .filter((link) => link.taskId === sourceTask.id)
          .map((link) => link.ultraworkId);
        active.runtime.recordFollowUp(sourceTask, input.claimedBy, input.prompt);
        const task = active.runtime.createTaskDraft({
          awesomeId: active.awesome.id,
          title: input.title ?? `Follow-up: ${sourceTask.title}`,
          prompt: input.prompt,
          command: input.command,
          cwd: active.awesome.path
        });
        active.store.createTask(task, ultraworkIds);
        if (input.launch) {
          active.runtime.launch(task);
        }
        return task;
      }),
    claim: publicProcedure
      .input(z.object({ taskId: z.string().min(1), claimedBy: z.string().min(1), note: z.string().optional() }))
      .mutation(({ ctx, input }) => {
        const active = requireActive(ctx);
        const task = active.store.getTask(input.taskId);
        if (!task) {
          throw new Error(`Unknown geek task: ${input.taskId}`);
        }
        return active.runtime.claim(task, input.claimedBy, input.note);
      }),
    interrupt: publicProcedure.input(z.object({ taskId: z.string().min(1) })).mutation(({ ctx, input }) => {
      return { interrupted: requireActive(ctx).runtime.interrupt(input.taskId) };
    }),
    terminate: publicProcedure.input(z.object({ taskId: z.string().min(1) })).mutation(({ ctx, input }) => {
      return { terminated: requireActive(ctx).runtime.terminate(input.taskId) };
    })
  }),
  policy: t.router({
    classify: publicProcedure
      .input(z.object({ command: z.array(z.string()).optional(), targetPath: z.string().optional(), externalDestination: z.string().optional() }))
      .query(({ ctx, input }) => {
        const scopePath = ctx.activeAwesome?.awesome.path ?? path.resolve(".");
        return classifyHighRiskAction({
          scopePath,
          ...(input.command ? { command: input.command } : {}),
          ...(input.targetPath ? { targetPath: input.targetPath } : {}),
          ...(input.externalDestination ? { externalDestination: input.externalDestination } : {})
        });
      })
  }),
  approvals: t.router({
    listPending: publicProcedure.query(({ ctx }) => requireActive(ctx).store.listApprovals("pending")),
    approve: publicProcedure
      .input(z.object({ approvalId: z.string().min(1), decidedBy: z.string().min(1).default("operator") }))
      .mutation(({ ctx, input }) => {
        const active = requireActive(ctx);
        const current = active.store.getApproval(input.approvalId);
        if (!current) {
          throw new Error(`Unknown approval: ${input.approvalId}`);
        }
        if (current.status !== "pending") {
          throw new Error(`Approval is ${current.status}, not pending.`);
        }
        const task = active.store.getTask(current.taskId);
        if (!task) {
          throw new Error(`Unknown task for approval: ${current.taskId}`);
        }
        if (task.status !== "queued") {
          throw new Error(`Approved task is ${task.status}, not queued.`);
        }
        const decidedAt = nowIso();
        const approval = active.store.updateApprovalDecision(input.approvalId, {
          status: "approved",
          decidedBy: input.decidedBy,
          decidedAt
        });
        publishEvent(active.store, ctx, {
          id: `event_${randomUUID()}`,
          taskId: task.id,
          type: "policy",
          message: "Persisted approval accepted; launching original task intent.",
          payload: { approvalId: approval.id, action: approval.action, decidedBy: input.decidedBy },
          createdAt: decidedAt
        });
        active.runtime.launch(task);
        return approval;
      }),
    reject: publicProcedure
      .input(z.object({ approvalId: z.string().min(1), decidedBy: z.string().min(1).default("operator") }))
      .mutation(({ ctx, input }) => {
        const active = requireActive(ctx);
        const current = active.store.getApproval(input.approvalId);
        if (!current) {
          throw new Error(`Unknown approval: ${input.approvalId}`);
        }
        if (current.status !== "pending") {
          throw new Error(`Approval is ${current.status}, not pending.`);
        }
        const decidedAt = nowIso();
        const approval = active.store.updateApprovalDecision(input.approvalId, {
          status: "rejected",
          decidedBy: input.decidedBy,
          decidedAt
        });
        active.store.updateTaskStatus(approval.taskId, { status: "rejected", endedAt: decidedAt });
        publishEvent(active.store, ctx, {
          id: `event_${randomUUID()}`,
          taskId: approval.taskId,
          type: "policy",
          message: "Persisted approval rejected; task remains non-running.",
          payload: { approvalId: approval.id, action: approval.action, decidedBy: input.decidedBy },
          createdAt: decidedAt
        });
        return approval;
      })
  })
});

export type AppRouter = typeof appRouter;

export async function buildServer() {
  const paths = defaultWorkspacePaths();
  const ctx: AppContext = {
    registry: await RegistryStore.open(paths.registryDbPath),
    activeAwesome: null,
    events: new Set()
  };
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: true });
  await fastify.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext: () => ctx }
  });

  fastify.get("/events", async (request, reply) => {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    const listener = (event: TaskEvent) => {
      reply.raw.write(`event: task\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    ctx.events.add(listener);
    request.raw.on("close", () => ctx.events.delete(listener));
  });

  return { fastify, ctx };
}
