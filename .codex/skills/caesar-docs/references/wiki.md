# Wiki 层规则

`docs/wiki/` 是知识地图里的代码浓缩解释层。它的目标是让人和智能体按接近工程代码的目录结构快速检索、定位和掌握代码链路，然后再下钻到实现索引、领域边界、架构 reference 和真实代码。

## 定位

wiki 不是普通百科，也不是替代代码的二次实现说明。

- `docs/wiki/` 贴近代码目录结构，回答“这个目录/模块里有什么、入口在哪里、链路怎么走、和哪些上下游相连”。
- `docs/references/indexes/` 更偏实现落点索引，回答“具体路径归谁、用途是什么、验证依据是什么”。
- `docs/domains/` 更偏稳定职责边界，回答“这个概念属于哪个领域，不属于什么”。
- `docs/map/glossary.md` 更偏术语标准化，回答“这个词在本工程里是什么意思”。

简化规则：wiki 从代码归纳事实，domain/tag/glossary 从 wiki、reference 和反复出现的稳定代码概念中沉淀。

## 目录镜像规则

wiki 目录应尽量接近工程代码目录，但不是逐文件复制。

- 对高价值代码目录创建 `docs/wiki/<CodeDir>/<CodeDir>.md` 或仓库已有的等价入口。
- 目录名优先沿用代码目录名，保留大小写，避免引入无法映射回代码的概念名。
- 只为承担稳定职责、经常被检索、或形成跨文件链路的目录创建 wiki 节点。
- 叶子文件只有在入口关键、逻辑复杂、或经常被误判时才单独建 wiki 节点。
- 自动生成内容放在清晰标记的子目录，例如 `docs/wiki/_autogen/`，并说明生成来源和刷新方式。

允许 wiki 与代码结构不完全一一对应，但偏差必须可解释：聚合多个小目录、拆分巨大目录或保留历史路径时，要在入口节点说明映射关系。

## Wiki 节点内容

wiki 节点优先写浓缩事实和链路，不写长篇教程。推荐章节：

```text
目标
对应代码
职责摘要
关键入口
核心链路
上游与下游
常见误判
验证方式
相关节点
```

写法要求：

- `对应代码` 使用 `CODE:*` 链接或相对路径，必须能指回真实文件或目录。
- `关键入口` 只列读代码时应该先看的入口，不穷举全部文件。
- `核心链路` 写清调用、数据、事件、状态或生命周期的方向。
- `上游与下游` 用来保证链路不断：谁创建它、谁调用它、它输出给谁。
- `常见误判` 只写已验证的误判，例如“名字像 Runtime 但实际是编辑期路径存根”。
- 不确定事实标记为 `draft`，不要为了完整性编造解释。

## Frontmatter 建议

wiki 节点仍遵守通用节点 schema。推荐：

```yaml
---
km_id: wiki.engine-gamecontrol
km_type: reference
domain: code
status: active
owner: caesar-maintainers
last_verified: 2026-05-14
source_of_truth:
  - assets/TypeScript/Engine/GameControl
validated_by:
  - manual-code-read
tags:
  - wiki:code-map
  - domain:code
related:
  - reference.file-ownership
---
```

`km_type` 默认使用 `reference`，因为 wiki 承载的是从代码验证过的浓缩事实。不要为了 wiki 新增 `km_type`，除非仓库 schema 已明确扩展。

## 与 Domain/Tag/Glossary 的关系

domain、tag 和 glossary 应以 wiki 与 reference 中反复出现、可验证、可复用的概念为基础。

- 新增 `domain` 前，先检查 wiki 是否已经显示该概念有稳定职责边界、多个相关节点和明确反边界。
- 新增 `tag` 前，先检查 wiki 和 references 中是否有多个节点需要同一检索维度。
- 新增 glossary 术语前，先检查 wiki 是否已经出现同词不同义、跨目录复用、或容易误解的概念。
- wiki 发现稳定概念后，同步 `docs/map/domains.md`、`docs/domains/`、`docs/map/glossary.md` 或 tags；不要只把概念留在 wiki。
- 如果 domain/tag/glossary 与 wiki 事实冲突，先以代码和 wiki 的验证事实定位冲突，再标记过期节点或更新控制层。

## 更新规则

代码变化后按这个顺序维护 wiki：

1. 找出受影响代码目录和已有 wiki 节点。
2. 用当前代码、配置、测试或脚本验证职责、入口和链路是否变化。
3. 更新 wiki 节点的 `对应代码`、`关键入口`、`核心链路`、`上游与下游` 和 `last_verified`。
4. 若路径、归属或边界变化，同步 `docs/references/indexes/`、`docs/domains/` 和 `docs/map/*`。
5. 若抽象概念变稳定，再更新 domain/tag/glossary；若概念消失，标记相关节点为 `stale` 或移除 tag。
6. 运行最小链接和路径检查。

不要让 wiki 只增不删。删除、迁移或废弃代码目录时，对应 wiki 要更新为新路径、标记 `deprecated`，或删除并修正所有反向链接。

## Review 规则

审查 wiki 时重点看这些问题：

- 是否存在代码目录但没有对应的高层 wiki 入口，导致智能体只能靠 `rg` 从零猜。
- wiki 是否逐文件堆叠而没有职责、入口和链路总结。
- wiki 节点是否缺少 `CODE:*` 或可验证 `source_of_truth`。
- 链路是否断裂：只有“本目录做什么”，没有上游、下游和数据/调用方向。
- domain/tag/glossary 是否脱离 wiki 和代码事实，变成先验概念分类。
- wiki 是否与 `file-ownership`、`zone-map` 或架构 reference 冲突。
- 自动生成 wiki 是否标明来源、生成时间、刷新方式和人工维护边界。

审查结论必须区分：

- 代码事实错误；
- wiki 链路不完整；
- wiki 与 reference/index 冲突；
- 控制层没有从 wiki 沉淀出 domain/tag/glossary；
- 只是表达不够清晰但不影响定位。

## 验证

通用检查：

```bash
find docs/wiki -name '*.md' -print
rg 'CODE:|source_of_truth|related:' docs/wiki
rg '^km_id:' docs/wiki
```

人工检查：

- wiki 节点能否从 `docs/index.md` 或其他入口发现；
- 每个重要 wiki 节点是否能指回真实代码路径；
- 关键目录是否至少有入口、职责、关键入口、核心链路、上游下游；
- wiki 总结出的稳定概念是否已沉淀到 domain/tag/glossary 或明确说明暂不沉淀。
