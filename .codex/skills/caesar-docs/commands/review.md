# caesar-docs:review

目标：判断知识地图是否足以作为可信的智能体工作环境。

## 结构依据

审查结构或无 docs 工程初始化质量时，读取 [../references/knowledge-map-structure.md](../references/knowledge-map-structure.md)。
审查目录或文件维护是否完整时，读取 [../references/directory-operations.md](../references/directory-operations.md)。
审查 `docs/wiki/`、代码目录浓缩解释、链路完整性或 wiki 与 domain/tag/glossary 的关系时，读取 [../references/wiki.md](../references/wiki.md)。
审查索引结构时，读取 [../references/index-structure.md](../references/index-structure.md)。
审查节点 schema 和枚举时，读取 [../references/node-schema.md](../references/node-schema.md)。
审查 `domain` 和 `tags` 时，读取 [../references/domain-tags.md](../references/domain-tags.md)。
审查 impact map 是否存在、是否可用于开工前约束时，读取 [../references/impact-map.md](../references/impact-map.md)。
审查 `AGENTS.md`、`ARCHITECTURE.md` 或 `README.md` 是否同步时，读取 [../references/repo-entry-sync.md](../references/repo-entry-sync.md)。
审查链接、事实优先级或验证规则时，读取 [../references/link-validation.md](../references/link-validation.md)。

## 审查顺序

1. **入口完整性**：`docs/index.md` 和 `docs/map/index.md` 能路由到 schema、工作流、领域、不变量、质量和参考。
2. **结构完整性**：文件夹结构、索引结构、节点结构和结构定义符合可移植知识地图规范。
3. **目录操作完整性**：新增/修改/维护不同目录时，是否同步了对应入口、索引、反向链接、验证证据和状态。
4. **仓库入口同步**：`AGENTS.md`、`ARCHITECTURE.md`、`README.md` 是否指向当前知识地图入口且没有过期路由。
5. **Impact Map 完整性**：`docs/workflows/impact-map.md` 存在，模板能在开工前约束读文档、改文件、风险、不变量和验证。
6. **Wiki 链路质量**：`docs/wiki/` 是否按代码目录组织，节点是否说明代码职责、入口、链路、上游下游和对应 `CODE:*`，是否从代码事实派生而不是凭概念先行。
7. **Domain/Tag/Glossary 派生质量**：`domain`、`tags`、`glossary` 是否基于 wiki 与 reference 中反复出现的稳定概念沉淀，是否避免把一次性文件名或临时任务升格成领域。
8. **Schema 完整性**：Markdown 节点有 frontmatter，`km_id` 唯一，枚举值有效，`related` id 可解析。
9. **链接完整性**：`KM:*`、相对 Markdown 链接、`CODE:*`、`CMD:*` 和 `source_of_truth` 路径可解析。
10. **控制质量**：任务工作流说明先读什么、何时停止阅读、验证什么、何时更新 memory。
11. **边界质量**：领域文档定义职责边界和“不是本层职责”的规则。
12. **参考准确性**：文件归属和区域地图与当前仓库结构一致。
13. **反馈卫生**：memory 只包含验证过的经验，不包含猜测或临时聊天记录。
14. **过期风险**：`last_verified`、过期文档清单和验证证据可信。

## 输出格式

最终审查输出默认使用中文，并按这个顺序组织：

1. 发现：按严重程度排序，包含文件路径和具体证据。
2. 开放问题：只列影响判断的问题。
3. 结论：给出简短通过/不通过判断。

## 验证

优先使用仓库专用检查。通用知识地图至少验证：

```bash
rg '^km_id:' docs
rg 'KM:|CODE:|CMD:' docs
find docs -name '*.md' -print
```

人工或脚本检查：

- 每个 docs Markdown 文件都有 frontmatter；
- `km_id` 值唯一；
- `KM:*` 标签能映射到现有 `km_id`；
- 相对链接指向存在的文件；
- `CODE:*` 路径存在；
- `source_of_truth` 路径存在，或明确表示命令；
- 没有残留已删除目录的过期引用。
