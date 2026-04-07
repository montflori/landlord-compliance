import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Let Lucid – UK Landlord Compliance Software for Letting Agents",
  description:
    "Track gas safety certificates, EPCs, EICRs and every compliance document across your property portfolio. Let Lucid keeps UK letting agents and landlords fully compliant — automatically.",
  openGraph: {
    title: "Let Lucid – UK Landlord Compliance Software",
    description:
      "The compliance platform built for UK letting agents. Track certificates, manage tenants, and never miss an expiry date again.",
    type: "website",
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Compliance tracking",
    description:
      "Track Gas Safety certificates, EPCs, EICRs, PAT tests, fire risk assessments and more — all in one dashboard.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
    title: "Expiry alerts",
    description:
      "Get automatic warnings 30, 14, and 7 days before any certificate expires. Never be caught out by an inspection again.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: "Tenant management",
    description:
      "Store tenancy agreements, deposit certificates, and tenant contact details neatly linked to each property.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    title: "Document storage",
    description:
      "Upload and retrieve every certificate, tenancy agreement, and inventory report — all securely stored and linked to the right property.",
  },
];

const painPoints = [
  "Expiry dates buried in spreadsheets",
  "Missed gas safety renewals leading to fines",
  "Certificates scattered across email inboxes",
  "No visibility across a multi-property portfolio",
  "Hours wasted chasing landlords for paperwork",
];

const steps = [
  {
    number: "01",
    title: "Add your properties and landlords",
    description:
      "Import your portfolio in minutes. Add landlords, link properties, and set which certificates are legally required for each.",
  },
  {
    number: "02",
    title: "Upload certificates and set requirements",
    description:
      "Upload Gas Safety records, EPCs, EICRs and more. Let Lucid automatically calculates expiry status for every document.",
  },
  {
    number: "03",
    title: "Stay ahead with automatic alerts",
    description:
      "Your compliance dashboard flags everything that needs attention — expiring soon, already expired, or missing entirely.",
  },
];

const complianceItems = [
  "Gas Safety Certificate (CP12)",
  "Energy Performance Certificate (EPC)",
  "Electrical Installation Condition Report (EICR)",
  "Portable Appliance Testing (PAT)",
  "Fire Risk Assessment",
  "Legionella Risk Assessment",
  "Houses in Multiple Occupation (HMO)",
  "Deposit Protection (DPS / TDS / MyDeposits)",
];

