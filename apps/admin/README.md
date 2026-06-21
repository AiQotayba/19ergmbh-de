# 19er GmbH – Admin Dashboard (MVP)

Minimal React admin dashboard for shift and payroll management.

## Features (MVP)

- Admin login against the API
- Dashboard stats overview

## Next steps

- User management CRUD UI
- Shift calendar with employee assignment
- Payroll run trigger and review
- Notification management
- German localization

## Dev

```bash
# From monorepo root
pnpm --filter @19er/admin dev
```

Set `VITE_API_URL` in `.env` (see `.env.example`).

Default seed admin: `admin@19ergmbh.de` / `Admin123!`
