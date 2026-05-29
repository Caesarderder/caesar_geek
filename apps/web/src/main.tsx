import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import {
  Activity,
  Bot,
  Check,
  CircleAlert,
  Clock3,
  FolderGit2,
  GitBranchPlus,
  MessageSquarePlus,
  Octagon,
  PanelLeft,
  Pause,
  RefreshCcw,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
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
    select: { mutate(input: { id: string }): Promise<unknown> };
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
    approve: { mutate(input: { approvalId: string; decidedBy?: string }): Promise<ApprovalRecord> };
    reject: { mutate(input: { approvalId: string; decidedBy?: string }): Promise<ApprovalRecord> };
  };
  deployments: {
    start: { mutate(): Promise<{ task: GeekTask; policy: { allowed: boolean; reason: string }; approval: ApprovalRecord | null }> };
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
  const pendingApprovals = recovery.data?.approvals.filter((approval) => approval.status === "pending").length ?? 0;
  const runningTasks = tasks.filter((task) => ["queued", "running"].includes(task.status)).length;
  const completedTasks = tasks.filter((task) => ["exited", "terminated"].includes(task.status)).length;
  const activeIssue = recovery.data?.awesome.name ?? "选择或创建一个工作区";

  return (
    <main className="appShell">
      <aside className="sideRail" aria-label="Workspaces and repositories">
        <Brand />
        <IssuePanel
          issues={awesomes.data ?? []}
          repos={repoScan.data ?? []}
          refreshIssues={() => void awesomes.refetch()}
          refreshRepos={() => void repoScan.refetch()}
        />
      </aside>

      <section className="chatPane" aria-label="Agent workspace">
        <header className="chatHeader">
          <div className="chatTitle">
            <span className="sectionKicker">
              <Sparkles size={14} />
              Agent workspace
            </span>
            <h1>{activeIssue}</h1>
          </div>
          <div className="headerActions">
            <Metric label="运行中" value={runningTasks} tone="blue" />
            <Metric label="待审批" value={pendingApprovals} tone={pendingApprovals > 0 ? "amber" : "green"} />
            <button className="ghostButton" type="button" onClick={() => void recovery.refetch()}>
              <RefreshCcw size={16} />
              刷新
            </button>
          </div>
        </header>

        <section className="heroPrompt" aria-label="Start an agent task">
          <div>
            <span className="sectionKicker">
              <Bot size={14} />
              和本地 AI 代理协作
            </span>
            <h2>描述目标，选择范围，剩下的交给可监督的任务流。</h2>
            <p>界面只保留三件事：你要什么、代理正在做什么、哪里需要你确认。</p>
          </div>
          <AgentComposer ultraworks={recovery.data?.ultraworks ?? []} />
        </section>

        <TaskFeed recovery={recovery.data} />
      </section>

      <aside className="contextRail" aria-label="Execution context">
        <StatusPanel runningTasks={runningTasks} completedTasks={completedTasks} events={events.length} repoCount={recovery.data?.ultraworks.length ?? 0} />
        <DeployPanel hasActiveWorkspace={Boolean(recovery.data)} />
        <ApprovalGate recovery={recovery.data} />
        <RepoScope repos={recovery.data?.ultraworks ?? []} />
        <EventStream events={events} />
      </aside>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand">
      <img src="/caesar-geek-icon.png" alt="" />
      <div>
        <strong>Caesar Geek</strong>
        <span>Local AI workbench</span>
      </div>
      <button className="iconButton" type="button" aria-label="Toggle sidebar">
        <PanelLeft size={17} />
      </button>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "amber" }) {
  return (
    <span className="metric" data-tone={tone}>
      <strong>{value}</strong>
      {label}
    </span>
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
  const [repoFilter, setRepoFilter] = useState("");
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
  const visibleRepos = repos.filter((repo) => repo.name.toLowerCase().includes(repoFilter.toLowerCase()) || repo.path.toLowerCase().includes(repoFilter.toLowerCase()));

  return (
    <div className="sideStack">
      <section className="sideSection">
        <div className="sectionHead">
          <span>工作区</span>
          <button className="iconButton" type="button" aria-label="Refresh workspaces" onClick={refreshIssues}>
            <RefreshCcw size={15} />
          </button>
        </div>
        <div className="workspaceList">
          {issues.map((issue) => (
            <button key={issue.id} className="workspaceItem" type="button" onClick={() => select.mutate(issue.id)} disabled={issue.availability !== "available"}>
              <span>{issue.name}</span>
              <small data-state={issue.availability}>{issueStateLabel(issue.availability)}</small>
            </button>
          ))}
          {issues.length === 0 ? <p className="emptyState">还没有工作区。先从本地仓库创建一个。</p> : null}
        </div>
      </section>

      <section className="sideSection">
        <div className="sectionHead">
          <span>新建工作区</span>
          <button className="iconButton" type="button" aria-label="Scan repositories" onClick={refreshRepos}>
            <RefreshCcw size={15} />
          </button>
        </div>
        <label className="field">
          <span>标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="searchField">
          <Search size={15} />
          <input value={repoFilter} placeholder="筛选仓库" onChange={(event) => setRepoFilter(event.target.value)} />
        </label>
        <div className="repoPickList">
          {visibleRepos.map((repo) => (
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
          {visibleRepos.length === 0 ? <p className="emptyState">没有匹配的 git 仓库。</p> : null}
        </div>
        <button className="primaryButton" type="button" disabled={selectedRepoPaths.length === 0 || create.isPending} onClick={() => create.mutate()}>
          <MessageSquarePlus size={16} />
          创建并进入
        </button>
      </section>
    </div>
  );
}

function AgentComposer({ ultraworks }: { ultraworks: Ultrawork[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("Audit selected scope");
  const [prompt, setPrompt] = useState("Goal: inspect the selected scope and report current status.\nConstraints: avoid destructive commands.\nReview point: stop before applying changes.");
  const [scope, setScope] = useState("all");
  const create = useMutation({
    mutationFn: () => {
      const selectedRepo = ultraworks.find((repo) => repo.id === scope);
      const ultraworkIds = selectedRepo ? [selectedRepo.id] : ultraworks.map((repo) => repo.id);
      return trpc.tasks.create.mutate({
        title,
        prompt,
        ultraworkIds,
        ...(selectedRepo ? { cwd: selectedRepo.destinationPath } : {}),
        launch: true
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recovery"] });
    }
  });

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate();
      }}
    >
      <label className="field compact">
        <span>任务名称</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field">
        <span>给代理的上下文</span>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
      </label>
      <div className="composerFooter">
        <label className="selectField">
          <FolderGit2 size={15} />
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">全部仓库</option>
            {ultraworks.map((repo) => (
              <option value={repo.id} key={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
        </label>
        <button className="primaryButton" type="submit" disabled={create.isPending || ultraworks.length === 0}>
          <Send size={16} />
          启动代理
        </button>
      </div>
      {create.data && !create.data.policy.allowed ? (
        <p className="policyNote">
          <CircleAlert size={15} />
          {create.data.approval ? `已进入审批队列：${create.data.policy.reason}` : create.data.policy.reason}
        </p>
      ) : null}
    </form>
  );
}

function TaskFeed({ recovery }: { recovery: RecoveryState | undefined }) {
  const qc = useQueryClient();
  const claim = useMutation({ mutationFn: (taskId: string) => trpc.tasks.claim.mutate({ taskId, claimedBy: "operator" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] }) });
  const followUp = useMutation({
    mutationFn: (task: GeekTask) =>
      trpc.tasks.followUp.mutate({
        taskId: task.id,
        claimedBy: "operator",
        prompt: `Continue from: ${task.prompt}`,
        command: task.command,
        launch: false
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] })
  });
  const interrupt = useMutation({ mutationFn: (taskId: string) => trpc.tasks.interrupt.mutate({ taskId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] }) });
  const terminate = useMutation({ mutationFn: (taskId: string) => trpc.tasks.terminate.mutate({ taskId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] }) });
  const tasks = recovery?.tasks ?? [];

  return (
    <section className="taskFeed" aria-label="Agent tasks">
      <div className="feedHead">
        <div>
          <span className="sectionKicker">
            <Activity size={14} />
            Conversation timeline
          </span>
          <h2>代理任务</h2>
        </div>
        <span>{tasks.length} 个任务</span>
      </div>
      <div className="taskList">
        {tasks.map((task) => {
          const linked = recovery?.taskUltraworks.filter((link) => link.taskId === task.id).length ?? 0;
          return (
            <article className="taskCard" key={task.id} data-status={task.status}>
              <div className="taskIcon">
                <Bot size={18} />
              </div>
              <div className="taskBody">
                <div className="taskCardHead">
                  <h3>{task.title}</h3>
                  <span className="statusPill">{taskStateLabel(task.status)}</span>
                </div>
                <p>{task.prompt}</p>
                <div className="taskMeta">
                  <span>
                    <FolderGit2 size={14} />
                    {linked} scope
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {task.command.join(" ")}
                  </span>
                </div>
                {task.cwd ? <code className="pathLine">{task.cwd}</code> : null}
                <div className="taskActions">
                  <button className="iconTextButton" type="button" onClick={() => claim.mutate(task.id)}>
                    <UserCheck size={15} />
                    接管
                  </button>
                  <button className="iconTextButton" type="button" onClick={() => interrupt.mutate(task.id)}>
                    <Pause size={15} />
                    暂停
                  </button>
                  <button className="iconTextButton danger" type="button" onClick={() => terminate.mutate(task.id)}>
                    <Octagon size={15} />
                    终止
                  </button>
                  <button className="iconTextButton" type="button" onClick={() => followUp.mutate(task)}>
                    <GitBranchPlus size={15} />
                    追问
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {tasks.length === 0 ? <p className="emptyState">还没有任务。写下目标并启动第一个代理。</p> : null}
      </div>
    </section>
  );
}

function StatusPanel({ runningTasks, completedTasks, events, repoCount }: { runningTasks: number; completedTasks: number; events: number; repoCount: number }) {
  return (
    <section className="railPanel">
      <div className="sectionHead">
        <span>运行概览</span>
        <ShieldCheck size={16} />
      </div>
      <div className="statusGrid">
        <Metric label="运行" value={runningTasks} tone="blue" />
        <Metric label="完成" value={completedTasks} tone="green" />
        <Metric label="事件" value={events} tone="amber" />
        <Metric label="仓库" value={repoCount} tone="blue" />
      </div>
    </section>
  );
}

function DeployPanel({ hasActiveWorkspace }: { hasActiveWorkspace: boolean }) {
  const qc = useQueryClient();
  const deploy = useMutation({
    mutationFn: () => trpc.deployments.start.mutate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recovery"] })
  });
  return (
    <section className="railPanel deployPanel">
      <div className="sectionHead">
        <span>更新/部署</span>
        <Rocket size={16} />
      </div>
      <p>同步当前分支到最新提交，安装依赖并构建；服务器可通过 CAESAR_DEPLOY_COMMAND 接入重启或云端发布。</p>
      <button className="primaryButton deployButton" type="button" disabled={!hasActiveWorkspace || deploy.isPending} onClick={() => deploy.mutate()}>
        <RefreshCcw size={16} />
        {deploy.isPending ? "正在创建任务" : "自动更新部署"}
      </button>
      {!hasActiveWorkspace ? <small>先选择或创建一个工作区，用于记录部署日志。</small> : null}
      {deploy.data ? <small>已创建任务：{taskStateLabel(deploy.data.task.status)}</small> : null}
      {deploy.error ? <small className="dangerText">{deploy.error.message}</small> : null}
    </section>
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
    <section className="railPanel">
      <div className="sectionHead">
        <span>审批</span>
        <CircleAlert size={16} />
      </div>
      <div className="approvalList">
        {approvals.map((approval) => (
          <article className="approvalItem" key={approval.id} data-state={approval.status}>
            <div>
              <strong>{taskNames.get(approval.taskId) ?? approval.taskId}</strong>
              <span>{approval.reason}</span>
            </div>
            <code>{approval.action}</code>
            {approval.status === "pending" ? (
              <div className="approvalActions">
                <button className="iconButton approve" type="button" aria-label="Approve" disabled={approve.isPending} onClick={() => approve.mutate(approval.id)}>
                  <Check size={15} />
                </button>
                <button className="iconButton reject" type="button" aria-label="Reject" disabled={reject.isPending} onClick={() => reject.mutate(approval.id)}>
                  <X size={15} />
                </button>
              </div>
            ) : (
              <span className="statusPill">{approvalStatusLabel(approval.status)}</span>
            )}
          </article>
        ))}
        {approvals.length === 0 ? <p className="emptyState">当前没有等待处理的审批。</p> : null}
      </div>
    </section>
  );
}

function RepoScope({ repos }: { repos: Ultrawork[] }) {
  return (
    <section className="railPanel">
      <div className="sectionHead">
        <span>当前范围</span>
        <FolderGit2 size={16} />
      </div>
      <div className="scopeList">
        {repos.map((repo) => (
          <article className="scopeItem" key={repo.id}>
            <strong>{repo.name}</strong>
            <span>{repo.destinationPath}</span>
            <small>{repo.headSha?.slice(0, 10) ?? "no head"}</small>
          </article>
        ))}
        {repos.length === 0 ? <p className="emptyState">创建工作区后会显示仓库范围。</p> : null}
      </div>
    </section>
  );
}

function EventStream({ events }: { events: TaskEvent[] }) {
  return (
    <section className="railPanel">
      <div className="sectionHead">
        <span>事件流</span>
        <Activity size={16} />
      </div>
      <div className="eventList">
        {events.map((event) => (
          <article className="eventItem" key={event.id}>
            <span>{eventTypeLabel(event.type)}</span>
            <code>{event.message.trim()}</code>
          </article>
        ))}
        {events.length === 0 ? <p className="emptyState">代理启动后会在这里显示实时事件。</p> : null}
      </div>
    </section>
  );
}

function issueStateLabel(state: string): string {
  const labels: Record<string, string> = {
    available: "可用",
    missing: "缺失",
    corrupt: "损坏"
  };
  return labels[state] ?? state;
}

function taskStateLabel(state: string): string {
  const labels: Record<string, string> = {
    created: "已创建",
    queued: "排队中",
    running: "运行中",
    claimed: "已接管",
    interrupted: "已暂停",
    terminated: "已终止",
    rejected: "已拒绝",
    exited: "已完成",
    failed: "失败",
    unknown: "未知",
    orphaned: "孤立"
  };
  return labels[state] ?? state;
}

function approvalStatusLabel(state: string): string {
  const labels: Record<string, string> = {
    pending: "待审批",
    approved: "已通过",
    rejected: "已拒绝",
    expired: "已过期",
    bypassed: "已跳过"
  };
  return labels[state] ?? state;
}

function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    status: "状态",
    log: "日志",
    error: "错误",
    policy: "策略",
    takeover: "接管"
  };
  return labels[type] ?? type;
}

createRoot(document.getElementById("root")!).render(<App />);
