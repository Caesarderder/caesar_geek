---
km_id: map.glossary
km_type: map
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - ../.omx/specs/deep-interview-cloud-agent-codex-session-mvp.md
  - docs/references/architecture/cloud-agent-codex-session-concepts.md
  - apps/web/src/main.tsx
  - packages/shared/src/index.ts
validated_by:
  - manual-code-read
tags:
  - domain:cross-domain
related:
  - map.domains
  - map.invariants
  - reference.cloud-agent-codex-session-concepts
---

# 术语表

本项目刻意使用 `awesome`、`ultrawork`、`geek` 和魔法世界 UI 词作为领域语言。不要把它们当作临时暗语清理；需要让新人或智能体理解时，在本表维护解释。

## 保留领域词

| 术语 | 含义 |
| --- | --- |
| `awesome` | 顶层本地工作空间和执行上下文；世界观中对应 `world`，拥有任务元数据、runtime 状态和 ultrawork 引用 |
| `ultrawork` | awesome 世界内从本地 git repo 派生的种族，当前实现以 git clone 为第一策略 |
| `geek` | agent task/process；世界观中对应由种族启动的角色，第一版本映射为从 awesome 目录启动的 Codex CLI 或 stub 命令 |
| gateway | `apps/server` 中的 Fastify/tRPC 本地服务，隔离浏览器与本地文件系统/进程 |
| registry | gateway 级 known-awesome 索引，默认路径来自 `CAESAR_GEEK_HOME` 或用户 home 下 `.caesar-geek` |
| takeover | operator 对运行中任务的接管事件，当前实现包含 claim、interrupt、terminate、follow_up |
| recovery | 通过持久化记录恢复 awesome、ultrawork、task、事件和 last-known runtime 状态 |

## Cloud Agent Codex Session 词

| 术语 | 含义 |
| --- | --- |
| World | Cloud Agent MVP 中的本地执行世界；在 `caesar_geek` 中由 outbound World runtime 代表，不等同于旧本地 UI 的 `awesome` 持久实体 |
| World runtime | `packages/cloud-agent` 中连接 Gateway、处理 Cloud Protocol request、回传 result/output 的本地 daemon |
| Issue | Cloud Agent MVP 的工作容器，拥有 rootPath、worktreeIds 和 session scope；不等同于本地 UI 里的 geek task |
| Repo | World 发现或导入的 git repo 记录；浏览器不能上传 credential |
| Worktree | Issue 下的独立 git worktree，Codex session cwd 必须落在 Issue root 或已知 worktree scope 内 |
| Agent | World 内启动的具体执行器，例如 Codex CLI；Mac mini 本身不是 Agent |
| Session | tmux-backed Codex 长会话，由 `CodexSessionManager` 管理输入、输出、状态和 buffer |

Cloud Agent 词和本地魔法世界 UI 词可以互相映射，但不能在 Cloud Protocol 字段里泄漏 `awesome/ultrawork/geek task` 等旧本地 UI 名称。

## 魔法世界 UI 词

| UI 词 | 中文翻译 | 对应领域词 | 含义 | 命名理由 |
| --- | --- | --- | --- | --- |
| world | 世界 / 冒险世界 | awesome | 当前或已登记的本地工作空间 | `awesome` 是整张世界地图，所有种族、角色、任务、日志和恢复状态都发生在这个边界内 |
| world path | 世界路径 / 工作区路径 | awesome path | 创建或打开 awesome 的本地路径 | world path 是世界在本机文件系统里的落地点 |
| found world | 开世界 / 建立世界 | create awesome | 创建一个 awesome | found 表示开启一个新的本地工作世界 |
| known worlds | 已知世界 | known awesomes | registry 中记录过的 awesomes | registry 像世界登记册，记录可重新打开的 awesome |
| race | 种族 | ultrawork | awesome 世界内的 git 派生工作单元 | `ultrawork` 是世界里的种族；每个种族保留自己的 repo 血统、代码边界和当前进度 |
| add race | 添加种族 | add ultrawork | 添加一个 ultrawork | 把本地 git repo 加入世界，形成一个可被任务引用的种族 |
| role | 角色 | geek / agent role | 由某个种族启动的 agent 执行身份 | 同一个种族可以启动不同角色；角色描述执行风格，底层仍由 geek task/runtime 承载 |
| bond | 羁绊 / 编排 | orchestration | 多个种族之间的协作关系，以及任务如何跨 ultrawork 组合、追踪和恢复 | 羁绊表达种族之间的编排关系，是后续多 agent 协作的世界观语言 |
| quest | 任务 / 远征 | geek task | 一个 agent 任务 | 角色被派出去完成明确目标，过程像一次远征 |
| hero | 勇者 | geek / agent | 执行任务的 agent 角色 | 旧 UI 词，仍可理解为 role 的英雄化表达 |
| scroll | 魔法卷轴 / 任务卷轴 | task draft 或 follow-up | 新建任务或后续任务的指令载体 | 命令像被写进卷轴的咒语，派发后会召唤一次 quest |
| royal writ / writ | 王令 / 任务令 | task draft 或 follow-up | 旧 UI 词，等价于 scroll | 仅用于理解旧文案，新 UI 应优先使用 scroll 或 quest |
| spell JSON / decree JSON | 咒语 JSON / 命令 JSON | command JSON | 要执行的命令数组 JSON | 命令是可执行咒语，必须保持 JSON 数组格式 |
| battle log | 战报 / 冒险日志 | task events | SSE 推送和持久化的任务事件 | runtime 把任务输出、错误和状态变化传回界面，像战斗日志 |
| herald dispatches | 传令记录 / 战报 | task events | 旧 UI 词，等价于 battle log 或 bond stream | 仅用于理解旧文案，新 UI 应优先使用 battle log 或 bond stream |
| guild master | 公会会长 / 操作者 | takeover actor | 操作者对任务的认领、接管或后续处理 | 操作者像公会会长，可以安排勇者继续、暂停或终止任务 |
| steward claims | 管家接管记录 | takeover events | 旧 UI 词，等价于 role claims | 仅用于理解旧文案，新 UI 应优先使用 role claims |
| dragon | 恶龙 / 高风险动作 | policy risk | 越权写入、大范围删除、系统配置、泄露密钥等危险动作 | 它代表冒险中必须被识别和拦截的大威胁，不能只靠 UI 文案提醒 |
| princess | 公主 / 核心目标 | user goal | 用户真正想达成的结果 | 它提醒 agent 不要沉迷支线，要围绕最终目标推进 |
| scout | 侦察 / 刷新 | refresh | 重新拉取 registry 或 recovery 状态 | scout 表示重新侦察当前状态 |
| unsealed | 未封存 / 未记录提交号 | no head sha | ultrawork 尚未记录 git head sha | sealed 表示提交号已落档，unsealed 表示还没记录 |
