---
km_id: domain.backend
km_type: domain
domain: backend
status: active
owner: caesar-maintainers
last_verified: 2026-05-27
source_of_truth:
  - apps/server/src/app.ts
  - apps/server/src/db/sqlite.ts
  - apps/server/package.json
validated_by:
  - manual-code-read
  - pnpm --filter @caesar-geek/server test
tags:
  - domain:backend
related:
  - domain.product
  - reference.file-ownership
  - wiki.apps
---

# Backend 领域

## 目标

维护本地 gateway：Fastify/tRPC API、SSE 事件、active awesome 状态、registry 与 per-awesome SQLite store。

## 什么时候读

- 修改 `apps/server`。
- 调整 API、事件流、恢复逻辑或持久化 schema。
- 排查 frontend 与本地文件/进程边界。

## 职责

- 创建、选择、列出 known awesomes。
- 添加 ultrawork 并调用 workspace clone 逻辑。
- 创建、关联、启动、接管、控制 geek tasks。
- 当 task create 未显式传入 command 时，用 shared 的 Codex exec command builder 构造默认 Codex CLI 任务。
- 持久化 awesome、ultrawork、task、event、takeover、runtime session 和 approval decision。
- 高风险 task 先保存为 `queued` 并创建 pending approval，批准后按原始 task intent 启动，拒绝后标记为 `rejected`。

## 不是本层职责

- 不直接实现浏览器 UI。
- 不负责 git/path 细节的全部规则；这些在 `packages/workspace`。
- 不负责进程生命周期内部实现；这些在 `packages/agent-runtime`。

## 不变量

- API 必须通过 active awesome 约束本地操作范围。
- task 必须在 launch 前或同事务中持久化。
- Codex 认证凭据只能由本地 CLI/credential store 使用，不能返回给 browser。
- 待审批的 `queued` task 是可恢复状态，gateway 重启不能把它误标为 `unknown`。
- SSE 只广播 task 事件，不替代恢复查询。

## 入口

- `CODE:apps/server/src/app.ts`
- `CODE:apps/server/src/db/sqlite.ts`

## 验证

- `pnpm --filter @caesar-geek/server typecheck`
- `pnpm --filter @caesar-geek/server test`

## 相关节点

- KM:reference.file-ownership
- KM:wiki.apps
