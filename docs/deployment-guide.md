# دليل النشر — شرح واضح من الصفر

> هدف الملف: تفهم **ماذا يحدث فعلاً** لما المستخدم يفتح الموقع، وكيف وصلنا للإنتاج.

---

## قبل ما نبدأ — 3 كلمات لازم تفهمها

### VPS = سيرفر (كمبيوتر) إنت مؤجره

- IP ثابت على الإنترنت، مثل: `45.132.241.51`
- تدخل عليه بـ SSH وتنصّب عليه Node و MySQL
- **أنت** مسؤول إنه يشتغل 24/7
- في مشروعنا: الـ **API** و **قاعدة البيانات** هنا

### Vercel = شركة تستضيف مواقع React جاهزة

- ما تحتاج تدير سيرفر
- تأخذ كود React → تبنيه → تعطيك رابط
- في مشروعنا: موقع **الموظف** وموقع **الإدارة** هنا

### CI/CD = نشر تلقائي

- CI = Continuous Integration → الكود يُختبر/يُبنى تلقائياً
- CD = Continuous Deployment → يُنشر تلقائياً على السيرفر
- في مشروعنا: لما تسوي `git push` على `main`، GitHub يدخل السيرفر وينشر الـ API **بدون ما تفتح SSH**

---

## ماذا يحدث لما موظف يفتح الموقع؟

```
1. يكتب: 19ergmbh-de.com
2. المتصفح يطلب الصفحة من Vercel
3. Vercel يرجع ملفات React (HTML + JS + CSS) — جاهزة مسبقاً
4. React يشتغل في المتصفح ويطلب بيانات من: api.19ergmbh-de.com
5. الطلب يصل VPS → Node.js (الـ API) → MySQL → يرجع JSON
6. React يعرض البيانات
```

**مهم:** Vercel **ما** يشغّل الـ API. Vercel يعطيك الواجهة فقط. الـ API على VPS.

```
┌─────────────────┐         ┌─────────────────┐
│  Vercel         │         │  VPS            │
│                 │         │                 │
│  employee app   │ ──API──►│  Node + MySQL   │
│  admin app      │  calls  │  (api.19erg...) │
└─────────────────┘         └─────────────────┘
```

---

## أين كل شيء؟ (جدول واحد)

| ماذا | أين يعيش | الرابط |
|------|----------|--------|
| تطبيق الموظف | Vercel | https://19ergmbh-de.com |
| لوحة الإدارة | Vercel | https://admin.19ergmbh-de.com |
| الـ API | VPS | https://api.19ergmbh-de.com |
| قاعدة البيانات | VPS (داخل السيرفر) | `127.0.0.1:3306` — ما تفتحها للإنترنت |

---

# الجزء 1: نشر الـ API على VPS

## الخطوة 0 — إيش موجود على السيرفر أصلاً؟

قبل ما ننشر، السيرفر لازم يكون فيه:

| شيء | ليش |
|-----|-----|
| Ubuntu Linux | نظام التشغيل |
| Node.js 22 | يشغّل كود الـ API |
| pnpm | يثبّت حزم المشروع |
| MySQL | يخزّن البيانات (مستخدمين، شفتات، رواتب...) |
| PM2 | يشغّل الـ API ويعيد تشغيله لو وقع |
| Git | يسحب الكود من GitHub |

**بيانات الدخول:**
```
ssh api-19ergmbh-de@45.132.241.51
```

**مجلد المشروع على السيرفر:**
```
~/htdocs/api.19ergmbh-de.com
```

---

## الخطوة 1 — أول مرة: حمّل الكود

```bash
ssh api-19ergmbh-de@45.132.241.51

mkdir -p ~/htdocs/api.19ergmbh-de.com
cd ~/htdocs/api.19ergmbh-de.com
git clone https://github.com/AiQotayba/19ergmbh-de.git .
```

الآن السيرفر فيه نسخة من الكود.

---

## الخطوة 2 — أنشئ ملف `.env`

`.env` = ملف سري فيه إعدادات الإنتاج (كلمة سر الداتابيس، مفاتيح JWT...).

