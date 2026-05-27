---
km_id: wiki.apps
km_type: reference
domain: code
status: active
owner: caesar-maintainers
last_verified: 2026-05-27
source_of_truth:
  - apps/server/src/app.ts
  - apps/server/src/db/sqlite.ts
  - apps/web/src/main.tsx
  - apps/web/vite.config.ts
validated_by:
  - manual-code-read
  - pnpm --filter @caesar-geek/server test
  - pnpm --filter @caesar-geek/web typecheck
tags:
  - wiki:code-map
  - domain:backend
  - domain:frontend
related:
  - domain.backend
  - domain.frontend
  - reference.file-ownership
---

# apps

## 目标

说明 `apps/` 下两个可运行应用的职责和链路。

## 对应代码

- `CODE:apps/server`
- `CODE:apps/web`

## 职责摘要

- `apps/server` 是本地 gateway，提供 tRPC API、SSE、SQLite store、approval gate、默认 Codex CLI task 构造和 active awesome 上下文。
- `apps/web` 是本地 operator UI，通过 tRPC 和 SSE 操作 gateway，并展示 persisted approval gate；它不处理 Codex 登录凭据。

## 关键入口

- `CODE:apps/server/src/app.ts`
- `CODE:apps/server/src/db/sqlite.ts`
- `CODE:apps/server/src/index.ts`
- `CODE:apps/web/src/main.tsx`
- `CODE:apps/web/vite.config.ts`

## 核心链路

1. Web 调用 `/trpc` 创建或选择 awesome。
2. Server 通过 `RegistryStore` 和 `AwesomeStore` 写入 registry/per-awesome SQLite。
3. Web 添加 ultrawork 时，server 调用 `packages/workspace` 的 clone 逻辑。
4. Web 创建 geek task 时只需提交 prompt；若没有显式 command，server 构造 `codex exec --json --sandbox workspace-write --skip-git-repo-check <prompt>`。
5. Server 先持久化 task 和 ultrawork 关联。
6. 低风险 task 直接调用 `GeekRuntime.launch`；高风险 task 保存为 `queued` 并写入 pending approval。
7. Operator 在 approval gate 批准后，server 按原始 task intent 启动；拒绝后 task 标记为 `rejected`。
8. Runtime 产生 task event，server 通过 `/events` SSE 推给 web，同时 web 可用 recovery query 重建状态。

## 上游与下游

- 上游：用户在 browser UI 中操作。
- 下游：`packages/workspace`、`packages/agent-runtime`、`packages/shared`。

## 常见误判

- `apps/web` 不能直接选择本地路径或运行命令；实际操作必须经 gateway。
- `apps/web/vite.config.ts` 默认代理到 `127.0.0.1:4387`，可用 `VITE_API_TARGET` 覆盖；web dev 端口可用 `WEB_PORT` 覆盖。
- SSE 是事件流，不是恢复事实来源；恢复以 server 的 persisted state 查询为准。

## 验证方式

- `pnpm --filter @caesar-geek/server typecheck`
- `pnpm --filter @caesar-geek/web typecheck`

## 相关节点

- KM:domain.backend
- KM:domain.frontend
