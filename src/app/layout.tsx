import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "SEO + GEO Engine" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <div className="row between" style={{ marginBottom: 8 }}>
            <Link href="/" style={{ fontWeight: 700, textDecoration: "none" }}>SEO + GEO Engine</Link>
            <form action="/api/logout" method="post"><button>Log out</button></form>
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}
