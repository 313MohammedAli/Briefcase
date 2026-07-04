import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
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
  title: "Briefcase — tailored cover letters, resumes, and fit scores",
  description:
    "Store your career experience once, then generate tailored cover letters, resumes, ATS keyword analysis, and a fit score for every job you apply to.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
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
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-leather-700 hover:text-leather-900 px-3 py-2 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="text-sm font-medium bg-leather-700 text-white rounded-xl px-4 py-2 hover:bg-leather-800 transition-colors"
                  >
                    Get started
                  </Link>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
