# 目录级操作规则

新增、修改或维护知识地图文件时，先判断文件属于哪一层，再执行对应同步操作。不要只改单个文件而不更新入口、索引、schema、链接和验证证据。

## 通用操作顺序

任何目录下的新增/修改/维护都按这个顺序处理：

1. 定位：确认目标节点属于哪个 `km_type`、`domain`，是否已有同类节点。
2. 读入口：读取 `docs/index.md`、`docs/map/index.md` 和目标目录对应索引。
3. 改节点：更新 frontmatter、正文、链接、`source_of_truth`、`validated_by`、`related`、`tags`。
4. 改索引：同步 `docs/map/*` 或 `docs/references/indexes/*` 中的导航关系。
5. 改反向关系：更新引用该节点的 `related`、`KM:*` 链接和事实优先级说明。
6. 验证：运行最小链接/frontmatter 检查；必要时运行项目测试、类型检查或 runbook 命令。
7. 标记不确定性：不能验证的事实使用 `draft`，确认过期的事实使用 `stale` 或 `deprecated`。

## 根入口 `docs/index.md`

新增：

- 只有创建知识地图或缺少公共入口时新增。
- 必须链接 `docs/map/index.md`、`docs/map/schema.md`、`docs/map/workflows.md`。
- 必须说明目录分区和事实优先级。

修改：

- 新增/删除顶层目录时同步目录分区表。
- 事实优先级变化时同步入口说明。
- 主工作流、领域入口或关键 reference 改名时同步链接。

维护：

- 检查所有入口链接是否存在。
- 确认它仍是人和智能体的第一入口。
- 不放长篇架构事实，只保留导航和优先级。

## `docs/map/`

新增：

- 新增控制类节点前，确认是否应放在 `map/` 而不是 `workflows/`、`quality/` 或 `references/`。
- 新增 `map` 节点必须在 `docs/map/index.md` 中可发现。
- 新增 schema、domain、workflow、invariant 或 glossary 规则时，同步相关索引。

修改：

- 修改 `schema.md` 时同步所有受影响节点 frontmatter。
- 修改 `domains.md` 时同步 `docs/domains/` 节点和 `domain` 枚举说明。
- 修改 `workflows.md` 时同步 `docs/workflows/` 文件和任务路由。
- 修改 `invariants.md` 时检查相关 reference、runbook 和 review 规则。

维护：

- 检查控制入口是否能路由到 schema、workflows、domains、invariants、quality、references。
- 检查 `KM:*` 链接和 `related` 是否可解析。
- 保持 `map/` 短小导航化，不堆叠底层事实。

## `docs/domains/`

新增：

- 只有稳定职责边界需要长期路由时才新增领域节点。
- 先在 `docs/map/domains.md` 注册，再创建 `docs/domains/<domain>.md`。
- 使用 `domain` 节点标准章节，写清“职责”和“不是本层职责”。
- 同步 `docs/map/schema.md` 的 domain 枚举或扩展说明。

修改：

- 职责边界变化时同步文件归属索引、架构 reference 和相关工作流。
- 领域改名时批量更新 frontmatter、`KM:*` 链接、`related` 和 `domain:<domain>` tag。
- 无法确认归属时把受影响节点标记为 `draft`。

维护：

- 定期检查是否有领域过大、重叠或只服务一次性任务。
- 检查每个领域是否有入口、验证方式和反边界。
- 合并同义领域前先用 `rg` 查全引用。

## `docs/workflows/`

新增：

- 只有某类任务会重复执行且有稳定步骤时才新增 workflow。
- 新增前确认不能通过扩展现有 workflow 解决。
- 新增后必须登记到 `docs/map/workflows.md`。
- 工作流必须说明输入、步骤、停止条件、验证和相关节点。

修改：

- 流程步骤变化时同步 runbook、quality 规则和入口索引。
- 工作流新增必读 reference 时，在正文中明确“何时读取”。
- 工作流影响 domain/tag 判断时，同步 `domain-tags.md` 或相关 schema。

维护：

- 删除过期步骤，避免与实际命令或仓库结构漂移。
- 检查每条 workflow 是否说明“先读什么”和“何时停止阅读”。
- 检查验证步骤是否还能运行。

## `docs/wiki/`

新增：

- 只有代码目录承担稳定职责、经常被检索、形成跨文件链路或反复被误判时才新增 wiki 节点。
- 新增前确认对应代码路径存在，并检查是否已有同目录或父目录 wiki 节点可扩展。
- 新增后必须能从 `docs/wiki/index.md`、父级 wiki 节点、相关 domain、workflow 或 reference 发现。
- 节点必须说明对应代码、职责摘要、关键入口、核心链路、上游下游和验证方式。

修改：

- 代码目录职责、入口、链路、文件迁移或上下游变化时同步 wiki。
- wiki 抽象出稳定概念后，同步 `docs/domains/`、`docs/map/domains.md`、`docs/map/glossary.md` 或 tags。
- 如果 wiki 与文件归属、区域地图或架构 reference 冲突，报告冲突并以当前代码和实现索引校验。

维护：

