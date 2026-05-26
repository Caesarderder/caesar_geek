---
km_id: map.workflows
km_type: map
domain: workflow
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/workflows/knowledge-query.md
  - docs/workflows/code-locating.md
  - docs/workflows/impact-map.md
  - docs/workflows/code-writing-review.md
  - docs/workflows/knowledge-map-maintenance.md
validated_by:
  - manual-docs-review
tags:
  - domain:workflow
related:
  - workflow.knowledge-query
  - workflow.code-locating
  - workflow.impact-map
  - workflow.code-writing-review
  - workflow.knowledge-map-maintenance
---

# 工作流索引

先选工作流，再读最小必要节点。不要为了单个任务展开整棵文档树。

| 任务类型 | 工作流 | 入口 |
| --- | --- | --- |
| 查项目事实、术语、决策 | KM:workflow.knowledge-query | [knowledge-query.md](../workflows/knowledge-query.md) |
| 找代码、确认实现落点 | KM:workflow.code-locating | [code-locating.md](../workflows/code-locating.md) |
| 写代码、修 bug、重构、审查 | KM:workflow.impact-map | [impact-map.md](../workflows/impact-map.md) |
| 编码和审查执行 | KM:workflow.code-writing-review | [code-writing-review.md](../workflows/code-writing-review.md) |
| 更新 docs、同步事实 | KM:workflow.knowledge-map-maintenance | [knowledge-map-maintenance.md](../workflows/knowledge-map-maintenance.md) |

## 使用规则

- 开始写代码、审查、重构或迁移文档前，先按 [impact map](../workflows/impact-map.md) 输出影响范围。
- 代码变化后，检查是否需要同步 `docs/wiki/`、`docs/references/indexes/`、`docs/map/domains.md` 和 `README.md`。
- 只有验证过、会改变未来行为的反馈才写入 `docs/memory/`。
