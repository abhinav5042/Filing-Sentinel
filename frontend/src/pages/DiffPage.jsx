import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { getFilingDiff } from "../lib/api";
import "../styles/tokens.css";

export default function DiffPage({ company, onBackToHome, onGoToChat, onGoToSummary }) {
  const { token, logout } = useAuth();
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getFilingDiff(company, token)
      .then((data) => {
        if (!cancelled) setDiff(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company, token]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--fs-bg)", color: "var(--fs-text-primary)", fontFamily: "var(--fs-font-sans)", fontSize: 14, lineHeight: 1.5 }}>
      <nav style={{ width: 224, flex: "none", background: "var(--fs-panel)", borderRight: "1px solid var(--fs-border)", display: "flex", flexDirection: "column", padding: "18px 12px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 14 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--fs-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px var(--fs-font-mono)", color: "#03210c" }}>
            FS
          </div>
          <div style={{ fontWeight: 600, letterSpacing: "-.2px" }}>FilingSentinel</div>
        </div>

        <button onClick={onGoToChat} style={navBtnStyle}>
          Ask the filing
        </button>
        <button onClick={onGoToSummary} style={navBtnStyle}>
          Filing summary
        </button>
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>
          Year-over-year diff
        </button>

        <div style={{ marginTop: "auto" }} />

        <button onClick={onBackToHome} style={navBtnStyle}>
          Search companies
        </button>
        <button onClick={logout} style={navBtnStyle}>
          Sign out
        </button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "40px 56px", width: "100%", textAlign: "left" }}>
        <div style={{ font: "500 11px var(--fs-font-mono)", letterSpacing: ".12em", color: "var(--fs-accent-label)", marginBottom: 6 }}>
          YEAR-OVER-YEAR DIFF
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.6px" }}>
          {company}
        </h1>

        {diff && (
          <div style={{ font: "500 11.5px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginBottom: 28 }}>
            {diff.prior_filing_date} to {diff.current_filing_date}
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, font: "500 11px var(--fs-font-mono)", letterSpacing: ".08em", color: "var(--fs-text-secondary)", marginTop: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fs-accent)" }} />
            COMPARING THIS YEAR AND LAST YEAR FILINGS...
          </div>
        )}

        {error && <div style={{ color: "var(--fs-danger-text)", fontSize: 13 }}>{error}</div>}

        {diff && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Section title="WHAT CHANGED">
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: "var(--fs-text-body)" }}>
                {diff.summary}
              </p>
            </Section>

            <Section title={`NEW OR INCREASED RISKS - ${diff.new_or_increased_risks.length}`}>
              {diff.new_or_increased_risks.length === 0 ? (
                <EmptyNote text="No clearly new or increased risks identified." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {diff.new_or_increased_risks.map((risk, i) => (
                    <DiffCard key={i} text={risk} color="var(--fs-success-text)" borderColor="var(--fs-success)" prefix="+" />
                  ))}
                </div>
              )}
            </Section>

            <Section title={`REMOVED OR DECREASED RISKS - ${diff.removed_or_decreased_risks.length}`}>
              {diff.removed_or_decreased_risks.length === 0 ? (
                <EmptyNote text="No clearly removed or decreased risks identified." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {diff.removed_or_decreased_risks.map((risk, i) => (
                    <DiffCard key={i} text={risk} color="var(--fs-danger-text)" borderColor="var(--fs-danger-text)" prefix="-" />
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}

function DiffCard({ text, color, borderColor, prefix }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        border: "1px solid var(--fs-border)",
        borderLeft: `2px solid ${borderColor}`,
        borderRadius: "0 10px 10px 0",
        background: "var(--fs-card)",
        padding: "12px 14px",
      }}
    >
      <div style={{ font: "600 12px var(--fs-font-mono)", color, flex: "none" }}>{prefix}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--fs-text-body)" }}>{text}</div>
    </div>
  );
}

function EmptyNote({ text }) {
  return (
    <div style={{ fontSize: 12.5, color: "var(--fs-text-muted)", fontStyle: "italic" }}>{text}</div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ font: "500 11px var(--fs-font-mono)", letterSpacing: ".08em", color: "var(--fs-accent-label)", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const navBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: 8,
  borderRadius: 9,
  border: "none",
  background: "transparent",
  color: "var(--fs-text-muted)",
  cursor: "pointer",
  font: "400 13px var(--fs-font-sans)",
  textAlign: "left",
};


