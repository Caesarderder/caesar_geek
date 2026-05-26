# 知识地图结构

本文件定义 `caesar-docs` 在任意仓库中创建或审查的通用知识地图。它必须能迁移到一个完全没有 `docs/` 的工程中，也必须能兼容已有文档的仓库。

## 目录

- [目录结构](#目录结构)
- [最小启动集](#最小启动集)
- [初始化策略](#初始化策略)

## 目录结构

推荐结构：

```text
docs/
|-- index.md
|-- map/
|   |-- index.md
|   |-- schema.md
|   |-- workflows.md
|   |-- domains.md
|   |-- invariants.md
|   `-- glossary.md
|-- domains/
|-- workflows/
|-- wiki/
|-- references/
|   |-- architecture/
|   |-- constraints/
|   `-- indexes/
|-- memory/
|-- decisions/
|-- runbooks/
`-- quality/
```

目录职责：

- `docs/index.md`：公共入口，说明知识地图是什么、先读什么、事实优先级和主索引。
- `docs/map/`：控制层，保存地图入口、schema、工作流索引、领域索引、不变量和术语表。
- `docs/domains/`：领域层，描述产品、模块、架构边界、归属和“不是本层职责”的规则。
- `docs/workflows/`：操作层，描述知识查询、代码定位、代码编写/审查、影响分析和地图维护流程。
- `docs/wiki/`：代码浓缩解释层，按接近工程代码的目录结构说明职责、入口、核心链路、上游下游和常见误判，用于快速检索和定位。
- `docs/references/`：参考层，保存事实密度较高的资料，例如架构细节、约束、命令、文件归属和区域地图。
- `docs/references/architecture/`：架构事实和系统链路。
- `docs/references/constraints/`：编码规范、业务约束、安全约束和不可破坏规则。
- `docs/references/indexes/`：文件归属、模块索引、区域索引和实现落点。
- `docs/memory/`：反馈层，保存验证过的重复误判、经验、操作记录和技术债。
- `docs/decisions/`：决策层，保存 ADR 和长期结构决策。
- `docs/runbooks/`：执行层，保存可运行维护步骤和命令。
- `docs/quality/`：传感层，保存 lint 规则、过期文档清单、健康评分和审查标准。

如果已有文档结构可用，优先保留现有事实和路径；只有结构缺少入口、schema、索引或检查能力时才补齐。

## 最小启动集

完全没有 `docs/` 的工程，至少创建这些文件：

```text
docs/index.md
docs/map/index.md
docs/map/schema.md
docs/map/workflows.md
docs/map/domains.md
docs/map/invariants.md
docs/map/glossary.md
docs/workflows/knowledge-query.md
docs/workflows/code-locating.md
docs/workflows/impact-map.md
docs/workflows/code-writing-review.md
docs/workflows/knowledge-map-maintenance.md
docs/wiki/index.md
docs/memory/index.md
docs/quality/lint-rules.md
docs/quality/stale-docs.md
docs/runbooks/docs-lint.md
docs/decisions/ADR-0001-knowledge-map-structure.md
```

可选但常用的首批参考节点：

```text
docs/references/indexes/file-ownership.md
docs/references/indexes/zone-map.md
docs/references/architecture/architecture-overview.md
docs/references/constraints/code-standards.md
```

`docs/wiki/index.md` 可以是稀疏入口：没有足够代码证据时只说明 wiki 用途、已有入口和待补目录，不要编造模块解释。

只有能从仓库文件、README、配置、测试或用户提供材料中得到证据时，才创建具体领域和参考事实；否则先用 `draft` 节点占位。

## 初始化策略

无 docs 工程初始化时：

1. 先创建最小启动集。
2. 从 README、package/config、测试命令、目录结构中提取可验证事实。
3. 为未知领域创建少量 `draft` 节点，不填充猜测细节。
4. 创建 `docs/workflows/impact-map.md`，让 agent 在写代码、审查或迁移文档前先生成 repository impact map。
5. 创建或登记 `docs/wiki/` 作为代码浓缩解释层；优先为最常被定位的顶层代码目录建立入口。
6. 把“如何继续补全”写入 `docs/workflows/knowledge-map-maintenance.md` 或 `docs/quality/stale-docs.md`。
7. 运行最小验证，确认 frontmatter、链接和路径可解析。
