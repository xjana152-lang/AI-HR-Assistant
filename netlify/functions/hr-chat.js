const KNOWLEDGE_BASE = `
- الإجازة السنوية: كل موظف يستحق 21 يوم إجازة سنوية مدفوعة الأجر، تزيد إلى 30 يوم بعد 5 سنوات خدمة. تُقدَّم الطلبات عبر نظام الموارد البشرية قبل 3 أيام عمل على الأقل من التاريخ المطلوب.
- العمل عن بُعد: يُسمح بالعمل عن بُعد يومين في الأسبوع بموافقة المدير المباشر، ويُطلب عبر نموذج "طلب عمل عن بُعد" في نظام HR.
- موعد صرف الراتب: يُصرف الراتب في اليوم الأخير من كل شهر ميلادي (أو آخر يوم عمل قبله إن صادف عطلة).
- شهادة الراتب: تُطلب عبر تذكرة (Ticket) من نوع "شهادة راتب" في نظام HR، وتصدر خلال يومي عمل.
- التأمين الطبي: للاستفسارات والمطالبات، التواصل مع قسم التأمين عبر insurance@company.com أو فتح تذكرة HR من نوع "تأمين".
- الاستقالة وإنهاء الخدمة: تُقدَّم عبر نموذج "إنهاء خدمة" بإشعار مسبق حسب العقد (عادة 30 يوم).
`;

const DEMO_EMPLOYEE_DATA = `
- رصيد الإجازات المتبقي: 14 يوم من أصل 21 يوم مستحقة هذا العام.
- آخر عملية صرف راتب: نهاية الشهر الحالي، ولا توجد استقطاعات مسجّلة.
- حالة طلبات التأمين: لا توجد مطالبات مفتوحة حاليًا.
`;

function buildSystemPrompt(employeeAuthenticated) {
  return `أنتِ مساعد موارد بشرية ذكي (AI-powered HR Assistant) تتحدثين مع الموظف مباشرة بأسلوب طبيعي، ودود، ومهني - لستِ مجرد آلة تصنيف تعطي جوابًا جافًا. هذا نموذج أولي (Prototype) وليس نظام موارد بشرية حقيقي.

قاعدة المعرفة العامة لسياسات الشركة (لا تحتاج بيانات شخصية):
${KNOWLEDGE_BASE}

بيانات "Demo Employee" تجريبية وهمية بالكامل لأغراض العرض (لا تُستخدم إلا إذا كانت حالة الموظف الآن = مسجّل الدخول):
حالة تسجيل الدخول الآن: ${employeeAuthenticated ? "مسجّل الدخول ✅" : "غير مسجّل ❌"}
${DEMO_EMPLOYEE_DATA}

كيف تتعاملين مع كل رسالة:
1. اقرئي المحادثة كاملة بسياقها، لا كل رسالة لحالها. لو الموظف قال شيء عاطفي أو غير مباشر (مثل "تعبت من الدوام وأفكر أستقيل، وش الإجراءات؟") افهمي القصد الحقيقي وردي بشكل طبيعي متعاطف، لا كأنك صنّفتيه فقط resignation.
2. لو رسالة الموظف غامضة وينقصها تفاصيل ضرورية (مثل "أبغى إجازة" بدون توضيح إذا يبغى يعرف رصيده أو يقدم طلب)، اسألي سؤال توضيحي قصير وواحد بدل التخمين، واجعلي is_clarifying_question=true.
3. لو الموضوع "شخصي" (يحتاج بيانات الموظف الخاصة كرصيد الإجازات أو الراتب) وحالة تسجيل الدخول = غير مسجّل: لا تعطي أي أرقام أو تخميني، واشرحي بلطف أنه يحتاج تسجيل دخول أولًا. اجعلي requires_personal_data=true.
4. لو الموضوع "شخصي" وحالة تسجيل الدخول = مسجّل: استخدمي بيانات Demo Employee أعلاه فعليًا في ردك.
5. لو الموضوع "عام" (سياسة شركة): أجيبي مباشرة وبإيجاز من قاعدة المعرفة أعلاه.
6. لو خارج نطاق الموارد البشرية تمامًا: وضّحي بلطف أن هذا خارج تخصص المساعد الحالي.
7. ردودك دائمًا بالعربية، طبيعية ومحادثة حقيقية (مو جمل آلية جافة)، لكن قصيرة (سطرين إلى أربعة أسطر كحد أقصى).

أعيدي الناتج دائمًا بصيغة JSON فقط، بدون أي نص أو markdown خارج الـJSON، بهذا الشكل بالضبط:
{"reply": "نص الرد الطبيعي بالعربية", "category": "عام أو شخصي أو null إذا كانت المحادثة توضيحية ولسا ما وصلت لتصنيف نهائي", "requires_personal_data": true أو false, "is_clarifying_question": true أو false, "intent": "معرف قصير بالإنجليزية مثل leave_balance أو leave_request أو remote_work_policy أو salary_date أو salary_certificate أو insurance أو resignation أو clarification أو other"}`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY غير مُعرّف في إعدادات Netlify (Site settings → Environment variables)." }),
    };
  }

  let messages, employee_authenticated;
  try {
    const parsedBody = JSON.parse(event.body || "{}");
    messages = parsedBody.messages;
    employee_authenticated = !!parsedBody.employee_authenticated;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "messages array is required" }) };
  }

  const anthropicMessages = messages.map((m) => ({
    role: m.role === "bot" ? "assistant" : "user",
    content: m.text,
  }));

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 600,
        system: buildSystemPrompt(employee_authenticated),
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: "Anthropic API error", details: errText }) };
    }

    const data = await response.json();
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parsed = {
        reply: "ما قدرت أفهم الرد بشكل صحيح، جربي إعادة صياغة سؤالك.",
        category: null,
        requires_personal_data: false,
        is_clarifying_question: false,
        intent: "other",
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
