---
km_id: reference.local-agent-core-rules
km_type: reference
domain: architecture
status: active
owner: caesar-maintainers
last_verified: 2026-05-29
source_of_truth:
  - user-interview-2026-05-29
  - README.md
  - packages/agent-runtime/src/index.ts
  - https://git-scm.com/docs/git-worktree
validated_by:
  - manual-requirements-review
  - manual-code-read
tags:
  - domain:architecture
  - domain:runtime
  - domain:workspace
related:
  - decision.0002-gateway-agent-split
  - map.invariants
  - domain.runtime
  - domain.workspace
---

# 本地 Agent 核心规则

## 目标

记录 `caesar_geek` 在新拆分方案中的职责：它是部署在家里 Mac mini 的本地 Agent/runtime 仓库，不是公网 Gateway 仓库。

## 事实

- 用户计划将公网 Gateway 放在独立仓库 `../caesar_gateway`，部署到阿里云 ECS `47.93.141.241`，域名为 `geekcaesar.com`。
- `caesar_geek` 负责 Mac mini 本地执行面：连接 Gateway、登记本地 Git repo、创建 git worktree、启动和管理多个持续 Codex 会话。
- 网页和手机不直接访问 Mac mini；Mac mini Agent 主动通过 WSS 连接 Gateway。
- 每个 Codex Session 必须运行在独立 git worktree 中，不能直接在原始 repo 目录中开发。
- worktree 应创建在固定根目录，例如 `~/.caesar-geek/worktrees/<repo>/<session-id>`。
- Codex Session 需要长生命周期管理；第一版推荐使用 tmux 或 PTY 管理多个 Codex 会话。
- 第一版编排是人工编排：用户在网页上同时操控多个 Codex 会话，不做自动 planner/executor/reviewer。
- 当前代码中 `packages/agent-runtime/src/index.ts` 已有基于 `child_process.spawn` 的任务执行能力；后续需要升级为 Codex Session Manager 和 Worktree Manager。

## 入口或路径

- `CODE:packages/agent-runtime/src/index.ts`
- `CODE:packages/workspace/src/index.ts`
- `CODE:packages/shared/src/index.ts`
- `CODE:apps/server/src/app.ts`
- `CODE:apps/web/src/main.tsx`

## 推荐对象

```text
LocalAgent
RepoRegistry
WorktreeManager
CodexWorkspace
CodexSessionManager
SessionEventBuffer
GatewayConnection
```

## 推荐创建会话流程

```text
Gateway 下发 createSession
-> Agent 校验 repo 是否已登记
-> Agent 用 git worktree add 创建独立目录
-> Agent 在 worktree 下启动 Codex 长会话
-> Agent 捕获输出并通过 WSS 回传 Gateway
-> Gateway 持久化并推送 Web UI
```

## 验证

- 实现前用 impact map 判断变更是否属于本地 Agent 仓库。
- 实现后至少验证 repo 登记、worktree 创建、Codex 启动、持续输入、输出回传、中断和终止。

## 相关节点

- KM:decision.0002-gateway-agent-split
- KM:domain.runtime
- KM:domain.workspace
