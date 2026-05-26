# caesar-docs:update

目标：让知识地图在仓库变化后保持一致。

## 结构依据

如果更新涉及目录结构或无 docs 工程补齐，读取 [../references/knowledge-map-structure.md](../references/knowledge-map-structure.md)。
如果更新涉及新增、修改或维护某个目录下的文件，读取 [../references/directory-operations.md](../references/directory-operations.md) 判断同步范围。
如果更新涉及 `docs/wiki/`、代码目录浓缩解释、代码链路、wiki 入口或从 wiki 派生 domain/tag/glossary，读取 [../references/wiki.md](../references/wiki.md)。
如果更新涉及索引，读取 [../references/index-structure.md](../references/index-structure.md)。
如果更新涉及节点 schema 或枚举，读取 [../references/node-schema.md](../references/node-schema.md)。
如果更新涉及 `domain`、`tags`、领域注册表或标签清理，读取 [../references/domain-tags.md](../references/domain-tags.md)。
如果更新涉及开工前影响范围、feedforward 约束或 `docs/workflows/impact-map.md`，读取 [../references/impact-map.md](../references/impact-map.md)。
如果更新涉及 `AGENTS.md`、`ARCHITECTURE.md` 或 `README.md`，读取 [../references/repo-entry-sync.md](../references/repo-entry-sync.md)。
如果更新涉及链接、事实优先级或验证规则，读取 [../references/link-validation.md](../references/link-validation.md)。

## 步骤

1. 确认变化来源：git diff、变更文件、issue/PR 上下文或用户描述。
2. 把变更文件映射到受影响的领域和参考节点。
3. 只更新受影响节点：
   - 代码目录职责、关键入口、调用链或文件链路变化时更新对应 `docs/wiki/` 节点；
   - 归属或职责变化时更新领域边界文档；
   - 流程变化时更新工作流文档；
   - 实现路径或事实来源变化时更新参考文档；
   - wiki 总结出稳定跨目录概念后，再同步 `docs/domains/`、`docs/map/domains.md`、`docs/map/glossary.md` 或 tags；
   - 验证命令或检查变化时更新 runbook/quality 文档；
   - 只有确认是重复经验时才更新 memory 文档。
4. 必要时更新 `last_verified`、`source_of_truth`、`validated_by`、`related` 和索引结构。
5. 保留明确的不确定性。没有验证前不要把节点升级为 `active`，应使用 `draft` 或 `stale`。
6. 运行地图 runbook 中最小相关验证。

## 冲突处理

当代码行为和文档冲突时，报告冲突。判断实现位置时，文件归属和参考索引通常优先于叙述性架构文档。

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

如果涉及代码变化，并且地图或仓库指导要求运行类型检查/测试，就运行仓库常规类型检查或测试命令。