- 检查 wiki 是否贴近代码目录结构但没有逐文件堆叠。
- 检查 `CODE:*`、`source_of_truth` 和相对链接是否仍指向存在路径。
- 检查上游下游链路是否完整，避免只有目录说明没有工作链路。
- 删除或迁移代码目录时，同步更新、标记 `deprecated` 或移除对应 wiki 节点和反向链接。

## `docs/references/`

新增：

- 只有事实密度高、会被多个节点引用、或实现落点需要稳定记录时才新增 reference。
- 架构链路放 `references/architecture/`。
- 约束和规范放 `references/constraints/`。
- 文件归属、模块索引、区域地图放 `references/indexes/`。
- 新增后必须从相关 domain、workflow 或 map 索引可达。

修改：

- 修改实现路径、文件归属或架构事实时，必须用当前代码、配置或测试验证。
- 修改 indexes 时同步受影响 domain 节点和 code-locating workflow。
- 修改 constraints 时同步 invariants、quality 或 code-writing-review workflow。

维护：

- 检查路径是否存在，删除或标记过期路径。
- 避免 reference 变成叙述性长文；事实要可追溯到 `source_of_truth`。
- 对高风险事实更新 `last_verified` 和 `validated_by`。

## `docs/memory/`

新增：

- 只有验证过、会改变未来行为的经验才写入 memory。
- 不写临时聊天记录、猜测、一次性 debug 过程。
- 新增 memory 后必须能链接到相关 workflow、domain、reference 或 quality 节点。

修改：

- 经验被新事实推翻时，标记 `stale` 或改写“以后怎么做”。
- 重复误判沉淀后，同步相关 workflow 的步骤或停止条件。
- 技术债变化后同步 references 或 quality。

维护：

- 定期清理不可验证、不可复用或已过期的记忆。
- 确认每条 memory 都有验证依据。
- memory 不作为实现事实最高来源；冲突时让位于代码、索引和 reference。

## `docs/decisions/`

新增：

- 只有长期结构、架构或流程取舍需要记录时才新增 ADR。
- ADR 必须写清决策、原因、影响和相关节点。
- 新增后链接到受影响的 map、domain、workflow 或 reference。

修改：

- ADR 原则通常不重写历史；后续变化优先新增 ADR 或追加状态说明。
- 决策失效时标记 `deprecated` 或 `stale`，并指向替代决策。

维护：

- 检查 ADR 的影响是否已同步到 schema、索引、workflow 或 runbook。
- 不把普通任务记录写成 ADR。

## `docs/runbooks/`

新增：

- 只有需要可重复执行的命令或维护步骤时才新增 runbook。
- 必须包含前置条件、命令、预期结果和失败处理。
- 命令锚点要能被 `CMD:*` 链接引用。

修改：

- 命令变化时同步 workflow、quality 和 `CMD:*` 链接。
- 如果命令依赖环境，写清工作目录、依赖和失败信号。

维护：

- 定期试运行关键命令或标记为未验证。
- 检查锚点是否仍能解析。
- 不把概念说明放进 runbook；概念放 domain/reference。

## `docs/quality/`

新增：

- 新增 lint、健康评分、过期文档清单或审查标准时放这里。
- 质量规则必须说明检查目标、检查方法和失败处理。
- 新增规则后同步 review workflow 和 docs-lint runbook。

修改：

- 检查规则变化时同步 runbook 命令和 review 输出标准。
- 新增过期文档时标记对应节点 `stale`，并给出修复入口。

维护：

- 定期移除已修复的 stale 项。
- 检查质量规则是否仍覆盖 frontmatter、链接、路径、domain/tag 和 source_of_truth。
- 避免 quality 节点存放业务事实。

## 目录变更矩阵

| 目录 | 新增时必须做 | 修改时必须做 | 维护时必须查 |
| --- | --- | --- | --- |
| `docs/` | 创建公共入口和事实优先级 | 同步顶层目录表 | 入口链接可达 |
| `docs/map/` | 登记控制节点 | 同步 schema/索引/不变量 | 路由完整、无长篇事实 |
| `docs/domains/` | 先注册领域再建节点 | 同步 frontmatter 和领域索引 | 边界清晰、无重叠 |
| `docs/workflows/` | 登记任务路由 | 同步 runbook/quality/reference | 步骤可执行、停止条件明确 |
| `docs/wiki/` | 连接到父级 wiki/domain/reference | 同步代码入口、链路和派生概念 | 贴近代码结构、链路完整、路径存在 |
| `docs/references/` | 连接到 domain/workflow/map | 用代码或配置验证事实 | 路径存在、事实不过期 |
| `docs/memory/` | 只写验证经验 | 同步 workflow 或标记 stale | 不含猜测和聊天残留 |
| `docs/decisions/` | 记录长期取舍 | 用状态或新 ADR 表达变化 | 影响已落到结构 |
| `docs/runbooks/` | 写命令和失败处理 | 同步 `CMD:*` 和 workflow | 命令仍可运行 |
| `docs/quality/` | 写检查目标和方法 | 同步 review/runbook | 规则覆盖关键漂移 |
