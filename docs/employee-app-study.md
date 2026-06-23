# دراسة تطبيق الموظف — عرض البيانات (بدون تسجيل حضور)

> **الإصدار:** 1.1  
> **التاريخ:** يونيو 2026  
> **النطاق:** US-13، US-14، US-25، US-26، US-27  
> **خارج النطاق:** US-15 (check-in / check-out من تطبيق الموظف)

---

## 1. الهدف والقواعد

بوابة موظف (ويب متجاوب / PWA) **للقراءة فقط**:

- معرفة **متى يعمل** (جدول + تفاصيل الدوام)
- معرفة **ساعاته** و**راتبه** المحسوب من النظام
- تسجيل الدخول وإدارة الملف الشخصي

**بدون** check-in / check-out. الحضور من الأدمن؛ الشفت المنتهي **مداوم افتراضياً** ما لم يُسجَّل غياب أو عطلة.

| الحالة | للموظف |
|--------|--------|
| `SCHEDULED` | مجدول |
| `ON_DUTY` | تم احتساب الدوام |
| `ABSENT` | غياب |
| `HOLIDAY` | عطلة |

| الطبقة | الحالة |
|--------|--------|
| API (`/me/*`) | جاهز — لا تعديل مطلوب للمرحلة 1 |
| `apps/employee` | MVP أولي — يُعاد بناؤه feature-by-feature |

---

## 2. مبدأ تنظيم الملفات

كل **ميزة** مجلد مستقل تحت `features/` — الصفحة، المكوّنات، الـ hooks، والأنواع **معاً**، وليس فصل `pages/` عن `components/` على مستوى التطبيق.

```text
apps/employee/src/
├── features/
│   ├── auth/
│   ├── home/
│   ├── schedule/
│   ├── payroll/
│   └── profile/
├── core/                    # مشترك بين كل الميزات
│   ├── layout/
│   ├── ui/
│   ├── lib/
│   ├── providers/
│   └── i18n/
├── App.tsx
└── main.tsx
```

**قاعدة:** إذا الملف يخص ميزة واحدة فقط → داخل مجلدها. إذا يُستخدم من ميزتين+ → `core/`.

---

## 3. البنية المشتركة (`core/`)

ملفات لا تنتمي لميزة محددة — تُبنى أولاً قبل الميزات.

| الملف | الغرض |
|-------|--------|
| `core/lib/api-client.ts` | HTTP + Bearer + refresh (منسوخ/مشترك مع الأدمن) |
| `core/lib/auth-storage.ts` | tokens في localStorage |
| `core/lib/auth-session.ts` | تجديد الجلسة |
| `core/lib/utils.ts` | `cn()` ومساعدات |
| `core/providers/AuthProvider.tsx` | سياق المصادقة |
| `core/providers/QueryProvider.tsx` | TanStack Query |
| `core/layout/AppShell.tsx` | هيكل الصفحة + header |
| `core/layout/BottomNav.tsx` | تنقل سفلي: الرئيسية / الجدول / الراتب / أنا |
| `core/layout/ProtectedRoute.tsx` | حماية المسارات |
| `core/ui/*` | button, card, badge, skeleton, input… (من الأدمن) |
| `core/i18n/index.tsx` | مزود اللغة DE / AR / EN + RTL |
| `core/i18n/locales/{de,ar,en}.json` | مفاتيح مشتركة: `common`, `nav`, `errors` |
| `App.tsx` | Routes فقط — يستورد من `features/*` |
| `main.tsx` | bootstrap |

```env
# apps/employee/.env
VITE_API_URL=http://localhost:3002
```

---

## 4. الميزات — ملفات كل ميزة معاً

---

### 4.1 `features/auth` — المصادقة (US-25)

**المسارات:** `/login` (خارج الـ shell)  
**API:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

| الملف | المسؤولية |
|-------|-----------|
| `features/auth/pages/LoginPage.tsx` | شاشة الدخول |
| `features/auth/components/LoginForm.tsx` | نموذج بريد + كلمة مرور |
| `features/auth/hooks/useLogin.ts` | mutation تسجيل الدخول |
| `features/auth/types.ts` | `LoginCredentials`, `AuthTokens` |
| `features/auth/i18n-keys.ts` | مرجع مفاتيح: `login.*` في locales |

**سلوك:** بعد النجاح → `GET /me` → توجيه إلى `/`. جلسة عبر refresh token.

**اختبار API:** `auth.test.ts`, US-25 في `user-stories.test.ts`

**معيار القبول:** موظف seed `anna.schmidt@19ergmbh.de` يسجّل دخول ويُوجَّه للرئيسية.

---

### 4.2 `features/home` — الرئيسية (US-13, US-26, US-27)

**المسار:** `/`  
**API:** `GET /me/shifts`, `GET /me/payroll` (طلبات مختصرة)

