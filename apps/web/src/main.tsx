import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import {
  Activity,
  BookOpen,
  FolderGit2,
  GitBranchPlus,
  Hammer,
  Octagon,
  Pause,
  Play,
  RefreshCcw,
  ShieldAlert,
  SquarePlus,
  UserCheck,
  X
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { GeekTask, RegistryRecord, TaskEvent, Ultrawork } from "@caesar-geek/shared";
import "./styles.css";

type TrpcClient = {
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
    create: { mutate(input: { title: string; prompt: string; command: string[]; ultraworkIds: string[]; launch: boolean }): Promise<{ task: GeekTask | null; policy: { allowed: boolean; reason: string } }> };
    followUp: { mutate(input: { taskId: string; claimedBy: string; prompt: string; command: string[]; launch: boolean }): Promise<GeekTask> };
    claim: { mutate(input: { taskId: string; claimedBy: string; note?: string }): Promise<unknown> };
    interrupt: { mutate(input: { taskId: string }): Promise<{ interrupted: boolean }> };
    terminate: { mutate(input: { taskId: string }): Promise<{ terminated: boolean }> };
  };
};

type RecoveryState = {
  awesome: { id: string; name: string; path: string };
  ultraworks: Ultrawork[];
  tasks: GeekTask[];
  taskUltraworks: Array<{ taskId: string; ultraworkId: string }>;
  takeoverEvents: Array<{ id: string; taskId: string; claimedBy: string; action: string; note: string | null; createdAt: string }>;
  latestEvents: TaskEvent[];
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

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <button className="brandAvatar" type="button" aria-label="Open Caesar Geek codex" onClick={() => setIsCodexOpen(true)}>
            <img className="brandIcon" src="/caesar-geek-icon.png" alt="" />
          </button>
          <div>
            <strong>Caesar Geek</strong>
            <span>local-first fantasy work worlds</span>
          </div>
          <img className="brandCrest" src="/race-sigil.png" alt="" />
        </div>
        <AwesomePanel awesomes={awesomes.data ?? []} refresh={() => void awesomes.refetch()} />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">active world</span>
            <h1>{recovery.data?.awesome.name ?? "No world selected"}</h1>
          </div>
          <div className="topMeta" aria-label="Workspace status">
            <span>{recovery.data?.ultraworks.length ?? 0} races</span>
            <span>{recovery.data?.tasks.length ?? 0} quests</span>
            <span>{events.length} bonds</span>
          </div>
          <button className="iconText scanButton" onClick={() => void recovery.refetch()} aria-label="Scan active world">
            <RefreshCcw size={16} />
            Scan
          </button>
        </header>

        <nav className="quickNav" aria-label="Console sections">
          <a href="#races">Races</a>
          <a href="#scroll">Scroll</a>
          <a href="#quests">Quests</a>
          <a href="#claims">Claims</a>
          <a href="#bonds">Bonds</a>
        </nav>

        <ConceptAtlas />

        <div className="grid">
          <section className="panel" id="races">
            <PanelTitle icon={<FolderGit2 size={17} />} title="Race Registry" />
            <UltraworkPanel ultraworks={recovery.data?.ultraworks ?? []} />
          </section>
          <section className="panel" id="scroll">
            <PanelTitle icon={<SquarePlus size={17} />} title="Draft Role Quest" />
            <TaskCreator ultraworks={recovery.data?.ultraworks ?? []} />
          </section>
          <section className="panel wide" id="quests">
            <PanelTitle icon={<Hammer size={17} />} title="Quest Ledger" />
            <TaskTable recovery={recovery.data} />
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

function AwesomePanel({ awesomes, refresh }: { awesomes: RegistryRecord[]; refresh: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("Local World");
  const [rootPath, setRootPath] = useState("");
  const create = useMutation({
    mutationFn: () => trpc.awesomes.create.mutate({ name, path: rootPath }),
    onSuccess: async () => {
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
        <span>World Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        <span>World Path</span>
        <input value={rootPath} onChange={(event) => setRootPath(event.target.value)} placeholder="/Users/me/world" />
      </label>
      <button className="primary" disabled={!rootPath || create.isPending} onClick={() => create.mutate()}>
        <SquarePlus size={16} />
        Found World
      </button>
      <div className="sideHeader">
        <span>Known Worlds</span>
        <button className="iconOnly" aria-label="Scan known worlds" onClick={refresh}>
          <RefreshCcw size={15} />
        </button>
      </div>
      <div className="awesomeList">
        {awesomes.map((awesome) => (
          <button key={awesome.id} className="awesomeRow" onClick={() => select.mutate(awesome.id)} disabled={awesome.availability !== "available"}>
            <span>{awesome.name}</span>
            <small data-state={awesome.availability}>{worldGateLabel(awesome.availability)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function UltraworkPanel({ ultraworks }: { ultraworks: Ultrawork[] }) {
  const qc = useQueryClient();
  const [sourcePath, setSourcePath] = useState("");
  const add = useMutation({
    mutationFn: () => trpc.ultraworks.add.mutate({ sourcePath }),
    onSuccess: async () => {
      setSourcePath("");
      await qc.invalidateQueries({ queryKey: ["recovery"] });
    }
  });
  return (
    <div className="stack">
      <div className="inlineForm">
        <input value={sourcePath} onChange={(event) => setSourcePath(event.target.value)} placeholder="/path/to/local/git/repo" />
        <button className="iconText" disabled={!sourcePath || add.isPending} onClick={() => add.mutate()}>
          <FolderGit2 size={16} />
          Add Race
        </button>
      </div>
      <div className="rows">
        {ultraworks.map((ultrawork) => (
          <div className="row" key={ultrawork.id}>
            <strong>{ultrawork.name}</strong>
            <span>{ultrawork.destinationPath}</span>
            <small>{ultrawork.headSha?.slice(0, 10) ?? "unsealed"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCreator({ ultraworks }: { ultraworks: Ultrawork[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("Scan the World");
  const [prompt, setPrompt] = useState("Run a world command");
  const [command, setCommand] = useState(`${JSON.stringify(processStubCommand())}`);
  const [selected, setSelected] = useState<string[]>([]);
  const create = useMutation({
    mutationFn: () =>
      trpc.tasks.create.mutate({
        title,
        prompt,
        command: JSON.parse(command) as string[],
        ultraworkIds: selected,
        launch: true
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recovery"] });
    }
  });
  return (
    <div className="stack">
      <label>
        <span>Quest Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Role Brief</span>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} />
      </label>
      <label>
        <span>Command JSON</span>
        <input value={command} onChange={(event) => setCommand(event.target.value)} />
      </label>
      <div className="checks">
        {ultraworks.map((ultrawork) => (
          <label key={ultrawork.id}>
            <input
              type="checkbox"
              checked={selected.includes(ultrawork.id)}
              onChange={(event) =>
                setSelected((ids) => (event.target.checked ? [...ids, ultrawork.id] : ids.filter((id) => id !== ultrawork.id)))
              }
            />
            <span>{ultrawork.name}</span>
          </label>
        ))}
      </div>
      <button className="primary" disabled={create.isPending} onClick={() => create.mutate()}>
        <Play size={16} />
        Launch Role
      </button>
      {create.data && !create.data.policy.allowed ? (
        <p className="policy">
          <ShieldAlert size={15} />
          {create.data.policy.reason}
        </p>
      ) : null}
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

function processStubCommand(): string[] {
  return ["node", "-e", "console.log(process.cwd())"];
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
    exited: "sealed",
    failed: "failed",
    unknown: "fogged",
    orphaned: "stray"
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
