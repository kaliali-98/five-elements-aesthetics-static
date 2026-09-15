const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function saveToSupabase(email) {
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
    body: JSON.stringify({ email, source: "website" })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not save newsletter signup: ${detail}`);
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

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return json(res, 400, { error: "Please enter a valid email address." });
    }

    await saveToSupabase(normalizedEmail);
    const syncedToBrevo = await addToBrevo(normalizedEmail);

    return json(res, 200, {
      ok: true,
      syncedToBrevo
    });
  } catch (error) {
    return json(res, 500, {
      error: error?.message || "Could not subscribe right now."
    });
  }
}
