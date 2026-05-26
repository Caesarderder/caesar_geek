# 链接、事实优先级与验证

## 链接结构

使用显式链接标签：

```md
[KM:domain.example](../domains/example.md)
[KM:workflow.code-writing-review](../workflows/code-writing-review.md)
[KM:reference.file-ownership](../references/indexes/file-ownership.md)
[CODE:ExampleService](../../src/example/service.ts)
[CMD:docs-lint](../runbooks/docs-lint.md#docs-lint)
```

检查规则：

- `KM:*` 必须匹配唯一 `km_id`。
- `CODE:*` 指向的路径必须存在。
- `CMD:*` 必须指向 runbook 中的锚点。
- `source_of_truth` 中的路径必须存在，除非它显式表示命令。
- `related` 中的 id 必须能解析到已知 `km_id`。
- 不允许引用已经删除的旧目录。

## 事实优先级

当事实冲突时按这个顺序处理：

1. 当前代码、配置、测试和脚本。
2. 文件归属、区域地图和实现索引。
3. wiki 中由代码验证过的目录浓缩解释和链路说明。
4. 架构参考和约束文档。
5. 工作流、runbook 和质量规则。
6. ADR 和 memory。
7. 叙述性说明。

如果冲突影响任务结论，报告冲突并标记相关节点为 `stale` 或 `draft`，不要静默选择一边。

## 最小验证

通用知识地图至少验证：

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
- `docs/wiki/` 节点的 `CODE:*`、`source_of_truth` 和上游下游链接能指回真实代码或有效 KM 节点。
