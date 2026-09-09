import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inference Chip Index",
  description: "Find the fastest verified inference hardware for your workload — never a universal ranking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="brand">
            <Link href="/">Inference Chip Index</Link>
            <span className="pill">MLPerf Inference v6.0 · Closed</span>
          </div>
          <nav>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/api">API</Link>
            <Link href="/updates">Updates</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          Official submitted-system results only. Derived per-accelerator figures are never the default ranking.
        </footer>
      </body>
    </html>
  );
}
