---
km_id: workflow.knowledge-map-maintenance
km_type: workflow
domain: workflow
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/index.md
  - docs/map/schema.md
  - docs/runbooks/docs-lint.md
validated_by:
  - manual-docs-review
tags:
  - domain:workflow
  - workflow:knowledge-map-maintenance
related:
  - map.schema
  - runbook.docs-lint
---

# 知识地图维护工作流

## 目标

让 `docs/` 随代码、架构、工作流和 `.omx` 规划变化持续同步。

## 输入

- 代码变更、计划变更或文档变更。
- 当前知识地图。

## 步骤

1. 判断变更影响哪些领域和入口。
2. 更新详细事实所在节点，不在多个文件复制同一事实。
3. 如果代码目录职责变化，更新 `docs/wiki/` 和 `docs/references/indexes/`。
4. 如果稳定边界变化，更新 `docs/map/domains.md`、`docs/domains/` 和 `docs/map/glossary.md`。
5. 如果入口路径、任务路由或事实优先级变化，更新 `README.md`。
6. 运行 [docs lint runbook](../runbooks/docs-lint.md)。

## 停止条件

- 新事实有可追溯来源。
- 索引能导航到详细节点。
- 旧事实被更新、标记 `stale`/`deprecated` 或删除。

## 验证

- `rg '^km_id:' docs`
- `rg 'KM:|CODE:|CMD:' docs`
- `find docs -name '*.md' -print`

## 相关节点

- KM:runbook.docs-lint
