---
km_id: domain.product
km_type: domain
domain: product
status: active
owner: caesar-maintainers
last_verified: 2026-05-26
source_of_truth:
  - README.md
  - .omx/specs/deep-interview-local-ai-workspace-gateway.md
  - .omx/plans/local-ai-workspace-gateway-plan.md
validated_by:
  - manual-repo-read
tags:
  - domain:product
related:
  - map.invariants
  - reference.architecture-overview
---

# 产品领域

## 目标

Caesar Geek 是面向本地仓库 AI 工作的 TypeScript control plane。目标是让 worker 执行可见、可持久化、可中断、可接管，并能通过本地 gateway 支撑前端恢复状态。

当前核心产品入口是 Issue-first：界面优先扫描本机 `~/workspace/repos` 下的 git 仓库，让用户勾选 repo 后创建 Issue。创建出的 Issue 必须落在 `~/.caesar/issues` 下，并在 Issue 内保存用户选中的所有 repo。Issue 作用域和 Issue 内每个 repo 作用域都必须能一键创建 agent。

## 什么时候读

- 判断 MVP 范围。
- 涉及 `awesome`、`ultrawork`、`geek` 术语或流程。
- 修改 UI、gateway、runtime 边界前。

## 职责

- 维护本地单用户 MVP 的验收路径。
- 保持公开领域词和核心流程稳定。
- 约束第一版本不扩张到远程、多用户、IDE 替代或 provider marketplace。
- 维护 Issue-first 仓库选择流程：扫描候选 repo、勾选 repo、创建 Issue、从 Issue 或 repo 创建 agent。

## 不是本层职责

- 不记录每个文件的实现细节。
- 不替代 `packages/shared` 的 schema 或 API 类型。

## 不变量

读 [不变量](../map/invariants.md)。

## 入口

- [架构概览](../references/architecture/architecture-overview.md)
- [.omx spec](../../.omx/specs/deep-interview-local-ai-workspace-gateway.md)
- [.omx plan](../../.omx/plans/local-ai-workspace-gateway-plan.md)

## 验证

- 对照 `.omx/specs/` 与当前代码，区分已实现和计划。
- 修改验收路径后同步 [map/domains.md](../map/domains.md)、[glossary](../map/glossary.md) 和 [README](../../README.md)。

## 相关节点

- KM:map.invariants
- KM:reference.architecture-overview
