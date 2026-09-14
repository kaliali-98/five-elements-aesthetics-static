import { getProfile, getUserFromBearer } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const user = await getUserFromBearer(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Please log in first." });
    }

    const profile = await getProfile(user.id);
    return res.status(200).json({
      plan: profile?.plan || "free",
      subscription_status: profile?.subscription_status || "free",
      current_period_end: profile?.current_period_end || null,
      free_trial_used: Boolean(profile?.free_trial_used)
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Could not read subscription status." });
  }
}
