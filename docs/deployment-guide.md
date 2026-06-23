# دليل النشر — VPS + Vercel + CI/CD

شرح بسيط لمشروع **19er GmbH**. افترض إنك جينيور وتبي تفهم **ليش** كل شيء موجود.

---

## 1. الصورة الكبيرة

```
الموظف (employee)  ──►  Vercel  ──►  19ergmbh-de.com
الإدارة (admin)    ──►  Vercel  ──►  admin.19ergmbh-de.com
الـ API            ──►  VPS     ──►  api.19ergmbh-de.com
```

| الجزء | وين ينشر | ليش |
|-------|----------|-----|
| Admin + Employee | **Vercel** | مواقع React ثابتة (SPA) — Vercel يبنيها ويخدمها بسرعة |
| API | **VPS** | يحتاج MySQL على نفس السيرفر + PM2 يشغّله 24/7 |

**القاعدة:** الواجهات على Vercel، الخادم والداتابيس على VPS.

---

## 2. نشر الـ API على VPS

### السيرفر

- **IP:** `45.132.241.51`
- **المستخدم:** `api-19ergmbh-de`
- **المجلد:** `~/htdocs/api.19ergmbh-de.com`
- **الدومين:** `api.19ergmbh-de.com`

### الأدوات على السيرفر

| أداة | وظيفتها |
|------|---------|
| **Node 22** (nvm) | تشغيل JavaScript |
| **pnpm** | تثبيت الحزم (monorepo) |
| **PM2** | يشغّل الـ API ويعيد تشغيله لو وقع |
| **MySQL** | قاعدة البيانات (محلية `127.0.0.1:3306`) |

### ملف `.env` على السيرفر

نسخ من `deploy/env.production.example` وتعبئة القيم الحقيقية:

- `DATABASE_URL` — اتصال MySQL
- `PORT=3003`
- `CORS_ORIGIN` — دومينات الواجهات (admin + employee)
- `JWT_SECRET` و `JWT_REFRESH_SECRET` — مفاتيح التوكن

### سكربت النشر: `deploy/deploy-api.sh`

هذا السكربت يعمل **كل مرة** تبي تنشر:

```bash
pnpm install --frozen-lockfile    # 1. تثبيت الحزم
pnpm db:generate                  # 2. توليد Prisma client
pnpm db:migrate:deploy            # 3. تحديث قاعدة البيانات
pnpm turbo build --filter=@19er/api...  # 4. بناء الـ API
pm2 startOrReload deploy/ecosystem.config.cjs  # 5. تشغيل/إعادة تشغيل
```

### PM2: `deploy/ecosystem.config.cjs`

PM2 = مدير عمليات Node. يشغّل:

```
apps/api/dist/server.js
```

اسم العملية: `19er-api`

### النشر اليدوي (من السيرفر)

```bash
ssh api-19ergmbh-de@45.132.241.51
cd ~/htdocs/api.19ergmbh-de.com
git pull
bash deploy/deploy-api.sh
```

أو من جذر المشروع محلياً (لو عندك SSH):

```bash
pnpm deploy:api
```

---

## 3. نشر الواجهات على Vercel

### المشاريع

| المشروع | الدومين |
|---------|---------|
| `19er-employee` | `19ergmbh-de.com` |
| `19er-admin` | `admin.19ergmbh-de.com` |

### ليش monorepo؟

المشروع فيه `apps/` و `packages/`. Vercel لازم يبني من **جذر الريبو** مو من مجلد التطبيق وحده.

كل تطبيق عنده `vercel.json` خاص:

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm turbo build --filter=@19er/admin",
  "outputDirectory": "apps/admin/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**شرح سريع:**

- `installCommand` — يثبّت كل الحزم
- `buildCommand` — turbo يبني التطبيق + الـ packages اللي يحتاجها
- `outputDirectory` — مجلد الملفات الجاهزة (HTML/JS/CSS)
- `rewrites` — أي رابط (`/login` مثلاً) يرجع `index.html` عشان React Router يشتغل

### متغيرات البيئة على Vercel

في إعدادات كل مشروع:

```
VITE_API_URL=https://api.19ergmbh-de.com
```

الواجهة تستخدم هذا الرابط للاتصال بالـ API.

### النشر من جهازك

```bash
pnpm deploy:employee   # ينشر employee
pnpm deploy:admin      # ينشر admin
pnpm deploy:vercel     # الاثنين معاً
```

الأمر يعمل:

1. `vercel link` — يربط المجلد بمشروع Vercel
2. `vercel deploy --prod` — يرفع للإنتاج
3. `--archive=tgz` — يضغط الريبو كامل (مهم للـ monorepo)
4. `--local-config apps/.../vercel.json` — يستخدم إعدادات التطبيق الصح

### DNS

عند مسجّل الدومين، أضف:

```
A  19ergmbh-de.com       → 76.76.21.21
A  www.19ergmbh-de.com   → 76.76.21.21
A  admin.19ergmbh-de.com → 76.76.21.21
```

`76.76.21.21` = IP Vercel.

---

## 4. CI/CD — النشر التلقائي

