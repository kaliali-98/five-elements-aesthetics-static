# Stripe payment setup

Use this checklist when you are ready to turn on paid plans.

## 1. Supabase tables

Open Supabase SQL Editor and run:

```sql
-- paste the contents of supabase-billing.sql
```

This creates:

- `profiles` for the user's active plan
- `payments` for Stripe payment records

## 2. Stripe products and prices

Create these prices in Stripe:

- One-off generation: `HK$9.90`, one-time
- Monthly plan: `HK$38`, recurring monthly
- Yearly plan: `HK$168`, recurring yearly

Copy the three Stripe Price IDs. They look like `price_...`.

## 3. Vercel environment variables

Add these to the Vercel project:

```text
APP_URL=https://fiveelementsaesthetics.com
SUPABASE_URL=https://ezjccrncouirprelvdtz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ONE_OFF_PRICE_ID=price_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
```

Use `sk_test_...` while testing. Switch to `sk_live_...` only when you are ready to accept real payments.

Never put `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` inside `index.html`.

## 4. Stripe webhook endpoint

In Stripe, add this webhook endpoint:

```text
https://fiveelementsaesthetics.com/api/stripe-webhook
```

Send these events:

- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## 5. Testing

Use Stripe Test mode first.

Successful test card:

```text
4242 4242 4242 4242
```

Use a future expiry date, such as `12/34`, and any three-digit CVC.

Confirm:

- Checkout opens on Stripe
- Stripe Dashboard shows the test payment
- Supabase `profiles` changes the user to `monthly` or `yearly`
- Cancelling or failed payments do not activate the plan
