---
km_id: reference.wiki-index
km_type: reference
domain: code
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - apps
  - packages
validated_by:
  - manual-code-read
tags:
  - wiki:code-map
  - domain:code
related:
  - wiki.apps
  - wiki.packages
  - reference.file-ownership
---

# Wiki 入口

## 目标

`docs/wiki/` 是贴近代码目录的浓缩解释层，用于快速理解目录职责、关键入口、核心链路和上下游。

## 目录映射

| Wiki | 对应代码 | 用途 |
| --- | --- | --- |
| [apps/apps.md](apps/apps.md) | `CODE:apps` | 前端与 server 应用 |
| [packages/packages.md](packages/packages.md) | `CODE:packages` | 共享库、workspace 服务、agent runtime |

## 阅读规则

先读父级 wiki，再按任务下钻到 [文件归属](../references/indexes/file-ownership.md)、领域节点和真实代码。

## 维护规则

- 代码目录新增、删除或职责变化时同步 wiki。
- 稳定概念再沉淀到 [领域索引](../map/domains.md) 或 [术语表](../map/glossary.md)。
- wiki 只写已验证代码事实，不把 `.omx` 计划写成当前实现。

## 相关节点

- KM:reference.file-ownership
- KM:reference.zone-map
