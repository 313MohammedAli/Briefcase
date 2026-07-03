import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 max-w-xl text-center px-6 py-24">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Briefcase
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Store your career experience bank, then generate tailored cover letters,
          resumes, and a fit score for any job description you paste in.
        </p>
        <Show when="signed-in">
          <div className="flex gap-3">
            <Link
              href="/experience"
              className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 text-sm font-medium"
            >
              Build your experience bank
            </Link>
            <Link
              href="/applications"
              className="rounded-lg border border-black/15 dark:border-white/20 px-5 py-2.5 text-sm font-medium"
            >
              View applications
            </Link>
          </div>
        </Show>
      </main>
    </div>
  );
}
