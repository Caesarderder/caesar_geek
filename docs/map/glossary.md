---
km_id: map.glossary
km_type: map
domain: cross-domain
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - packages/shared/src/index.ts
validated_by:
  - manual-code-read
tags:
  - domain:cross-domain
related:
  - map.domains
  - map.invariants
---

# 术语表

| 术语 | 含义 |
| --- | --- |
| `awesome` | 顶层本地工作空间和执行上下文，拥有任务元数据、runtime 状态和 ultrawork 引用 |
| `ultrawork` | awesome 内从本地 git repo 派生的工作单元，当前实现以 git clone 为第一策略 |
| `geek` | agent task/process，第一版本映射为从 awesome 目录启动的 Codex CLI 或 stub 命令 |
| gateway | `apps/server` 中的 Fastify/tRPC 本地服务，隔离浏览器与本地文件系统/进程 |
| registry | gateway 级 known-awesome 索引，默认路径来自 `CAESAR_GEEK_HOME` 或用户 home 下 `.caesar-geek` |
| takeover | operator 对运行中任务的接管事件，当前实现包含 claim、interrupt、terminate、follow_up |
| recovery | 通过持久化记录恢复 awesome、ultrawork、task、事件和 last-known runtime 状态 |
