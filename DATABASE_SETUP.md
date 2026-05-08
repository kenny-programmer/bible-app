# Database (Supabase) Setup

This repo uses **Supabase migrations** as the single source of truth. You should not copy/paste large SQL blocks manually.

### One command to migrate the database

Run this after linking your Supabase project:

```bash
supabase db push
```

That applies everything in `supabase/migrations/` in the correct order.

### Environment variables

Create a `.env` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Required Edge Function secret (for AI chat)

In Supabase Dashboard → **Edge Functions** → **Secrets**, add:

- `GEMINI_API_KEY`: your Gemini API key

