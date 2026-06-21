# 19er GmbH – Shift & Payroll Platform

Turborepo monorepo for **19er GmbH** (Germany): shift scheduling, attendance tracking, payroll calculation, and notifications.

## Structure

```
apps/
  api/        Express + TypeScript REST API
  admin/      Admin dashboard (React + Vite)
  employee/   Employee portal (React + Vite)
packages/
  db/         Prisma schema, client, seeds
  types/      Shared TypeScript types
  shared/     Utilities, constants, errors
  auth/       JWT, password hashing, Express guards
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (optional, for PostgreSQL)

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment

Copy the root env template and adjust if needed:

```bash
cp .env.example .env
```

Also copy app-specific examples if running frontends:

```bash
cp apps/admin/.env.example apps/admin/.env
cp apps/employee/.env.example apps/employee/.env
cp apps/api/.env.example apps/api/.env
```

### 3. Start PostgreSQL (Docker)

Uses port **5433** to avoid conflict with a local PostgreSQL on 5432.

```bash
docker compose up -d
```

Wait until healthy, then continue.

### 4. Database setup

Stop any running `pnpm dev` first, then:

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

Then start the apps (step 5).

### 5. Run development

```bash
# API only
pnpm dev:api

# All apps (API + admin + employee)
pnpm dev
```

| App       | URL                      |
|-----------|--------------------------|
| API       | http://localhost:3001    |
| Admin     | http://localhost:5173    |
| Employee  | http://localhost:5174    |

### 6. Build

```bash
pnpm build
```

### 7. API tests

Requires PostgreSQL with seed data (`pnpm db:seed`).

```bash
pnpm test:api
```

Integration tests use Vitest + Supertest against the real database.

| File | Coverage |
|------|----------|
| `tests/auth.test.ts` | Auth, tokens, authorization |
| `tests/users-shifts.test.ts` | Users CRUD, shifts, overlap |
| `tests/me-dashboard.test.ts` | Me, dashboard, attendance, notifications |
| `tests/user-stories.test.ts` | All user stories US-1 … US-29 from `docs/user-story.md` |

Skipped (not in API MVP): US-20 Excel export, US-28 company settings.

## Seed accounts

| Role     | Email                      | Password      |
|----------|----------------------------|---------------|
| Admin    | admin@19ergmbh.de          | Admin123!     |
| Employee | anna.schmidt@19ergmbh.de   | Employee123!  |

## Environment variables

| Variable               | Description                          | Default        |
|------------------------|--------------------------------------|----------------|
| `DATABASE_URL`         | PostgreSQL connection string         | see `.env.example` |
| `JWT_ACCESS_SECRET`    | Access token signing secret          | required       |
| `JWT_REFRESH_SECRET`   | Refresh token signing secret         | required       |
| `JWT_ACCESS_EXPIRES_IN`| Access token TTL                     | `15m`          |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token TTL                   | `7d`           |
| `API_PORT`             | API server port                      | `3001`         |
| `CORS_ORIGIN`          | Allowed frontend origins (comma-sep) | `5173,5174`    |
| `VITE_API_URL`         | API base URL for frontends           | `http://localhost:3001` |

## API overview

- `POST /auth/login`, `/auth/refresh`, `/auth/logout`
- `GET/POST/PUT/DELETE /admin/users` (admin)
- `GET/POST/PUT/DELETE /shifts`, `POST /shifts/assign`
- `POST /attendance/check-in`, `/attendance/check-out`
- `POST /payroll/run`, `GET /payroll`, `PUT /payroll/:id/pay`
- `GET /notifications`, `POST /notifications/send-schedule`
- `GET /me`, `/me/shifts`, `/me/attendance`, `/me/payroll`
- `GET /dashboard/stats`, `/system/health`

## Business rules

- Shift overlap is rejected on employee assignment
- `workedHours = (checkOut - checkIn - breakMinutes) / 60`
- `salary = totalHours × hourlyRate`
- Payroll flow: Attendance → Hours → Payroll Run → Payroll records → Notifications

## Future phases

- Full admin UI (calendar, CRUD, payroll runs)
- Employee check-in/out from mobile
- Email/WhatsApp delivery (Nodemailer, WhatsApp API)
- Excel payroll export
- Company settings
- Cloud deployment & CI/CD
- German UI localization

## Troubleshooting

### `EPERM` on `pnpm db:generate`

On Windows, Prisma cannot replace `query_engine-windows.dll.node` while the API is running.

1. Stop `pnpm dev` (Ctrl+C)
2. Run `pnpm db:generate` again
3. Restart `pnpm dev`

`pnpm db:push` uses `--skip-generate` so schema sync works even while dev is running; run `db:generate` separately after stopping dev when the schema changes.

## License

Private – 19er GmbH internal project.
