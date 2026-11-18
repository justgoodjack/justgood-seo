# SEO + GEO Engine

Multi-site WordPress SEO and GEO automation on Supabase + Vercel Hobby + free API tiers.

## Setup
1. Supabase: run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill it in (`openssl rand -base64 32` for ENCRYPTION_KEY).
3. `npm install && npm run dev`, sign in with DASHBOARD_PASSWORD, add a blog.
4. On the blog page run the pipeline buttons in order: test WP, index posts, mine keywords, build calendar, generate drafts.
5. Deploy to Vercel, add the same env vars. The four crons in `vercel.json` run daily (01/03/05/07 UTC).

## Notes
- Google Trends has no official API, so keyword popularity uses Autocomplete hit counts plus Gemini classification. GSC data feeds back in via the refresh queue.
- Only Gemini is checked for GEO citations so far. ChatGPT/Perplexity can be added in `src/lib/geo.ts`.
- FAQ JSON-LD is added as a script tag; WordPress may strip it if the user lacks `unfiltered_html` (the WP test button reports this).
- Start every blog in batch preview; flip to autopilot once drafts consistently look right.
