import Link from "next/link";
import { Show } from "@clerk/nextjs";

function Spark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className={className}>
      <path d="M7 0l1.5 3.5L12 5 8.5 6.5 7 10 5.5 6.5 2 5l3.5-1.5z" fill="currentColor" />
    </svg>
  );
}

const steps = [
  {
    title: "Pack your briefcase",
    body: "Add your jobs, projects, education, and certifications once — each bullet becomes a searchable piece of your story.",
  },
  {
    title: "Paste a job description",
    body: "Briefcase reads the posting and retrieves the most relevant experience you have for exactly that role.",
  },
  {
    title: "Apply with confidence",
    body: "Get three cover letter drafts, a tailored resume, an ATS keyword check, and a fit score — in about fifteen seconds.",
  },
];

const features = [
  {
    title: "Experience bank",
    body: "One structured home for everything you've done. Write it once, reuse it for every application.",
  },
  {
    title: "Three-tone cover letters",
    body: "Concise, detailed, and enthusiastic drafts in a single pass. Edit inline or regenerate one paragraph at a time.",
  },
  {
    title: "Tailored resumes",
    body: "Your bullets reordered and reworded to lead with what this job cares about — never invented, always yours.",
  },
  {
    title: "ATS keyword gaps",
    body: "See which keywords from the posting your experience already covers, and which are missing, before you submit.",
  },
  {
    title: "Fit score",
    body: "A percentage match computed from how semantically close your experience is to the job description.",
  },
  {
    title: "Export & track",
    body: "Download letters and resumes as PDF or DOCX, and track every application from applied to offer.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-24 grid gap-16 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-leather-100 text-leather-800 px-3.5 py-1.5 text-sm font-medium mb-6">
            <Spark size={13} className="text-amber-500" />
            AI that argues your case, from your real experience
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] text-leather-900">
            Every job application, tailored in the time it takes to read the posting.
          </h1>
          <p className="mt-5 text-lg text-leather-600 leading-relaxed max-w-xl">
            Briefcase stores your career experience once, then writes the cover letter, tailors
            the resume, checks the ATS keywords, and scores your fit — for any job description
            you paste in.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="rounded-xl bg-leather-700 text-white px-6 py-3 text-sm font-medium hover:bg-leather-800 transition-colors"
              >
                Get started — it&apos;s free
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-xl border border-leather-200 text-leather-800 px-6 py-3 text-sm font-medium hover:border-leather-400 transition-colors"
              >
                See how it works
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/applications"
                className="rounded-xl bg-leather-700 text-white px-6 py-3 text-sm font-medium hover:bg-leather-800 transition-colors"
              >
                Open your applications
              </Link>
              <Link
                href="/experience"
                className="rounded-xl border border-leather-200 text-leather-800 px-6 py-3 text-sm font-medium hover:border-leather-400 transition-colors"
              >
                Experience bank
              </Link>
            </Show>
          </div>
        </div>

        <div className="relative h-80 sm:h-96 select-none" aria-hidden="true">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-64 h-64 sm:w-72 sm:h-72 rounded-[2.5rem] bg-leather-700">
            <div className="absolute left-1/2 -translate-x-1/2 -top-8 w-24 h-16 rounded-t-3xl border-8 border-leather-700 border-b-0" />
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[30%] h-1.5 bg-white" />
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[30%] h-1.5 bg-white" />
            <Spark size={56} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500" />
          </div>
          <div className="absolute left-0 top-4 w-28 h-28 rounded-3xl bg-leather-100" />
          <div className="absolute left-14 bottom-2 w-20 h-20 rounded-2xl bg-leather-200" />
          <div className="absolute right-0 bottom-8 w-14 h-14 rounded-xl bg-amber-100" />
          <Spark size={22} className="absolute left-6 bottom-24 text-leather-300" />
          <Spark size={16} className="absolute right-4 top-6 text-leather-400" />
        </div>
      </section>

      <section id="how-it-works" className="bg-leather-50 border-y border-leather-100">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-leather-900">
            How it works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-3xl bg-white border border-leather-100 p-7">
                <div className="w-11 h-11 rounded-2xl bg-leather-700 text-white flex items-center justify-center text-sm font-semibold">
                  {i + 1}
                </div>
                <h3 className="mt-5 font-semibold text-leather-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-leather-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-leather-900">
          Everything between you and “submit”
        </h2>
        <p className="mt-3 text-leather-600 max-w-2xl">
          Built for job seekers who apply seriously: grounded in your actual experience, never
          fabricated, always editable.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-leather-100 p-7 hover:border-leather-300 transition-colors"
            >
              <Spark size={18} className="text-amber-500" />
              <h3 className="mt-4 font-semibold text-leather-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-leather-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="rounded-[2.5rem] bg-leather-700 px-8 py-14 sm:px-14 text-center relative overflow-hidden">
          <div className="absolute -left-8 -top-8 w-32 h-32 rounded-3xl bg-leather-600" aria-hidden="true" />
          <div className="absolute -right-6 -bottom-10 w-40 h-40 rounded-[2rem] bg-leather-800" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Pack once. Apply everywhere.
            </h2>
            <p className="mt-3 text-leather-200 max-w-xl mx-auto">
              Your next application could take fifteen seconds of writing instead of an evening.
            </p>
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="mt-7 inline-block rounded-xl bg-white text-leather-800 px-6 py-3 text-sm font-medium hover:bg-leather-50 transition-colors"
              >
                Create your briefcase
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/experience"
                className="mt-7 inline-block rounded-xl bg-white text-leather-800 px-6 py-3 text-sm font-medium hover:bg-leather-50 transition-colors"
              >
                Open your briefcase
              </Link>
            </Show>
          </div>
        </div>
      </section>

      <footer className="border-t border-leather-100">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 flex items-center justify-between text-sm text-leather-500">
          <span>© {new Date().getFullYear()} Briefcase</span>
          <span className="flex items-center gap-1.5">
            Made with <Spark size={12} className="text-amber-500" /> for job seekers
          </span>
        </div>
      </footer>
    </main>
  );
}
