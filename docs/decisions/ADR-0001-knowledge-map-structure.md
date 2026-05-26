---
km_id: decision.0001-knowledge-map-structure
km_type: decision
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - .codex/skills/caesar-docs/references/knowledge-map-structure.md
  - .omx/plans/local-ai-workspace-gateway-plan.md
validated_by:
  - manual-docs-review
tags:
  - decision:knowledge-map
  - domain:cross-domain
related:
  - map.public-index
  - map.control-index
  - workflow.knowledge-map-maintenance
---

# ADR-0001 知识地图结构

## 背景

仓库初始化时没有 `docs/`、`AGENTS.md` 或 `ARCHITECTURE.md`，只有 `README.md` 和 `.omx` 规划。项目已经有 TypeScript monorepo 代码和本地 gateway/control-plane 的实施计划。

## 决策

创建 `docs/` 知识地图作为长期事实来源，包含控制层、领域层、工作流层、wiki 层、reference 层、quality 层、memory 层、runbook 层和 decisions 层。

## 备选方案

- 只更新 README：不足以承载工作流、实现索引和知识反馈。
- 只依赖 `.omx`：`.omx` 是规划和运行状态来源，不适合作为稳定共享事实地图。

## 后果

- 后续代码或架构变化必须同步相关 docs。
- `.omx` 中的规划事实需要在 docs 中标明“计划”或“规格”，不能混同为当前实现。
- README 只保留知识地图入口链接，不替代 `docs/`。

## 验证

- `rg '^km_id:' docs`
- `rg 'KM:|CODE:|CMD:' docs`

## 相关节点

- KM:workflow.knowledge-map-maintenance
