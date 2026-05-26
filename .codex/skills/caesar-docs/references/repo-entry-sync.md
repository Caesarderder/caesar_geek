# 仓库入口同步规则

`AGENTS.md`、`ARCHITECTURE.md` 和 `README.md` 是知识地图外层入口。它们不替代 `docs/`，但必须把人和智能体路由到当前知识地图。

## 职责边界

- `AGENTS.md`：智能体控制入口，说明先读顺序、任务路由、约束和验证责任。
- `ARCHITECTURE.md`：顶层架构入口，说明稳定世界观、粗粒度边界和真实事实的下钻入口。
- `README.md`：面向人类的项目入口；如果项目已有 README，只保留必要的 docs 链接，不强行重写产品说明。
- `docs/`：事实和工作流的长期来源。

## 初始化时

如果仓库已有 `AGENTS.md`：

- 加入或更新知识地图入口：`docs/index.md`、`docs/map/index.md`、`docs/map/workflows.md`。
- 说明详细事实必须落在 `docs/`，不要依赖隐藏 skill、聊天历史或本地记忆。
- 加入任务路由表或链接到 `docs/map/workflows.md`。
- 加入验证和反馈规则：改文档时检查链接，发现重复经验时写入 `docs/memory/`。

如果仓库已有 `ARCHITECTURE.md`：

- 明确它是顶层架构入口，不是完整实现索引。
- 链接 `docs/references/architecture/` 和 `docs/references/indexes/`。
- 说明真实文件归属以实现索引为准，架构叙事冲突时要报告。
- 保持稳定边界和推荐阅读顺序，不塞入细碎实现清单。

如果仓库已有 `README.md`：

- 只补充知识地图入口链接和维护提示。
- 不把 `README.md` 改成知识地图本体。

如果这些文件不存在：

- 不自动创建，除非用户要求或仓库已有 agent/architecture 入口惯例。
- 无 docs 工程初始化时，优先创建 `docs/` 最小启动集。

## 更新时

当知识地图发生以下变化，必须同步仓库入口：

- `docs/index.md`、`docs/map/index.md`、`docs/map/workflows.md` 路径或职责变化；
- 任务路由变化；
- 顶层领域边界变化；
- 事实优先级变化；
- 关键 architecture/reference/index 路径移动；
- 验证命令或反馈写入规则变化。

同步原则：

- `AGENTS.md` 更新任务路由、读文档顺序、验证责任和反馈路径。
- `ARCHITECTURE.md` 更新稳定边界、架构入口和“真实实现以哪个索引为准”。
- `README.md` 只更新面向人的入口链接。

## 审查时

检查：

- `AGENTS.md` 是否指向当前 `docs/` 入口和工作流索引；
- `AGENTS.md` 是否仍引用已删除路径或旧 workflow；
- `ARCHITECTURE.md` 是否把自己误写成完整实现索引；
- `ARCHITECTURE.md` 是否链接当前 architecture references 和 implementation indexes；
- `README.md` 是否有过期 docs 路径；
- 入口文件与 `docs/index.md`、`docs/map/index.md` 的事实优先级是否冲突。

如果入口文件与知识地图冲突：

1. 以当前代码、配置和 docs 索引为事实依据。
2. 更新入口文件的路由或标记相关 docs 节点为 `stale`。
3. 在最终回复中说明冲突和处理方式。
