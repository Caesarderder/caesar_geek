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
