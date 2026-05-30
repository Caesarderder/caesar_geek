---
km_id: reference.architecture-overview
km_type: reference
domain: architecture
status: active
owner: caesar-maintainers
last_verified: 2026-05-30
source_of_truth:
  - README.md
  - package.json
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - .omx/plans/local-ai-workspace-gateway-plan.md
  - docs/references/architecture/local-agent-core-rules.md
  - docs/references/architecture/cloud-agent-codex-session-concepts.md
  - apps/server/src/app.ts
  - apps/web/src/main.tsx
  - packages/shared/src/index.ts
  - packages/workspace/src/index.ts
  - packages/agent-runtime/src/index.ts
  - packages/cloud-agent/src/index.ts
  - deploy/deploy-to-47.93.141.241.sh
  - deploy/sync-local-and-deploy.sh
  - deploy/nginx.caesar-geek.conf
  - deploy/caesar-geek.service
validated_by:
  - manual-code-read
  - pnpm --filter @caesar-geek/server test
  - pnpm --filter @caesar-geek/web typecheck
  - manual-requirements-review
tags:
  - domain:architecture
related:
  - domain.product
  - reference.file-ownership
  - reference.zone-map
  - reference.local-agent-core-rules
  - reference.cloud-agent-codex-session-concepts
  - runbook.cloud-deployment
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
- per-awesome SQLite 持久化 approval decisions；高风险 task 保存为 `queued`，批准后按原始 task intent 启动，拒绝后标记为 `rejected`。
- runtime 使用 Node `child_process.spawn` 启动任务；默认 geek task 通过本地已登录的 `codex exec --json --sandbox workspace-write --skip-git-repo-check <prompt>` 运行。
- Browser 不读取 Codex/ChatGPT 登录缓存；Codex 认证由本机 CLI 和 credential store 处理。
- `.omx` 规划要求后续持续围绕 create/select awesome、add ultrawork、persist task、launch geek、recover state 的 MVP 路径推进。
- 2026-05-29 的目标边界更新：公网 Gateway 计划拆到 `../caesar_gateway`；`caesar_geek` 后续聚焦 Mac mini 本地 Agent/runtime、repo registry、git worktree 和持续 Codex Session 管理。
- 根目录 `.omx` 的 Cloud Agent Codex Session 规划将产品模型明确为 World/Issue/repo/worktree/Agent/session；本地执行面由 `packages/cloud-agent`、`packages/shared`、`packages/workspace` 和 `packages/agent-runtime` 承担。
- 2026-05-29 的当前运维部署：Caesar Geek Web 控制台已可通过阿里云 ECS 公网 IP `47.93.141.241` 访问；Nginx 对外监听 80，使用 Basic Auth，静态托管 `apps/web/dist`，并将 `/trpc` 与 `/events` 反代到本机 `127.0.0.1:4387`。
- 云端发布工作流有两条：`deploy/deploy-to-47.93.141.241.sh` 从 Git 部署已推送代码；`deploy/sync-local-and-deploy.sh` 用 `rsync` 上传本地未提交工作区后远端构建并重启服务。
- 修改线上网页、后端服务、Nginx/systemd 配置或部署脚本后，必须按 KM:runbook.cloud-deployment 重新部署到云服务器；纯文档修改且不影响线上运行时除外。

## 入口或路径

- `CODE:apps/server/src/app.ts`
- `CODE:apps/server/src/db/sqlite.ts`
- `CODE:apps/web/src/main.tsx`
- `CODE:packages/shared/src/index.ts`
- `CODE:packages/workspace/src/index.ts`
- `CODE:packages/agent-runtime/src/index.ts`
- `CODE:packages/cloud-agent/src/index.ts`
- `CODE:deploy/deploy-to-47.93.141.241.sh`
- `CODE:deploy/sync-local-and-deploy.sh`
- `CODE:deploy/nginx.caesar-geek.conf`
- `CODE:deploy/caesar-geek.service`
- `CODE:.omx/specs/deep-interview-local-ai-workspace-gateway.md`
- `CODE:.omx/plans/local-ai-workspace-gateway-plan.md`
- `CODE:../.omx/specs/deep-interview-cloud-agent-codex-session-mvp.md`
- `CODE:../.omx/plans/ralplan-cloud-agent-codex-session-mvp.md`

## 当前实现链路

Browser UI 调用 tRPC -> server 维护 active awesome -> SQLite store 记录状态 -> workspace 包处理本地路径/git clone -> server 为默认任务构造 Codex CLI 命令 -> runtime 包启动进程并产生日志/状态事件 -> SSE 推送给 UI -> recovery query 从 SQLite 恢复视图。

## Cloud Agent Codex Session 链路

Gateway typed request -> `packages/cloud-agent` outbound World runtime -> shared protocol validation -> Issue/repo/worktree/session handler -> `packages/agent-runtime` tmux-backed Codex session -> capture output -> typed result/output message -> Gateway audit/UI。

## 计划但需验证的目标

- `.omx` 计划提到 SQLite + Drizzle；当前代码实际使用 `node:sqlite`。
- `.omx` 计划提到 Codex CLI；当前 UI 默认提交 prompt，server 默认生成 `codex exec` command；高级 command JSON 仍可覆盖。
- `.omx` hardening plan 要求安全审批 UI；当前代码已有 persisted approval gate、approve/reject API 和前端审批面板，后续仍可补充过期与 bypass 策略。
- Cloud Agent Codex Session MVP 当前仍有内存 Issue/repo/worktree registry；持久化 World workspace/session registry 是后续硬化项。
- 当前 ECS 运行的是 `caesar_geek` Web 控制台部署事实；长期公网 Gateway/本地 Agent 拆分仍以 KM:decision.0002-gateway-agent-split 为准。

## 验证

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `curl -i -u 'caesar:<password>' http://47.93.141.241`

## 相关节点

- KM:map.invariants
- KM:reference.file-ownership
- KM:reference.cloud-agent-codex-session-concepts
- KM:runbook.cloud-deployment
