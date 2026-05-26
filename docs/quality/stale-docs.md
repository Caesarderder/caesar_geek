---
km_id: quality.stale-docs
km_type: quality
domain: quality
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/index.md
validated_by:
  - manual-docs-review
tags:
  - quality:stale-docs
  - domain:quality
related:
  - workflow.knowledge-map-maintenance
  - runbook.docs-lint
---

# 过期文档清单

## 目标

记录已知文档漂移和待维护项。

## 当前清单

| 状态 | 项 | 依据 | 处理 |
| --- | --- | --- | --- |
| active | `.omx` 计划中的 Drizzle 与当前 `node:sqlite` 实现不一致 | `apps/server/src/db/sqlite.ts` | 已在架构概览和 memory 标注 |

## 维护规则

- 发现 docs 与代码冲突时，优先更新详细事实节点。
- 无法立即修复时，在本文件登记并标明证据。

## 验证

- `rg 'stale|deprecated|Drizzle|node:sqlite' docs`

## 相关节点

- KM:workflow.knowledge-map-maintenance
