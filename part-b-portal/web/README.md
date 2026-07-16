# Part B — Web (Internal Portal UI)

React + Vite + TypeScript + Tailwind. Theme: **Butter `#ffefb3`** + **Forest `#013e37`**.

## Run

```bash
npm install            # from repo root
npm run dev:web        # or: cd part-b-portal/web && npm run dev
# → http://localhost:5173
```

Vite proxies `/api` to the portal server (`:4002`). The live-updates WebSocket connects **directly** to
the server (`ws://localhost:4002/ws`, overridable via `VITE_WS_URL`) — proxying a socket through Vite
produces noisy `write EPIPE` logs when connections close.

## What it does

- **Auth** — JWT stored in `localStorage`; login screen with a demo-account picker.
- **RBAC-driven navigation** — the sidebar renders exactly the features the server grants the signed-in
  user, each labelled with its scope (`ALL` / `OWN` / `MAPPED`). Nothing is hardcoded per role.
- **Five views** — Clients, Trades (filter by client + date), My Clients, Employees, Incentives — plus an
  admin **Access Control** matrix editor.
- **Live updates** — a WebSocket connection (`/ws`) bumps a per-resource revision; the active view
  re-fetches automatically. The top bar shows the connection state, live counts, and current sync progress.
- **Proof of speed** — every screen shows its server response time; green means it met the < 1s requirement.

## Structure

```
src/
  App.tsx                 # auth gate + view switch
  state/AuthContext.tsx   # login / session
  state/LiveContext.tsx   # WebSocket → revisions + sync status
  hooks/useApi.ts         # fetch + re-fetch on deps + timing
  components/             # Layout, SyncIndicator, UI primitives
  views/                  # Login, Clients, Trades, Employees, Incentives, AccessControl
  lib/                    # api client, types, formatting, feature metadata
```
