---
km_id: workflow.code-writing-review
km_type: workflow
domain: workflow
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - package.json
  - docs/workflows/impact-map.md
validated_by:
  - manual-docs-review
tags:
  - domain:workflow
  - workflow:code-writing-review
related:
  - workflow.impact-map
  - quality.lint-rules
---

# 代码编写与审查工作流

## 目标

在保持领域边界和不变量的前提下修改代码，并把影响到的知识地图同步更新。

## 输入

- 用户任务。
- impact map。
- 相关代码、测试和 docs 节点。

## 步骤

1. 按 [impact map](impact-map.md) 读取最小必要节点。
2. 优先遵循现有包边界和代码风格。
3. 修改代码时检查是否影响 schema、术语、领域、文件归属或 wiki。
4. 按风险运行验证命令。
5. 如发现重复误判或可复用经验，写入 `docs/memory/`。

## 停止条件

- 代码和必要 docs 已同步。
- 验证完成，或明确说明未运行原因。

## 验证

- 常规：`pnpm typecheck`
- 风险较高：`pnpm test`、`pnpm build`
- 文档：`docs/runbooks/docs-lint.md`

## 相关节点

- KM:workflow.impact-map
- KM:quality.lint-rules
