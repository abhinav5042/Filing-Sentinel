import "../styles/tokens.css";

const FEATURES = [
  {
    title: "Ask the filing",
    desc: "Ask any question about a company 10-K. A self-correcting agent retrieves, grades, and verifies its own answer before showing it to you.",
  },
  {
    title: "Filing summary",
    desc: "Business overview, key risks, and real financial metrics extracted directly from the filing tables, with citations for every claim.",
  },
  {
    title: "Year-over-year diff",
    desc: "Automatically compares this year risk factors against last year, flagging what is new and what is gone.",
  },
  {
    title: "Financials table",
    desc: "The actual income statement, balance sheet, and cash flow statement, parsed from the filing real tables.",
  },
  {
    title: "Memos",
    desc: "Keep your own private research notes attached to any company you are tracking.",
  },
  {
    title: "Alerts",
    desc: "Watch a company and get flagged the moment a new 10-K appears on SEC EDGAR.",
  },
];

export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{ background: "var(--fs-bg)", color: "var(--fs-text-primary)", fontFamily: "var(--fs-font-sans)", minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid var(--fs-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--fs-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px var(--fs-font-mono)", color: "#03210c" }}>
            FS
          </div>
          <div style={{ fontWeight: 600, letterSpacing: "-.2px" }}>FilingSentinel</div>
        </div>
        <button
          onClick={onGetStarted}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid var(--fs-border-strong)",
            background: "transparent",
            color: "var(--fs-text-primary)",
            font: "500 13px var(--fs-font-sans)",
            cursor: "pointer",
          }}
        >
          Sign in
        </button>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 48px 100px" }}>
        <div style={{ font: "500 11px var(--fs-font-mono)", letterSpacing: ".12em", color: "var(--fs-accent-label)", marginBottom: 14 }}>
          AGENTIC RAG FOR SEC FILINGS
        </div>
        <h1 style={{ margin: "0 0 20px", fontSize: 42, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1.2, maxWidth: 760 }}>
          Every answer traced back to the page it came from.
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: 16, lineHeight: 1.7, color: "var(--fs-text-secondary)", maxWidth: 620 }}>
          Ask a question about any public company 10-K. FilingSentinel retrieves the
          relevant passage, checks its own answer for hallucination, and shows you exactly
          which chunk it came from - for any of the ~10,000 US companies that file with
          the SEC, fetched live from EDGAR.
        </p>
        <div style={{ display: "flex", gap: 12, marginBottom: 90 }}>
          <button
            onClick={onGetStarted}
            style={{
              padding: "12px 22px",
              borderRadius: 9,
              border: "none",
              background: "var(--fs-accent)",
              color: "#03210c",
              font: "600 14px var(--fs-font-sans)",
              cursor: "pointer",
            }}
          >
            Get started
          </button>
          <button
            onClick={onGetStarted}
            style={{
              padding: "12px 22px",
              borderRadius: 9,
              border: "1px solid var(--fs-border-strong)",
              background: "transparent",
              color: "var(--fs-text-primary)",
              font: "500 14px var(--fs-font-sans)",
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ border: "1px solid var(--fs-border-strong)", borderRadius: 12, padding: 20, background: "var(--fs-card)" }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--fs-text-secondary)" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--fs-border)", padding: "24px 48px", textAlign: "center" }}>
        <div style={{ font: "400 11.5px var(--fs-font-mono)", color: "var(--fs-text-faint)" }}>
          Not investment advice. Source documents are public SEC filings.
        </div>
      </footer>
    </div>
  );
}
