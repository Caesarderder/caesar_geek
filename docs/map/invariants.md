---
km_id: map.invariants
km_type: invariant
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - .omx/plans/local-ai-workspace-gateway-plan.md
  - packages/shared/src/index.ts
  - packages/workspace/src/index.ts
  - packages/agent-runtime/src/index.ts
validated_by:
  - manual-code-read
tags:
  - domain:cross-domain
  - risk:safety-boundary
related:
  - domain.product
  - reference.architecture-overview
---

# 不变量

## 产品不变量

- `awesome`、`ultrawork`、`geek` 是公开领域词，不能随意改名。
- 世界观映射必须保持：`awesome` 是 world，`ultrawork` 是 race，`geek`/agent 是由 race 启动的 role，race 之间的协作编排称为 bond。
- 第一版本是本地单用户，不包含认证、远程部署、多用户权限组或项目管理套件。
- `geek` 任务应从所选 `awesome` 目录启动，而不是原始 repo 或单个 ultrawork 目录。
- `ultrawork` 必须保持 git 关系；普通目录复制或 symlink 不满足当前规格。
- 任务持久化是基础流程，不能只依赖 live process 状态。

## 架构不变量

- 浏览器不能直接访问本地文件系统或进程，必须通过 gateway。
- 持久化恢复以 SQLite/registry 中的记录为事实来源；重启后的进程状态只能表达为 last-known、unknown、exited 或 orphaned。
- 高风险动作必须在 gateway/runtime 边界建模，不能只在 UI 文案里提示。
- `docs/` 是长期事实来源；`.omx` 是计划和上下文来源，不能替代知识地图。

## 验证

- 改 TypeScript 代码后至少运行 `pnpm typecheck`，风险较高时运行 `pnpm test` 和 `pnpm build`。
- 改 docs 后运行 [docs-lint](../runbooks/docs-lint.md) 中的最小检查。
