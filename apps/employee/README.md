# 19er GmbH – Employee App

Mobile-first employee portal (read-only): schedule, hours, and payroll.

## Features

- Login (US-25)
- Home dashboard: next shift, hours, latest payroll
- Schedule: list + calendar (day / 3 days / week / month)
- Shift details (US-13, US-14)
- Payroll list and detail (US-26, US-27)
- Profile + change password
- DE / EN / AR with RTL

**No check-in / check-out** — attendance is managed by admin.

## Structure

```text
src/
├── core/           # shared: api, auth, layout, ui, i18n
└── features/
    ├── auth/
    ├── home/
    ├── schedule/
    ├── payroll/
    └── profile/
```

## Dev

```bash
# From monorepo root (API on :3002)
pnpm --filter @19er/employee dev
```

Open http://localhost:5174 — API proxied via `/api`.

Seed employee: `anna.schmidt@19ergmbh.de` / `Employee123!`
