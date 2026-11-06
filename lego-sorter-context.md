# lego-sorter — service context

Static web app (Vite + Svelte 5 + Manifold WASM) that generates STL files for the Lego Sorter modular
drawer system. Everything runs in the browser; no database, no files, no env vars beyond `PORT`.

| | |
|---|---|
| Repo | Gitea `goatcheese/lego-sorter` |
| Image | `10.0.2.166:5000/goatcheese/lego-sorter` |
| Host / port | Voltron, **3008** |
| Public | Cloudflare Tunnel `lego.euphoriatech.xyz` → `http://10.0.2.166:3008` |
| Health | `GET /health` → `{"status":"ok"}` |
| State | none (per-browser localStorage only) |
| UID | 1000 (no mounts, so only for consistency) |

## How it's built

Three-stage Dockerfile: `node:22-alpine` runs `npm ci`, `npm test` (rebuilds every part in Node and checks
volumes against the Fusion reference) and `npm run build`; `golang:1.22-alpine` builds `server/main.go`,
a stdlib static server (`http.ServeMux` with `GET /health`, long cache on `/assets/*`, no-cache on
`index.html`, `.wasm` served as `application/wasm`); `alpine:3.20` runs it as UID 1000 on `$PORT`.

## Deploy

Standard pipeline: push to `main` runs the tests; `git tag vX.Y.Z && git push --tags` builds and pushes
the image; Dockhand stack `lego-sorter` from `docker-compose.yml`, env `PORT=3008`.

## Gotchas

- The Go server uses the Go 1.22 `GET /path` mux patterns; don't lower the toolchain.
- `vite.config.js` has `base: './'`, so the bundle also works from a subpath if the tunnel route changes.
- The geometry also lives in a Python port (`lego-sorter-py`) and a Fusion script; a change to
  `src/lib/geometry.js` goes to all three, and `npm test` must stay green (volumes vs Fusion).
