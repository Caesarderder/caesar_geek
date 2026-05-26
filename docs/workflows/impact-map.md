---
km_id: workflow.impact-map
km_type: workflow
domain: workflow
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - .codex/skills/caesar-docs/references/impact-map.md
validated_by:
  - manual-docs-review
tags:
  - domain:workflow
  - workflow:impact-map
related:
  - map.workflows
  - map.invariants
---

# Impact Map 工作流

## 目标

在写代码、审查、重构、迁移文档或跨领域修改前，先输出 repository impact map，提前约束影响范围和验证方式。

## 输入

- 用户任务。
- 当前知识地图入口。
- 相关代码、配置、测试和计划文档。

## 步骤

1. 判断任务是否需要 impact map；单行无副作用文案可跳过并说明原因。
2. 读取 [领域索引](../map/domains.md)、[不变量](../map/invariants.md)、[文件归属](../references/indexes/file-ownership.md)。
3. 输出以下模板。
4. 完成任务后比较实际修改与 impact map，必要时更新 docs。

## 模板

```text
任务：
触发原因：
受影响领域：
需要先读的文件：
可能修改的文件：
必须保持的不变量：
验证方式：
可能需要同步更新的文档：
风险：
需要人确认的决策：
```

## 停止条件

- 影响范围足够指导下一步实现或审查。

## 验证

- 所列路径存在或明确标注为待创建。
- 不变量来自 [map/invariants.md](../map/invariants.md) 或 constraints。

## 相关节点

- KM:map.invariants
- KM:reference.file-ownership
