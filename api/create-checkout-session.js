import Stripe from "stripe";
import { getUserFromBearer } from "./_supabase.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const plans = {
  oneOff: {
    mode: "payment",
    priceId: process.env.STRIPE_ONE_OFF_PRICE_ID,
    label: "one_off"
  },
  monthly: {
    mode: "subscription",
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    label: "monthly"
  },
  yearly: {
    mode: "subscription",
    priceId: process.env.STRIPE_YEARLY_PRICE_ID,
    label: "yearly"
  }
};

function getBaseUrl(req) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured yet." });
    }

    const user = await getUserFromBearer(req);
    if (!user?.id || !user?.email) {
      return res.status(401).json({ error: "Please log in before paying." });
    }

    const selectedPlan = plans[req.body?.plan];
    if (!selectedPlan || !selectedPlan.priceId) {
      return res.status(400).json({ error: "This payment plan is not configured yet." });
    }

    const baseUrl = getBaseUrl(req);
    const metadata = {
      user_id: user.id,
      plan: selectedPlan.label
    };

    const session = await stripe.checkout.sessions.create({
      mode: selectedPlan.mode,
      payment_method_types: ["card"],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      metadata,
      subscription_data: selectedPlan.mode === "subscription" ? { metadata } : undefined,
      allow_promotion_codes: true,
      success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancelled`
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Could not create checkout." });
  }
}
