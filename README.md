# fitnessmaxxing

Log your workouts. Build workout plans (e.g. a 3-day split), fill each split
day ("Back & Biceps", "Chest & Triceps", …) with exercises, sets and reps, then
start a workout from a split and log every set as you train.

Sibling app to [habitmaxxing](../habitmaxxing) — same stack, same architecture,
same session/guest authentication model.

## Stack

- **client/** — React 18 + TypeScript + Vite, styled-components (dark/light
  theme), react-router. Served by nginx in production.
- **server/** — Node 20 + Express + Prisma (PostgreSQL), zod validation,
  cookie-based DB-backed sessions.
- **Docker Compose** — production compose joins the shared infra networks; a
  gitignored `docker-compose.override.yml` gives a self-contained local dev
  stack with hot reload and its own Postgres.

## Local development

```bash
./setup-dev.sh        # creates .env + docker-compose.override.yml
docker compose up --build
```

- Client: http://localhost:3002 (demo account: `demo@fitnessmaxxing.local` / `password123`)
- Server: http://localhost:4001 (API under `/api/...`)
- DB: `localhost:5433` (`postgres` / `devpassword`)

Ports are offset from habitmaxxing's (3000/4000/5432) so both dev stacks can
run at the same time.

Without Docker: run your own Postgres, set `DATABASE_URL`, then
`npm install && npx prisma migrate deploy && npm run dev` in `server/` and
`npm install && npm run dev` in `client/`.

## Domain model

- **Exercise** — your personal catalogue (name, muscle group, equipment).
- **WorkoutPlan** — e.g. "3-Day Split"; contains ordered **Splits**.
- **Split** — one day of a plan, e.g. "Back & Biceps"; contains ordered
  **SplitExercises** (exercise + target sets × reps, optional weight/rest).
- **Workout** — a logged session, usually started from a split: its
  prescription is copied in as **WorkoutSets** which you check off / adjust
  (actual reps + weight) as you train, then finish.

Workout history is denormalised (exercise and split names are copied onto the
workout/sets), so editing or deleting plans and exercises never rewrites what
you actually did.

## Authentication

Same model as habitmaxxing — email/password with verification, password
reset, DB-backed httpOnly cookie sessions, admin role + service-token admin
API — plus a few improvements found while porting:

- **Guest mode**: one click creates a real (pre-verified, `isGuest`) account so
  every data route works unchanged; convert it to a full account from Settings
  at any time and keep all data.
- **Inactivity-based guest purge**: sessions track `lastUsedAt`; the
  maintenance job only deletes guests idle for `GUEST_TTL_DAYS`, so an active
  guest is never purged (habitmaxxing purges on account *age*).
- **Sliding sessions**: active sessions are extended past the halfway point of
  `SESSION_TTL_DAYS` instead of expiring mid-use.
- **Rate limiting** on all sensitive auth endpoints (login, register,
  forgot/reset password, resend verification, guest creation).
- **No account-enumeration timing oracle**: login always performs a bcrypt
  comparison, even for unknown emails.
- **Self-cleaning**: the daily in-process maintenance job also prunes expired
  sessions and used/expired verification tokens (`npm run maintenance` for
  cron use).
- Logging into a real account from a guest session deletes the now-orphaned
  guest account immediately.

## Deployment

`docker-compose.yml` targets the ruudjuffermans-infra VPS setup: shared
Postgres on the external `backend` network, Traefik routing on
`dokploy-network`, migrations + seed run on server start. Configure via `.env`
(see `.env.example`).
