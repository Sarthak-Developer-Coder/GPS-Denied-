# SpaceBorn Nav-Testing Platform

A full-stack multi-tenant SaaS prototype for benchmarking SLAM, Nav2, and GPS-denied autonomy stacks.

This repository turns the product spec into a working platform surface:

- `frontend/`: a polished React + Vite SPA with a live run viewer, dashboard, run wizard, scoring report, leaderboard, docs, and org settings.
- `backend/`: an Express + TypeScript API with JWT auth, Prisma/Postgres models, BullMQ orchestration, Socket.IO live telemetry, webhook delivery, and a deterministic simulation/scoring engine.
- `docker-compose.yml`: local Postgres + Redis for development.

## Important Note

This environment does not include the real ROS 2 / Gazebo / GPU worker stack described in the product specification. Instead, the backend implements a deterministic seeded simulation engine that mirrors the benchmark behavior:

- GPS -> hybrid -> denied phase transitions
- synthetic live telemetry over WebSocket
- known failure detectors / error codes
- weighted score computation
- queued run execution with artifacts and event timelines

The architecture boundary is already shaped so the synthetic engine can be replaced later by real Gazebo Fortress + ROS 2 workers without changing the frontend or public API contract.

## Stack

### Frontend
- React 18
- Vite
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Zustand
- Socket.IO client

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis + BullMQ
- Socket.IO
- JWT auth
- Zod validation

## Features

- Org-scoped authentication and session refresh
- Stack registry with versioned submissions
- Scenario catalog
- Launchable benchmark runs with deterministic seed control
- Queue-backed run execution
- Live telemetry stream and event timeline
- Weighted scoring and diagnostic error codes
- Per-org leaderboard
- Webhook registration for run completion
- Demo seed data for first-run experience

## Project Structure

```text
spaceborn/
├─ backend/
│  ├─ prisma/
│  └─ src/
├─ frontend/
│  └─ src/
├─ docker-compose.yml
└─ README.md
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
copy backend\.env.example backend\.env
```

### 3. Start Postgres and Redis

```bash
docker compose up -d
```

### 4. Generate Prisma client and initialize database

```bash
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
npm run prisma:seed --workspace backend
```

### 5. Run the app

In one terminal:

```bash
npm run dev:backend
```

In another terminal:

```bash
npm run dev:frontend
```

Frontend: http://localhost:5173

Backend: http://localhost:4000

## Demo Login

```text
demo@spaceborn.dev
Passw0rd!
```

## API Surface

Representative endpoints:

```text
POST   /v1/auth/login
GET    /v1/auth/me
GET    /v1/dashboard/summary
GET    /v1/stacks
POST   /v1/stacks/:id/versions
GET    /v1/scenarios
POST   /v1/runs
GET    /v1/runs/:id
GET    /v1/runs/:id/result
GET    /v1/runs/:id/events
DELETE /v1/runs/:id
GET    /v1/leaderboard
POST   /v1/webhooks
```

Socket events:

- client -> server: `run:subscribe`, `run:unsubscribe`
- server -> client: `run:event`, `run:subscribed`, `run:error`

## Validation Status

Validated in this environment:

- `npm install`
- `npm run prisma:generate --workspace backend`
- `npm run build --workspace backend`
- `npm run build --workspace frontend`

Not validated here because Docker daemon was unavailable:

- `docker compose up -d`
- `npm run prisma:migrate --workspace backend`
- `npm run prisma:seed --workspace backend`

## Next Upgrade Path

To connect this app to the real SpaceBorn robotics stack later:

1. Replace the synthetic `SimulationEngine` with a worker adapter that launches Gazebo Fortress + ROS 2 containers.
2. Persist real rosbag, map, and video artifacts instead of synthetic placeholders.
3. Swap synthetic telemetry emission with ROS bridge / Foxglove bridge topic streaming.
4. Add object storage and signed artifact URLs.
5. Add enterprise billing, SSO, and hardened sandboxing for uploaded containers.
