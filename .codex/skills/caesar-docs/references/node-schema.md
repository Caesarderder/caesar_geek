# 节点结构与 Schema

每个 Markdown 知识节点必须包含 YAML frontmatter。正文默认中文，字段名和枚举值保持英文以便机器解析。

## 通用 Frontmatter

```yaml
---
km_id: domain.example
km_type: domain
domain: example
status: active
owner: maintainers
last_verified: 2026-05-11
source_of_truth:
  - docs/references/example.md
validated_by:
  - manual-docs-review
tags:
  - domain:example
related:
  - map.index
---
```

字段定义：

- `km_id`：唯一机器可读 id，格式为 `{km_type}.{slug}`。
- `km_type`：节点类型，只使用结构定义中的枚举值。
- `domain`：节点主归属领域；跨领域节点使用 `cross-domain`。
- `status`：节点状态；不确定事实使用 `draft`，过期事实使用 `stale` 或 `deprecated`。
- `owner`：维护者或维护群体。
- `last_verified`：最后验证日期，使用 `YYYY-MM-DD`。
- `source_of_truth`：事实来源路径或命令。
- `validated_by`：实际运行过的检查、脚本、测试或人工审查。
- `tags`：机器可搜索标签。
- `related`：相关 `km_id` 列表，不写自由文本。

## 正文标准章节

领域节点：

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

工作流节点：

```text
目标
输入
步骤
停止条件
验证
相关节点
```

参考节点：

```text
目标
事实
入口或路径
验证
相关节点
```

记忆节点：

```text
目标
已验证经验
触发条件
以后怎么做
验证依据
相关节点
```

Runbook 节点：

```text
目标
前置条件
命令
预期结果
失败处理
相关节点
```

## 结构枚举

`km_type` 只使用这些值：

```text
map
domain
workflow
invariant
decision
runbook
quality
reference
memory
```

`status` 只使用这些值：

```text
active
draft
stale
deprecated
```

通用 `domain` 值：

```text
product
code
architecture
workflow
quality
agent-memory
cross-domain
```

项目可以增加自己的领域值，例如 `frontend`、`backend`、`servercontext`、`localcontext`。新增领域必须在 `docs/map/domains.md` 中登记。
