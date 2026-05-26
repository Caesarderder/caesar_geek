# Domain 与 Tag 治理

`domain` 和 `tags` 都用于组织知识地图，但职责不同：

- `domain` 是主归属边界，用来回答“这个节点主要属于哪个系统、模块或责任域”。它是导航骨架，数量应少、稳定、可解释。
- `tags` 是辅助检索索引，用来回答“这个节点还和哪些主题、流程、质量规则或决策有关”。它可以比 `domain` 更细，但必须有命名规则和定期清理。

`domain` 和 `tags` 不应该凭空设计。优先从 `docs/wiki/` 与 `docs/references/` 中已经验证、反复出现、能稳定路由的代码概念中沉淀；wiki 负责贴近代码目录解释事实，domain/tag 负责把这些事实变成可导航、可检索的地图骨架。

## Domain 创建规则

每个节点只能有一个主 `domain`。选择顺序：

1. 如果节点描述明确系统、模块、产品或架构边界，使用对应领域。
2. 如果节点服务多个领域且无法明确主归属，使用 `cross-domain`。
3. 如果节点属于知识地图自身、智能体记忆或文档维护，使用 `agent-memory`、`workflow` 或 `quality` 这类控制领域。
4. 不因为一次性任务、临时功能或单个文件创建新 `domain`。

新增 `domain` 前先检查：

- `docs/wiki/` 中是否已有多个相关目录或链路指向同一稳定概念；
- 该概念是否有明确职责边界和反边界；
- 该概念是否需要影响任务路由，而不只是帮助搜索。

新增 `domain` 必须同时满足：

- 会反复用于任务路由或归属判断；
- 有清晰职责边界和“不是本领域职责”的反边界；
- 能映射到一组稳定文件、模块、产品能力或工作流；
- 已在 `docs/map/domains.md` 登记；
- 必要时有 `docs/domains/<domain>.md` 领域节点。

新增领域节点时至少写清：

```text
目标
什么时候读
职责
不是本层职责
不变量
入口
验证
相关节点
```

## Domain 管理规则

`docs/map/domains.md` 是领域注册表，必须保存：

- 领域名；
- 对应 `KM:*` 链接；
- 职责摘要；
- 需要落到文件时读取哪个 reference/index。

领域节点放在 `docs/domains/`。如果项目领域值从通用值扩展为项目专用值，必须同步更新：

- `docs/map/domains.md`；
- `docs/map/schema.md` 的 `domain` 枚举或说明；
- 受影响节点的 frontmatter；
- 相关 `related` 和 `tags`。

删除或合并领域时，不要只改一个节点。先找出全部引用：

```bash
rg 'domain: old-domain|domain.old-domain|domain:old-domain|old-domain' docs
```

然后更新领域注册表、领域节点、相关节点 frontmatter、`KM:*` 链接和 references 索引。不能确认的新归属标记为 `draft`。

## Tag 创建规则

`tags` 只做辅助检索，不决定主归属。优先使用稳定前缀：

```text
domain:<domain>
workflow:<workflow-name>
reference:<reference-name>
quality:<quality-rule>
lint:<lint-rule>
decision:<decision-topic>
memory:<memory-topic>
risk:<risk-topic>
```

创建 tag 前先检查是否已有近义标签：

```bash
rg '^  - ' docs
rg 'tags:' docs
```

同时检查 wiki 中是否已有多个节点共享这个检索维度：

```bash
rg '<candidate-topic>|<candidate-symbol>|<candidate-path>' docs/wiki docs/references
```

只有满足以下条件之一才新增 tag：

- 多个节点会共享这个检索维度；
- 它能帮助审查、过滤、维护或统计；
- 它表示稳定流程、质量规则、风险类型或决策主题。

不要为单个临时任务、一次性 issue、短期分支名或随口描述创建 tag。不要使用无前缀自由标签，除非项目已有明确约定。

## Tag 管理规则

tag 应保持可搜索、可合并、可清理：

- 使用小写英文和连字符，避免空格和同义词漂移。
- 同一概念只保留一个写法，例如只用 `workflow:code-locating`，不要同时出现 `workflow:locate-code`。
- 领域相关 tag 使用 `domain:<domain>`，并确保 `<domain>` 已在领域注册表中存在。
- 质量、lint、决策、记忆类 tag 使用对应前缀，不混用。
- tag 不替代 `related`。节点间强关系写入 `related`，检索维度写入 `tags`。

定期维护时运行：

```bash
rg 'tags:' docs
rg '^  - [a-z]+:' docs
```

审查重点：

- 是否有同义 tag；
- 是否有只出现一次且没有长期价值的 tag；
- 是否有拼写错误或大小写漂移；
- `domain:<domain>` 是否对应现有 domain；
- tag 是否被误用来表达节点关系。

## Domain 与 Tag 判断标准

| 问题 | 倾向 |
| --- | --- |
| 它是否决定任务先读哪个领域节点？ | `domain` |
| 它是否代表稳定模块、系统边界或产品能力？ | `domain` |
| 它是否需要“不是本层职责”的反边界？ | `domain` |
| 它是否只是帮助搜索、过滤或审查？ | `tag` |
| 它是否可能同时贴到多个不同领域节点上？ | `tag` |
| 它是否只是质量、风险、决策或流程主题？ | `tag` |

简化规则：`domain` 是地图导航骨架，`tags` 是搜索和维护索引。`domain` 要少、稳、可解释；`tags` 可以多一点，但必须有前缀、能复用、可清理。

如果 wiki 中的代码事实尚未稳定，不要提前创建 domain；可以先在 wiki 节点使用已有 domain 和临时说明，等多个 wiki/reference 节点形成稳定边界后再沉淀。
