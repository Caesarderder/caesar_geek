---
km_id: wiki.packages
km_type: reference
domain: code
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - packages/shared/src/index.ts
  - packages/workspace/src/index.ts
  - packages/agent-runtime/src/index.ts
validated_by:
  - manual-code-read
tags:
  - wiki:code-map
  - domain:shared
  - domain:workspace
  - domain:runtime
related:
  - domain.shared
  - domain.workspace
  - domain.runtime
  - reference.file-ownership
---

# packages

## 目标

说明 `packages/` 下可复用库的职责边界。

## 对应代码

- `CODE:packages/shared`
- `CODE:packages/workspace`
- `CODE:packages/agent-runtime`

## 职责摘要

- `packages/shared` 提供 Zod schemas、TypeScript types、时间工具和高风险动作分类。
- `packages/workspace` 处理 awesome layout、registry 默认路径、路径 scope、git repo 检测和 clone-first ultrawork。
- `packages/agent-runtime` 处理 geek task draft、spawn、日志事件、takeover、interrupt、terminate、shutdown。

## 关键入口

- `CODE:packages/shared/src/index.ts`
- `CODE:packages/workspace/src/index.ts`
- `CODE:packages/agent-runtime/src/index.ts`

## 核心链路

1. Server 引入 shared types 和 policy classifier。
2. Server 创建 awesome 或 ultrawork 时调用 workspace 包。
3. Server 创建 task 后把 task 交给 agent-runtime。
4. Agent-runtime 通过 persistence interface 回写 server store。

## 上游与下游

- 上游：`apps/server`。
- 下游：Node filesystem、git、child_process 和 SQLite store 接口。

## 常见误判

- `packages/shared` 的 policy classifier 只分类，不执行审批流。
- `packages/workspace` 不负责持久化表。
- `packages/agent-runtime` 不知道 ultrawork clone 细节。

## 验证方式

- `pnpm --filter @caesar-geek/shared test`
- `pnpm --filter @caesar-geek/workspace test`
- `pnpm --filter @caesar-geek/agent-runtime typecheck`

## 相关节点

- KM:domain.shared
- KM:domain.workspace
- KM:domain.runtime
