---
km_id: map.public-index
km_type: map
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - README.md
  - package.json
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - .omx/plans/local-ai-workspace-gateway-plan.md
validated_by:
  - manual-repo-read
tags:
  - domain:cross-domain
  - workflow:knowledge-query
related:
  - map.control-index
  - map.schema
  - map.workflows
  - map.domains
---

# Caesar Geek 知识地图

本目录是 Caesar Geek 项目的人和智能体共用工作环境。长期事实、工作流、实现索引、质量规则和可复用经验都应沉淀到 `docs/`，不要只依赖聊天记录、隐藏记忆或本地 skill。

## 先读顺序

1. [控制入口](map/index.md)：确认当前知识地图怎么用。
2. [Schema](map/schema.md)：确认节点格式、状态和领域枚举。
3. [工作流索引](map/workflows.md)：按任务类型选择最小工作流。
4. [领域索引](map/domains.md)：确认任务归属和实现入口。
5. [不变量](map/invariants.md)：确认不能破坏的产品和架构约束。

## 目录分区

| 目录 | 职责 |
| --- | --- |
| `docs/map/` | 控制层：入口、schema、工作流、领域、不变量、术语 |
| `docs/domains/` | 领域层：稳定职责边界和反边界 |
| `docs/workflows/` | 操作层：查询、定位、编码审查、影响分析、地图维护 |
| `docs/wiki/` | Wiki 层：贴近代码目录的浓缩解释和链路 |
| `docs/references/` | 参考层：架构事实、约束、文件归属和区域地图 |
| `docs/memory/` | 反馈层：验证过的经验和重复误判 |
| `docs/decisions/` | 决策层：长期结构决策 |
| `docs/runbooks/` | 执行层：可运行维护命令 |
| `docs/quality/` | 传感层：lint、过期文档和健康检查 |

## 事实优先级

- 任务路由以 [工作流索引](map/workflows.md) 为准。
- 领域归属以 [领域索引](map/domains.md) 和 `docs/domains/` 为准。
- 当前实现落点以 [文件归属](references/indexes/file-ownership.md) 和 [区域地图](references/indexes/zone-map.md) 为准。
- 架构叙事以 [架构概览](references/architecture/architecture-overview.md) 为准，但具体文件仍以实现索引和代码为准。
- 产品计划和未完成目标以 `.omx/specs/`、`.omx/plans/` 和 [ADR-0001](decisions/ADR-0001-knowledge-map-structure.md) 标记，不等同于当前实现。

## 常用入口

- 查概念：读 [术语表](map/glossary.md)。
- 找代码：读 [代码定位工作流](workflows/code-locating.md) 和 [wiki 入口](wiki/index.md)。
- 改代码或审查：先写 [impact map](workflows/impact-map.md)。
- 维护文档：读 [知识地图维护工作流](workflows/knowledge-map-maintenance.md) 和 [docs lint runbook](runbooks/docs-lint.md)。
