import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import AppHeader from "@/components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif for page titles and document content (cover letter, resume): the
// "paper" half of the leather-and-paper language the landing page sets up.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
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
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
          <AppHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
