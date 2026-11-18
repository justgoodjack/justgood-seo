-- Multi-tenant schema. Every row is scoped by site_id. The app uses the service role key
-- server-side only; RLS is enabled with no policies so the anon key can read nothing.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,                              -- reserved for future multi-user
  name text not null,
  domain text not null,
  wp_url text not null,
  wp_user text not null,
  wp_app_pass_enc text not null,              -- AES-256-GCM, see src/lib/crypto.ts
  niche text not null default '',
  seed_topics text[] not null default '{}',
  voice_prompt text not null default '',
  example_urls text[] not null default '{}',
  image_style text not null default 'clean editorial photo, natural light, no text',
  publish_mode text not null default 'batch_preview' check (publish_mode in ('batch_preview','autopilot')),
  cadence_per_month int not null default 12 check (cadence_per_month between 1 and 90),
  gsc_property text,                           -- e.g. sc-domain:example.com or https://example.com/
  seo_plugin text not null default 'none' check (seo_plugin in ('none','yoast','rankmath')),
  default_category_id int,
  created_at timestamptz not null default now()
);

create table keywords (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  phrase text not null,
  cluster text,
  intent text,
  trend_score numeric not null default 0,
  priority int not null default 5,
  source text not null default 'autocomplete',
  status text not null default 'new' check (status in ('new','scheduled','drafted','published','skipped')),
  scheduled_date date,
  created_at timestamptz not null default now(),
  unique (site_id, phrase)
);
create index keywords_sched on keywords (site_id, status, scheduled_date);

create table articles (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  keyword_id uuid references keywords(id) on delete set null,
  kind text not null default 'new' check (kind in ('new','refresh')),
  title text not null default '',
  slug text not null default '',
  html_body text not null default '',
  faq_jsonld jsonb,
  meta_desc text not null default '',
  featured_img_url text,
  featured_media_id int,
  wp_post_id int,
  wp_link text,
  status text not null default 'pending_review'
    check (status in ('queued','pending_review','approved','published','rejected','failed')),
  publish_date date,
  sources jsonb not null default '[]',
  notes text,                                  -- refresh reason, errors
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index articles_status on articles (site_id, status, publish_date);

create table internal_link_index (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  wp_post_id int not null,
  url text not null,
  title text not null,
  summary text not null default '',
  embedding vector(768),
  updated_at timestamptz not null default now(),
  unique (site_id, wp_post_id)
);
create index internal_link_embedding on internal_link_index using hnsw (embedding vector_cosine_ops);

create or replace function match_internal_links(
  p_site_id uuid, p_embedding vector(768), p_count int default 5, p_exclude_post_id int default null
) returns table (wp_post_id int, url text, title text, summary text, similarity float)
language sql stable as $$
  select wp_post_id, url, title, summary, 1 - (embedding <=> p_embedding) as similarity
  from internal_link_index
  where site_id = p_site_id and embedding is not null
    and (p_exclude_post_id is null or wp_post_id <> p_exclude_post_id)
  order by embedding <=> p_embedding
  limit p_count;
$$;

create table gsc_metrics (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  page_url text not null,
  query text not null default '',
  clicks numeric not null default 0,
  impressions numeric not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  date_range text not null check (date_range in ('current','previous')),
  period_start date not null,
  period_end date not null
);
create index gsc_site_range on gsc_metrics (site_id, date_range);

create table geo_prompts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  prompt text not null,
  active boolean not null default true,
  unique (site_id, prompt)
);

create table geo_checks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  target_prompt text not null,
  engine text not null default 'gemini',
  cited_bool boolean not null default false,
  cited_urls jsonb not null default '[]',
  answer_excerpt text,
  checked_at timestamptz not null default now()
);
create index geo_checks_site on geo_checks (site_id, checked_at desc);

create table outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  target_url text not null,
  domain text not null,
  relevance_note text not null default '',
  contact_hint text not null default '',
  draft_email text not null default '',
  status text not null default 'new' check (status in ('new','approved','sent','rejected')),
  created_at timestamptz not null default now(),
  unique (site_id, target_url)
);

create table job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  site_id uuid references sites(id) on delete set null,
  ok boolean not null,
  detail text,
  ran_at timestamptz not null default now()
);
create index job_runs_recent on job_runs (ran_at desc);

alter table sites enable row level security;
alter table keywords enable row level security;
alter table articles enable row level security;
alter table internal_link_index enable row level security;
alter table gsc_metrics enable row level security;
alter table geo_prompts enable row level security;
alter table geo_checks enable row level security;
alter table outreach_prospects enable row level security;
alter table job_runs enable row level security;