| الملف | المسؤولية |
|-------|-----------|
| `features/home/pages/HomePage.tsx` | تجميع البطاقات |
| `features/home/components/WelcomeHeader.tsx` | ترحيب باسم الموظف |
| `features/home/components/NextShiftCard.tsx` | أقرب شفت قادم |
| `features/home/components/HoursSummaryCard.tsx` | ساعات آخر مسير (US-26) |
| `features/home/components/LatestPayrollCard.tsx` | آخر راتب (US-27) |
| `features/home/components/UpcomingShiftsList.tsx` | 3 شفتات قادمة + رابط للجدول |
| `features/home/hooks/useHomeData.ts` | `useQuery` مجمّع للبطاقات |
| `features/home/types.ts` | أنواع ملخص الرئيسية |

**بيانات البطاقات:**

| البطاقة | المصدر |
|---------|--------|
| الشفت القادم | `GET /me/shifts?fromDate=today&limit=1` |
| الساعات | آخر `Payroll.totalHours` |
| الراتب | آخر `Payroll.salary` + `isPaid` |

**معيار القبول:** الرئيسية تعرض ملخصاً بدون check-in/out.

---

### 4.3 `features/schedule` — جدول الدوام (US-13, US-14)

**المسارات:** `/schedule`, `/schedule/:assignmentId`  
**API:** `GET /me/shifts` (`fromDate`, `toDate`, `sort_field=date`)

| الملف | المسؤولية |
|-------|-----------|
| `features/schedule/pages/SchedulePage.tsx` | قائمة + تبديل تقويم |
| `features/schedule/pages/ShiftDetailPage.tsx` | تفاصيل دوام واحد (US-14) |
| `features/schedule/components/ShiftCard.tsx` | بطاقة تعيين في القائمة |
| `features/schedule/components/ShiftStatusBadge.tsx` | شارة SCHEDULED / ON_DUTY / … |
| `features/schedule/components/ShiftDateBadges.tsx` | نطاق التاريخ |
| `features/schedule/components/ShiftTimeBadges.tsx` | الوقت اليومي |
| `features/schedule/components/ShiftFlexibleCalendar.tsx` | تقويم: يوم / 3 أيام / أسبوع |
| `features/schedule/lib/shift-calendar-utils.ts` | `expandShiftsToOccurrences` (من الأدمن) |
| `features/schedule/lib/shift-display.ts` | `resolveShiftFromApi` — عرض التواريخ |
| `features/schedule/hooks/useMyShifts.ts` | جلب الشفتات مع فلاتر |
| `features/schedule/types.ts` | `ShiftAssignment`, `ShiftOccurrence` |

**عرضان (قراءة فقط):**

| العرض | الوصف |
|-------|--------|
| قائمة | بطاقة لكل تعيين: عنوان، تاريخ، وقت، حالة |
| تقويم | يوم / 3 أيام / أسبوع — شفتات متعددة بنفس الوقت = بطاقات منفصلة |

**تفاصيل الدوام (US-14):** عنوان، `fromDate`–`toDate`، `dailyStartTime`–`dailyEndTime`، `breakMinutes`، `notes`، `attendanceStatus` — **بدون أزرار إجراء**.

**اختبار API:** US-13, US-14 في `user-stories.test.ts`, `me-dashboard.test.ts`

**معيار القبول:** الموظف يرى شفتاته وحالاتها؛ الضغط يفتح التفاصيل.

---

### 4.4 `features/payroll` — الرواتب وساعات العمل (US-26, US-27)

**المسارات:** `/payroll`, `/payroll/:id`  
**API:** `GET /me/payroll`

| الملف | المسؤولية |
|-------|-----------|
| `features/payroll/pages/PayrollPage.tsx` | قائمة مسيرات الراتب |
| `features/payroll/pages/PayrollDetailPage.tsx` | تفاصيل مسير واحد |
| `features/payroll/components/PayrollCard.tsx` | بطاقة في القائمة |
| `features/payroll/components/PayrollStatusBadge.tsx` | مدفوع / قيد الانتظار |
| `features/payroll/components/HoursBreakdown.tsx` | `totalHours` + `absenceHours` (US-26) |
| `features/payroll/components/PayrollAmount.tsx` | `salary`, `paidAmount`, `hourlyRate` |
| `features/payroll/hooks/useMyPayroll.ts` | جلب قائمة / تفصيل |
| `features/payroll/types.ts` | `PayrollRecord` |

**قائمة:**

| الحقل | المصدر |
|-------|--------|
| الفترة | `fromDate` – `toDate` |
| الساعات | `totalHours` (+ `absenceHours`) |
| المبلغ | `salary` |
| الحالة | `isPaid`, `paidAt` |

**نص مساعد (US-26):** «يتم احتساب الساعات تلقائياً من جدولك. الغياب والعطلة يحدّثها المكتب.»

**اختبار API:** US-26, US-27 في `user-stories.test.ts`

**معيار القبول:** الموظف يرى رواتبه فقط — لا بيانات زملاء ولا أزرار أدمن.

---

### 4.5 `features/profile` — الملف الشخصي (US-25)

**المسار:** `/profile`  
**API:** `GET /me`, `PUT /me`, `PUT /auth/change-password`

