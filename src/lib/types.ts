export interface Site {
  id: string;
  name: string;
  domain: string;
  wp_url: string;
  wp_user: string;
  wp_app_pass_enc: string;
  niche: string;
  seed_topics: string[];
  voice_prompt: string;
  example_urls: string[];
  image_style: string;
  publish_mode: "batch_preview" | "autopilot";
  cadence_per_month: number;
  gsc_property: string | null;
  seo_plugin: "none" | "yoast" | "rankmath";
  default_category_id: number | null;
}

export interface Keyword {
  id: string;
  site_id: string;
  phrase: string;
  cluster: string | null;
  intent: string | null;
  trend_score: number;
  priority: number;
  status: "new" | "scheduled" | "drafted" | "published" | "skipped";
  scheduled_date: string | null;
}

export interface Article {
  id: string;
  site_id: string;
  keyword_id: string | null;
  kind: "new" | "refresh";
  title: string;
  slug: string;
  html_body: string;
  faq_jsonld: unknown;
  meta_desc: string;
  featured_img_url: string | null;
  featured_media_id: number | null;
  wp_post_id: number | null;
  wp_link: string | null;
  status: "queued" | "pending_review" | "approved" | "published" | "rejected" | "failed";
  publish_date: string | null;
  sources: { uri: string; title: string }[];
  notes: string | null;
  created_at: string;
}
