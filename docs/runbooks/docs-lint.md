---
km_id: runbook.docs-lint
km_type: runbook
domain: quality
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - .codex/skills/caesar-docs/commands/init.md
validated_by:
  - manual-docs-review
tags:
  - quality:docs-lint
  - domain:quality
related:
  - quality.lint-rules
  - workflow.knowledge-map-maintenance
---

# Docs Lint Runbook

## 目标

运行知识地图最小检查，发现缺少 frontmatter、重复 id、断裂链接和路径漂移。

## 前置条件

- 在仓库根目录执行。
- 已安装常用 shell 工具和 `rg`。

## 命令

```bash
rg '^km_id:' docs
rg 'KM:|CODE:|CMD:' docs
find docs -name '*.md' -print
```

可选人工检查：

```bash
rg '^---$|^km_type:|^domain:|^status:|^last_verified:' docs
rg 'status: stale|status: deprecated' docs
```

## 预期结果

- 每个 Markdown 文件有 frontmatter。
- `km_id` 唯一。
- `KM:*` 对应现有 `km_id`。
- `CODE:*` 指向现有路径或明确标注待创建。

## 失败处理

- 缺 frontmatter：补齐 schema 字段。
- 重复 `km_id`：保留真实入口，改名或合并重复节点。
- 断裂 `KM:*`：修正引用或创建缺失节点。
- 断裂 `CODE:*`：更新实现索引或标记节点 stale。

## 相关节点

- KM:quality.lint-rules
