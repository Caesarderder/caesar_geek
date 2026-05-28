---
km_id: decision.0002-gateway-agent-split
km_type: decision
domain: architecture
status: active
owner: caesar-maintainers
last_verified: 2026-05-29
source_of_truth:
  - user-interview-2026-05-29
  - docs/references/architecture/local-agent-core-rules.md
validated_by:
  - manual-requirements-review
  - manual-code-read
tags:
  - domain:architecture
related:
  - reference.local-agent-core-rules
  - reference.architecture-overview
---

# ADR-0002: 将公网 Gateway 与本地 Agent 拆为两个仓库

## 决策

未来架构按两个仓库分工：

- `caesar_gateway`：公网 Gateway，部署在阿里云 ECS，提供登录、Web UI、Agent registry、会话 registry、事件持久化和 WSS 转发。
- `caesar_geek`：本地 Agent/runtime，部署在家里 Mac mini，负责 Git repo 登记、worktree 创建、Codex 长会话和本地进程管理。

## 原因

- 公网控制面与本地执行面的安全边界不同。
- Gateway 不应该拥有直接执行 Mac mini shell/Codex 的能力。
- Agent 需要访问本地 repo、tmux/PTY、Codex CLI 和 worktree，天然属于 Mac mini 本地环境。

## 影响

- `caesar_geek` 当前已有 web/server/runtime monorepo 结构；后续需要决定保留本地开发 UI，还是收敛为 Agent/runtime 包。
- 跨仓库协议必须版本化，避免 Gateway 与 Agent schema 漂移。
- 文档和实现都必须避免把 Gateway 职责重新放回 `caesar_geek`。

## 相关节点

- KM:reference.local-agent-core-rules
- KM:reference.architecture-overview
