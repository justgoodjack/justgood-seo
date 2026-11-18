import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config";

let client: SupabaseClient | null = null;

/** Service-role client. Server only. RLS is bypassed, so always filter by site_id. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
  }
  return client;
}

export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function logJob(job: string, siteId: string | null, ok: boolean, detail: string) {
  await db().from("job_runs").insert({ job, site_id: siteId, ok, detail: detail.slice(0, 2000) });
}
