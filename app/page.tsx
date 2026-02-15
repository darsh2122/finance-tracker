"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
            💸
          </span>
          <span className="font-semibold tracking-tight">MoneyFlow</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="rounded-xl px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
          >
            Open Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-12">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid items-center gap-10 lg:grid-cols-2"
        >
          <div>
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 ring-1 ring-white/10">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Track spending daily • Simple • Fast
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
            >
              A clean, modern way to track
              <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-emerald-200 bg-clip-text text-transparent">
                {" "}
                every transaction
              </span>
              .
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-xl text-base leading-7 text-zinc-300"
            >
              Log income, expenses, transfers, loans, and “shared” expenses (tagged by
              category). Beautiful trends, category standings, and monthly insights —
              without the clutter.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/transactions/new"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                Add a Transaction
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
              >
                View Dashboard
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-6 grid grid-cols-3 gap-3 text-sm text-zinc-300"
            >
              <MiniStat label="Fast logging" value="10 sec" />
              <MiniStat label="Categories" value="Hybrid" />
              <MiniStat label="Currency" value="CAD" />
            </motion.div>
          </div>

          {/* Preview card */}
          <motion.div variants={fadeUp} className="relative">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">This month</div>
                <div className="text-xs text-zinc-400">Insights</div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <GlassCard title="Spending" value="- 1,248.50 CAD" tone="bad" />
                <GlassCard title="Income" value="+ 4,000.00 CAD" tone="good" />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
                <div className="mb-2 text-sm font-semibold">Top categories</div>
                <div className="space-y-2">
                  <BarRow label="Eating Out" pct={0.68} />
                  <BarRow label="Gas" pct={0.42} />
                  <BarRow label="Phone Bill" pct={0.33} />
                  <BarRow label="Shared Dinner" pct={0.25} />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
                <div className="mb-2 text-sm font-semibold">Recent</div>
                <div className="space-y-3 text-sm">
                  <TxnRow left="Shared Dinner" right="-120.00" tone="bad" />
                  <TxnRow left="Salary" right="+4000.00" tone="good" />
                  <TxnRow left="Transfer" right="500.00" tone="neutral" />
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/10 to-emerald-500/10 blur-2xl" />
          </motion.div>
        </motion.div>

        {/* Features */}
        <section className="mt-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
            className="grid gap-4 md:grid-cols-3"
          >
            <Feature
              title="Daily logging that sticks"
              desc="Fast forms, smart defaults, and clean category selection so you don’t fall behind."
              icon="⚡"
            />
            <Feature
              title="Beautiful monthly insights"
              desc="Charts for spending trends, where money went, and category standings by month."
              icon="📊"
            />
            <Feature
              title="Built for real life"
              desc="Transfers and loans are one row. Shared expenses are a simple tagged expense."
              icon="🧠"
            />
          </motion.div>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-lg font-semibold">Ready to start tracking?</div>
              <div className="text-sm text-zinc-300">
                Add your first transaction and watch the dashboard light up.
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/auth/login"
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
              >
                Sign in
              </Link>
              <Link
                href="/transactions/new"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                Add Transaction
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-10 pb-8 text-center text-xs text-zinc-500">
          Built with Supabase + Next.js • Your data, your rules
        </footer>
      </main>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  )
}

function GlassCard({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: "good" | "bad" | "neutral"
}) {
  const ring =
    tone === "good"
      ? "ring-emerald-400/20"
      : tone === "bad"
      ? "ring-red-400/20"
      : "ring-white/10"
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ring-1 ${ring}`}>
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}

function BarRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-zinc-300">
        <span>{label}</span>
        <span>{Math.round(pct * 100)}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-300"
          style={{ width: `${Math.max(4, Math.round(pct * 100))}%` }}
        />
      </div>
    </div>
  )
}

function TxnRow({
  left,
  right,
  tone,
}: {
  left: string
  right: string
  tone: "good" | "bad" | "neutral"
}) {
  const cls =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
      ? "text-red-300"
      : "text-zinc-200"
  return (
    <div className="flex items-center justify-between">
      <div className="truncate text-zinc-200">{left}</div>
      <div className={`font-semibold ${cls}`}>{right}</div>
    </div>
  )
}

function Feature({
  title,
  desc,
  icon,
}: {
  title: string
  desc: string
  icon: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-3xl border border-white/10 bg-white/5 p-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          {icon}
        </div>
        <div className="font-semibold">{title}</div>
      </div>
      <div className="mt-3 text-sm leading-6 text-zinc-300">{desc}</div>
    </motion.div>
  )
}
