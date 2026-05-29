import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import {
  Activity,
  Bot,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FolderGit2,
  GitBranchPlus,
  Gauge,
  Hammer,
  MessageSquareText,
  Octagon,
  Pause,
  Play,
  RefreshCcw,
  Route,
  ShieldAlert,
  SquarePlus,
  UserCheck,
  Workflow,
  X
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ApprovalRecord, GeekTask, RegistryRecord, TaskEvent, Ultrawork } from "@caesar-geek/shared";
import "./styles.css";

type TrpcClient = {
  repos: {
    scan: { query(): Promise<RepoCandidate[]> };
  };
  issues: {
    create: { mutate(input: { title: string; repoPaths: string[] }): Promise<{ issue: unknown; repos: Ultrawork[]; record: RegistryRecord }> };
  };
  awesomes: {
    list: { query(): Promise<RegistryRecord[]> };
    create: { mutate(input: { name: string; path: string }): Promise<{ awesome: unknown; record: RegistryRecord }> };
    select: { mutate(input: { id: string }): Promise<unknown> };
    active: { query(): Promise<unknown> };
  };
  ultraworks: {
    list: { query(): Promise<Ultrawork[]> };
    add: { mutate(input: { sourcePath: string; name?: string }): Promise<Ultrawork> };
  };
  tasks: {
    recovery: { query(): Promise<RecoveryState> };
    create: { mutate(input: { title: string; prompt: string; command?: string[]; ultraworkIds: string[]; cwd?: string; launch: boolean }): Promise<{ task: GeekTask; policy: { allowed: boolean; reason: string }; approval: ApprovalRecord | null }> };
    followUp: { mutate(input: { taskId: string; claimedBy: string; prompt: string; command: string[]; launch: boolean }): Promise<GeekTask> };
    claim: { mutate(input: { taskId: string; claimedBy: string; note?: string }): Promise<unknown> };
    interrupt: { mutate(input: { taskId: string }): Promise<{ interrupted: boolean }> };
    terminate: { mutate(input: { taskId: string }): Promise<{ terminated: boolean }> };
  };
  approvals: {
    listPending: { query(): Promise<ApprovalRecord[]> };
    approve: { mutate(input: { approvalId: string; decidedBy?: string }): Promise<ApprovalRecord> };
    reject: { mutate(input: { approvalId: string; decidedBy?: string }): Promise<ApprovalRecord> };
  };
};

type RecoveryState = {
  awesome: { id: string; name: string; path: string };
  ultraworks: Ultrawork[];
  tasks: GeekTask[];
  taskUltraworks: Array<{ taskId: string; ultraworkId: string }>;
  approvals: ApprovalRecord[];
  takeoverEvents: Array<{ id: string; taskId: string; claimedBy: string; action: string; note: string | null; createdAt: string }>;
  latestEvents: TaskEvent[];
};

type RepoCandidate = {
  id: string;
  name: string;
  path: string;
  defaultBranch: string | null;
  headSha: string | null;
};

const trpc = createTRPCProxyClient({
  links: [httpBatchLink({ url: "/trpc" })]
}) as unknown as TrpcClient;

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceConsole />
    </QueryClientProvider>
  );
}

