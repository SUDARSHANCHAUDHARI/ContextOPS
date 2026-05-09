import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ContextOps",
  description: "Local-first workflow intelligence for AI coding tools.",
};

const links = [
  ["/", "Overview"],
  ["/sessions", "Sessions"],
  ["/replay", "Replay"],
  ["/tools", "Tools"],
  ["/projects", "Projects"],
  ["/waste", "Waste"],
  ["/settings", "Settings"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="nav">
            <p className="brand">ContextOps</p>
            {links.map(([href, label]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
