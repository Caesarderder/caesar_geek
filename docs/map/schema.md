---
km_id: map.schema
km_type: map
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - .codex/skills/caesar-docs/references/node-schema.md
validated_by:
  - manual-docs-review
tags:
  - domain:cross-domain
  - quality:schema
related:
  - map.control-index
  - map.domains
---

# Schema

## Frontmatter

每个 `docs/**/*.md` 节点必须包含 YAML frontmatter：

```yaml
---
  km_id: map.example
km_type: map
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/index.md
validated_by:
  - manual-docs-review
tags:
  - domain:cross-domain
related:
  - map.control-index
---
```

## 枚举

`km_type` 只使用：`map`、`domain`、`workflow`、`invariant`、`decision`、`runbook`、`quality`、`reference`、`memory`。

`status` 只使用：`active`、`draft`、`stale`、`deprecated`。

当前领域值：

| domain | 用途 |
| --- | --- |
| `product` | 产品目标、MVP、用户流程 |
| `frontend` | `apps/web` UI 控制面 |
| `backend` | `apps/server` 本地 gateway/API/持久化 |
| `workspace` | `packages/workspace` awesome/ultrawork 文件系统边界 |
| `runtime` | `packages/agent-runtime` geek 进程生命周期 |
| `shared` | `packages/shared` 跨包类型、schema、策略分类 |
| `code` | 贴近代码目录的 wiki 和实现索引 |
| `architecture` | 跨模块架构事实 |
| `workflow` | 操作工作流 |
| `quality` | 检查、lint、过期检测 |
| `agent-memory` | 验证过的反馈和经验 |
| `cross-domain` | 多领域或控制入口 |

## 正文规则

- 索引短小，详细事实放入 references、domains 或 wiki。
- 不确定事实标记 `draft`。
- 计划性事实必须标明来源是 `.omx`，不能写成当前实现。
- 强关系写 `related`，辅助检索写 `tags`。
