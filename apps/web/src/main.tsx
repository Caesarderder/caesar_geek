import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { Activity, FolderGit2, GitBranchPlus, Hammer, Octagon, Pause, Play, RefreshCcw, ShieldAlert, SquarePlus, UserCheck } from "lucide-react";
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
          <Activity size={20} />
          <div>
            <strong>Caesar Geek</strong>
            <span>local gateway</span>
          </div>
        </div>
        <AwesomePanel awesomes={awesomes.data ?? []} refresh={() => void awesomes.refetch()} />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">awesome</span>
            <h1>{recovery.data?.awesome.name ?? "No awesome selected"}</h1>
          </div>
          <button className="iconText" onClick={() => void recovery.refetch()}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </header>

        <div className="grid">
          <section className="panel">
            <PanelTitle icon={<FolderGit2 size={17} />} title="Ultraworks" />
            <UltraworkPanel ultraworks={recovery.data?.ultraworks ?? []} />
          </section>
          <section className="panel">
            <PanelTitle icon={<SquarePlus size={17} />} title="Create Geek Task" />
            <TaskCreator ultraworks={recovery.data?.ultraworks ?? []} />
          </section>
          <section className="panel wide">
            <PanelTitle icon={<Hammer size={17} />} title="Geek Tasks" />
            <TaskTable recovery={recovery.data} />
          </section>
          <section className="panel wide">
            <PanelTitle icon={<UserCheck size={17} />} title="Takeovers" />
            <TakeoverList recovery={recovery.data} />
          </section>
          <section className="panel wide">
            <PanelTitle icon={<Activity size={17} />} title="Events" />
            <EventStream events={events} />
          </section>
        </div>
      </section>
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

function AwesomePanel({ awesomes, refresh }: { awesomes: RegistryRecord[]; refresh: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("Local Awesome");
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
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        <span>Path</span>
        <input value={rootPath} onChange={(event) => setRootPath(event.target.value)} placeholder="/Users/me/awesome" />
      </label>
      <button className="primary" disabled={!rootPath || create.isPending} onClick={() => create.mutate()}>
        <SquarePlus size={16} />
        Create
      </button>
      <div className="sideHeader">
        <span>Known</span>
        <button className="iconOnly" aria-label="Refresh awesomes" onClick={refresh}>
          <RefreshCcw size={15} />
        </button>
      </div>
      <div className="awesomeList">
        {awesomes.map((awesome) => (
          <button key={awesome.id} className="awesomeRow" onClick={() => select.mutate(awesome.id)} disabled={awesome.availability !== "available"}>
            <span>{awesome.name}</span>
            <small data-state={awesome.availability}>{awesome.availability}</small>
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
          Add
        </button>
      </div>
      <div className="rows">
        {ultraworks.map((ultrawork) => (
          <div className="row" key={ultrawork.id}>
            <strong>{ultrawork.name}</strong>
            <span>{ultrawork.destinationPath}</span>
            <small>{ultrawork.headSha?.slice(0, 10) ?? "no head"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCreator({ ultraworks }: { ultraworks: Ultrawork[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("Stub Codex task");
  const [prompt, setPrompt] = useState("Run a local command");
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
        <span>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Prompt</span>
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
        Launch
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
        prompt: `Continue from: ${task.prompt}`,
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
        <span>Task</span>
        <span>Prompt</span>
        <span>Command</span>
        <span>Status</span>
        <span>Ultraworks</span>
        <span>Controls</span>
      </div>
      {(recovery?.tasks ?? []).map((task) => {
        const linked = recovery?.taskUltraworks.filter((link) => link.taskId === task.id).length ?? 0;
        return (
          <div className="taskRow" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <small>{task.cwd}</small>
            </div>
            <code>{task.prompt}</code>
            <code>{task.command.join(" ")}</code>
            <span className="status">{task.status}</span>
            <span>{linked}</span>
            <div className="actions">
              <button className="iconOnly" aria-label="Claim task" onClick={() => claim.mutate(task.id)}>
                <UserCheck size={15} />
              </button>
              <button className="iconOnly" aria-label="Interrupt task" onClick={() => interrupt.mutate(task.id)}>
                <Pause size={15} />
              </button>
              <button className="iconOnly" aria-label="Terminate task" onClick={() => terminate.mutate(task.id)}>
                <Octagon size={15} />
              </button>
              <button className="iconOnly" aria-label="Create follow-up task" onClick={() => followUp.mutate(task)}>
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
          <span>{event.type}</span>
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
          <strong>{event.action}</strong>
          <span>{event.claimedBy}</span>
          <span>{taskNames.get(event.taskId) ?? event.taskId}</span>
          <time>{new Date(event.createdAt).toLocaleString()}</time>
          <code>{event.note ?? ""}</code>
        </div>
      ))}
    </div>
  );
}

function processStubCommand(): string[] {
  return ["node", "-e", "console.log(process.cwd())"];
}

createRoot(document.getElementById("root")!).render(<App />);
