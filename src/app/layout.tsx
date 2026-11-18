import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "SEO + GEO Engine", description: "Multi-site WordPress content engine" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=Public+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap"
        />
      </head>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">SEO + <span className="hl">GEO</span> Engine</Link>
            <nav className="topnav">
              <Link href="/">Blogs</Link>
              <Link href="/sites/new">Add blog</Link>
            </nav>
            <span className="spacer" />
            <form action="/api/logout" method="post"><button className="sm">Log out</button></form>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
