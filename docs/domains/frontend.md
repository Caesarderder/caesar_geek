---
km_id: domain.frontend
km_type: domain
domain: frontend
status: active
owner: caesar-maintainers
last_verified: 2026-05-27
source_of_truth:
  - apps/web/src/main.tsx
  - apps/web/src/styles.css
  - apps/web/vite.config.ts
validated_by:
  - manual-code-read
  - pnpm --filter @caesar-geek/web typecheck
tags:
  - domain:frontend
related:
  - domain.product
  - wiki.apps
---

# Frontend 领域

## 目标

维护本地 operator UI，展示和操作 Issue、Issue repo、agent task、takeover 与事件流。内部仍兼容 awesome/ultrawork/geek task 数据模型，但首屏体验应尽量用扫描和选择替代路径输入。

## 什么时候读

- 修改 `apps/web`。
- 改控制台布局、任务控制、SSE 展示或恢复查询。

## 职责

- 使用 React + Vite 构建前端。
- 使用 TanStack Query 管理 server state。
- 通过 tRPC client 和 `/events` SSE 与 gateway 通信。
- 创建 task 时默认只提交 prompt；不传 command 时由 gateway 生成 Codex CLI 命令。
- 显示 persisted approval gate，让 operator 批准或拒绝高风险 task。
- 首屏是可用控制台，不是营销 landing page。
- 首屏应扫描 `~/workspace/repos` 并列出 repo 选项；用户勾选 repo 后创建 `~/.caesar/issues` 下的 Issue。

## 不是本层职责

- 不直接访问本地文件系统。
- 不在 UI 内绕过 gateway 执行命令。
- 不读取、保存或展示 Codex/ChatGPT 登录缓存或 token。
- 不把安全策略只做成提示文案。

## 不变量

- UI 操作必须经 gateway。
- 任务、接管和事件显示应能通过恢复查询重新构建。
- 安全审批状态必须来自 gateway persisted recovery，不只依赖前端临时 state。
- Issue 和 repo 都必须有 agent 创建入口；repo agent 的 cwd 必须是 Issue 内已登记 repo 路径。

## 入口

- `CODE:apps/web/src/main.tsx`
- `CODE:apps/web/src/styles.css`

## 验证

- `pnpm --filter @caesar-geek/web typecheck`
- `pnpm --filter @caesar-geek/web build`

## 相关节点

- KM:wiki.apps
