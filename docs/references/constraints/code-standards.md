---
km_id: reference.code-standards
km_type: reference
domain: quality
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - package.json
  - tsconfig.base.json
  - apps/web/src/main.tsx
  - apps/server/src/app.ts
validated_by:
  - manual-code-read
tags:
  - quality:code-standards
  - domain:quality
related:
  - quality.lint-rules
  - map.invariants
---

# 代码标准

## 目标

记录当前仓库已能从配置和代码验证的工程标准。

## 事实

- TypeScript 使用 strict 配置、`exactOptionalPropertyTypes` 和 `noUncheckedIndexedAccess`。
- 包使用 ESM：根和子包 `package.json` 均为 `"type": "module"`。
- 根脚本通过 `pnpm -r` 对 workspace 执行 build/typecheck/lint/test。
- 当前 lint 脚本实际等价于 TypeScript typecheck。
- UI 代码使用 React 函数组件、TanStack Query、lucide-react icons。
- Server 使用 Fastify、tRPC 和 Zod；SQLite store 当前在 `apps/server/src/db/sqlite.ts` 手写。

## 入口或路径

- `CODE:tsconfig.base.json`
- `CODE:package.json`

## 验证

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## 相关节点

- KM:quality.lint-rules
