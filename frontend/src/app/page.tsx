"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const JOBS = [
  {
    title: "Senior Backend Engineer",
    company: "Acme Corp",
    fit: "84% fit",
    fitBg: "#ecfdf5",
    fitFg: "#047857",
    bars: ["92%", "78%", "85%"],
    kws: [
      { t: "Django", bg: "#ecfdf5", fg: "#065f46" },
      { t: "PostgreSQL", bg: "#ecfdf5", fg: "#065f46" },
      { t: "Python", bg: "#f3ece0", fg: "#553923" },
    ],
    draft: "Draft 1",
    letter:
      "Dear hiring team, I led the billing-service migration that cut p95 latency 40%, which maps directly to your…",
  },
  {
    title: "Staff Platform Engineer",
    company: "Northwind",
    fit: "78% fit",
    fitBg: "#ecfdf5",
    fitFg: "#047857",
    bars: ["86%", "70%", "80%"],
    kws: [
      { t: "Kubernetes", bg: "#ecfdf5", fg: "#065f46" },
      { t: "Terraform", bg: "#ecfdf5", fg: "#065f46" },
      { t: "Go", bg: "#f3ece0", fg: "#553923" },
    ],
    draft: "Draft 2",
    letter:
      "Hello Northwind, I run the platform serving 2M queries a month, and your reliability goals read like my last…",
  },
  {
    title: "Engineering Manager",
    company: "Meridian Labs",
    fit: "62% fit",
    fitBg: "#fffbeb",
    fitFg: "#b45309",
    bars: ["76%", "88%", "68%"],
    kws: [
      { t: "Leadership", bg: "#ecfdf5", fg: "#065f46" },
      { t: "Roadmaps", bg: "#ecfdf5", fg: "#065f46" },
      { t: "Hiring", bg: "#fef2f2", fg: "#991b1b" },
    ],
    draft: "Draft 1",
    letter:
      "Dear Meridian Labs, I grew a team from 3 to 11 engineers while shipping every quarter, and your posting…",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Pack your briefcase",
    body: "Add jobs, projects, education, and certifications once. Briefcase remembers every bullet.",
  },
  {
    n: "2",
    title: "Paste a job posting",
    body: "Drop in any listing. Briefcase reads the requirements and scores your fit before you spend a minute writing.",
  },
  {
    n: "3",
    title: "Get tailored documents",
    body: "A resume and cover letter built from your real experience, matched to the posting. Export PDF or DOCX.",
  },
];

const CREAM = "#faf7f2";
const TEXT = "#3d2818";
const MUTED = "#8a5f3b";
const BADGE_BORDER = "#d2b494";

function NavLogo() {
  const [hover, setHover] = useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 600,
        fontSize: 19,
        letterSpacing: "-0.02em",
        cursor: "default",
      }}
    >
      <svg
        width={30}
        height={30}
        viewBox="0 0 48 48"
        style={{ overflow: "visible", transition: "transform 0.3s ease", transform: hover ? "scale(1.18)" : "scale(1)" }}
      >
        <g transform="rotate(-6 24 28)">
          <path d="M5 26h38v8c0 4.4-3.6 8-8 8H13c-4.4 0-8-3.6-8-8z" fill="#a4764c" stroke="#3d2818" strokeWidth={3.5} />
          <rect x={19} y={26.5} width={10} height={7} rx={2} fill="#f59e0b" stroke="#3d2818" strokeWidth={2.5} />
          <g
            style={{
              transform: hover ? "rotate(-11deg)" : "rotate(0deg)",
              transformOrigin: "5px 26px",
              transformBox: "view-box",
              transition: "transform 0.3s ease",
            }}
          >
            <path d="M17 14v-2.5a7 7 0 0 1 14 0V14" fill="none" stroke="#3d2818" strokeWidth={4.5} strokeLinecap="round" />
            <path d="M5 26v-5c0-4.4 3.6-8 8-8h22c4.4 0 8 3.6 8 8v5z" fill="#a4764c" stroke="#3d2818" strokeWidth={3.5} />
          </g>
        </g>
        <path d="M42 4l1.4 3.6L47 9l-3.6 1.4L42 14l-1.4-3.6L37 9l3.6-1.4z" fill="#f59e0b" />
        <g style={{ opacity: hover ? 1 : 0, transition: "opacity 0.3s ease" }}>
          <path d="M34 0l0.9 2.3 2.3 0.9-2.3 0.9L34 6.4l-0.9-2.3-2.3-0.9 2.3-0.9z" fill="#f59e0b" />
          <path d="M46 18l0.8 2 2 0.8-2 0.8-0.8 2-0.8-2-2-0.8 2-0.8z" fill="#f59e0b" />
          <path d="M3 4l0.9 2.3 2.3 0.9-2.3 0.9L3 10.4l-0.9-2.3L-0.2 7.2l2.3-0.9z" fill="#f59e0b" />
        </g>
      </svg>
      Briefcase
    </span>
  );
}

