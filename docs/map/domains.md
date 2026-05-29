---
km_id: map.domains
km_type: map
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - package.json
  - apps/server/src/app.ts
  - apps/web/src/main.tsx
  - packages/shared/src/index.ts
  - packages/workspace/src/index.ts
  - packages/agent-runtime/src/index.ts
  - packages/cloud-agent/src/index.ts
  - docs/references/architecture/cloud-agent-codex-session-concepts.md
validated_by:
  - manual-code-read
tags:
  - domain:cross-domain
related:
  - domain.product
  - domain.backend
  - domain.frontend
  - domain.workspace
  - domain.runtime
  - domain.shared
  - reference.cloud-agent-codex-session-concepts
---

# 领域索引

| 领域 | 节点 | 职责摘要 | 落到文件时先读 |
| --- | --- | --- | --- |
| `product` | KM:domain.product | 本地优先 AI 工作控制台、MVP 验收路径、术语边界 | [架构概览](../references/architecture/architecture-overview.md) |
| `backend` | KM:domain.backend | Fastify/tRPC gateway、SQLite store、SSE 事件、active awesome 状态 | [file-ownership](../references/indexes/file-ownership.md) |
| `frontend` | KM:domain.frontend | React/Vite 本地 operator UI，展示 awesome、ultrawork、geek task | [wiki/apps](../wiki/apps/apps.md) |
| `workspace` | KM:domain.workspace | awesome 布局、registry 路径、ultrawork clone、路径范围判断 | [wiki/packages](../wiki/packages/packages.md) |
| `runtime` | KM:domain.runtime | geek task 草稿、进程启动、日志事件、接管/中断/终止 | [wiki/packages](../wiki/packages/packages.md) |
| `shared` | KM:domain.shared | Zod schema、共享类型、高风险动作分类 | [file-ownership](../references/indexes/file-ownership.md) |
| `cloud-agent` | KM:reference.cloud-agent-codex-session-concepts | outbound World runtime、Cloud Protocol handler、Gateway request/result bridge | [Cloud Agent Codex Session 概念](../references/architecture/cloud-agent-codex-session-concepts.md) |
| `code` | KM:reference.wiki-index | wiki 和实现索引使用的代码检索领域 | [wiki/index](../wiki/index.md) |
| `workflow` | KM:map.workflows | 知识地图和工程操作流程 | [workflows](workflows.md) |
| `quality` | KM:quality.lint-rules | 类型检查、测试、文档检查、过期文档 | [docs-lint](../runbooks/docs-lint.md) |

新增领域前，必须先确认它会反复用于任务路由，并同步本文件、[schema](schema.md)、相关领域节点和 tags。
