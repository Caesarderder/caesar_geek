---
km_id: domain.shared
km_type: domain
domain: shared
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - packages/shared/src/index.ts
  - packages/shared/src/index.test.ts
validated_by:
  - manual-code-read
tags:
  - domain:shared
  - risk:safety-boundary
related:
  - map.schema
  - domain.backend
  - domain.workspace
  - domain.runtime
---

# Shared 领域

## 目标

维护跨包共享的 Zod schema、TypeScript types、时间工具和高风险动作分类。

## 什么时候读

- 改公开数据模型。
- 改 policy classification。
- 改 `awesome`、`ultrawork`、`geek` task 状态或事件 payload。

## 职责

- 定义 `Awesome`、`RegistryRecord`、`Ultrawork`、`GeekTask`、`TaskEvent`、`TakeoverEvent`、`RuntimeSession`、`TaskRecovery`。
- 统一 `GeekTaskStatus` 枚举。
- 分类 out-of-scope write、broad delete、remote push、global install、system config、sensitive file access、secret exfiltration。

## 不是本层职责

- 不直接执行策略。
- 不访问文件系统或进程。

## 不变量

- 改 schema 必须同步 server、frontend 和 docs glossary。
- 高风险分类缺口可能影响本地安全边界，必须配测试。

## 入口

- `CODE:packages/shared/src/index.ts`

## 验证

- `pnpm --filter @caesar-geek/shared typecheck`
- `pnpm --filter @caesar-geek/shared test`

## 相关节点

- KM:map.schema
- KM:map.glossary
