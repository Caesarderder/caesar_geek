---
km_id: map.control-index
km_type: map
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - docs/index.md
  - package.json
  - .omx/plans/local-ai-workspace-gateway-plan.md
validated_by:
  - manual-docs-review
tags:
  - domain:cross-domain
  - workflow:knowledge-query
related:
  - map.public-index
  - map.schema
  - map.workflows
  - map.domains
  - map.invariants
---

# 控制入口

## 阅读顺序

1. `README.md` 了解项目一句话和命令。
2. [Schema](schema.md) 了解知识节点格式和状态枚举。
3. [不变量](invariants.md) 了解产品和架构硬约束。
4. [工作流索引](workflows.md) 选择本次任务工作流。
5. [领域索引](domains.md) 和 [文件归属](../references/indexes/file-ownership.md) 确认实现落点。

## 工作环境分层

| 层 | 入口 | 用途 |
| --- | --- | --- |
| 控制层 | `docs/map/` | 任务路由、schema、领域、不变量 |
| 格式层 | [schema.md](schema.md) | frontmatter、状态、枚举 |
| 领域层 | [domains.md](domains.md) | 产品、前端、后端、运行时、工作区等边界 |
| 工作流层 | [workflows.md](workflows.md) | 查询、定位、编码审查、维护 |
| Wiki 层 | [wiki/index.md](../wiki/index.md) | 贴近代码目录检索职责和链路 |
| 约束层 | [code-standards.md](../references/constraints/code-standards.md) | 编码、运行、安全边界 |
| 记忆层 | [memory/index.md](../memory/index.md) | 只记录验证过、会改变以后行为的经验 |
| 质量层 | [quality/lint-rules.md](../quality/lint-rules.md) | 文档和项目检查 |
| 参考层 | [references/indexes/](../references/indexes/file-ownership.md) | 文件归属、区域地图、架构事实 |

## 常用入口

| 任务 | 先读 |
| --- | --- |
| 理解项目 | [架构概览](../references/architecture/architecture-overview.md) |
| 查实现落点 | [代码定位](../workflows/code-locating.md) |
| 改代码或审查 | [impact map](../workflows/impact-map.md) |
| 更新 docs | [知识地图维护](../workflows/knowledge-map-maintenance.md) |
| 判断术语 | [术语表](glossary.md) |
