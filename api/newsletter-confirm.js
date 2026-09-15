const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;

function html(res, status, body) {
  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(body);
}

function page(title, message) {
  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f7f0e5; color: #20211f; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif; }
      main { max-width: 520px; padding: 28px; border: 1px solid rgba(167,123,66,.28); border-radius: 12px; background: rgba(255,250,242,.76); box-shadow: 0 18px 48px rgba(32,33,30,.1); }
      h1 { margin: 0; color: #a77b42; font-size: 1.35rem; }
      p { margin: 12px 0 0; color: #6f6a5f; line-height: 1.7; }
      a { display: inline-block; margin-top: 18px; color: #a77b42; font-weight: 800; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="/">返回五行美學</a>
    </main>
  </body>
</html>`;
}

async function updateConfirmed(token) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server settings are missing.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_signups?confirmation_token=eq.${encodeURIComponent(token)}&select=email`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      status: "confirmed",
      confirmed_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not confirm newsletter signup: ${detail}`);
  }

  const rows = await response.json();
  return rows[0]?.email || null;
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
  try {
    const token = String(req.query?.token || "").trim();
    if (!token || token.length < 32) {
      return html(res, 400, page("確認連結無效", "請重新輸入電郵訂閱，系統會寄出新的確認連結。"));
    }

    const email = await updateConfirmed(token);
    if (!email) {
      return html(res, 404, page("確認連結已失效", "這個確認連結無法使用，可能已經確認過或已過期。"));
    }

    await addToBrevo(email);
    return html(res, 200, page("訂閱已確認", "你已成功確認電郵地址，之後會收到五行美學最新消息。"));
  } catch (_error) {
    return html(res, 500, page("暫時未能確認", "請稍後再試，或電郵聯絡我們。"));
  }
}