```bash
cp deploy/env.production.example .env
nano .env
```

**أهم القيم اللي لازم تغيّرها:**

```env
DATABASE_URL="mysql://USER:PASS@127.0.0.1:3306/DATABASE"
API_PORT=3003
CORS_ORIGIN="https://19ergmbh-de.com,https://admin.19ergmbh-de.com"
JWT_ACCESS_SECRET="سلسلة-عشوائية-طويلة-32-حرف-على-الأقل"
JWT_REFRESH_SECRET="سلسلة-عشوائية-ثانية-طويلة"
```

**ليش `CORS_ORIGIN`؟**
المتصفح يمنع موقع `19ergmbh-de.com` يطلب بيانات من `api.19ergmbh-de.com` إلا إذا الـ API قال: "أنا أسمح لهذا الموقع". هذي القيمة هي القائمة المسموح لها.

---

## الخطوة 3 — شغّل سكربت النشر

```bash
bash deploy/deploy-api.sh
```

**ماذا يفعل السكربت خطوة بخطوة؟**

```
الخطوة 1: pnpm install
         → يحمّل كل المكتبات (express, prisma, ...)

الخطوة 2: pnpm db:generate
         → Prisma يولّد كود للتعامل مع MySQL

الخطوة 3: pnpm db:migrate:deploy
         → يطبّق تغييرات الجداول على الداتابيس

الخطوة 4: pnpm turbo build
         → يحوّل TypeScript لـ JavaScript في apps/api/dist/

الخطوة 5: pm2 startOrReload
         → يشغّل apps/api/dist/server.js على بورت 3003
```

**PM2 ببساطة:** برنامج يقول "شغّل Node.js ولو وقع أعد تشغيله". بدونه لو السيرفر رستارت أو الـ API كراش، ما أحد يشغّله.

بعد النشر، تحقق:
```bash
pm2 status          # لازم تشوف 19er-api = online
curl localhost:3003/health   # لازم يرجع OK
```

---

## الخطوة 4 — ربط الدومين

الدومين `api.19ergmbh-de.com` لازم يشير لـ IP السيرفر `45.132.241.51`.

عند مسجّل الدومين:
```
A  api.19ergmbh-de.com  →  45.132.241.51
```

على السيرفر (عادةً nginx أو Apache) يوجّه الطلبات من بورت 443 إلى بورت 3003.

---

## الخطوة 5 — بيانات تجريبية (مرة واحدة)

```bash
pnpm db:seed
```

ينشئ:
- أدمن: `admin@19ergmbh.de` / `Admin123!`
- موظفين تجريبيين

---

## النشر بعد أول مرة (يدوي)

كل ما تعدّل الـ API وتبي تنشر:

```bash
ssh api-19ergmbh-de@45.132.241.51
cd ~/htdocs/api.19ergmbh-de.com
git pull
bash deploy/deploy-api.sh
```

**أو** من جهازك (لو SSH مضبوط):
```bash
pnpm deploy:api
```

---

# الجزء 2: نشر الواجهات على Vercel

## ليش Vercel مو VPS للواجهات؟

React بعد البناء = ملفات ثابتة (HTML, JS, CSS). Vercel:
1. يبنيها
2. يوزّعها على سيرفرات حول العالم (CDN)
3. يعطيك HTTPS مجاناً

ما تحتاج PM2 ولا MySQL للواجهة.

---

## الخطوة 1 — أنشئ مشروعين على Vercel