function HeroCase() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "out" | "pre">("idle");
  const swap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase("out");
      swap.current = setTimeout(() => {
        setIdx((i) => (i + 1) % JOBS.length);
        setPhase("pre");
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase("idle")));
      }, 300);
    }, 3400);
    return () => {
      clearInterval(timer);
      clearTimeout(swap.current);
    };
  }, []);

  const job = JOBS[idx];
  const resumeT =
    phase === "out" ? "translateY(-18px) rotate(-5deg)" : phase === "pre" ? "translateY(16px) rotate(2deg)" : "rotate(-1.2deg)";
  const letterT =
    phase === "out" ? "translateY(-14px) rotate(4.5deg)" : phase === "pre" ? "translateY(14px) rotate(-1.5deg)" : "rotate(1deg)";
  const cardOp = phase === "idle" ? 1 : 0;
  const cardTrans = phase === "pre" ? "none" : "transform 0.3s ease, opacity 0.3s ease";

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 440, maxWidth: "100%" }}>
        <div style={{ width: 130, height: 56, border: "10px solid #553923", borderBottom: "none", borderRadius: "26px 26px 0 0", margin: "0 auto" }} />
        <div style={{ background: "#6f4b2f", borderRadius: 26, padding: 14, boxShadow: "0 32px 64px -24px rgba(61,40,24,.5)", position: "relative", marginTop: -6 }}>
          <div style={{ border: "2px dashed rgba(250,247,242,.35)", borderRadius: 16, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
            <div style={{ position: "absolute", top: -24, left: 44, width: 26, height: 14, background: "#f59e0b", borderRadius: "4px 4px 2px 2px" }} />
            <div style={{ position: "absolute", top: -24, right: 44, width: 26, height: 14, background: "#f59e0b", borderRadius: "4px 4px 2px 2px" }} />

            <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 8px 20px rgba(61,40,24,.25)", transition: cardTrans, transform: resumeT, opacity: cardOp }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#a4764c", fontWeight: 500 }}>Tailored résumé</span>
                <span style={{ background: job.fitBg, color: job.fitFg, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{job.fit}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {job.title} <span style={{ color: "#a4764c", fontWeight: 400 }}>@ {job.company}</span>
              </div>
              {job.bars.map((w, i) => (
                <div key={i} style={{ height: 7, background: "#f3ece0", borderRadius: 4, width: w, margin: "9px 0" }} />
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {job.kws.map((kw) => (
                  <span key={kw.t} style={{ background: kw.bg, color: kw.fg, borderRadius: 999, padding: "3px 10px", fontSize: 12 }}>{kw.t}</span>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 8px 20px rgba(61,40,24,.25)", transition: cardTrans, transform: letterT, opacity: cardOp }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#a4764c", fontWeight: 500 }}>Cover letter</span>
                <span style={{ fontSize: 12, color: "#a4764c" }}>{job.draft}</span>
              </div>
              <div style={{ fontSize: 13, color: "#553923", lineHeight: 1.55, minHeight: 60 }}>{job.letter}</div>
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", right: -36, top: 96, transform: "rotate(8deg)" }}>
          <div style={{ width: 2, height: 34, background: "#bc9269", margin: "0 auto" }} />
          <div style={{ background: "#e5d3bc", border: "1px solid #d2b494", borderRadius: 10, padding: "10px 16px", boxShadow: "0 6px 16px rgba(61,40,24,.2)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: CREAM, border: "1px solid #bc9269", margin: "0 auto 6px" }} />
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#6f4b2f", fontWeight: 600 }}>You, hired.</div>
          </div>
        </div>

        <div style={{ position: "absolute", left: -26, top: 52, animation: "sparkPulse 2.6s ease-in-out infinite" }}>
          <svg width={34} height={34} viewBox="0 0 34 34">
            <path d="M17 3l3.2 10.8L31 17l-10.8 3.2L17 31l-3.2-10.8L3 17l10.8-3.2z" fill="#f59e0b" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const STARS = [
  { top: -18, left: -20, size: 18, delay: 0, dur: 2.2 },
  { top: -16, right: -14, size: 13, delay: 0.05, dur: 2.6, floatDelay: -0.6 },
  { bottom: -10, right: -22, size: 15, delay: 0.1, dur: 2.4, floatDelay: -1.2 },
  { bottom: -12, left: -14, size: 11, delay: 0.14, dur: 2.8, floatDelay: -0.3 },
  { top: -26, left: "52%", size: 12, delay: 0.08, dur: 2.3, floatDelay: -0.9 },
  { top: 8, left: -26, size: 10, delay: 0.18, dur: 2.7, floatDelay: -1.5 },
  { top: 2, right: -26, size: 14, delay: 0.12, dur: 2.5, floatDelay: -0.45 },
];

function HeroButton() {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href="/sign-up"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        minWidth: 238,
        transformOrigin: "50% 100%",
        transition: "transform 0.25s ease",
        transform: hover ? "scale(1.07)" : "scale(1)",
        cursor: "pointer",
      }}
    >
      {STARS.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            opacity: hover ? 1 : 0,
            transition: `opacity 0.25s ease ${s.delay}s`,
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          <svg
            width={s.size}
            height={s.size}
            viewBox="0 0 18 18"
            style={{ display: "block", animation: hover ? `starFloat ${s.dur}s ease-in-out ${s.floatDelay ?? 0}s infinite` : "none" }}
          >
            <path d="M9 1l1.9 5.1L16 8l-5.1 1.9L9 15 7.1 9.9 2 8l5.1-1.9z" fill="#f59e0b" />
          </svg>
        </span>
      ))}
      {/* handle */}
      <span style={{ width: 40, height: 16, border: "4px solid #553923", borderBottom: "none", borderRadius: "11px 11px 0 0", boxSizing: "border-box", marginBottom: -2 }} />
      {/* case body */}
      <span
        style={{
          position: "relative",
          width: "100%",
          background: "#6f4b2f",
          borderRadius: 14,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          overflow: "hidden",
          transition: "box-shadow 0.3s ease",
          boxShadow: hover
            ? "0 0 24px 4px rgba(245,158,11,.45), 0 8px 24px -8px rgba(61,40,24,.4)"
            : "0 0 0 0 rgba(245,158,11,0)",
        }}
      >
        {/* lid seam */}
        <span style={{ position: "absolute", top: 15, left: 0, right: 0, borderTop: "2px solid rgba(0,0,0,.22)" }} />
        {/* latches */}
        <span style={{ position: "absolute", top: 11, left: 22, width: 14, height: 8, background: "#f59e0b", borderRadius: "2px 2px 1px 1px" }} />
        <span style={{ position: "absolute", top: 11, right: 22, width: 14, height: 8, background: "#f59e0b", borderRadius: "2px 2px 1px 1px" }} />
        <span style={{ position: "relative", marginTop: 12, color: "#fff", fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", padding: "0 30px" }}>
          Get started — it&apos;s free
        </span>
      </span>
    </Link>
  );
}

function Check() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 8.5l4 4 8-9" fill="none" stroke="#059669" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <div style={{ background: CREAM }}>
      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,247,242,.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid #f3ece0" }}>
        <div className="mx-auto flex items-center gap-9 px-8" style={{ maxWidth: 1160, height: 68 }}>
          <NavLogo />
          <nav className="hidden md:flex" style={{ gap: 28, fontSize: 14, fontWeight: 500, color: MUTED }}>
            <a href="#how" style={{ color: MUTED }}>How it works</a>
            <a href="#features" style={{ color: MUTED }}>Features</a>
          </nav>
          <span style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center", fontSize: 14, fontWeight: 500 }}>
            <Link href="/sign-in" style={{ color: "#6f4b2f" }}>Sign in</Link>
            <Link href="/sign-up" style={{ background: "#6f4b2f", color: "#fff", borderRadius: 12, padding: "9px 18px" }}>Get started</Link>
          </span>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: CREAM, position: "relative", overflow: "hidden" }}>
        <div className="mx-auto grid grid-cols-1 items-center gap-12 px-8 lg:grid-cols-[1.05fr_1fr]" style={{ maxWidth: 1160, paddingTop: 88, paddingBottom: 96 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px dashed ${BADGE_BORDER}`, borderRadius: 999, padding: "6px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: MUTED, marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: "#f59e0b", transform: "rotate(45deg)" }} />
              One briefcase. Every application.
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "0 0 22px", color: TEXT, textWrap: "balance" }}>
              Every job application, tailored.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: MUTED, margin: "0 0 36px", maxWidth: 480 }}>
              Pack your experience once, jobs, projects, education, certifications. Paste any job posting and Briefcase writes the resume and cover letter that fit it.
            </p>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
              <HeroButton />
              <a href="#how" style={{ color: TEXT, border: `1px solid ${BADGE_BORDER}`, borderRadius: 14, padding: "14px 26px", fontSize: 16, fontWeight: 500, display: "inline-block" }}>
                See how it works
              </a>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 30, fontSize: 13, color: MUTED }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check />No credit card</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Check />Export PDF &amp; DOCX</span>
            </div>
          </div>
          <HeroCase />
        </div>
        <div style={{ borderTop: `2px dashed ${BADGE_BORDER}`, margin: "0 32px" }} />
      </section>

      {/* Stitch strip */}
      <div style={{ background: "#3d2818", color: "#e5d3bc", padding: "16px 0", overflow: "hidden" }}>
        <div className="flex-wrap px-4" style={{ display: "flex", gap: 48, justifyContent: "center", alignItems: "center", fontSize: 12, textTransform: "uppercase", letterSpacing: ".14em" }}>
          <span>Pack once</span><span style={{ color: "#f59e0b" }}>✦</span>
          <span>Tailor everywhere</span><span style={{ color: "#f59e0b" }}>✦</span>
          <span>ATS keywords matched</span><span style={{ color: "#f59e0b" }}>✦</span>
          <span>Track every application</span><span style={{ color: "#f59e0b" }}>✦</span>
          <span>Export in seconds</span>
        </div>
      </div>

      {/* How it works */}
      <section id="how" style={{ background: "#553923", padding: "96px 32px" }}>
        <div className="mx-auto" style={{ maxWidth: 1160 }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#d2b494", marginBottom: 14 }}>How it works</div>
            <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", color: CREAM, margin: 0, textWrap: "balance" }}>
              From job posting to submitted, in three steps
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} style={{ background: "#6f4b2f", borderRadius: 24, padding: 8, boxShadow: "0 16px 40px -16px rgba(0,0,0,.4)" }}>
                <div style={{ border: "2px dashed rgba(250,247,242,.25)", borderRadius: 18, padding: "28px 26px", height: "100%", boxSizing: "border-box" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 16, background: "#3d2818", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{step.n}</div>
                  <div style={{ fontSize: 19, fontWeight: 600, color: CREAM, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "#e5d3bc" }}>{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ background: CREAM, padding: "96px 32px" }}>
        <div className="mx-auto" style={{ maxWidth: 1160 }}>
          <div style={{ marginBottom: 52, maxWidth: 560 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#a4764c", marginBottom: 14 }}>What&apos;s inside</div>
            <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px", textWrap: "balance" }}>A briefcase that does the paperwork</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: MUTED, margin: 0 }}>
              Everything between “found a posting” and “submitted,” handled in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div style={{ background: "#fff", border: "1px solid #f3ece0", borderRadius: 24, padding: 32 }}>
              <svg width={36} height={36} viewBox="0 0 36 36" style={{ marginBottom: 18 }}>
                <rect x={4} y={10} width={28} height={20} rx={6} fill="#f3ece0" />
                <rect x={4} y={10} width={28} height={20} rx={6} fill="none" stroke="#6f4b2f" strokeWidth={2} />
                <path d="M13 10V8a5 5 0 0 1 10 0v2" fill="none" stroke="#6f4b2f" strokeWidth={2} strokeLinecap="round" />
                <path d="M11 20h14M11 24h9" stroke="#a4764c" strokeWidth={2} strokeLinecap="round" />
              </svg>
              <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Experience Bank</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>Jobs, projects, certifications, and education, stored once. Every bullet is retrieved when generating, so nothing you&apos;ve done gets left behind.</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #f3ece0", borderRadius: 24, padding: 32 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
                <span style={{ background: "#ecfdf5", color: "#047857", borderRadius: 999, padding: "5px 14px", fontSize: 14, fontWeight: 600 }}>84% fit</span>
                <span style={{ background: "#ecfdf5", color: "#065f46", borderRadius: 999, padding: "4px 11px", fontSize: 12 }}>Django</span>
                <span style={{ background: "#fef2f2", color: "#991b1b", borderRadius: 999, padding: "4px 11px", fontSize: 12 }}>Kubernetes</span>
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Fit score &amp; ATS keywords</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>See how well you match before you apply, and exactly which keywords the posting wants that your resume is missing.</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #f3ece0", borderRadius: 24, padding: 32 }}>
              <svg width={36} height={36} viewBox="0 0 36 36" style={{ marginBottom: 18 }}>
                <rect x={6} y={4} width={24} height={28} rx={4} fill="#f3ece0" stroke="#6f4b2f" strokeWidth={2} />
                <path d="M12 12h12M12 17h12M12 22h8" stroke="#a4764c" strokeWidth={2} strokeLinecap="round" />
                <path d="M28 23l1.5 3.5L33 28l-3.5 1.5L28 33l-1.5-3.5L23 28l3.5-1.5z" fill="#f59e0b" />
              </svg>
              <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Resumes &amp; cover letters, written for the job</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>Not a template with your name swapped in, documents drafted from your real experience, matched to the posting&apos;s language. Edit anything, regenerate any part.</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #f3ece0", borderRadius: 24, padding: 32 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                <span style={{ background: "#f3ece0", color: "#553923", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 500 }}>Applied</span>
                <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 500 }}>Interview</span>
                <span style={{ background: "#ecfdf5", color: "#047857", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 500 }}>Offer</span>
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Application tracking</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>Every application, its documents, and its status in one list, from first draft to offer.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: CREAM, padding: "0 32px 96px" }}>
        <div className="mx-auto" style={{ maxWidth: 1160, background: "#6f4b2f", borderRadius: 28, padding: 10, boxShadow: "0 32px 64px -28px rgba(61,40,24,.5)" }}>
          <div style={{ border: "2px dashed rgba(250,247,242,.3)", borderRadius: 20, padding: "72px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <svg width={52} height={52} viewBox="0 0 48 48" style={{ marginBottom: 22 }}>
              <g transform="rotate(-6 24 28)">
                <path d="M17 14v-2.5a7 7 0 0 1 14 0V14" fill="none" stroke="#faf7f2" strokeWidth={4.5} strokeLinecap="round" />
                <rect x={5} y={13} width={38} height={29} rx={8} fill="#a4764c" stroke="#faf7f2" strokeWidth={3.5} />
                <path d="M5 26h38" stroke="#faf7f2" strokeWidth={3} />
                <rect x={19} y={22} width={10} height={8} rx={2.5} fill="#f59e0b" stroke="#faf7f2" strokeWidth={2.5} />
              </g>
              <path d="M42 4l1.4 3.6L47 9l-3.6 1.4L42 14l-1.4-3.6L37 9l3.6-1.4z" fill="#f59e0b" />
            </svg>
            <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", color: CREAM, margin: "0 0 14px", textWrap: "balance" }}>Pack your briefcase once.</h2>
            <p style={{ fontSize: 16, color: "#e5d3bc", margin: "0 0 34px" }}>Your next application takes minutes, not evenings.</p>
            <Link href="/sign-up" style={{ background: CREAM, color: "#553923", borderRadius: 14, padding: "15px 30px", fontSize: 16, fontWeight: 600, display: "inline-block" }}>
              Get started — it&apos;s free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#3d2818", color: "#d2b494", padding: "36px 32px" }}>
        <div className="mx-auto flex-wrap" style={{ maxWidth: 1160, display: "flex", alignItems: "center", gap: 24, fontSize: 13 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 16, color: CREAM }}>
            <svg width={24} height={24} viewBox="0 0 48 48">
              <g transform="rotate(-6 24 28)">
                <path d="M17 14v-2.5a7 7 0 0 1 14 0V14" fill="none" stroke="#faf7f2" strokeWidth={4.5} strokeLinecap="round" />
                <rect x={5} y={13} width={38} height={29} rx={8} fill="#a4764c" stroke="#faf7f2" strokeWidth={3.5} />
                <path d="M5 26h38" stroke="#faf7f2" strokeWidth={3} />
                <rect x={19} y={22} width={10} height={8} rx={2.5} fill="#f59e0b" stroke="#faf7f2" strokeWidth={2.5} />
              </g>
              <path d="M42 4l1.4 3.6L47 9l-3.6 1.4L42 14l-1.4-3.6L37 9l3.6-1.4z" fill="#f59e0b" />
            </svg>
            Briefcase
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 24 }}>
            <a href="#" style={{ color: "#d2b494" }}>Privacy</a>
            <a href="#" style={{ color: "#d2b494" }}>Terms</a>
            <a href="#" style={{ color: "#d2b494" }}>Contact</a>
          </span>
          <span style={{ color: "#8a5f3b" }}>© 2026 Briefcase</span>
        </div>
      </footer>
    </div>
  );
}
