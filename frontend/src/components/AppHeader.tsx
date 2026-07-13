"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import Wordmark from "@/components/Wordmark";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/experience", label: "Experience bank" },
  { href: "/applications", label: "Applications" },
];

export default function AppHeader() {
  const pathname = usePathname();
  // The landing page ships its own nav; don't stack a second header on it.
  if (pathname === "/") return null;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(250,247,242,.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #f3ece0",
      }}
    >
      <div className="mx-auto w-full max-w-5xl 2xl:max-w-6xl flex items-center gap-9 px-6" style={{ height: 68 }}>
        <Show when="signed-in">
          <Wordmark href="/dashboard" />
          <nav className="hidden md:flex items-center" style={{ gap: 28, fontSize: 14, fontWeight: 500 }}>
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ color: active ? "#553923" : "#8a5f3b" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <UserButton />
          </span>
        </Show>
        <Show when="signed-out">
          <Wordmark href="/" />
          <span style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center", fontSize: 14, fontWeight: 500 }}>
            <Link href="/sign-in" style={{ color: "#6f4b2f" }}>
              Sign in
            </Link>
            <Link href="/sign-up" style={{ background: "#6f4b2f", color: "#fff", borderRadius: 12, padding: "9px 18px" }}>
              Get started
            </Link>
          </span>
        </Show>
      </div>
    </header>
  );
}
