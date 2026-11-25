"use client";
import { useState } from "react";
import { PhotoDialog } from "./PhotoDialog";

export function FeaturedCard({ articleId, title, url }: { articleId: string; title: string; url: string | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function remove() {
    if (!window.confirm("Remove the featured photo from this article?")) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/articles/${articleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featured_img_url: null, featured_media_id: null }) });
    if (res.ok) window.location.reload(); else { setMsg("Couldn't remove it. Try again."); setBusy(false); }
  }

  return (
    <div className="card featcard">
      {url ? <a href={url} target="_blank" rel="noreferrer"><img className="hero-img" src={url} alt="Featured photo" /></a> : <div className="hero-empty">No featured photo</div>}
      <div>
        <p className="railtitle" style={{ marginBottom: 6 }}>Featured photo</p>
        <p className="muted" style={{ margin: "0 0 12px" }}>The main picture for this article. Photos inside the article are managed below the text.</p>
        <div className="row">
          <button className="primary sm" onClick={() => setOpen(true)}>{url ? "Change photo" : "Add a photo"}</button>
          {url && <button className="sm danger" disabled={busy} onClick={remove}>Remove</button>}
        </div>
        {msg && <p className="muted" style={{ color: "var(--bad)" }}>{msg}</p>}
      </div>
      {open && <PhotoDialog articleId={articleId} target="featured" title={title} onClose={() => setOpen(false)} onPick={() => window.location.reload()} />}
    </div>
  );
}
