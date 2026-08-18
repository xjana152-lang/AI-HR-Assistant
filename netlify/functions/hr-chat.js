const KNOWLEDGE_BASE = `
- الإجازة السنوية: كل موظف يستحق 21 يوم إجازة سنوية مدفوعة الأجر، تزيد إلى 30 يوم بعد 5 سنوات خدمة. تُقدَّم الطلبات عبر نظام الموارد البشرية قبل 3 أيام عمل على الأقل من التاريخ المطلوب.
- العمل عن بُعد: يُسمح بالعمل عن بُعد يومين في الأسبوع بموافقة المدير المباشر، ويُطلب عبر نموذج "طلب عمل عن بُعد" في نظام HR.
- موعد صرف الراتب: يُصرف الراتب في اليوم الأخير من كل شهر ميلادي، أو آخر يوم عمل قبله إن صادف عطلة.
- شهادة الراتب: تُطلب عبر تذكرة من نوع "شهادة راتب" في نظام HR، وتصدر خلال يومي عمل.
- التأمين الطبي: للاستفسارات والمطالبات، التواصل مع قسم التأمين عبر insurance@company.com أو فتح تذكرة HR من نوع "تأمين".
- الاستقالة وإنهاء الخدمة: تُقدَّم عبر نموذج "إنهاء خدمة" بإشعار مسبق حسب العقد، وعادةً 30 يومًا.
`;

const DEMO_EMPLOYEE_DATA = `
- رصيد الإجازات المتبقي: 14 يوم من أصل 21 يوم مستحقة هذا العام.
- آخر عملية صرف راتب: نهاية الشهر الحالي، ولا توجد استقطاعات مسجّلة.
- حالة طلبات التأمين: لا توجد مطالبات مفتوحة حاليًا.
`;

function buildSystemPrompt(employeeAuthenticated) {
  return `أنتِ مساعد موارد بشرية ذكي (AI-powered HR Assistant) تتحدثين مع الموظف مباشرة بأسلوب طبيعي، ودود، ومهني. هذا نموذج أولي (Prototype) وليس نظام موارد بشرية حقيقي.

قاعدة المعرفة العامة لسياسات الشركة:
${KNOWLEDGE_BASE}

بيانات Demo Employee تجريبية وهمية بالكامل لأغراض العرض:
حالة تسجيل الدخول الآن: ${employeeAuthenticated ? "مسجّل الدخول" : "غير مسجّل الدخول"}

${DEMO_EMPLOYEE_DATA}

تعليمات التعامل مع الرسائل:

1. اقرئي المحادثة كاملة مع سياقها، وليس كل رسالة منفصلة.

2. إذا كان السؤال غامضًا وينقصه تفصيل ضروري، اسألي سؤالًا توضيحيًا قصيرًا واحدًا بدل التخمين.

3. إذا كان السؤال شخصيًا ويحتاج بيانات الموظف الخاصة، مثل رصيد الإجازات أو حالة الراتب، والموظف غير مسجّل الدخول:
لا تعرضي أي بيانات شخصية.
اشرحي بلطف أنه يحتاج تسجيل الدخول أولًا.
واجعلي requires_personal_data=true.

4. إذا كان السؤال شخصيًا والموظف مسجّل الدخول:
استخدمي بيانات Demo Employee الموجودة أعلاه.

5. إذا كان السؤال عامًا عن سياسة من سياسات الشركة:
أجيبي مباشرة وباختصار من قاعدة المعرفة.

6. إذا كان السؤال خارج نطاق الموارد البشرية:
وضحي بلطف أن هذا خارج نطاق المساعد.

7. اجعلي الردود بالعربية وبأسلوب طبيعي وودود ومهني.

8. اجعلي الرد قصيرًا، من سطرين إلى أربعة أسطر تقريبًا.

يجب أن يكون الرد JSON فقط، بدون Markdown وبدون أي نص خارج JSON.

استخدمي هذا الشكل بالضبط:

{
  "reply": "نص الرد بالعربية",
  "category": "عام أو شخصي أو null",
  "requires_personal_data": true,
  "is_clarifying_question": false,
  "intent": "leave_balance"
}

قواعد category:
- عام = سؤال عن سياسة أو معلومة عامة.
- شخصي = يحتاج بيانات الموظف.
- null = سؤال توضيحي لم يكتمل تصنيفه.

قواعد intent:
استخدمي معرفًا قصيرًا بالإنجليزية مثل:
leave_balance
leave_request
remote_work_policy
salary_date
salary_certificate
insurance
resignation
clarification
other
`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Method Not Allowed"
      })
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "ANTHROPIC_API_KEY غير موجود في إعدادات Netlify."
      })
    };
  }

  let parsedBody;

  try {
    parsedBody = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Invalid JSON request body"
      })
    };
  }

  const messages = parsedBody.messages;
  const employeeAuthenticated = Boolean(
    parsedBody.employee_authenticated
  );

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "messages array is required"
      })
    };
  }

  const anthropicMessages = messages.map((message) => ({
    role: message.role === "bot" ? "assistant" : "user",
    content: String(message.text || "")
  }));

  try {
    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 600,
          system: buildSystemPrompt(employeeAuthenticated),
          messages: anthropicMessages
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Anthropic API error",
          details: responseText
        })
      };
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Invalid response from Anthropic API"
        })
      };
    }

    const text = (data.content || [])
      .map((block) => {
        return block.type === "text" ? block.text : "";
      })
      .join("")
      .trim();

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(cleaned);
    } catch (error) {
      result = {
        reply: "ما قدرت أفهم الرد بشكل صحيح. جربي إعادة صياغة سؤالك.",
        category: null,
        requires_personal_data: false,
        is_clarifying_question: false,
        intent: "other"
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Server error",
        details: error.message
      })
    };
  }
};