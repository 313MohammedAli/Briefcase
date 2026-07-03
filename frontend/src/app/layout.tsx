import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import Logo from "@/components/Logo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Briefcase",
  description: "AI-tailored cover letters, resumes, and fit scoring for every job application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="flex items-center gap-6 px-6 py-4 border-b border-black/10 dark:border-white/10">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo />
              Briefcase
            </Link>
            <Show when="signed-in">
              <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <Link href="/experience" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Experience Bank
                </Link>
                <Link href="/applications" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Applications
                </Link>
              </nav>
            </Show>
            <div className="ml-auto flex items-center gap-4">
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
