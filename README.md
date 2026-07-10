# fitnessmaxxing

Log your workouts. Build workout plans (e.g. a 3-day split), fill each split
day ("Back & Biceps", "Chest & Triceps", …) with exercises, sets and reps, then
start a workout from a split and log every set as you train. Runs at
`fitness.ruudjuffermans.nl`.

**Client-only since the platform consolidation.** The backend lives in
[`../ruudjuffermans-server`](../ruudjuffermans-server) (one API for all maxxing
apps at `api.ruudjuffermans.nl`), and all auth UI lives in
[`../ruudjuffermans-account`](../ruudjuffermans-account)
(`account.ruudjuffermans.nl`) — sign in once there and you're signed in to
every app. A signed-out visitor here is redirected to the account app and comes
straight back after login. See `../PLATFORM_ARCHITECTURE_PLAN.md` for the
architecture.

Finishing a workout auto-completes any habitmaxxing habit linked to
`fitness_workout` — handled by the platform's event bus, not this client.

Stack: React 18 + TypeScript + Vite, styled-components (dark/light theme),
react-router; served by nginx in production.

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
you actually did. The tables live in the platform database's `fitness` schema
(`../ruudjuffermans-server/prisma/schema.prisma`).

## Local development

Run the platform API and (for login) the account app first:

```bash
# 1. API — in ../ruudjuffermans-server (see its README):
docker compose -f docker-compose.dev.yml up -d && npm run dev   # :4000

# 2. Account app — in ../ruudjuffermans-account/client:
npm run dev                                                     # :3004

# 3. This client:
cd client
npm install
npm run dev                                                     # :3000
```

The dev ports matter: the platform server's CORS allowlist expects this client
on `http://localhost:3000` (its `FITNESS_URL` default). Configuration is via
Vite env (see [`.env.example`](.env.example)): `VITE_API_URL`,
`VITE_ACCOUNT_URL`, `VITE_APP_TZ`.

> `server/` and `setup-dev.sh` are **legacy** (pre-consolidation) — no longer
> deployed or maintained; kept only for reference until deleted.

## Authentication

Handled by the platform: email/password with verification, guest mode with
one-click conversion, DB-backed httpOnly cookie sessions (one `rj_session`
cookie shared by every app), rate limiting, sliding expiry, admin role +
service-token admin API. This client only reads the session
(`/api/account/auth/me`), signs out, converts guests, and changes passwords;
register/login/reset live in the account app. The in-app admin pages call the
central `/api/account/admin/*`.

## Deployment

`docker-compose.yml` builds the client into a static nginx image on the
external `dokploy-network`; Traefik routes `fitness.ruudjuffermans.nl`
(renamed from `fit.`) to it. Build args: `VITE_API_URL` (default
`https://api.ruudjuffermans.nl`) and `VITE_ACCOUNT_URL` (default
`https://account.ruudjuffermans.nl`). No server or database here — those
belong to the `ruudjuffermans-server` stack.