// ─── Components ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6" aria-label="Main navigation">
          <a href="/" className="flex items-center gap-2.5" aria-label="Let Lucid home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden">
              <img src="/let-lucid-logo.png" alt="" className="h-7 w-7 object-contain" />
            </div>
            <span
              style={{ fontFamily: "var(--font-bebas)" }}
              className="text-[22px] tracking-widest leading-none text-white"
            >
              LET LUCID
            </span>
          </a>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      <main>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden bg-slate-900 px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28"
        >
          {/* Background grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
            aria-hidden="true"
          />
          {/* Gradient glow */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-64 w-[600px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(ellipse at center, #6366f1, transparent 70%)" }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
              Built for UK letting agents &amp; landlords
            </div>

            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              UK Landlord Compliance,{" "}
              <span className="text-indigo-400">Finally Under Control</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              Let Lucid helps letting agents track Gas Safety certificates, EPCs, EICRs,
              and every regulatory document across their entire portfolio — so nothing expires unnoticed.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 sm:w-auto"
              >
                Start for free
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-8 py-3.5 text-base font-medium text-slate-300 transition hover:border-slate-400 hover:text-white sm:w-auto"
              >
                Sign in to your account
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">No credit card required. Free to get started.</p>
          </div>

          {/* Dashboard preview card */}
          <div className="relative mx-auto mt-16 max-w-4xl sm:mt-20">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-2xl shadow-black/40">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/70" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-amber-400/70" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-green-400/70" aria-hidden="true" />
                <div className="mx-auto flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-1 text-xs text-slate-400">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>
                  app.letlucid.co.uk/dashboard
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="grid grid-cols-4 gap-0">
                {/* Sidebar strip */}
                <div className="col-span-1 hidden border-r border-white/5 bg-slate-900 p-3 sm:block">
                  <div className="mb-4 flex items-center gap-2 px-1 pt-1">
                    <div className="h-6 w-6 rounded bg-white/10" />
                    <div className="h-3 w-16 rounded bg-white/20" />
                  </div>
                  {["Dashboard","Landlords","Properties","Compliance"].map((item, i) => (
                    <div key={item} className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 ${i === 0 ? "bg-white/10" : ""}`}>
                      <div className={`h-3.5 w-3.5 rounded ${i === 0 ? "bg-indigo-400/60" : "bg-white/20"}`} />
                      <div className={`h-2.5 rounded ${i === 0 ? "bg-white/50" : "bg-white/20"}`} style={{ width: `${[60,55,58,62][i]}%` }} />
                    </div>
                  ))}
                </div>
                {/* Main content */}
                <div className="col-span-4 p-4 sm:col-span-3 sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-4 w-24 rounded bg-white/20" />
                    <div className="h-3 w-32 rounded bg-white/10" />
                  </div>
                  {/* Stat cards */}
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Landlords", val: "12", color: "bg-slate-700" },
                      { label: "Properties", val: "34", color: "bg-indigo-900/40" },
                      { label: "Required", val: "89", color: "bg-emerald-900/30" },
                      { label: "Missing", val: "3", color: "bg-red-900/40" },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-lg ${s.color} p-3`}>
                        <div className="mb-1.5 h-2 w-14 rounded bg-white/20" />
                        <div className="h-5 w-8 rounded bg-white/40" />
                      </div>
                    ))}
                  </div>
                  {/* Table preview */}
                  <div className="rounded-lg border border-white/10 bg-slate-900/40">
                    <div className="border-b border-white/5 px-4 py-2.5">
                      <div className="h-2.5 w-32 rounded bg-white/20" />
                    </div>
                    {[
                      { w1: "w-40", w2: "w-24", badge: "bg-emerald-500/20 text-emerald-400" },
                      { w1: "w-32", w2: "w-28", badge: "bg-amber-500/20 text-amber-400" },
                      { w1: "w-36", w2: "w-20", badge: "bg-red-500/20 text-red-400" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0">
                        <div className={`h-2.5 ${row.w1} rounded bg-white/25`} />
                        <div className={`h-5 w-20 rounded-full px-2 py-0.5 text-[10px] font-medium ${row.badge}`}>
                          <div className="h-full w-12 rounded bg-current opacity-40 mx-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust bar ────────────────────────────────────────────────────── */}
        <section aria-label="Trust indicators" className="border-b border-gray-100 bg-gray-50 px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-gray-500">
              {[
                { icon: "🔒", text: "GDPR compliant" },
                { icon: "🇬🇧", text: "Built for UK regulations" },
                { icon: "🏠", text: "Multi-property portfolios" },
                { icon: "📄", text: "All major certificates covered" },
                { icon: "⚡", text: "Auto expiry alerts" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <span aria-hidden="true">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Problem → Solution ───────────────────────────────────────────── */}
        <section
          aria-labelledby="problem-heading"
          className="px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">

              {/* Problem side */}
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-600">The problem</p>
                <h2 id="problem-heading" className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Compliance gaps are costing landlords thousands
                </h2>
                <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                  UK letting agents managing multiple properties face a compliance nightmare.
                  Fines for missing gas safety records start at £6,000. Failure to protect
                  a tenant's deposit can cost 1–3× the deposit amount. The consequences of
                  lost paperwork are severe.
                </p>
                <ul className="mt-8 space-y-3" role="list">
                  {painPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <XIcon />
                      <span className="text-gray-600">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Solution side */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-600">The solution</p>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                  One dashboard for your entire compliance picture
                </h3>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  Let Lucid gives you a real-time view of every certificate across every
                  property — what's valid, what's expiring, and what's missing. No more spreadsheets.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {[
                    "Live compliance score for each property",
                    "Automatic 30-day expiry warnings",
                    "Centralised document storage per property",
                    "Landlord and tenant records in one place",
                    "Instant visibility across your whole portfolio",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <CheckIcon />
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  See it in action
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features grid ─────────────────────────────────────────────────── */}
        <section
          aria-labelledby="features-heading"
          className="bg-gray-50 px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-14">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-600">Features</p>
              <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Everything your agency needs to stay compliant
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                Purpose-built for UK letting agents managing landlords, tenants, and regulatory documents.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs transition hover:border-indigo-200 hover:shadow-sm"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section
          aria-labelledby="how-heading"
          className="px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-14">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-600">How it works</p>
              <h2 id="how-heading" className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Up and running in under 10 minutes
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
                No lengthy onboarding. No training courses. Just log in and start adding your properties.
              </p>
            </div>

            <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3" role="list">
              {steps.map((step, index) => (
                <li key={step.number} className="relative">
                  {index < steps.length - 1 && (
                    <div
                      className="absolute left-7 top-7 hidden h-0.5 w-[calc(100%+2rem)] bg-gradient-to-r from-indigo-200 to-transparent sm:block"
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex flex-col items-start">
                    <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                      <span className="text-sm font-bold">{step.number}</span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Compliance coverage ───────────────────────────────────────────── */}
        <section
          aria-labelledby="coverage-heading"
          className="bg-slate-900 px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-400">Coverage</p>
                <h2 id="coverage-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Every UK compliance requirement, in one place
                </h2>
                <p className="mt-4 text-lg text-slate-400 leading-relaxed">
                  From annual gas safety checks to deposit protection, Let Lucid covers all
                  the certificates UK landlords are legally required to maintain.
                </p>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                  >
                    Start tracking compliance
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {complianceItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <CheckIcon />
                    <span className="text-sm font-medium text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust / security ─────────────────────────────────────────────── */}
        <section
          aria-labelledby="trust-heading"
          className="px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 sm:p-12">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-600">Why agencies trust Let Lucid</p>
                  <h2 id="trust-heading" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Secure, private, and built for British property
                  </h2>
                  <p className="mt-3 text-gray-600 leading-relaxed">
                    Let Lucid is purpose-built for the UK rental market. Your data stays
                    secure and GDPR-compliant — always.
                  </p>
                </div>

                <div className="col-span-1 lg:col-span-2 grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {[
                    {
                      icon: (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Z" />
                        </svg>
                      ),
                      title: "GDPR compliant",
                      desc: "All data handled in accordance with UK data protection law.",
                    },
                    {
                      icon: (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      ),
                      title: "Secure document storage",
                      desc: "Certificates and tenancy files stored with enterprise-grade security.",
                    },
                    {
                      icon: (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                        </svg>
                      ),
                      title: "Always up to date",
                      desc: "We track UK regulatory changes so your compliance requirements stay current.",
                    },
                  ].map((card) => (
                    <div key={card.title}>
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        {card.icon}
                      </div>
                      <h3 className="mb-1.5 text-sm font-semibold text-gray-900">{card.title}</h3>
                      <p className="text-sm leading-relaxed text-gray-500">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="cta-heading"
          className="bg-indigo-600 px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Stop managing compliance with spreadsheets
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-indigo-100 leading-relaxed">
              Join letting agents who use Let Lucid to stay on top of every certificate,
              every property, every landlord — all in one place.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50 sm:w-auto"
              >
                Create your free account
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-indigo-400 px-8 py-3.5 text-base font-medium text-white transition hover:border-white hover:bg-white/10 sm:w-auto"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-indigo-200">No credit card required. Free to get started.</p>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <a href="/" className="flex items-center gap-2.5" aria-label="Let Lucid home">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden">
                <img src="/let-lucid-logo.png" alt="" className="h-7 w-7 object-contain" />
              </div>
              <span
                style={{ fontFamily: "var(--font-bebas)" }}
                className="text-[20px] tracking-widest leading-none text-white"
              >
                LET LUCID
              </span>
            </a>

            <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Create account</Link>
            </nav>

            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Let Lucid. Built for UK landlords.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
