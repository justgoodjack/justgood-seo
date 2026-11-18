"use client";
import { useState } from "react";
import { ActionButton } from "./ActionButton";

export function StockControl({ articleId, hasImage }: { articleId: string; hasImage: boolean }) {
  const [q, setQ] = useState("");
  return (
    <div style={{ width: "100%" }}>
      <label>Stock photo search (optional, leave blank to let the AI choose)</label>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. community volunteers, protest crowd" style={{ marginBottom: 8 }} />
      <ActionButton url={`/api/articles/${articleId}/image`} body={{ mode: "stock", query: q }} label={q.trim() ? "Search stock photos for this" : hasImage ? "Reject & try another stock photo" : "Use stock photo"} />
    </div>
  );
}