function WorkspaceConsole() {
  const qc = useQueryClient();
  const [eventLog, setEventLog] = useState<TaskEvent[]>([]);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const awesomes = useQuery({ queryKey: ["awesomes"], queryFn: () => trpc.awesomes.list.query() });
  const repoScan = useQuery({ queryKey: ["repos", "scan"], queryFn: () => trpc.repos.scan.query() });
  const recovery = useQuery({
    queryKey: ["recovery"],
    queryFn: () => trpc.tasks.recovery.query(),
    retry: false
  });

  useEffect(() => {
    const source = new EventSource("/events");
    source.addEventListener("task", (message) => {
      const event = JSON.parse((message as MessageEvent).data) as TaskEvent;
      setEventLog((events) => [...events.slice(-99), event]);
      void qc.invalidateQueries({ queryKey: ["recovery"] });
    });
    return () => source.close();
  }, [qc]);

  const events = useMemo(() => [...(recovery.data?.latestEvents ?? []), ...eventLog].slice(-120), [eventLog, recovery.data?.latestEvents]);
  const tasks = recovery.data?.tasks ?? [];
  const runningTasks = tasks.filter((task) => ["queued", "running"].includes(task.status)).length;
  const needsOperator = tasks.filter((task) => ["created", "claimed", "interrupted", "failed", "orphaned"].includes(task.status)).length;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <button className="brandAvatar" type="button" aria-label="Open Caesar Geek codex" onClick={() => setIsCodexOpen(true)}>
            <img className="brandIcon" src="/caesar-geek-icon.png" alt="" />
          </button>
          <div>
            <strong>Caesar Geek</strong>
            <span>local issue agents</span>
          </div>
          <img className="brandCrest" src="/race-sigil.png" alt="" />
        </div>
        <IssuePanel
          issues={awesomes.data ?? []}
          repos={repoScan.data ?? []}
          refreshIssues={() => void awesomes.refetch()}
          refreshRepos={() => void repoScan.refetch()}
        />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topCopy">
            <span className="eyebrow">agent mission control</span>
            <h1>{recovery.data?.awesome.name ?? "No issue selected"}</h1>
            <p>Select local repositories, create an issue workspace under ~/.caesar/issues, then start agents at issue or repo scope.</p>
          </div>
          <div className="topMeta" aria-label="Workspace status">
            <span><strong>{runningTasks}</strong> active</span>
            <span><strong>{needsOperator}</strong> review</span>
            <span><strong>{events.length}</strong> traces</span>
          </div>
          <img className="topIllustration" src="/world-map.png" alt="" />
          <button className="iconText scanButton" onClick={() => void recovery.refetch()} aria-label="Scan active world">
            <RefreshCcw size={16} />
            Scan
          </button>
        </header>

        <nav className="quickNav" aria-label="Console sections">
          <a href="#repos">Repos</a>
          <a href="#agents">Agents</a>
          <a href="#approvals">Approvals</a>
          <a href="#quests">Issues</a>
          <a href="#claims">Claims</a>
          <a href="#bonds">Bonds</a>
        </nav>

        <AgentExperiencePanel tasks={tasks} events={events} ultraworkCount={recovery.data?.ultraworks.length ?? 0} />

        <ConceptAtlas />

        <div className="grid">
          <section className="panel" id="repos">
            <PanelTitle icon={<FolderGit2 size={17} />} title="Issue Repos" />
            <IssueRepoPanel repos={recovery.data?.ultraworks ?? []} />
          </section>
          <section className="panel" id="agents">
            <PanelTitle icon={<SquarePlus size={17} />} title="Create Agent" />
            <TaskCreator ultraworks={recovery.data?.ultraworks ?? []} />
          </section>
          <section className="panel wide" id="quests">
            <PanelTitle icon={<Hammer size={17} />} title="Quest Ledger" />
            <TaskTable recovery={recovery.data} />
          </section>
          <section className="panel wide" id="approvals">
            <PanelTitle icon={<ShieldAlert size={17} />} title="Approval Gate" />
            <ApprovalGate recovery={recovery.data} />
          </section>
          <section className="panel wide" id="claims">
            <PanelTitle icon={<UserCheck size={17} />} title="Role Claims" />
            <TakeoverList recovery={recovery.data} />
          </section>
          <section className="panel wide" id="bonds">
            <PanelTitle icon={<Activity size={17} />} title="Bond Stream" />
            <EventStream events={events} />
          </section>
        </div>
      </section>
      {isCodexOpen ? <CodexModal onClose={() => setIsCodexOpen(false)} /> : null}
    </main>
  );
}

