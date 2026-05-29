---
km_id: reference.cloud-agent-codex-session-concepts
km_type: reference
domain: architecture
status: active
owner: caesar-maintainers
last_verified: 2026-05-29
source_of_truth:
  - ../.omx/specs/deep-interview-cloud-agent-chat-mvp.md
  - ../.omx/context/cloud-agent-chat-next-step-20260528T164441Z.md
  - ../.omx/specs/deep-interview-cloud-agent-codex-session-mvp.md
  - ../.omx/plans/ralplan-cloud-agent-codex-session-mvp.md
  - ../.omx/context/cloud-agent-codex-session-mvp-20260528T171002Z.md
  - ../.omx/reports/team-commit-hygiene/implement-omx-plans-ralplan-cl.md
  - packages/shared/src/index.ts
  - packages/cloud-agent/src/index.ts
  - packages/agent-runtime/src/index.ts
  - packages/workspace/src/index.ts
validated_by:
  - manual-omx-read
  - manual-code-read
  - geek-targeted-tests-2026-05-29
tags:
  - domain:architecture
  - domain:runtime
  - domain:workspace
  - domain:shared
  - mvp:cloud-agent-codex-session
related:
  - reference.local-agent-core-rules
  - reference.architecture-overview
  - reference.zone-map
  - reference.file-ownership
---

# Cloud Agent Codex Session 工程概念

## 目标

把根目录 `.omx` 里关于 Cloud Agent Codex Session MVP 的工程概念整理为 `caesar_geek` 的本地执行面参考。后续修改 shared/workspace/cloud-agent/agent-runtime 前，先读本节点确认产品语言和执行边界。

## 概念模型

| 概念 | Geek 视角 | 当前实现入口 |
| --- | --- | --- |
| World | Mac mini 上的本地执行世界，主动连接 Gateway，持有 Issue/repo/worktree/session 的本地真相 | `packages/cloud-agent/src/index.ts` |
| World runtime | outbound WebSocket client + request handler，接收 Gateway typed request 并返回 typed result/output | `CloudAgent`、`InMemoryWorldRuntime` |
| Issue | 一个用户目标的本地工作容器，拥有 rootPath 和 worktreeIds | `InMemoryWorldRuntime` MVP 内存模型；workspace 包可扩展持久化布局 |
| Repo | World 发现或导入的 Git repo 记录；浏览器只能提供 URL/ref/name metadata，不提供 credential | `packages/shared/src/index.ts` protocol validation；`packages/workspace/src/index.ts` workspace helpers |
| Worktree | Issue 下的独立工作目录；session cwd 必须在 Issue root 或已知 worktree 内 | `packages/agent-runtime/src/index.ts` scope validation |
| Agent | 在 worktree/Issue scope 内启动的 Codex CLI 执行器 | `CodexSessionManager` |
| Session | tmux-backed Codex 长会话，支持 start/input/output/list/select/interrupt/terminate | `CodexSessionManager` + cloud protocol |
| Output buffer | World runtime 的 session output 缓冲，用于 Gateway/UI 切换时补上下文 | `CodexSessionRecord.outputBuffer` |

## `.omx` 事实来源

- Chat MVP spec 证明传输链路：Gateway 页面 -> outbound Mac Agent -> constrained local probe -> Gateway/UI output。
- Next-step context 将目标从探针推进到真实 Codex CLI Session。
- Codex Session spec 明确 World/Issue/repo/worktree/Agent/session ontology，并禁止把 Mac mini 本身称为 Agent。
- Ralplan 选择“在现有 repos 增量扩展”方案：Gateway 仍无执行依赖；Geek 扩展 shared/workspace/cloud-agent/agent-runtime。
- Team commit hygiene report 汇总了已完成实现 lane：协议、Gateway typed routing、World runtime、tmux session manager、workspace 支持、验证和 smoke。

## Geek 当前职责

- `packages/shared`: 维护 Cloud Protocol schema/type，拒绝缺少 scope ID、非法 git URL、credential-shaped payload 和 browser-controlled session command payload。
- `packages/cloud-agent`: 连接 Gateway，发送 World status/capabilities，处理 Issue/repo/worktree/session typed request。
- `packages/agent-runtime`: 管理 tmux-backed Codex session，校验 cwd scope，发送输入，捕获增量输出，维护 session buffer。
- `packages/workspace`: 负责本地路径、git workspace 和后续固定 root repo scan/import/worktree 扩展。
- `apps/server`/`apps/web`: 仍是本地 operator console，不是公网 Gateway；可以复用事件/持久化思路，但不直接替代 cloud protocol。

## 当前实现状态

- 已存在 `CloudAgent` outbound client 和 `InMemoryWorldRuntime` MVP handler。
- 已存在 `CodexSessionManager`，通过可注入 `TmuxRunner` 方便单测，不要求单测启动真实 tmux。
- 已有 cwd realpath/symlink escape 校验、Codex command allowlist 和 tmux session naming。
- MVP 仍以内存 Issue/repo/worktree registry 为主；后续需要把 World workspace 和 session registry 持久化。

## 反边界

- 浏览器不能上传 git token、password、private key 或 credential-bearing URL。
- Gateway 不能直接执行 shell/git/tmux/Codex。
- `caesar_geek` 不应把 `awesome/ultrawork/geek task` 旧本地 UI 词泄漏为 cloud protocol 字段；cloud protocol 使用 World/Issue/repo/worktree/Agent/session。
- Codex session 不能在未登记、未校验的 arbitrary local path 中启动。

## 验证

- `CMD:geek-cloud-agent-tests`: `cd caesar_geek && pnpm --filter @caesar-geek/cloud-agent typecheck && pnpm --filter @caesar-geek/cloud-agent test`
- `CMD:geek-runtime-tests`: `cd caesar_geek && pnpm --filter @caesar-geek/agent-runtime test`
- `CMD:geek-shared-tests`: `cd caesar_geek && pnpm --filter @caesar-geek/shared test`
- `CMD:codex-session-smoke`: 见 `../caesar_gateway/docs/runbooks/cloud-agent-codex-session-mvp.md`。

## 相关节点

- KM:reference.local-agent-core-rules
- KM:reference.architecture-overview
- KM:reference.zone-map
- KM:reference.file-ownership
