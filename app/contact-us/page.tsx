import Link from "next/link"

const contactItems = [
  {
    title: "General support",
    value: "darsh2122@gmail.com",
    href: "mailto:darsh2122@gmail.com",
    note: "Questions about accounts, transactions, or onboarding.",
  },
  {
    title: "Phone",
    value: "+1 (226) 606-5709",
    href: "tel:+12266065709",
    note: "Mon to Fri, 9:00 AM to 6:00 PM ET.",
  }
]

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-14">
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/15"
        >
          Back to Home
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/15"
        >
          Back to Dashboard
        </Link>
      </div>


        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Contact Us</h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          Need help with Finance Tracker? Reach out using the details below and we
          will respond as quickly as possible.
        </p>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {contactItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-xs uppercase tracking-wide text-zinc-400">
                {item.title}
              </div>
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-2 block text-base font-semibold text-cyan-300 hover:underline"
                >
                  {item.value}
                </a>
              ) : (
                <div className="mt-2 text-base font-semibold">{item.value}</div>
              )}
              <p className="mt-2 text-sm text-zinc-300">{item.note}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Before you contact support</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>Include the email used for login.</li>
            <li>Share steps to reproduce issues for faster debugging.</li>
            <li>For billing questions, include your latest invoice date.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
