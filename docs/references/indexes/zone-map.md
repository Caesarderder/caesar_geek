---
km_id: reference.zone-map
km_type: reference
domain: code
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - apps
  - packages
  - .omx/plans/local-ai-workspace-gateway-plan.md
validated_by:
  - manual-code-read
tags:
  - reference:zone-map
  - domain:code
related:
  - reference.file-ownership
  - reference.architecture-overview
---

# 区域地图

## 目标

按仓库区域说明代码边界和常见修改影响。

## 事实

| 区域 | 主要职责 | 常见影响 |
| --- | --- | --- |
| `apps/server` | 本地 gateway、API、事件、SQLite store | API contract、recovery、registry、task persistence |
| `apps/web` | 本地 operator console | UI state、表单、任务控制、事件展示 |
| `packages/shared` | 跨包 schema/type/policy | 所有 app/package 的类型兼容性 |
| `packages/workspace` | 本地路径和 git workspace 操作 | 文件系统安全边界、ultrawork clone |
| `packages/agent-runtime` | geek process runtime | task 状态机、日志、takeover、shutdown |
| `.omx` | 规划、访谈、上下文、运行状态 | 只作规格和计划来源，不替代当前实现 |
| `docs` | 知识地图 | 工作流、领域、wiki、质量检查 |

## 入口或路径

- `CODE:apps`
- `CODE:packages`
- `CODE:.omx`
- `CODE:docs`

## 验证

- `find . -maxdepth 2 -type d -not -path './.git*'`

## 相关节点

- KM:reference.file-ownership
- KM:reference.wiki-index
