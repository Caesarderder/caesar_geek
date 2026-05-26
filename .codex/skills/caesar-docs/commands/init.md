# caesar-docs:init

目标：创建最小、可导航、可检查的中文知识地图。

## 必读结构定义

开始前读取 [../references/knowledge-map-structure.md](../references/knowledge-map-structure.md)，它定义目录结构、最小启动集和无 docs 工程初始化策略。
需要创建或规范化 `docs/wiki/` 时读取 [../references/wiki.md](../references/wiki.md)，它定义 wiki 的定位、目录镜像粒度、节点模板和与 domain/tag/glossary 的派生关系。
新增目录或文件时读取 [../references/directory-operations.md](../references/directory-operations.md)，判断应该同步哪些入口、索引和验证证据。
创建索引时读取 [../references/index-structure.md](../references/index-structure.md)。
创建节点 frontmatter 时读取 [../references/node-schema.md](../references/node-schema.md)。
创建领域或标签时读取 [../references/domain-tags.md](../references/domain-tags.md)。
创建 `docs/workflows/impact-map.md` 时读取 [../references/impact-map.md](../references/impact-map.md)。
需要设置 `AGENTS.md`、`ARCHITECTURE.md` 或 `README.md` 路由时读取 [../references/repo-entry-sync.md](../references/repo-entry-sync.md)。

## 步骤

1. 判断仓库是否已有 `docs/`、`AGENTS.md`、`ARCHITECTURE.md`、`README.md` 或其他事实入口。
2. 如果没有 `docs/`，按结构定义创建“最小启动集”，不要等待已有文档。
3. 如果已有 `docs/` 但结构不完整，保留可用事实，补齐入口、schema、索引、工作流和质量检查。
4. 创建或更新 `docs/index.md` 作为公共入口，创建或更新 `docs/map/index.md` 作为工作环境控制入口。
5. 创建或更新 `docs/map/schema.md`、`docs/map/workflows.md`、`docs/map/domains.md`、`docs/map/invariants.md` 和 `docs/map/glossary.md`。
6. 创建或更新结构定义要求的最小工作流、runbook、quality 和 memory 节点；其中必须包含 `docs/workflows/impact-map.md`。
7. 如果仓库需要快速代码检索层，创建 `docs/wiki/` 入口和少量高价值目录节点；wiki 只浓缩已验证代码事实，不替代实现索引。
8. 只有证据足够时才添加具体领域、架构和文件归属参考；不确定节点标记为 `draft`。
9. 按仓库入口同步规则更新已有 `AGENTS.md`、`ARCHITECTURE.md` 或 `README.md`；如果没有，只有用户要求时才创建。

不要编造详细架构事实。稀疏但准确的地图优于详细但靠猜的地图。

## 验证

初始化后至少验证：

```bash
rg '^km_id:' docs
rg 'KM:|CODE:|CMD:' docs
find docs -name '*.md' -print
```

检查每个 docs Markdown 文件都有 frontmatter，`km_id` 唯一，`KM:*` 能映射到现有 `km_id`，相对链接和 `CODE:*` 路径存在。
