# Newsletter setup

The website now submits newsletter signups through `/api/newsletter-signup`.

## 1. Create the Supabase table

Open Supabase SQL Editor and run:

```sql
-- Use the contents of supabase-newsletter.sql
```

This stores each email in `public.newsletter_signups`.

## 2. Add Vercel environment variables

Required for saving signups:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Optional for syncing contacts to Brevo:

```text
BREVO_API_KEY
BREVO_LIST_ID
```

If Brevo variables are not set, the website still stores emails in Supabase, but it will not automatically send newsletters.

## 3. Sending emails

To send actual newsletter emails, create campaigns or automations inside Brevo using the list connected by `BREVO_LIST_ID`.
