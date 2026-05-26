---
km_id: workflow.knowledge-query
km_type: workflow
domain: workflow
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/index.md
  - docs/map/index.md
validated_by:
  - manual-docs-review
tags:
  - domain:workflow
  - workflow:knowledge-query
related:
  - map.public-index
  - map.control-index
---

# 知识查询工作流

## 目标

用最少入口找到可信事实，避免凭记忆或文件名猜测。

## 输入

- 用户问题。
- 相关代码路径、术语或报错。

## 步骤

1. 读 [docs/index.md](../index.md) 和 [控制入口](../map/index.md)。
2. 如果是术语或领域问题，读 [术语表](../map/glossary.md) 和 [领域索引](../map/domains.md)。
3. 如果是实现问题，读 [代码定位工作流](code-locating.md)。
4. 如果发现 docs 与代码冲突，以当前代码和配置为准，并标记需要维护的 docs。

## 停止条件

- 找到足够回答问题的事实来源。
- 或确认事实不存在，需要新增 docs 或询问用户。

## 验证

- 引用路径必须存在。
- `.omx` 内容只能作为计划/规格来源，不当作当前实现证据。

## 相关节点

- KM:map.public-index
- KM:workflow.code-locating