في [vercel.com](https://vercel.com):

| اسم المشروع | التطبيق |
|-------------|---------|
| `19er-employee` | تطبيق الموظف |
| `19er-admin` | لوحة الإدارة |

**Root Directory = `.`** (جذر الريبو، مو `apps/admin`)

ليش؟ لأن المشروع monorepo — الكود مشترك في `packages/` وكل التطبيقات تحتاجه.

---

## الخطوة 2 — ملف `vercel.json` لكل تطبيق

مثال `apps/admin/vercel.json`:

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm turbo build --filter=@19er/admin",
  "outputDirectory": "apps/admin/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**كل سطر معناه:**

| السطر | المعنى |
|-------|--------|
| `installCommand` | Vercel يثبّت الحزم |
| `buildCommand` | turbo يبني admin + الحزم اللي يحتاجها |
| `outputDirectory` | الملفات الجاهزة هنا بعد البناء |
| `rewrites` | أي رابط (`/login`, `/dashboard`) يرجع `index.html` |

**ليش `rewrites`؟**
React Router يشتغل في المتصفح. لما تفتح `/login` مباشرة، Vercel ما عنده ملف اسمه `login.html`. الـ rewrite يقول: "أعطه `index.html` وخلي React يتعامل مع المسار".

---

## الخطوة 3 — متغير البيئة على Vercel

في كل مشروع (admin + employee):

**Settings → Environment Variables:**
```
VITE_API_URL = https://api.19ergmbh-de.com
```

الكود في React يقرأ هذا الرابط ويرسل له طلبات الـ API.

---

## الخطوة 4 — النشر

**من جهازك:**
```bash
pnpm deploy:employee    # ينشر employee
pnpm deploy:admin       # ينشر admin
pnpm deploy:vercel      # الاثنين
```

**ماذا يحدث خلف الكواليس؟**
```
1. vercel link     → يربط مجلدك بمشروع Vercel
2. يضغط الريبو كامل (--archive=tgz) ويرفعه
3. Vercel يشغّل installCommand ثم buildCommand
4. يأخذ ملفات dist وينشرها
5. يعطيك رابط: https://19er-admin.vercel.app
```

**أو تلقائي:** اربط GitHub بالمشروع على Vercel → كل `git push` على `main` ينشر لوحده.

---

## الخطوة 5 — ربط الدومين

في Vercel → Project → Settings → Domains:

| المشروع | الدومين |
|---------|---------|
| `19er-employee` | `19ergmbh-de.com` |
| `19er-admin` | `admin.19ergmbh-de.com` |

عند مسجّل الدومين:
```
A  19ergmbh-de.com       →  76.76.21.21
A  www.19ergmbh-de.com   →  76.76.21.21
A  admin.19ergmbh-de.com →  76.76.21.21
```

`76.76.21.21` = IP Vercel (مو IP السيرفر).

---

# الجزء 3: CI/CD — النشر التلقائي للـ API

## الفكرة بجملة واحدة

> أنت تدفع كود على GitHub → روبوت يدخل السيرفر ويشغّل `deploy-api.sh` بدالك.

**الواجهات (Vercel):** إما Vercel ينشر تلقائي من GitHub، أو تنشر يدوي بـ `pnpm deploy:vercel`.

**الـ API (VPS):** GitHub Actions هو اللي ينشر تلقائي.

---

## ماذا يحدث بالضبط لما تسوي `git push`؟

```
أنت على جهازك:
  git add .
  git commit -m "fix login"
  git push origin main

        ↓

GitHub يشوف: في تغيير في apps/api أو packages؟
  نعم → يشغّل ملف .github/workflows/deploy-api.yml

        ↓

GitHub Actions (سيرفر Ubuntu مؤقت):
  1. يقرأ SSH_HOST, SSH_USER, SSH_PRIVATE_KEY من Secrets
  2. يتصل بالـ VPS: ssh api-19ergmbh-de@45.132.241.51
  3. يدخل مجلد ~/htdocs/api.19ergmbh-de.com
  4. git fetch + git reset --hard origin/main  (يسحب آخر كود)
  5. يكتب .env من secret اسمه API_ENV
  6. bash deploy/deploy-api.sh
  7. ينتهي

        ↓

الـ API محدّث على https://api.19ergmbh-de.com
```

تتابع التقدم من: **GitHub → Actions tab**

---

## الـ Secrets — وين تحطها؟

**GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret**

| الاسم | ماذا تحط |
|-------|----------|
| `SSH_HOST` | `45.132.241.51` |
| `SSH_USER` | `api-19ergmbh-de` |
| `SSH_PRIVATE_KEY` | محتوى المفتاح **الخاص** كامل (انظر تحت) |
| `API_ENV` | محتوى ملف `.env` **كامل** — كل سطر كما هو |

---

## كيف تجهّز مفتاح SSH للـ CI/CD؟

**على Windows (PowerShell):**

```powershell
# 1. أنشئ مفتاح (مرة واحدة)
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\github_deploy_19er -N '""'

# 2. المفتاح الخاص → انسخه لـ GitHub Secret اسمه SSH_PRIVATE_KEY
Get-Content $env:USERPROFILE\.ssh\github_deploy_19er

# 3. المفتاح العام → حطه على السيرفر
Get-Content $env:USERPROFILE\.ssh\github_deploy_19er.pub
```

**على السيرفر:**
```bash
echo "المفتاح_العام_هنا" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**الفرق:**
- **خاص (private)** = مثل كلمة السر → يبقى في GitHub Secrets فقط
- **عام (public)** = مثل القفل → يتحط على السيرفر

GitHub Actions يستخدم المفتاح الخاص ليثبت للسيرفر إنه مسموح يدخل.

---

# سيناريوهات يومية

## سيناريو 1: عدّلت endpoint في الـ API

```
1. عدّل الكود محلياً
2. git push origin main
3. انتظر GitHub Actions (دقيقة–دقيقتين)
4. افتح https://api.19ergmbh-de.com/health
```

## سيناريو 2: عدّلت صفحة في Admin

```
1. عدّل الكود
2. pnpm deploy:admin
   (أو git push لو Vercel مربوط بالريبو)
3. افتح https://admin.19ergmbh-de.com
```

## سيناريو 3: الـ API ما يشتغل بعد reboot السيرفر

```bash
ssh api-19ergmbh-de@45.132.241.51
pm2 status                    # شوف الحالة
pm2 restart 19er-api          # أعد التشغيل
pm2 startup                   # مرة واحدة: يشغّل PM2 تلقائي بعد reboot
pm2 save
```

---

# أخطاء شائعة — سبب + حل

### "CORS error" في المتصفح
- **السبب:** الـ API ما يسمح بدومين الواجهة
- **الحل:** تأكد `CORS_ORIGIN` في `.env` على VPS فيه `https://19ergmbh-de.com` و `https://admin.19ergmbh-de.com`

### `/login` يعطي 404 على Vercel
- **السبب:** Vercel ما يعرف يرجع `index.html` لمسارات React
- **الحل:** تأكد `rewrites` موجود في `vercel.json`

### GitHub Actions يفشل عند SSH
- **السبب:** مفتاح خاطئ أو المفتاح العام مو على السيرفر
- **الحل:** راجع الخطوات في قسم SSH أعلاه

### `deploy-api.sh` يفشل على Linux
- **السبب:** الملف انحفظ بـ Windows line endings (`\r\n`)
- **الحل:** `.gitattributes` يفرض LF — تأكد الملف محفوظ صح

### الواجهة تطلب API من `localhost`
- **السبب:** `VITE_API_URL` مو مضبوط على Vercel
- **الحل:** أضف المتغير في Vercel Settings → Environment Variables

---

# الملفات — وين كل شيء؟

```
deploy/deploy-api.sh           ← السكربت اللي ينشر على VPS
deploy/ecosystem.config.cjs    ← إعداد PM2 (اسم العملية: 19er-api)
deploy/env.production.example  ← قالب .env

.github/workflows/deploy-api.yml  ← روبوت GitHub Actions

apps/admin/vercel.json         ← إعداد بناء admin على Vercel
apps/employee/vercel.json      ← إعداد بناء employee على Vercel

package.json                   ← أوامر: deploy:api, deploy:admin, deploy:employee
```

---

# ملخص في 5 أسطر

1. **VPS** يشغّل الـ API + MySQL. **Vercel** يستضيف React.
2. النشر على VPS = `bash deploy/deploy-api.sh` (يثبّت → يبني → PM2 يشغّل).
3. النشر على Vercel = `pnpm deploy:admin` أو `pnpm deploy:employee`.
4. **CI/CD** = `git push` → GitHub يدخل VPS ويشغّل السكربت.
5. الواجهات تتكلم مع `https://api.19ergmbh-de.com` — مو مع localhost.
