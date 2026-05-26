---
km_id: workflow.code-locating
km_type: workflow
domain: workflow
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/references/indexes/file-ownership.md
  - docs/references/indexes/zone-map.md
  - docs/wiki/index.md
validated_by:
  - manual-docs-review
tags:
  - domain:workflow
  - workflow:code-locating
related:
  - reference.file-ownership
  - reference.zone-map
  - reference.wiki-index
---

# 代码定位工作流

## 目标

从知识地图快速定位代码入口、职责边界和验证方式。

## 输入

- 任务描述。
- 可能相关的领域、路径或术语。

## 步骤

1. 在 [领域索引](../map/domains.md) 中找主领域。
2. 读 [文件归属](../references/indexes/file-ownership.md) 和 [区域地图](../references/indexes/zone-map.md)。
3. 读对应 [wiki](../wiki/index.md) 父节点，再下钻到代码。
4. 用 `rg` 查符号或调用链，确认当前代码事实。

## 停止条件

- 已找到最小必要代码入口。
- 或实现索引不足，需要先补充 docs，再继续。

## 验证

- `CODE:*` 对应路径必须存在。
- 实现位置以代码和实现索引为准，不以计划文档为准。

## 相关节点

- KM:reference.file-ownership
- KM:reference.zone-map
