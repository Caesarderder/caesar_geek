---
km_id: domain.runtime
km_type: domain
domain: runtime
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - packages/agent-runtime/src/index.ts
validated_by:
  - manual-code-read
tags:
  - domain:runtime
related:
  - domain.backend
  - reference.file-ownership
---

# Runtime 领域

## 目标

维护 geek task 的进程生命周期、事件输出、接管、中断、终止和 shutdown 恢复标记。

## 什么时候读

- 修改 `packages/agent-runtime`。
- 改 task 状态机、日志捕获、takeover 行为或 process registry。

## 职责

- 创建 task draft。
- 用 `child_process.spawn` 启动命令。
- 写入 task status、runtime session、task events 和 takeover events。
- 提供 claim、follow-up、interrupt、terminate、shutdown。

## 不是本层职责

- 不决定 API 输入 schema；API 在 `apps/server`。
- 不做 UI 展示。
- 不决定 awesome/ultrawork 路径布局。

## 不变量

- command 为空时不能启动。
- task 的 `cwd` 由调用方传入，当前产品不变量要求它是 selected awesome path。
- shutdown 必须把 live task 标记成可恢复解释的状态。

## 入口

- `CODE:packages/agent-runtime/src/index.ts`

## 验证

- `pnpm --filter @caesar-geek/agent-runtime typecheck`
- `pnpm --filter @caesar-geek/agent-runtime test`

## 相关节点

- KM:domain.backend
- KM:map.invariants