**CI/CD** = لما تدفع كود على GitHub، السيرفر ينشر لوحده بدون ما تدخل SSH.

### ملف الـ workflow: `.github/workflows/deploy-api.yml`

**متى يشتغل؟**

- push على فرع `main`
- وتغيّر في: `apps/api`, `packages`, `deploy`, أو ملفات الجذر

**ماذا يفعل؟**

```
GitHub Actions  ──SSH──►  VPS  ──►  deploy-api.sh
```

الخطوات بالتفصيل:

1. GitHub يشغّل workflow على سيرفر Ubuntu مؤقت
2. يتصل بالـ VPS عبر SSH (مفتاح خاص)
3. يسحب آخر كود من `main`
4. يكتب ملف `.env` من secret اسمه `API_ENV`
5. يشغّل `bash deploy/deploy-api.sh`

### Secrets المطلوبة في GitHub

اذهب: **Repo → Settings → Secrets → Actions**

| Secret | القيمة |
|--------|--------|
| `SSH_HOST` | `45.132.241.51` |
| `SSH_USER` | `api-19ergmbh-de` |
| `SSH_PRIVATE_KEY` | المفتاح الخاص (بدون passphrase) |
| `API_ENV` | محتوى ملف `.env` كامل سطر بسطر |

### كيف تجيب `SSH_PRIVATE_KEY`؟

على جهازك (PowerShell):

```powershell
# إنشاء مفتاح جديد (لو ما عندك)
ssh-keygen -t ed25519 -C "github-deploy" -f $env:USERPROFILE\.ssh\github_deploy_19er -N '""'

# عرض المفتاح الخاص — انسخه كامل لـ GitHub Secret
Get-Content $env:USERPROFILE\.ssh\github_deploy_19er

# عرض المفتاح العام — ضعه على السيرفر
Get-Content $env:USERPROFILE\.ssh\github_deploy_19er.pub
```

على السيرفر:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "المفتاح_العام_هنا" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### ملاحظة عن Vercel

Vercel عنده **نشر تلقائي** مدمج: لما تربط الريبو بمشروع Vercel، كل push على `main` يبني وينشر.

أو تنشر يدوياً بـ `pnpm deploy:vercel`.

---

## 5. تدفق العمل اليومي

### تعدّل الـ API

```
1. اكتب الكود
2. git push origin main
3. GitHub Actions ينشر على VPS تلقائياً
4. تحقق: https://api.19ergmbh-de.com/health
```

### تعدّل Admin أو Employee

```
1. اكتب الكود
2. git push (لو Vercel مربوط بالريبو → ينشر تلقائي)
   أو: pnpm deploy:admin / pnpm deploy:employee
3. افتح الموقع وتأكد
```

### أول مرة على سيرفر جديد

```bash
# 1. SSH للسيرفر
ssh api-19ergmbh-de@45.132.241.51

# 2. استنساخ المشروع
mkdir -p ~/htdocs/api.19ergmbh-de.com
cd ~/htdocs/api.19ergmbh-de.com
git clone https://github.com/AiQotayba/19ergmbh-de.git .

# 3. إنشاء .env
cp deploy/env.production.example .env
nano .env   # عدّل القيم

# 4. نشر
bash deploy/deploy-api.sh

# 5. (اختياري) بيانات تجريبية
pnpm db:seed
```

---

## 6. أخطاء شائعة

| المشكلة | السبب | الحل |
|---------|-------|------|
| `/login` يعطي 404 على Vercel | SPA بدون rewrite | تأكد من `rewrites` في `vercel.json` |
| `DATABASE_URL` missing أثناء البناء | Prisma يحتاج المتغير وقت البناء | موجود placeholder في `with-root-env.mjs` |
| السكربت يفشل على Linux | ملف bash فيه `\r\n` (Windows) | `.gitattributes` يفرض LF لملفات `.sh` |
| CORS error | الـ API ما يسمح بدومين الواجهة | حدّث `CORS_ORIGIN` في `.env` على VPS |
| PM2 ما يشتغل بعد reboot | ما عملت `pm2 startup` | `pm2 startup` ثم `pm2 save` |

---

## 7. الملفات المهمة (مرجع سريع)

```
deploy/
  deploy-api.sh          ← سكربت النشر على VPS
  ecosystem.config.cjs   ← إعداد PM2
  env.production.example ← قالب .env

.github/workflows/
  deploy-api.yml         ← CI/CD للـ API

apps/admin/vercel.json   ← إعداد Vercel للإدارة
apps/employee/vercel.json← إعداد Vercel للموظفين

package.json             ← أوامر deploy:*
```

---

## 8. الخلاصة

1. **VPS** = خادمك الخاص. الـ API + MySQL يعيشون هناك. PM2 يشغّل الـ API.
2. **Vercel** = استضافة للواجهات. يبني React ويخدمه على CDN.
3. **CI/CD** = GitHub Actions يتصل SSH ويشغّل سكربت النشر لما تدفع على `main`.
4. **Monorepo** = كل شيء في ريبو واحد. turbo يبني التطبيق الصح، وVercel يبني من الجذر.

لو فهمت الأربع نقاط فوق، فهمت كل الإعداد.