function AgentExperiencePanel({ tasks, events, ultraworkCount }: { tasks: GeekTask[]; events: TaskEvent[]; ultraworkCount: number }) {
  const latestEvent = events.at(-1);
  const completed = tasks.filter((task) => ["exited", "terminated"].includes(task.status)).length;
  return (
    <section className="agentBrief" aria-label="Agent collaboration status">
      <article className="agentPrimary">
        <div className="agentPrimaryHeader">
          <Bot size={20} />
          <div>
            <span className="eyebrow">delegation surface</span>
            <h2>From chat prompt to supervised execution</h2>
          </div>
        </div>
        <p>
          Caesar Geek treats each role as an accountable worker: define the outcome, bind it to local repositories, watch the trace,
          then claim, pause, end, or branch the quest without losing context.
        </p>
        <div className="agentMetrics">
          <span><strong>{ultraworkCount}</strong> workspaces</span>
          <span><strong>{tasks.length}</strong> quests</span>
          <span><strong>{completed}</strong> resolved</span>
        </div>
      </article>
      <article className="agentCard">
        <ClipboardCheck size={18} />
        <strong>Intent first</strong>
        <span>Write the goal and constraints before commands, so the role knows what success means.</span>
      </article>
      <article className="agentCard">
        <ShieldAlert size={18} />
        <strong>Operator gates</strong>
        <span>Pause, terminate, claim, or branch any quest from the ledger when risk or ambiguity appears.</span>
      </article>
      <article className="agentCard">
        <Route size={18} />
        <strong>Traceable work</strong>
        <span>{latestEvent ? latestEvent.message.trim() : "Live task events will stream here as soon as a role starts."}</span>
      </article>
    </section>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="panelTitle">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

const conceptAssets = [
  {
    term: "world",
    title: "World",
    copy: "The awesome boundary where state, tasks, logs, and recovery live.",
    image: "/world-map.png"
  },
  {
    term: "race",
    title: "Race",
    copy: "An ultrawork lineage cloned from a local git repository.",
    image: "/race-sigil.png"
  },
  {
    term: "role",
    title: "Role",
    copy: "A geek or agent identity launched to carry out a quest.",
    image: "/role-operator.png"
  },
  {
    term: "bond",
    title: "Bond",
    copy: "The orchestration graph between races and their shared quests.",
    image: "/bond-network.png"
  }
] as const;

function ConceptAtlas() {
  return (
    <section className="conceptAtlas" aria-label="World model">
      {conceptAssets.map((asset) => (
        <article className="conceptCard" key={asset.term}>
          <img src={asset.image} alt="" loading="lazy" />
          <div>
            <strong>{asset.title}</strong>
            <span>{asset.copy}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function IssuePanel({
  issues,
  repos,
  refreshIssues,
  refreshRepos
}: {
  issues: RegistryRecord[];
  repos: RepoCandidate[];
  refreshIssues: () => void;
  refreshRepos: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("Audit selected repos");
  const [selectedRepoPaths, setSelectedRepoPaths] = useState<string[]>([]);
  const create = useMutation({
    mutationFn: () => trpc.issues.create.mutate({ title, repoPaths: selectedRepoPaths }),
    onSuccess: async () => {
      setSelectedRepoPaths([]);
      await qc.invalidateQueries({ queryKey: ["awesomes"] });
      await qc.invalidateQueries({ queryKey: ["recovery"] });
    }
  });
  const select = useMutation({
    mutationFn: (id: string) => trpc.awesomes.select.mutate({ id }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recovery"] });
      await qc.invalidateQueries({ queryKey: ["awesomes"] });
    }
  });

  return (
    <div className="stack">
      <label>
        <span>Issue Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <div className="sideHeader">
        <span>~/workspace/repos</span>
        <button className="iconOnly" aria-label="Scan local repositories" onClick={refreshRepos}>
          <RefreshCcw size={15} />
        </button>
      </div>
      <div className="repoPickList">
        {repos.map((repo) => (
          <label className="repoPick" key={repo.path}>
            <input
              type="checkbox"
              checked={selectedRepoPaths.includes(repo.path)}
              onChange={(event) =>
                setSelectedRepoPaths((paths) => (event.target.checked ? [...paths, repo.path] : paths.filter((path) => path !== repo.path)))
              }
            />
            <span>{repo.name}</span>
            <small>{repo.defaultBranch ?? "detached"} · {repo.headSha?.slice(0, 8) ?? "no head"}</small>
          </label>
        ))}
        {repos.length === 0 ? <p className="emptyState">No git repositories found under ~/workspace/repos.</p> : null}
      </div>
      <button className="primary" disabled={selectedRepoPaths.length === 0 || create.isPending} onClick={() => create.mutate()}>
        <SquarePlus size={16} />
        Create Issue
      </button>
      <div className="sideHeader">
        <span>Known Issues</span>
        <button className="iconOnly" aria-label="Scan known issues" onClick={refreshIssues}>
          <RefreshCcw size={15} />
        </button>
      </div>
      <div className="awesomeList">
        {issues.map((issue) => (
          <button key={issue.id} className="awesomeRow" onClick={() => select.mutate(issue.id)} disabled={issue.availability !== "available"}>
            <span>{issue.name}</span>
            <small data-state={issue.availability}>{worldGateLabel(issue.availability)}</small>
          </button>
        ))}
        {issues.length === 0 ? <p className="emptyState">No issues created yet.</p> : null}
      </div>
    </div>
  );
}

function IssueRepoPanel({ repos }: { repos: Ultrawork[] }) {
  return (
    <div className="stack">
      <div className="rows">
        {repos.map((repo) => (
          <div className="row" key={repo.id}>
            <strong>{repo.name}</strong>
            <span>{repo.destinationPath}</span>
            <small>{repo.headSha?.slice(0, 10) ?? "unsealed"}</small>
          </div>
        ))}
        {repos.length === 0 ? <p className="emptyState">Create an issue from scanned repositories to populate this list.</p> : null}
      </div>
    </div>
  );
}

function TaskCreator({ ultraworks }: { ultraworks: Ultrawork[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("Audit selected scope");
  const [prompt, setPrompt] = useState("Goal: inspect the selected scope and report current status.\nConstraints: avoid destructive commands.\nReview point: stop before applying changes.");
  const create = useMutation({
    mutationFn: (scope: { ultraworkIds: string[]; cwd?: string }) =>
      trpc.tasks.create.mutate({
        title,
        prompt,
        ultraworkIds: scope.ultraworkIds,
        ...(scope.cwd ? { cwd: scope.cwd } : {}),
        launch: true
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recovery"] });
    }
  });

  return (
    <div className="stack">
      <div className="handoffCard">
        <div>
          <Gauge size={18} />
          <strong>Agent handoff</strong>
        </div>
        <p>Frame the role like a delegated job: desired result, allowed scope, and the moment it should hand control back.</p>
      </div>
      <label>
        <span>Outcome</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Goal, Constraints, Review Point</span>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} />
      </label>
      <div className="reviewStrip" aria-label="Launch review checklist">
        <span><CheckCircle2 size={15} /> Goal visible</span>
        <span><Workflow size={15} /> Issue or repo scope</span>
        <span><MessageSquareText size={15} /> Trace retained</span>
      </div>
      <button className="primary" disabled={create.isPending || ultraworks.length === 0} onClick={() => create.mutate({ ultraworkIds: ultraworks.map((repo) => repo.id) })}>
        <Play size={16} />
        Start Issue Agent
      </button>
      <div className="agentLaunchList">
        {ultraworks.map((ultrawork) => (
          <button className="repoAgentButton" key={ultrawork.id} disabled={create.isPending} onClick={() => create.mutate({ ultraworkIds: [ultrawork.id], cwd: ultrawork.destinationPath })}>
            <FolderGit2 size={16} />
            <span>Start repo agent</span>
            <strong>{ultrawork.name}</strong>
          </button>
        ))}
        {ultraworks.length === 0 ? <span className="emptyPill">No repos available</span> : null}
      </div>
      {create.data && !create.data.policy.allowed ? (
        <p className="policy">
          <ShieldAlert size={15} />
          {create.data.approval ? `Approval queued: ${create.data.policy.reason}` : create.data.policy.reason}
        </p>
      ) : null}
    </div>
  );
}

function ApprovalGate({ recovery }: { recovery: RecoveryState | undefined }) {
  const qc = useQueryClient();
  const approve = useMutation({
    mutationFn: (approvalId: string) => trpc.approvals.approve.mutate({ approvalId, decidedBy: "operator" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] })
  });
  const reject = useMutation({
    mutationFn: (approvalId: string) => trpc.approvals.reject.mutate({ approvalId, decidedBy: "operator" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] })
  });
  const taskNames = new Map((recovery?.tasks ?? []).map((task) => [task.id, task.title]));
  const approvals = recovery?.approvals ?? [];

  return (
    <div className="approvalList">
      {approvals.length === 0 ? <p className="emptyState">No persisted approval decisions for this world.</p> : null}
      {approvals.map((approval) => (
        <div className="approvalRow" key={approval.id} data-state={approval.status}>
          <div>
            <strong>{taskNames.get(approval.taskId) ?? approval.taskId}</strong>
            <span>{approval.reason}</span>
          </div>
          <code>{approval.action}</code>
          <span className="status">{approvalStatusLabel(approval.status)}</span>
          {approval.status === "pending" ? (
            <div className="actions">
              <button className="iconText" disabled={approve.isPending} onClick={() => approve.mutate(approval.id)}>
                <Play size={15} />
                Approve
              </button>
              <button className="iconText danger" disabled={reject.isPending} onClick={() => reject.mutate(approval.id)}>
                <X size={15} />
                Reject
              </button>
            </div>
          ) : (
            <time>{approval.decidedAt ? new Date(approval.decidedAt).toLocaleString() : new Date(approval.updatedAt).toLocaleString()}</time>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskTable({ recovery }: { recovery: RecoveryState | undefined }) {
  const qc = useQueryClient();
  const claim = useMutation({ mutationFn: (taskId: string) => trpc.tasks.claim.mutate({ taskId, claimedBy: "operator" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] }) });
  const followUp = useMutation({
    mutationFn: (task: GeekTask) =>
      trpc.tasks.followUp.mutate({
        taskId: task.id,
        claimedBy: "operator",
        prompt: `Continue the quest from: ${task.prompt}`,
        command: task.command,
        launch: false
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] })
  });
  const interrupt = useMutation({ mutationFn: (taskId: string) => trpc.tasks.interrupt.mutate({ taskId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] }) });
  const terminate = useMutation({ mutationFn: (taskId: string) => trpc.tasks.terminate.mutate({ taskId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] }) });
  return (
    <div className="taskTable">
      <div className="taskHead">
        <span>Quest</span>
        <span>Charge</span>
        <span>Decree</span>
        <span>State</span>
        <span>Races</span>
        <span>Actions</span>
      </div>
      {(recovery?.tasks ?? []).map((task) => {
        const linked = recovery?.taskUltraworks.filter((link) => link.taskId === task.id).length ?? 0;
        return (
          <div className="taskRow" key={task.id}>
            <div data-label="Quest">
              <strong>{task.title}</strong>
              <small>{task.cwd}</small>
            </div>
            <code data-label="Charge">{task.prompt}</code>
            <code data-label="Decree">{task.command.join(" ")}</code>
            <span className="status" data-label="State">{questStateLabel(task.status)}</span>
            <span data-label="Races">{linked}</span>
            <div className="actions" data-label="Actions">
              <button className="iconOnly" aria-label="Claim quest" onClick={() => claim.mutate(task.id)}>
                <UserCheck size={15} />
              </button>
              <button className="iconOnly" aria-label="Halt quest" onClick={() => interrupt.mutate(task.id)}>
                <Pause size={15} />
              </button>
              <button className="iconOnly" aria-label="End quest" onClick={() => terminate.mutate(task.id)}>
                <Octagon size={15} />
              </button>
              <button className="iconOnly" aria-label="Draft follow-up quest" onClick={() => followUp.mutate(task)}>
                <GitBranchPlus size={15} />
              </button>
            </div>
          </div>
        );
      })}
      {(recovery?.tasks ?? []).length === 0 ? <p className="emptyState">No quests have been launched in this world.</p> : null}
    </div>
  );
}

function EventStream({ events }: { events: TaskEvent[] }) {
  return (
    <div className="events">
      {events.map((event) => (
        <div className="event" key={event.id}>
          <span>{dispatchTypeLabel(event.type)}</span>
          <code>{event.message.trim()}</code>
        </div>
      ))}
      {events.length === 0 ? <p className="emptyState">Bond activity will appear here as roles run.</p> : null}
    </div>
  );
}

function TakeoverList({ recovery }: { recovery: RecoveryState | undefined }) {
  const taskNames = new Map((recovery?.tasks ?? []).map((task) => [task.id, task.title]));
  return (
    <div className="takeovers">
      {(recovery?.takeoverEvents ?? []).map((event) => (
        <div className="takeover" key={event.id}>
          <strong data-label="Action">{claimActionLabel(event.action)}</strong>
          <span data-label="Claimed by">{event.claimedBy}</span>
          <span data-label="Quest">{taskNames.get(event.taskId) ?? event.taskId}</span>
          <time data-label="When">{new Date(event.createdAt).toLocaleString()}</time>
          <code data-label="Note">{event.note ?? ""}</code>
        </div>
      ))}
      {(recovery?.takeoverEvents ?? []).length === 0 ? <p className="emptyState">No operator claims recorded yet.</p> : null}
    </div>
  );
}

type GlossaryTerm = {
  term: string;
  translation: string;
  concept: string;
  meaning: string;
  reason: string;
  asset?: string;
};

const glossaryTerms: GlossaryTerm[] = [
  {
    term: "world",
    translation: "世界 / 冒险世界",
    concept: "awesome",
    meaning: "顶层本地工作空间，也是所有任务、日志和运行状态的边界。",
    reason: "awesome 是整张世界地图，所有种族、角色任务、日志和恢复状态都发生在这个边界内。",
    asset: "/world-map.png"
  },
  {
    term: "race",
    translation: "种族",
    concept: "ultrawork",
    meaning: "从本地 git 仓库派生出的工作单元，落在 world 的 ultraworks 目录。",
    reason: "ultrawork 是世界里的种族。每个种族保留自己的 repo 血统、代码边界和当前进度。",
    asset: "/race-sigil.png"
  },
  {
    term: "role",
    translation: "角色",
    concept: "geek / agent role",
    meaning: "由某个种族启动的 agent 执行身份，可以偏侦察、构建、修复、审查或批量推进。",
    reason: "同一个种族可以启动不同角色；角色描述执行风格，底层仍由 geek task/runtime 承载。",
    asset: "/role-operator.png"
  },
  {
    term: "bond",
    translation: "羁绊 / 编排",
    concept: "orchestration",
    meaning: "多个种族之间的协作关系，以及任务如何跨 ultrawork 组合、追踪和恢复。",
    reason: "羁绊表达种族之间的编排关系，比旧的队伍/封地比喻更贴近多 agent 协作。",
    asset: "/bond-network.png"
  },
  {
    term: "quest",
    translation: "任务 / 远征",
    concept: "geek task",
    meaning: "一次角色执行任务，先持久化，再由 runtime 启动或恢复状态。",
    reason: "角色接到目标后出发，过程可能进行中、暂停、失败，也可能完成后写入战报。"
  },
  {
    term: "scroll",
    translation: "魔法卷轴 / 任务卷轴",
    concept: "task draft",
    meaning: "承载标题、指令正文、命令 JSON 和关联 race bond 的任务指令。",
    reason: "命令像被写进卷轴的咒语，派发后会召唤一次可记录、可恢复的 quest。"
  },
  {
    term: "battle log",
    translation: "战报 / 冒险日志",
    concept: "task event",
    meaning: "任务事件流，来自 SSE 和 SQLite 中保存的历史记录。",
    reason: "runtime 把角色执行时的输出、错误、状态变化传回界面，像战斗日志。"
  },
  {
    term: "guild master",
    translation: "公会会长 / 操作者",
    concept: "takeover",
    meaning: "操作者对任务的认领、暂停、终止或追加后续任务。",
    reason: "操作者像公会会长，可以接管角色任务，决定继续、暂停或终止。"
  },
  {
    term: "princess",
    translation: "公主 / 核心目标",
    concept: "user goal",
    meaning: "用户真正想救出来的结果，比如完成修复、跑通任务或恢复状态。",
    reason: "它提醒界面和 agent 不要沉迷支线，要围绕最终目标推进。"
  }
];

const usageNotes = [
  "先创建或选择 world，它就是这局冒险的地图边界，浏览器的本地操作都会经 gateway 执行。",
  "把本地 git repo 加入 world 时，可以把它理解为加入一个 race；当前策略是 clone，而不是复制普通目录。",
  "每个 race 可以启动不同 role；选择多个 race 时形成 bond，也就是一次任务的编排范围。",
  "派发 scroll 会创建 quest；命令必须写成 JSON 数组，例如 [\"node\", \"-e\", \"console.log(process.cwd())\"]。"
] as const;

function CodexModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="codexOverlay" role="presentation" onMouseDown={onClose}>
      <section className="codexModal" role="dialog" aria-modal="true" aria-labelledby="codex-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="codexHeader">
          <div>
            <span className="eyebrow">adventurer codex</span>
            <h2 id="codex-title">Caesar Geek Bestiary</h2>
          </div>
          <button className="iconOnly" type="button" aria-label="Close codex" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="codexBody">
          <figure className="codexPortrait">
            <img src="/caesar-geek-icon.png" alt="Caesar Geek avatar" />
            <figcaption>
              <strong>Caesar Geek</strong>
              <span>local-first adventure console for AI work across repositories</span>
            </figcaption>
          </figure>

          <div className="codexPages">
            <section className="codexSection">
              <div className="panelTitle">
                <BookOpen size={17} />
                <h3>Terms</h3>
              </div>
              <div className="codexTerms">
                {glossaryTerms.map((entry) => (
                  <div className="codexTerm" key={entry.term}>
                    {entry.asset ? <img className="codexTermAsset" src={entry.asset} alt="" loading="lazy" /> : null}
                    <div className="codexTermHead">
                      <strong>{entry.term}</strong>
                      <span>{entry.translation}</span>
                    </div>
                    <span>{entry.concept}</span>
                    <p>{entry.meaning}</p>
                    <p className="codexReason">{entry.reason}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="codexSection">
              <div className="panelTitle">
                <ShieldAlert size={17} />
                <h3>How It Works</h3>
              </div>
              <ol className="codexNotes">
                {usageNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function worldGateLabel(state: string): string {
  const labels: Record<string, string> = {
    available: "open world",
    missing: "lost world",
    corrupt: "broken world"
  };
  return labels[state] ?? state;
}

function questStateLabel(state: string): string {
  const labels: Record<string, string> = {
    created: "drafted",
    queued: "in queue",
    running: "on quest",
    claimed: "claimed",
    interrupted: "halted",
    terminated: "ended",
    rejected: "rejected",
    exited: "sealed",
    failed: "failed",
    unknown: "fogged",
    orphaned: "stray"
  };
  return labels[state] ?? state;
}

function approvalStatusLabel(state: string): string {
  const labels: Record<string, string> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    expired: "expired",
    bypassed: "bypassed"
  };
  return labels[state] ?? state;
}

function dispatchTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    status: "bond",
    log: "trace",
    error: "alarm",
    policy: "guard",
    takeover: "claim"
  };
  return labels[type] ?? type;
}

function claimActionLabel(action: string): string {
  const labels: Record<string, string> = {
    claim: "claimed",
    interrupt: "halted",
    terminate: "ended",
    follow_up: "new quest"
  };
  return labels[action] ?? action;
}

createRoot(document.getElementById("root")!).render(<App />);