| الملف | المسؤولية |
|-------|-----------|
| `features/profile/pages/ProfilePage.tsx` | عرض + تعديل |
| `features/profile/components/ProfileForm.tsx` | اسم، بريد، هاتف |
| `features/profile/components/ChangePasswordForm.tsx` | كلمة مرور قديمة / جديدة |
| `features/profile/components/HourlyRateDisplay.tsx` | عرض الأجر (قراءة فقط) |
| `features/profile/hooks/useProfile.ts` | query + mutations |
| `features/profile/schema.ts` | Zod للتحقق |
| `features/profile/types.ts` | `Profile` |

**معيار القبول:** تحديث البيانات وتغيير كلمة المرور يعملان.

---

## 5. التوجيه (`App.tsx`)

```tsx
// مسارات عامة
/login                          → features/auth/pages/LoginPage

// داخل AppShell + ProtectedRoute
/                               → features/home/pages/HomePage
/schedule                       → features/schedule/pages/SchedulePage
/schedule/:assignmentId         → features/schedule/pages/ShiftDetailPage
/payroll                        → features/payroll/pages/PayrollPage
/payroll/:id                    → features/payroll/pages/PayrollDetailPage
/profile                        → features/profile/pages/ProfilePage
```

```text
┌─────────────────────────────────────┐
│  Header: ترحيب + تسجيل خروج         │
├─────────────────────────────────────┤
│           محتوى الميزة              │
├─────────────────────────────────────┤
│  🏠 الرئيسية │ 📅 الجدول │ 💰 الراتب │ 👤 أنا  │
└─────────────────────────────────────┘
```

---

## 6. API — مرجع سريع

| Endpoint | الميزة | ملاحظة |
|----------|--------|--------|
| `POST /auth/login` | auth | |
| `POST /auth/refresh` | auth | |
| `POST /auth/logout` | auth | |
| `PUT /auth/change-password` | profile | |
| `GET /me` | home, profile | |
| `PUT /me` | profile | |
| `GET /me/shifts` | home, schedule | يتضمن `attendanceStatus` |
| `GET /me/payroll` | home, payroll | `totalHours`, `absenceHours` |
| `GET /me/attendance` | — | اختياري مرحلة 2 — قراءة فقط |
| `POST /me/check-in` | **مستبعد** | |
| `POST /me/check-out` | **مستبعد** | |

---

## 7. Stack

| التقنية | الاستخدام |
|---------|-----------|
| React 19 + Vite | `apps/employee` |
| React Router 7 | توجيه |
| TanStack Query | `core/` + hooks داخل كل feature |
| Tailwind + `core/ui` | منسوخ من الأدمن |
| `date-fns` | schedule |
| Zod + RHF | profile |
| i18n | `core/i18n` + مفاتيح لكل feature في locales |

---

## 8. ترتيب التنفيذ

| # | الميزة | الملفات أولاً |
|---|--------|----------------|
| 1 | `core/` | api-client, providers, layout, ui, i18n |
| 2 | `features/auth` | Login كامل |
| 3 | `features/home` | ملخص بعد الدخول |
| 4 | `features/schedule` | قائمة + تفاصيل |
| 5 | `features/payroll` | قائمة + تفاصيل + ساعات |
| 6 | `features/profile` | تعديل + كلمة مرور |
| 7 | `features/schedule` | تقويم مرن (يوم / 3 / أسبوع) — مرحلة 2 داخل نفس المجلد |

**معايير قبول عامة:**

- لا زر check-in / check-out في أي feature
- يعمل على 375px (موبايل)
- اختبارات API الحالية خضراء
- كل ميزة جديدة = مجلد `features/<name>/` كامل قبل الانتقال للتالية

---

## 9. مستبعد صراحة

| الميزة | السبب |
|--------|--------|
| Check-in / Check-out | حضور من الأدمن + مداوم افتراضي |
| تعديل الشفتات | أدمن فقط |
| رواتب الزملاء | خصوصية |
| Excel / إشعارات | أدمن فقط (US-20, US-24) |

---

## 10. الاختبار والنشر

| النوع | الملف / الأداة |
|-------|----------------|
| API | `apps/api/tests/me-dashboard.test.ts`, `user-stories.test.ts` |
| E2E (مقترح) | Playwright: `features/auth` → `schedule` → `payroll` |
| يدوي | `anna.schmidt@19ergmbh.de` / `Employee123!` |
| تطوير | `pnpm --filter @19er/employee dev` → `:5174` |
| إنتاج | `https://app.19ergmbh.de` |

---

## 11. الخلاصة

الدراسة تُنظَّم **حسب الميزة** — كل feature مجلد يضم صفحاتها ومكوّناتها وhooks وأنواعها معاً. البنية المشتركة في `core/` فقط. المرحلة 1 = عرض بيانات بدون حضور؛ API جاهز؛ التنفيذ يبدأ من `core/` ثم `auth` → `home` → `schedule` → `payroll` → `profile`.
