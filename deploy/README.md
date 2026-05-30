# Caesar Geek Deployment

Target server:

- Public IP: `47.93.141.241`
- Web URL: `http://47.93.141.241`
- App path: `/opt/caesar/caesar_geek`
- Data path: `/var/lib/caesar-geek`
- Backend bind: `127.0.0.1:4387`

Deploy from the repository root:

```bash
cd caesar_geek
SERVER_USER=root ./deploy/deploy-to-47.93.141.241.sh
```

If the server uses another SSH user:

```bash
SERVER_USER=ubuntu ./deploy/deploy-to-47.93.141.241.sh
```

The script builds locally as a preflight check, then deploys on the server from Git. On the first run it clones the repository into `/opt/caesar/caesar_geek`; on later runs it fetches and resets to `origin/main`, installs dependencies, builds, starts the Fastify server with systemd, and serves the Vite build through Nginx.

The default repository URL is:

```bash
git@github.com:Caesarderder/caesar_geek.git
```

For a server without a GitHub SSH deploy key, use an HTTPS URL if the repository is public:

```bash
REPO_URL=https://github.com/Caesarderder/caesar_geek.git SERVER_USER=root ./deploy/deploy-to-47.93.141.241.sh
```

Deploy another branch:

```bash
DEPLOY_REF=main SERVER_USER=root ./deploy/deploy-to-47.93.141.241.sh
```

Deploy local uncommitted changes directly with rsync:

```bash
SERVER_USER=root ./deploy/sync-local-and-deploy.sh
```

This path does not require committing or pushing first. It runs a local install/build preflight, uploads the current working tree to `/opt/caesar/caesar_geek` with `rsync`, then installs dependencies, builds, restarts `caesar-geek`, and reloads Nginx on the server.

Useful overrides:

```bash
SERVER_HOST=47.93.141.241 SERVER_USER=root SERVER_PORT=22 ./deploy/sync-local-and-deploy.sh
SKIP_LOCAL_BUILD=1 ./deploy/sync-local-and-deploy.sh
```
