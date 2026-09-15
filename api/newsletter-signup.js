const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;
const NEWSLETTER_FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "five.elements.aesthetics@gmail.com";
const NEWSLETTER_FROM_NAME = process.env.NEWSLETTER_FROM_NAME || "五行美學";
const SITE_URL = process.env.SITE_URL || "https://five-elements-aesthetics-static.vercel.app";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBVIOUS_FAKE_LOCAL_PARTS = new Set(["a", "aa", "aaa", "abc", "abcd", "test", "fake", "email", "user", "sample", "none", "null"]);

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function isPlausibleEmail(email) {
  if (!EMAIL_PATTERN.test(email)) return false;
  const [localPart] = email.split("@");
  if (!localPart || localPart.length < 4) return false;
  if (!/[a-z]/i.test(localPart)) return false;
  if (OBVIOUS_FAKE_LOCAL_PARTS.has(localPart.replace(/[^a-z]/gi, "").toLowerCase())) return false;
  return true;
}

function createToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

async function savePendingSignup(email, token) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server settings are missing.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_signups?on_conflict=email`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      email,
      source: "website",
      status: "pending",
      confirmation_token: token,
      confirmation_sent_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not save newsletter signup: ${detail}`);
  }
}

async function sendConfirmationEmail(email, token) {
  if (!BREVO_API_KEY) {
    throw new Error("Newsletter email sender is not configured.");
  }

  const confirmUrl = `${SITE_URL.replace(/\/$/, "")}/api/newsletter-confirm?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        email: NEWSLETTER_FROM_EMAIL,
        name: NEWSLETTER_FROM_NAME
      },
      to: [{ email }],
      subject: "確認訂閱五行美學最新消息",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #20211f;">
          <h2>確認訂閱五行美學最新消息</h2>
          <p>請按以下按鈕確認你的電郵地址。確認後，你先會正式加入五行美學訂閱名單。</p>
          <p><a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;background:#20211f;color:#fff;text-decoration:none;border-radius:8px;">確認訂閱</a></p>
          <p style="color:#6f6a5f;font-size:13px;">如果你沒有申請訂閱，可以忽略此電郵。</p>
        </div>
      `,
      textContent: `請打開以下連結確認訂閱五行美學最新消息：${confirmUrl}`
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not send confirmation email: ${detail}`);
  }
}

async function addToBrevo(email) {
  if (!BREVO_API_KEY || !BREVO_LIST_ID) return false;

  const response = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      listIds: [Number(BREVO_LIST_ID)],
      updateEnabled: true
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not add Brevo contact: ${detail}`);
  }

  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const { email } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!isPlausibleEmail(normalizedEmail)) {
      return json(res, 400, { error: "Please enter a valid email address." });
    }

    const token = createToken();
    await savePendingSignup(normalizedEmail, token);
    await sendConfirmationEmail(normalizedEmail, token);

    return json(res, 200, {
      ok: true,
      confirmationSent: true
    });
  } catch (error) {
    return json(res, 500, {
      error: error?.message || "Could not subscribe right now."
    });
  }
}
