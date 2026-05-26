---
km_id: quality.lint-rules
km_type: quality
domain: quality
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - package.json
  - docs/runbooks/docs-lint.md
validated_by:
  - manual-docs-review
tags:
  - quality:lint
  - domain:quality
related:
  - runbook.docs-lint
  - reference.code-standards
---

# Lint 规则

## 目标

定义代码和知识地图的最小检查。

## 事实

- 根 `pnpm lint` 当前执行 `pnpm -r lint`。
- 各包 lint 脚本当前实际运行 `tsc --noEmit`。
- docs 检查需要人工和命令结合，当前没有专用 docs linter。

## 检查项

- 每个 `docs/**/*.md` 必须有 frontmatter。
- `km_id` 必须唯一。
- `KM:*` 应能映射到现有 `km_id`。
- `CODE:*` 后的路径应存在，除非明确标记为待创建。
- 修改代码后按风险运行 typecheck/test/build。

## 验证

- [docs-lint runbook](../runbooks/docs-lint.md)

## 相关节点

- KM:runbook.docs-lint
