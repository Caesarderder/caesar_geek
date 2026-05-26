---
name: caesar-docs
description: 用于初始化、更新、审查或在知识地图约束下开展仓库工作，使其成为人和智能体共用的中文工作环境。适用于已有 docs 的仓库，也适用于完全没有 docs 的工程；支持 caesar-docs:work 作为使用本 skill 工作时的通用开工入口，caesar-docs:init 从零创建可移植知识地图，caesar-docs:update 根据代码或架构变化更新地图，caesar-docs:review 审查结构、索引、节点和链接质量。命令细节拆分在 commands/work.md、commands/init.md、commands/update.md、commands/review.md，结构细节拆分在 references/ 下。
---

# caesar-docs

这是 `caesar-docs` skill 的入口披露文档。它只说明使用环境、共用规则和命令路由；具体执行步骤和结构定义放在独立文档中。

## 中文环境

默认使用中文执行本 skill：

- 与用户沟通、审查结论、计划、发现和总结默认使用中文。
- 新增或更新的知识地图正文、标题、表格说明和运行手册说明默认使用中文。
- 保留机器可读标识的英文稳定性，包括 `caesar-docs:*`、`km_id`、`km_type`、`domain`、`status`、`source_of_truth`、`validated_by`、`related`、目录名、文件名、代码符号、命令和链接标签。
- 如果现有节点正文是中文，沿用中文风格；如果需要保留英文术语，首次出现时给出中文语境或中文说明。
- 不把只存在于本地 skill、聊天上下文或隐藏记忆里的内容当作事实来源；长期事实必须写入 `docs/` 知识地图。

## 工作环境模型

把知识地图当成控制系统，而不是普通文档堆。

- **控制层**：入口、schema、工作流、不变量和任务路由。
- **前馈层**：领域边界、架构地图、文件归属和“先读什么”规则，用来在编辑前约束工作方向。
- **Wiki 层**：代码目录的浓缩解释层，通常放在 `docs/wiki/`，用于让人和智能体按接近工程代码的路径快速检索、定位和掌握代码链路。
- **传感层**：lint 规则、链接检查、过期文档检测、测试和审查清单。
- **反馈层**：记忆、误判、经验、ADR 和 runbook，用来记录工作后发现的漂移。
- **执行层**：具体步骤、命令、脚本和验证流程。

知识地图必须让人和智能体使用同一批文件。不要依赖隐藏记忆、私有聊天上下文或只存在本地的 skill 作为事实来源。

## 命令路由

根据用户请求选择命令文档：

- `caesar-docs:work`：读取 [commands/work.md](commands/work.md)，在使用本 skill 开始实际工作时先约束知识地图入口、impact map、文件范围、验证和知识反馈。
- `caesar-docs:init`：读取 [commands/init.md](commands/init.md)，创建或规范化通用知识地图结构。
- `caesar-docs:update`：读取 [commands/update.md](commands/update.md)，在代码、架构、工作流或归属变化后更新知识地图。
- `caesar-docs:review`：读取 [commands/review.md](commands/review.md)，审查知识地图的正确性和可维护性。

如果用户没有显式给出模式，就按最安全的含义推断：审查/检查类请求使用 `review`，已有文档修改或知识地图同步使用 `update`，只有仓库没有清晰地图或用户明确要求初始化时才使用 `init`；其他使用本 skill 开展仓库工作的请求使用 `work`。

## 结构定义

需要从零创建、规范化或判断知识地图结构时，按需读取这些 reference：

- [references/knowledge-map-structure.md](references/knowledge-map-structure.md)：目录结构、最小启动集、初始化策略。
- [references/wiki.md](references/wiki.md)：`docs/wiki/` 的定位、目录镜像规则、链路维护、更新和审查规则。
- [references/directory-operations.md](references/directory-operations.md)：不同目录新增、修改、维护时的同步操作。
- [references/index-structure.md](references/index-structure.md)：公共入口、控制入口、工作流索引、领域索引和实现索引。
- [references/node-schema.md](references/node-schema.md)：节点 frontmatter、正文结构和结构枚举。
- [references/domain-tags.md](references/domain-tags.md)：`domain` 与 `tags` 的创建、管理、维护规则。
- [references/impact-map.md](references/impact-map.md)：impact map 的用途、生成时机、模板和写法。
- [references/link-validation.md](references/link-validation.md)：链接标签、事实优先级和验证规则。
- [references/repo-entry-sync.md](references/repo-entry-sync.md)：`AGENTS.md`、`ARCHITECTURE.md`、`README.md` 与 `docs/` 的同步规则。

## 共用发现规则

改文件前先检查本地仓库：

1. 读取仓库指导文件（如果存在）：`AGENTS.md`、`ARCHITECTURE.md`、`README.md`。
2. 用 `rg --files -g 'docs/**' -g '*ARCHITECTURE*' -g 'AGENTS.md'` 查找地图入口。
3. 优先使用仓库当前的地图入口，而不是过期说明。常见入口：
   - `docs/index.md`
   - `docs/map/index.md`
   - `docs/map/schema.md`
   - `docs/map/workflows.md`
4. 如果说明互相冲突，先报告冲突。文档结构以当前地图入口和 schema 为准；实现位置以文件归属和参考索引为准。

读到下一步已经明确时就停止，不要为了单个任务展开整棵文档树。

## 共用编辑规则

- 事实放在 `docs/`，不要只写在 skill 里。
- 索引保持短小并偏导航；详细事实放到 references。
- 优先更新已有节点，不要创建平行重复节点。
- 不要在多个文件里复制同一个事实来源；用链接指向它。
- 用 ADR 记录长期结构决策。
- 只有验证过、会改变未来智能体行为的反馈才写入 memory。
- 地图过渡期要显式标记旧路径为 deprecated 或 stale，不要静默混用新旧布局。
