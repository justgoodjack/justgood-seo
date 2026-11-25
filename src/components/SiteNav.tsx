"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Item { href: string; label: string; badge?: number; step?: string }
interface Group { title?: string; items: Item[] }

export function SiteNav({ id, review, queued }: { id: string; review: number; queued: number }) {
  const path = usePathname();
  const b = `/sites/${id}`;
  const groups: Group[] = [
    { items: [{ href: b, label: "Overview" }] },
    { title: "1 · Plan", items: [{ href: `${b}/topics`, label: "Topics" }, { href: `${b}/calendar`, label: "Calendar", badge: queued }] },
    { title: "2 · Create", items: [{ href: `${b}/articles`, label: "Articles", badge: review }] },
    { title: "3 · Grow", items: [{ href: `${b}/search-console`, label: "Search Console" }, { href: `${b}/ai-visibility`, label: "AI visibility" }, { href: `${b}/outreach`, label: "Outreach" }] },
    { items: [{ href: `${b}/settings`, label: "Settings" }] },
  ];
  const active = (href: string) => (href === b ? path === b : path === href || path.startsWith(href + "/"));
  return (
    <nav className="sidenav" aria-label="Blog sections">
      {groups.map((g, i) => (
        <div key={i} className="navgroup">
          {g.title && <p className="navtitle">{g.title}</p>}
          {g.items.map((it) => (
            <Link key={it.href} href={it.href} className={`navlink ${active(it.href) ? "on" : ""}`} aria-current={active(it.href) ? "page" : undefined}>
              {it.label}
              {!!it.badge && <span className={`navbadge ${it.label === "Articles" ? "attn" : ""}`}>{it.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
