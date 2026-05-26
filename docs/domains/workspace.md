---
km_id: domain.workspace
km_type: domain
domain: workspace
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - packages/workspace/src/index.ts
  - packages/workspace/src/index.test.ts
validated_by:
  - manual-code-read
tags:
  - domain:workspace
  - risk:safety-boundary
related:
  - domain.backend
  - reference.file-ownership
---

# Workspace 领域

## 目标

维护 awesome 布局、known-awesome registry 默认路径、路径范围判断、git repo 检测和 clone-first ultrawork 创建。

## 什么时候读

- 修改 `packages/workspace`。
- 涉及路径安全、workspace layout、git clone/worktree 策略。

## 职责

- 生成 awesome 目录结构。
- 校验 candidate 路径是否在 scope 内。
- 解析 ultrawork destination。
- 校验 source repo 是 git repository。
- clone ultrawork 并读取 branch/head metadata。

## 不是本层职责

- 不保存 SQLite 表；保存逻辑在 `apps/server`。
- 不启动 geek process；runtime 在 `packages/agent-runtime`。

## 不变量

- `ultraworks/<slug>` 必须位于 awesome 的 `ultraworks` 目录下。
- 当前第一策略是 `clone`，后续 worktree 应通过策略接口扩展。

## 入口

- `CODE:packages/workspace/src/index.ts`

## 验证

- `pnpm --filter @caesar-geek/workspace typecheck`
- `pnpm --filter @caesar-geek/workspace test`

## 相关节点

- KM:domain.backend
- KM:reference.file-ownership
