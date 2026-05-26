---
km_id: domain.frontend
km_type: domain
domain: frontend
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - apps/web/src/main.tsx
  - apps/web/src/styles.css
  - apps/web/vite.config.ts
validated_by:
  - manual-code-read
tags:
  - domain:frontend
related:
  - domain.product
  - wiki.apps
---

# Frontend 领域

## 目标

维护本地 operator UI，展示和操作 awesome、ultrawork、geek task、takeover 与事件流。

## 什么时候读

- 修改 `apps/web`。
- 改控制台布局、任务控制、SSE 展示或恢复查询。

## 职责

- 使用 React + Vite 构建前端。
- 使用 TanStack Query 管理 server state。
- 通过 tRPC client 和 `/events` SSE 与 gateway 通信。
- 首屏是可用控制台，不是营销 landing page。

## 不是本层职责

- 不直接访问本地文件系统。
- 不在 UI 内绕过 gateway 执行命令。
- 不把安全策略只做成提示文案。

## 不变量

- UI 操作必须经 gateway。
- 任务、接管和事件显示应能通过恢复查询重新构建。

## 入口

- `CODE:apps/web/src/main.tsx`
- `CODE:apps/web/src/styles.css`

## 验证

- `pnpm --filter @caesar-geek/web typecheck`
- `pnpm --filter @caesar-geek/web build`

## 相关节点

- KM:wiki.apps
