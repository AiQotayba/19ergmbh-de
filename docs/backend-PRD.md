# 📄 PRD – Backend System

# 🧠 منصة إدارة جداول الدوام والرواتب

# 1. 🎯 الهدف من الـ Backend

بناء API مركزية مسؤولة عن:

- إدارة المستخدمين والصلاحيات
- إنشاء وإدارة الشفتات
- ربط الموظفين بالشفتات
- تسجيل الحضور والانصراف
- حساب الرواتب تلقائيًا
- إرسال الإشعارات
- توفير بيانات للـ Admin Dashboard و Employee App

# 2. ⚙️ Tech Stack

- Core: [ Node.js, Express.js, TypeScript ]
- Database: [ PostgreSQL ]
- ORM: [ Prisma ]
- Auth: [ JWT (Access + Refresh) ]
- Optional Services: [ Email (Nodemailer), WhatsApp API, Cron Jobs (node-cron) ]

# 3. 🧱 File Structure

```text
├── docs/
│   ├── user-story.md
│   ├── user-flow.md
│   ├── backend-prd.md
│   ├── frontend-prd.md
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seeds.ts
│
├── src/
│
│   ├── config/
│   │   ├── env.ts
│   │   ├── db.ts
│   │   ├── jwt.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │
│   ├── modules/
│   │
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── auth.validators.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── users.types.ts
│   │   │   ├── users.validators.ts
│   │   │
│   │   ├── shifts/
│   │   │   ├── ...
│   │   │
│   │   ├── shift-employees/
│   │   │   ├── ...
│   │   │
│   │   ├── attendance/
│   │   │   ├── ...
│   │   │
│   │   ├── payroll/
│   │   │   ├── ...
│   │   │
│   │   ├── payroll-runs/
│   │   │   ├── ...
│   │   │
│   │   ├── notifications/
│   │   │   ├── ...
│   │
│   ├── shared/
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── errors/
│   │
│   ├── app.ts
│   ├── server.ts
```

# 4. 📦 API Endpoints

## 🔐 AUTH

POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
PUT /auth/change-password

## 👥 USERS (ADMIN)

GET /admin/users
POST /admin/users
GET /admin/users/:id
PUT /admin/users/:id
DELETE /admin/users/:id

## 📅 SHIFTS

GET /shifts
POST /shifts
GET /shifts/:id
PUT /shifts/:id
DELETE /shifts/:id

## 🔗 SHIFT EMPLOYEES (ASSIGNMENT)

POST /shifts/assign
DELETE /shifts/unassign
GET /shift-employees

## ⏱ ATTENDANCE

POST /attendance/check-in
POST /attendance/check-out
GET /attendance

## 💰 PAYROLL RUNS

POST /payroll/run
GET /payroll/runs
GET /payroll/runs/:id

## 💵 PAYROLL

GET /payroll
GET /payroll/:id
PUT /payroll/:id/pay

## 🔔 NOTIFICATIONS

GET /notifications
POST /notifications/send-schedule
POST /notifications/send-salary
PUT /notifications/:id/resend

## 👤 ME (EMPLOYEE)

GET /me
GET /me/shifts
GET /me/attendance
GET /me/payroll
POST /me/check-in
POST /me/check-out

## 📊 DASHBOARD

GET /dashboard/stats
GET /dashboard/overview
GET /system/health

# 5. 🧠 Business Logic (Core Rules)

- ⛔ 5.1 منع تعارض الشفتات

```text
if (
  newShift.start < existingShift.end &&
  newShift.end > existingShift.start
)
→ reject assignment
```

- ⏱ 5.2 حساب ساعات العمل

```text
workedHours =
(checkOut - checkIn - breakMinutes) / 60
```

- 💰 5.3 حساب الراتب - [ salary = totalHours × hourlyRate ]

- 📦 5.4 Payroll Run Logic - [ Attendance → Hours Calculation → Payroll Run → Payroll per Employee → Notifications ]

# 6. 🧱 Database (Prisma Core Entities)

```yaml
- User
- Shift
- ShiftEmployee
- Attendance
- Payroll
- PayrollRun
- Notification
```

# 7. 🔄 Data Flow (Backend Flow)

```yaml
Request → Route → Controller → Service → Prisma DB → Response
```

# 8. 🔐 Authentication Rules

```text
JWT Access Token (short-lived) → Refresh Token (stored in DB) → Role-based access: ADMIN, EMPLOYEE
```

# 9. 📦 API Standards

## ✔ Rules:

- JSON body only for POST/PUT
- Query params for filtering
- RESTful naming
- camelCase for all data
