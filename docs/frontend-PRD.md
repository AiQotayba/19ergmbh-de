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

- Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, sonner, lucide-react, clsx
- castem: apiClient, nextvip-table

# 3. 🧱 File Structure

```text
src/

├── app/
│
│   ├── (auth)/
│   │   └── login/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── shifts/
│   │   ├── attendance/
│   │   ├── payroll/
│   │   ├── notifications/
│   │   ├── settings/
│   │   └── profile/
│   │
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── calendar/
│   ├── charts/
│   ├── dialogs/
│   └── layouts/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── shifts/
│   ├── attendance/
│   ├── payroll/
│   ├── notifications/
│   └── dashboard/
│
├── hooks/
├── lib/
├── services/
├── types/
├── constants/
├── utils/
├── providers/
└── middleware.ts
```

# 4. 📦 API Integration

## Authentication

POST /auth/login
POST /auth/refresh
POST /auth/logout
PUT /auth/change-password

## Users

GET /admin/users
POST /admin/users
PUT /admin/users/:id
DELETE /admin/users/:id

## Shifts

GET /shifts
POST /shifts
PUT /shifts/:id
DELETE /shifts/:id
POST /shifts/assign

## Attendance

GET /attendance
POST /attendance/check-in
POST /attendance/check-out

## Payroll

GET /payroll
GET /payroll/runs
POST /payroll/run
PUT /payroll/:id/pay

## Notifications

GET /notifications
POST /notifications/send-schedule
POST /notifications/send-salary
PUT /notifications/:id/resend

## Employee

GET /me
GET /me/shifts
GET /me/attendance
GET /me/payroll
POST /me/check-in
POST /me/check-out

## Dashboard

GET /dashboard/stats
GET /dashboard/overview

# 5. 📄 Pages

- Authentication: Login
- Dashboard: Statistics, Charts, Recent Activity
- Users: Users List, Create User, Edit User, User Details
- Shifts: Calendar, Shift Form, Shift Details, Assign Employees
- Attendance: Attendance Table, Attendance Details
- Payroll: Payroll Runs, Payroll List, Payroll Details, Export Excel
- Notifications: Notifications List, Send Schedule, Send Salary
- Profile: My Profile, Change Password

# 6. 🎨 UI Components

- Layout: Sidebar, Navbar, Header, Footer
- Forms: Input, Select, Date Picker, Time Picker, Multi Select, Search Input
- Tables: Data Table, Pagination, Filters, Sorting
- Calendar: Month View, Week View, Day View, Shift Card
- Feedback: Modal, Drawer, Toast, Alert Dialog, Loading Spinner, Empty State

- 📱 Responsive Design: Desktop, Tablet, Mobile, PWA Ready

# 9. 📊 Dashboard Widgets

- Employees Count
- Today's Shifts
- Attendance Summary
- Monthly Payroll
- Notifications Status
- Recent Activities

# 10. 📦 Coding Standards

- TypeScript Strict
- ESLint
- Prettier
- App Router
- Feature-Based Modules
- Reusable Components
- Responsive First
- Accessibility (ARIA)
- Lazy Loading
- Server Components عند الإمكان
- Client Components عند الحاجة

# 11. 🚀 Future Improvements

- Dark Mode
- Multi Language (i18n)
- Offline Support
- Push Notifications
- Real-time Updates
- Theme Customization
- Multi Company Support
- Role Permissions UI
