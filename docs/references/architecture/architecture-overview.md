---
km_id: reference.architecture-overview
km_type: reference
domain: architecture
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - README.md
  - package.json
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - .omx/plans/local-ai-workspace-gateway-plan.md
  - apps/server/src/app.ts
  - apps/web/src/main.tsx
  - packages/shared/src/index.ts
  - packages/workspace/src/index.ts
  - packages/agent-runtime/src/index.ts
validated_by:
  - manual-code-read
tags:
  - domain:architecture
related:
  - domain.product
  - reference.file-ownership
  - reference.zone-map
---

# 架构概览

## 目标

提供 Caesar Geek 的顶层架构事实，并区分当前实现和 `.omx` 规划。

## 事实

- 仓库是 pnpm workspace，根脚本包含 `dev`、`build`、`typecheck`、`lint`、`test`、`db:generate`、`db:migrate`。
- 当前包布局是 `apps/web`、`apps/server`、`packages/shared`、`packages/workspace`、`packages/agent-runtime`。
- 前端是 React + Vite，Vite dev server 代理 `/trpc` 和 `/events` 到 `127.0.0.1:4387`。
- 后端是 Fastify + tRPC，暴露 `/trpc` 与 `/events`。
- 持久化使用 Node `node:sqlite` 的 `DatabaseSync`，当前没有 Drizzle schema 文件；`db:generate`/`db:migrate` 是占位脚本。
- known-awesome registry 默认位置由 `CAESAR_GEEK_HOME` 或 home 下 `.caesar-geek/registry.sqlite` 决定。
- 每个 awesome 的数据库位于 `awesome/.caesar-geek/db.sqlite`。
- runtime 使用 Node `child_process.spawn` 启动任务。
- `.omx` 规划要求后续持续围绕 create/select awesome、add ultrawork、persist task、launch geek、recover state 的 MVP 路径推进。

## 入口或路径

- `CODE:apps/server/src/app.ts`
- `CODE:apps/server/src/db/sqlite.ts`
- `CODE:apps/web/src/main.tsx`
- `CODE:packages/shared/src/index.ts`
- `CODE:packages/workspace/src/index.ts`
- `CODE:packages/agent-runtime/src/index.ts`
- `CODE:.omx/specs/deep-interview-local-ai-workspace-gateway.md`
- `CODE:.omx/plans/local-ai-workspace-gateway-plan.md`

## 当前实现链路

Browser UI 调用 tRPC -> server 维护 active awesome -> SQLite store 记录状态 -> workspace 包处理本地路径/git clone -> runtime 包启动进程并产生日志/状态事件 -> SSE 推送给 UI -> recovery query 从 SQLite 恢复视图。

## 计划但需验证的目标

- `.omx` 计划提到 SQLite + Drizzle；当前代码实际使用 `node:sqlite`。
- `.omx` 计划提到 Codex CLI；当前 UI 默认提供 stub command，API 默认 command 是 `["codex"]`。
- `.omx` 计划要求安全审批 UI；当前代码已有 classifier，审批流仍需以后实现。

## 验证

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## 相关节点

- KM:map.invariants
- KM:reference.file-ownership
