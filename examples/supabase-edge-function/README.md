# Supabase Edge Function — Link Preview

A Supabase Edge Function (Deno) that returns link preview metadata.

## Setup

1. Copy `index.ts` to `supabase/functions/preview/index.ts` in your Supabase project.

2. Deploy:

```bash
supabase functions deploy preview
```

## Usage

```bash
curl -H "Authorization: Bearer $SUPABASE_USER_JWT" \
  "https://<your-project>.supabase.co/functions/v1/preview?url=https://github.com"
```

Set `SUPABASE_USER_JWT` to a valid caller JWT from your app’s Supabase Auth
session. Default deployments verify this JWT before invoking the function.
Send it only to your Supabase function; never forward it to a preview target.
