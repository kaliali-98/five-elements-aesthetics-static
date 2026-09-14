import Stripe from "stripe";
import { insertPayment, upsertProfile } from "./_supabase.js";

export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function unixToIso(value) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function activateFromCheckout(session) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  const plan = session.metadata?.plan;
  if (!userId || !plan) return;

  let subscription = null;
  if (session.subscription) {
    subscription = await stripe.subscriptions.retrieve(session.subscription);
  }

  const periodEnd = subscription?.current_period_end
    ? unixToIso(subscription.current_period_end)
    : null;

  await upsertProfile({
    user_id: userId,
    email: session.customer_details?.email || session.customer_email || null,
    plan,
    subscription_status: subscription?.status || (session.payment_status === "paid" ? "active" : "paid"),
    current_period_end: periodEnd,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
    stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
    free_trial_used: true,
    updated_at: new Date().toISOString()
  });

  await insertPayment({
    user_id: userId,
    stripe_session_id: session.id,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
    stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
    amount_total: session.amount_total,
    currency: session.currency,
    plan,
    status: session.payment_status || subscription?.status || "completed"
  });
}

async function updateFromSubscription(subscription) {
  const userId = subscription.metadata?.user_id;
  const plan = subscription.metadata?.plan;
  if (!userId) return;

  await upsertProfile({
    user_id: userId,
    plan: plan || "paid",
    subscription_status: subscription.status,
    current_period_end: unixToIso(subscription.current_period_end),
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || null,
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString()
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Stripe webhook is not configured yet." });
  }

  const signature = req.headers["stripe-signature"];
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).json({ error: `Invalid Stripe signature: ${error.message}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await activateFromCheckout(event.data.object);
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await updateFromSubscription(event.data.object);
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await updateFromSubscription(subscription);
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await updateFromSubscription(subscription);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Webhook processing failed." });
  }
}
