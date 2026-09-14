const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function assertSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server settings are missing.");
  }
}

export async function getUserFromBearer(req) {
  assertSupabaseConfig();
  const authorization = req.headers.authorization || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return null;
  return response.json();
}

export async function upsertProfile(profile) {
  assertSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(profile)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not update profile: ${detail}`);
  }

  const rows = await response.json();
  return rows[0] || null;
}

export async function getProfile(userId) {
  assertSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not read profile: ${detail}`);
  }

  const rows = await response.json();
  return rows[0] || null;
}

export async function insertPayment(payment) {
  assertSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payment)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not insert payment: ${detail}`);
  }
}
