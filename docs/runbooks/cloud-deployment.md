---
km_id: runbook.cloud-deployment
km_type: runbook
domain: workflow
status: active
owner: caesar-maintainers
last_verified: 2026-05-29
source_of_truth:
  - deploy/deploy-to-47.93.141.241.sh
  - deploy/nginx.caesar-geek.conf
  - deploy/caesar-geek.service
  - user-deployment-2026-05-29
validated_by:
  - manual-deployment
  - curl-public-http-check
  - systemctl-status-check
tags:
  - domain:workflow
  - ops:deployment
  - server:aliyun-ecs
related:
  - map.workflows
  - reference.architecture-overview
  - decision.0002-gateway-agent-split
---

# Cloud Deployment Runbook

## 目标

把当前 Caesar Geek Web 控制台部署到阿里云 ECS，并通过公网 IP 访问：

```text
http://47.93.141.241
```

访问入口由 Nginx Basic Auth 保护。当前账号为 `caesar`；密码不写入仓库，服务器上以 htpasswd 哈希形式存放在 `/etc/nginx/.caesar-geek.htpasswd`。

## 当前部署事实

- 云服务器公网 IP：`47.93.141.241`。
- 操作系统：Ubuntu ECS。
- 应用目录：`/opt/caesar/caesar_geek`。
- 数据目录：`/var/lib/caesar-geek`。
- 后端服务：systemd unit `caesar-geek.service`。
- 后端监听：`127.0.0.1:4387`，不直接暴露公网。
- 前端静态目录：`/opt/caesar/caesar_geek/apps/web/dist`。
- Nginx 对外监听：`80`。
- 当前根路径 `/` 代理到 `caesar_gateway` 的 Gateway UI，用于显示 Mac mini World 连接状态。
- Nginx 反代路径：`/trpc` 与 `/events` -> `http://127.0.0.1:4387`。
- Nginx 反代路径：`/api`、`/world`、`/agent`、`/client` -> `http://127.0.0.1:8787`。
- 后续同步方式：Git 部署，不使用 `rsync`。

## 发布流程

先把本地变更提交并推送到远端：

```bash
git status
git add .
git commit -m "deploy caesar geek"
git push origin main
```

然后从仓库根目录执行部署脚本：

```bash
SERVER_USER=root REPO_URL=https://github.com/Caesarderder/caesar_geek.git ./deploy/deploy-to-47.93.141.241.sh
```

脚本行为：

1. 本地执行 `pnpm install --frozen-lockfile` 和 `pnpm build` 作为预检。
2. 服务器安装或确认 `curl`、`git`、`nginx`、Node.js、pnpm。
3. 首次部署时 clone 仓库到 `/opt/caesar/caesar_geek`；后续部署时 `git fetch --prune` 并 `git reset --hard origin/main`。
4. 服务器执行 `pnpm install --frozen-lockfile` 和 `pnpm build`。
5. 安装 `deploy/caesar-geek.service` 到 systemd。
6. 安装 `deploy/nginx.caesar-geek.conf` 到 Nginx。
7. 重启 `caesar-geek` 服务并 reload Nginx。

## Basic Auth

服务器上生成或更新密码文件：

```bash
HASH=$(openssl passwd -apr1 '<password>')
printf '%s:%s\n' 'caesar' "$HASH" > /etc/nginx/.caesar-geek.htpasswd
chmod 640 /etc/nginx/.caesar-geek.htpasswd
chown root:www-data /etc/nginx/.caesar-geek.htpasswd
nginx -t
systemctl reload nginx
```

不要把 Basic Auth 密码、root 密码、GitHub token 或 SSH 私钥写入仓库。

## 验证

未带账号密码应被拦截：

```bash
curl -i --max-time 10 http://47.93.141.241 | sed -n '1,12p'
```

预期：`401 Unauthorized`，并带 `WWW-Authenticate: Basic realm="Caesar Geek"`。

带账号密码应返回前端 HTML：

```bash
curl -i --max-time 10 -u 'caesar:<password>' http://47.93.141.241 | sed -n '1,20p'
```

预期：`200 OK`，HTML 中包含 `Caesar Geek World`。

验证后端反代：

```bash
curl -i --max-time 10 -u 'caesar:<password>' 'http://47.93.141.241/trpc/awesomes.list?batch=1&input=%7B%7D' | sed -n '1,30p'
```

预期：`200 OK`，返回 JSON。

验证服务状态：

```bash
systemctl is-active caesar-geek
systemctl is-active nginx
```

预期：两个命令都返回 `active`。

## 架构边界说明

这份 runbook 记录的是当前 Caesar Geek Web 控制台的可访问部署方式。长期架构决策仍以 KM:decision.0002-gateway-agent-split 为准：公网 Gateway 计划由独立仓库承担，`caesar_geek` 后续应收敛为本地 Agent/runtime 边界。

## 相关节点

- KM:map.workflows
- KM:reference.architecture-overview
- KM:decision.0002-gateway-agent-split
