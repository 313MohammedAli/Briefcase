"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Logo from "@/components/Logo";

export default function AppHeader() {
  const pathname = usePathname();
  // The landing page ships its own nav; don't stack a second header on it.
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-leather-100">
      <div className="mx-auto w-full max-w-6xl px-6 h-16 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-leather-900">
          <Logo />
          Briefcase
        </Link>
        <Show when="signed-in">
          <nav className="flex items-center gap-6 text-sm text-leather-600">
            <Link href="/experience" className="hover:text-leather-900 transition-colors">
              Experience bank
            </Link>
            <Link href="/applications" className="hover:text-leather-900 transition-colors">
              Applications
            </Link>
          </nav>
        </Show>
        <div className="ml-auto flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
