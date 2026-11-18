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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">S</span>
              SEO + GEO Engine
            </Link>
            <nav className="topnav">
              <Link href="/">Blogs</Link>
              <Link href="/sites/new">Add blog</Link>
            </nav>
            <span className="spacer" />
            <form action="/api/logout" method="post">
              <button className="sm">Log out</button>
            </form>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
