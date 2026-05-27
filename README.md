# Caesar Geek

Local-first TypeScript control plane for AI work across local repositories.

## Knowledge map

- Start at `docs/index.md` for the shared human/agent project map.
- Use `docs/map/workflows.md` before code, review, refactor, or docs maintenance work.
- Planning artifacts in `.omx/` are inputs to the map, not replacements for durable docs.

## Commands

- `pnpm install`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm dev`

The gateway stores a known-awesome registry under the local app data directory by default and stores each awesome database at `awesome/.caesar-geek/db.sqlite`.
If the default dev ports are occupied, run the server with `PORT=<port>` and the web app with `WEB_PORT=<port> VITE_API_TARGET=http://127.0.0.1:<server-port>`.

## Codex CLI

Run `codex login` locally before launching Codex-backed tasks from the web console. The browser never receives Codex credentials; the local gateway starts `codex exec` through the runtime and streams task output back over SSE.
