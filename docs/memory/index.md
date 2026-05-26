---
km_id: memory.index
km_type: memory
domain: agent-memory
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/index.md
validated_by:
  - manual-docs-review
tags:
  - memory:index
  - domain:agent-memory
related:
  - workflow.knowledge-map-maintenance
---

# 记忆入口

## 目标

记录验证过、会改变未来智能体行为的经验。

## 已验证经验

- 初始化时发现 `.omx` 计划提到 Drizzle，但当前 server 持久化代码使用 `node:sqlite`；以后讨论持久化时必须区分计划与当前实现。

## 触发条件

- 重复误判。
- 已验证的架构漂移。
- 会影响以后开工顺序、风险判断或验证命令的事实。

## 以后怎么做

- 先写证据路径，再写经验。
- 不把未经验证的猜测写入 memory。

## 验证依据

- `CODE:apps/server/src/db/sqlite.ts`
- `CODE:.omx/plans/local-ai-workspace-gateway-plan.md`

## 相关节点

- KM:workflow.knowledge-map-maintenance
