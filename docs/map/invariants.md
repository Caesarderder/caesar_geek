---
km_id: map.invariants
km_type: invariant
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-30
source_of_truth:
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - .omx/plans/local-ai-workspace-gateway-plan.md
  - packages/shared/src/index.ts
  - packages/workspace/src/index.ts
  - packages/agent-runtime/src/index.ts
  - deploy/sync-local-and-deploy.sh
  - docs/runbooks/cloud-deployment.md
  - docs/references/architecture/local-agent-core-rules.md
validated_by:
  - manual-code-read
  - manual-requirements-review
tags:
  - domain:cross-domain
  - risk:safety-boundary
related:
  - domain.product
  - reference.architecture-overview
  - reference.local-agent-core-rules
---

# 不变量

## 产品不变量

- `awesome`、`ultrawork`、`geek` 是公开领域词，不能随意改名。
- 世界观映射必须保持：`awesome` 是 world，`ultrawork` 是 race，`geek`/agent 是由 race 启动的 role，race 之间的协作编排称为 bond。
- 第一版本是本地单用户，不包含认证、远程部署、多用户权限组或项目管理套件。
- 可选本地 repo 的默认来源是 `~/workspace/repos`；界面应扫描并列出候选项，避免要求用户反复手输路径。
- Issue 的默认创建根目录是 `~/.caesar/issues`；创建 Issue 时必须把用户选中的所有 repo 放进该 Issue。
- Agent 创建入口必须同时支持 Issue 作用域和 Issue 内单个 repo 作用域。
- Issue-level `geek` 任务应从所选 `awesome`/Issue 目录启动；repo-level agent 只能从该 Issue 已登记 repo 的目录启动，不能从原始 repo 目录启动。
- `ultrawork` 必须保持 git 关系；普通目录复制或 symlink 不满足当前规格。
- 任务持久化是基础流程，不能只依赖 live process 状态。

## 架构不变量

- 浏览器不能直接访问本地文件系统或进程，必须通过 gateway。
- 拆分后，`caesar_geek` 是 Mac mini 本地 Agent/runtime 仓库；公网 Gateway 属于 `../caesar_gateway`。
- Mac mini Agent 必须主动连接公网 Gateway，不要求家里 Mac mini 开放公网入站端口。
- Codex 长会话必须绑定独立 git worktree，不能直接在原始 repo 目录里开发。
- worktree 创建路径必须位于 Agent 配置允许的固定根目录下。
- 持久化恢复以 SQLite/registry 中的记录为事实来源；重启后的进程状态只能表达为 last-known、unknown、exited 或 orphaned。
- 高风险动作必须在 gateway/runtime 边界建模，不能只在 UI 文案里提示。
- `docs/` 是长期事实来源；`.omx` 是计划和上下文来源，不能替代知识地图。
- 修改线上网页、后端服务、Nginx/systemd 配置或部署脚本后，必须按 [Cloud Deployment Runbook](../runbooks/cloud-deployment.md) 重新部署到云服务器；纯文档修改且不影响线上运行时除外。

## 验证

- 改 TypeScript 代码后至少运行 `pnpm typecheck`，风险较高时运行 `pnpm test` 和 `pnpm build`。
- 改 docs 后运行 [docs-lint](../runbooks/docs-lint.md) 中的最小检查。
