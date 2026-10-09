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
    <header className="sticky top-0 z-50 border-b border-leather-100 bg-leather-50/92 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl 2xl:max-w-6xl flex items-center gap-9 px-6 h-[68px]">
        <Show when="signed-in">
          <Wordmark href="/dashboard" />
          <nav className="hidden md:flex items-stretch self-stretch gap-7 text-sm font-medium">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center transition-colors ${
                    active ? "text-leather-900" : "text-leather-600 hover:text-leather-900"
                  }`}
                >
                  {item.label}
                  {/* Amber latch under the active item: the one accent in the shell. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
          <span className="ml-auto flex items-center">
            <UserButton />
          </span>
        </Show>
        <Show when="signed-out">
          <Wordmark href="/" />
          <span className="ml-auto flex items-center gap-3 text-sm font-medium">
            <Link href="/sign-in" className="text-leather-700 hover:text-leather-900">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-primary">
              Get started
            </Link>
          </span>
        </Show>
      </div>
    </header>
  );
}
