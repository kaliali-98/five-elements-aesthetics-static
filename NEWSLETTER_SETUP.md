# Newsletter setup

The website now submits newsletter signups through `/api/newsletter-signup`.
It uses double opt-in: users must receive and click a confirmation email before they become confirmed subscribers.

## 1. Create the Supabase table

Open Supabase SQL Editor and run:

```sql
-- Use the contents of supabase-newsletter.sql
```

This stores each email in `public.newsletter_signups` with `pending` or `confirmed` status.

## 2. Add Vercel environment variables

Required for saving signups:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Required for sending confirmation emails:

```text
BREVO_API_KEY
NEWSLETTER_FROM_EMAIL
NEWSLETTER_FROM_NAME
SITE_URL
```

Required for syncing confirmed contacts to a Brevo list:

```text
BREVO_LIST_ID
```

If Brevo is not configured, users cannot receive the confirmation email and the form will show an error.

## 3. Sending emails

After users confirm, they can be added to the Brevo list connected by `BREVO_LIST_ID`.
Create campaigns or automations inside Brevo to send actual newsletter emails.
