export default function NewSite() {
  return (
    <>
      <h1>Add a blog</h1>
      <form action="/api/sites" method="post" className="card">
        <div className="grid2">
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Domain (no https://)</label><input name="domain" placeholder="example.com" required /></div>
          <div><label>WordPress URL</label><input name="wp_url" placeholder="https://example.com" required /></div>
          <div><label>WordPress username</label><input name="wp_user" required /></div>
          <div><label>Application Password</label><input name="wp_app_pass" type="password" autoComplete="off" required /></div>
          <div><label>Posts per month</label><input name="cadence_per_month" type="number" defaultValue={12} min={1} max={90} /></div>
        </div>
        <label>Niche (one line)</label><input name="niche" placeholder="e.g. budget travel for solo women" />
        <label>Seed topics (comma separated, up to 5)</label><input name="seed_topics" placeholder="solo travel, budget hostels" />
        <label>Brand voice and rules</label><textarea name="voice_prompt" placeholder="Friendly, first person plural, short paragraphs. Never recommend X. Always mention Y." />
        <label>Example post URLs (comma separated)</label><input name="example_urls" />
        <div className="grid2">
          <div><label>SEO plugin</label><select name="seo_plugin"><option value="none">None / not sure</option><option value="yoast">Yoast</option><option value="rankmath">Rank Math</option></select></div>
          <div><label>Publish mode</label><select name="publish_mode"><option value="batch_preview">Batch preview (recommended)</option><option value="autopilot">Autopilot</option></select></div>
        </div>
        <label>Search Console property (optional, can add later)</label><input name="gsc_property" placeholder="sc-domain:example.com" />
        <p><button className="primary">Create blog</button></p>
      </form>
    </>
  );
}
