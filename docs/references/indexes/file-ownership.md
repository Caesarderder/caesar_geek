---
km_id: reference.file-ownership
km_type: reference
domain: code
status: active
owner: caesar-maintainers
last_verified: 2026-05-30
source_of_truth:
  - apps
  - packages
  - deploy
  - package.json
  - docs/references/architecture/cloud-agent-codex-session-concepts.md
validated_by:
  - manual-code-read
  - pnpm --filter @caesar-geek/server test
  - pnpm --filter @caesar-geek/shared test
  - pnpm --filter @caesar-geek/web typecheck
tags:
  - reference:file-ownership
  - domain:code
related:
  - reference.zone-map
  - wiki.apps
  - wiki.packages
  - reference.cloud-agent-codex-session-concepts
---

# 文件归属

## 目标

用“路径 + 归属 + 用途 + 验证依据”定位实现落点。

## 事实

| 路径 | 归属 | 用途 | 验证依据 |
| --- | --- | --- | --- |
| `CODE:package.json` | cross-domain | 根脚本、依赖和 pnpm 版本 | manual-read |
| `CODE:pnpm-workspace.yaml` | cross-domain | workspace 包发现 | manual-read |
| `CODE:tsconfig.base.json` | cross-domain | TypeScript 基础配置和 path aliases | manual-read |
| `CODE:apps/server/src/app.ts` | backend | Fastify/tRPC app、API router、SSE、默认 Codex task、active awesome | manual-read |
| `CODE:apps/server/src/db/sqlite.ts` | backend | RegistryStore、AwesomeStore、SQLite schema、approval records 和 mapping | manual-read |
| `CODE:apps/server/src/index.ts` | backend | server 启动入口 | manual-read |
| `CODE:apps/web/src/main.tsx` | frontend | operator UI、Codex prompt task、approval gate、tRPC client、SSE listener | manual-read |
| `CODE:apps/web/src/styles.css` | frontend | UI 样式 | path-exists |
| `CODE:apps/web/vite.config.ts` | frontend | Vite React、可覆盖 web 端口和 API proxy | manual-read |
| `CODE:packages/shared/src/index.ts` | shared | Zod schema、types、policy classifier、Codex exec command builder、approval record contract | manual-read |
| `CODE:packages/workspace/src/index.ts` | workspace | awesome layout、path scope、git clone ultrawork | manual-read |
| `CODE:packages/agent-runtime/src/index.ts` | runtime | GeekRuntime、spawn、events、takeover、shutdown；Cloud path 中的 CodexSessionManager/tmux session scope | manual-read |
| `CODE:packages/cloud-agent/src/index.ts` | cloud-agent | outbound World runtime、Cloud Protocol parser、Issue/repo/worktree/session handler | manual-read |
| `CODE:deploy/deploy-to-47.93.141.241.sh` | ops | 从 Git 部署已推送代码到 ECS | manual-read |
| `CODE:deploy/sync-local-and-deploy.sh` | ops | 通过 SSH/rsync 上传本地未提交工作区并远端构建重启 | bash-n |
| `CODE:deploy/nginx.caesar-geek.conf` | ops | ECS Nginx 入口、Basic Auth、静态目录和反代规则 | manual-read |
| `CODE:deploy/caesar-geek.service` | ops | systemd 服务定义、后端监听和数据目录环境变量 | manual-read |
| `CODE:.omx/specs/deep-interview-local-ai-workspace-gateway.md` | product | 需求规格和范围 | manual-read |
| `CODE:.omx/plans/local-ai-workspace-gateway-plan.md` | product | 实施规划和验收标准 | manual-read |
| `CODE:../.omx/specs/deep-interview-cloud-agent-codex-session-mvp.md` | product | Cloud Agent Codex Session MVP ontology 和验收标准 | manual-read |
| `CODE:../.omx/plans/ralplan-cloud-agent-codex-session-mvp.md` | product | Cloud Agent Codex Session MVP 实施计划 | manual-read |

## 验证

- `find apps packages -maxdepth 3 -type f`
- `rg '^km_id:' docs`

## 相关节点

- KM:reference.zone-map
- KM:reference.architecture-overview
