# Impact Map 工作流规范

Impact map 是 feedforward 机制：在 agent 写代码、做审查、迁移文档或重构前，先根据真实仓库结构和知识地图输出影响范围判断。它的目标是提前约束 agent 做对事，而不是事后补救。

初始化知识地图时必须创建：

```text
docs/workflows/impact-map.md
```

并在 `docs/map/workflows.md` 中登记 `KM:workflow.impact-map`。

## 什么时候写

以下任务开始前应先输出 impact map：

- 写代码；
- 修 bug；
- 做代码审查；
- 重构或迁移；
- 改文档结构；
- 改领域边界、文件归属、工作流、验证命令；
- 任务影响多个目录或多个 domain；
- 用户要求“先分析影响范围”。

如果任务非常小，例如单行错别字或明显无副作用的文案修改，可以跳过，但最终回复中说明跳过理由。

## 信息来源

impact map 必须来自真实仓库和知识地图：

- `AGENTS.md`
- `ARCHITECTURE.md`
- `docs/index.md`
- `docs/map/workflows.md`
- `docs/map/domains.md`
- `docs/map/invariants.md`
- `docs/references/indexes/*`
- 相关源码、配置、测试和 runbook

不要凭文件名直觉生成影响范围。实现落点优先使用文件归属、区域地图和实现索引。

## 标准模板

`docs/workflows/impact-map.md` 至少包含这个模板：

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

字段含义：

- `任务`：用户要完成的工作。
- `触发原因`：为什么需要 impact map，例如写代码、审查、迁移、跨领域修改。
- `受影响领域`：列出 `domain`，不确定时写 `待确认` 并说明要读哪个索引确认。
- `需要先读的文件`：最小必要文档和代码入口。
- `可能修改的文件`：预估修改落点；不确定时写候选路径和确认方式。
- `必须保持的不变量`：来自 `docs/map/invariants.md`、constraints 或架构边界。
- `验证方式`：测试、类型检查、lint、docs 检查或人工审查。
- `可能需要同步更新的文档`：包括 docs 节点、`AGENTS.md`、`ARCHITECTURE.md`、`README.md`。
- `风险`：跨域、状态一致性、确定性、链接漂移、过期事实等。
- `需要人确认的决策`：权限、范围、产品判断或无法从仓库验证的信息。

## 写法规则

1. 先判断受影响 `domain`；不清楚时读取 `docs/map/domains.md`。
2. 再判断真实实现落点；使用 `docs/references/indexes/*`，不要只看叙述性架构文档。
3. 如果触达权威逻辑、确定性、输入输出泵、预测或同步链路，必须写明对应风险和约束。
4. 如果改知识地图结构，必须列出要同步的索引、节点、入口文件和验证命令。
5. 如果影响 `AGENTS.md`、`ARCHITECTURE.md` 或 `README.md`，必须写进“可能需要同步更新的文档”。
6. impact map 应简短，足够指导下一步即可，不要变成完整设计文档。

## 与 Feedback 的关系

impact map 是做之前的 feedforward。任务完成后，必须用 feedback 检查实际结果：

- 实际修改文件是否超出 impact map；
- 是否有未同步的 docs、入口文件或索引；
- 验证是否按 impact map 执行；
- 是否发现可复用经验，需要写入 `docs/memory/`；
- 是否需要把节点标记为 `stale`、`draft` 或更新 `last_verified`。

如果实际影响范围和 impact map 不一致，最终回复中说明偏差，并更新相关知识地图节点。
