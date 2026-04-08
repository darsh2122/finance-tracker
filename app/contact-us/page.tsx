// ─────────────────────────────────────────────────────────────────────────────
// app/contact-us/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
import Link from "next/link"

export default function ContactUsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-gradient)", backgroundAttachment: "fixed", padding: "20px 16px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          <Link href="/" style={{
            padding: "9px 16px", borderRadius: "var(--r-md)", textDecoration: "none",
            fontSize: 13, fontWeight: 700, color: "var(--text-muted)",
            background: "var(--surface)", boxShadow: "var(--clay-sm)",
            display: "inline-flex", alignItems: "center",
          }}>← Home</Link>
          <Link href="/dashboard" style={{
            padding: "9px 16px", borderRadius: "var(--r-md)", textDecoration: "none",
            fontSize: 13, fontWeight: 700, color: "var(--text-muted)",
            background: "var(--surface)", boxShadow: "var(--clay-sm)",
            display: "inline-flex", alignItems: "center",
          }}>📊 Dashboard</Link>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 className="clay-page-title">Contact Us 📧</h1>
          <p className="clay-page-sub">We're here to help. Reach out anytime.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {[
            {
              icon: "📧", title: "Email Support",
              value: "darsh2122@gmail.com",
              href: "mailto:darsh2122@gmail.com",
              note: "Questions about accounts, transactions, or onboarding.",
            },
            {
              icon: "📞", title: "Phone",
              value: "+1 (226) 606-5709",
              href: "tel:+12266065709",
              note: "Mon–Fri, 9:00 AM to 6:00 PM ET.",
            },
          ].map(item => (
            <div key={item.title} className="clay-card">
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div className="clay-icon clay-icon-md" style={{ background: "var(--primary-gradient)" }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.title}</div>
                  <a href={item.href} style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)", textDecoration: "none", display: "block", marginTop: 2 }}>
                    {item.value}
                  </a>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.6 }}>{item.note}</p>
            </div>
          ))}
        </div>

        <div className="clay-card" style={{ background: "var(--primary-light)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)", marginBottom: 12 }}>💡 Before you reach out</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Include the email used for login",
              "Share steps to reproduce any issues",
              "For billing questions, include your latest invoice date",
            ].map(tip => (
              <div key={tip} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: "var(--primary)", fontSize: 14, marginTop: 1, flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
