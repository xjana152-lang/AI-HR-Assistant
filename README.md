# AI-powered HR Assistant — Prototype

نموذج أولي (Proof of Concept) لمساعد موارد بشرية ذكي. الواجهة صفحة واحدة (بدون خطوة Build)، والتصنيف الذكي للأسئلة يتم عبر Netlify Function تستدعي Claude API بأمان من السيرفر.

## هيكل المشروع

```
hr-assistant-netlify/
├── netlify.toml              ← إعدادات Netlify
├── public/
│   └── index.html            ← الواجهة (HTML/CSS/JS بدون Framework)
└── netlify/
    └── functions/
        └── hr-chat.js        ← الدالة اللي تستدعي Claude API بمفتاحك الخاص
```

## خطوات النشر

### 1. احصلي على مفتاح Anthropic API
سجّلي في console.anthropic.com وأنشئي API key من قسم API Keys.
⚠️ لا تحطي المفتاح داخل أي ملف في المشروع أو ترفعينه على GitHub — يُضاف فقط كمتغيّر بيئة في Netlify (خطوة 3).

### 2. ارفعي المشروع
أسهل طريقة: أنشئي مستودع (repo) على GitHub وارفعي هذا المجلد بالكامل، ثم في Netlify:
`Add new site → Import an existing project → اختاري المستودع`

(الطريقة القديمة "Deploy manually" بالسحب والإفلات ما تدعم الـ Functions، فلازم يكون عن طريق Git أو Netlify CLI).

بديل بدون Git: تثبيت Netlify CLI محليًا ثم تشغيل:
```
npm install -g netlify-cli
netlify deploy --prod
```

### 3. أضيفي متغيّر البيئة
في لوحة Netlify: `Site settings → Environment variables → Add a variable`
- Key: `ANTHROPIC_API_KEY`
- Value: المفتاح اللي أخذتيه من الخطوة 1

بعد الإضافة، أعيدي النشر (Trigger deploy) عشان يقرأ المتغيّر الجديد.

### 4. جاهز
الموقع بعد النشر يشتغل فعليًا مع Claude — التصنيف بين الأسئلة العامة والشخصية حقيقي، مو محاكاة.

## ملاحظات مهمة
- هذا نموذج أولي: بيانات "Demo Employee" (رصيد الإجازات، الراتب...) وهمية بالكامل ومكتوبة داخل `hr-chat.js`، وتسجيل الدخول محاكاة فقط بدون أمان حقيقي. الواجهة توضّح هذا بشكل صريح (تاغ "Demo Employee" بعد تسجيل الدخول + ملاحظة تحت أي رد شخصي).
- المساعد الآن يحتفظ بسياق المحادثة كاملة (multi-turn) بدل تصنيف كل رسالة لحالها، ويقدر يسأل سؤال توضيحي قبل ما يجاوب لو السؤال غامض (مثل "أبغى إجازة" → يسأل: تقصدين رصيدك أو تقديم طلب؟).
- لو حبيتي تربطينه بنظام HR حقيقي لاحقًا، مكان التعديل هو `DEMO_EMPLOYEE_DATA` و`buildSystemPrompt` داخل `netlify/functions/hr-chat.js` — تستبدلينهم باستدعاء API فعلي لنظام الـ HRIS بدل النص الثابت.
- تقدرين تعدّلين قاعدة المعرفة (سياسات الإجازات، العمل عن بُعد...) من نفس الملف داخل `KNOWLEDGE_BASE`.
- Model ID المستخدم `claude-sonnet-5` — تم التحقق منه في توثيق Anthropic الرسمي (سلسلة Sonnet 5، بدون تاريخ في الاسم). لو لاحظتِ خطأ "Model Not Found" وقت النشر، راجعي https://docs.claude.com/en/docs/about-claude/models/overview للاسم الحالي.
