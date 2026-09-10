import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { getFilingSummary } from "../lib/api";
import "../styles/tokens.css";

export default function SummaryPage({ company, onBackToHome, onGoToChat, onGoToDiff, onGoToFinancials }) {
  const { token, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getFilingSummary(company, token)
      .then((data) => {
        if (!cancelled) setSummary(data);
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

  function handleExport() {
    if (!summary) return;
    const text = [
      `${company} - Filing Summary`,
      "",
      "BUSINESS OVERVIEW",
      summary.business_overview,
      "",
      "KEY RISKS",
      ...summary.key_risks.map((r, i) => `${i + 1}. ${r}`),
      "",
      "FINANCIAL HIGHLIGHTS",
      summary.financial_highlights,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.replace(/\s+/g, "_")}_summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--fs-bg)", color: "var(--fs-text-primary)", fontFamily: "var(--fs-font-sans)", fontSize: 14, lineHeight: 1.5 }}>
      <nav style={{ width: 224, flex: "none", background: "var(--fs-panel)", borderRight: "1px solid var(--fs-border)", display: "flex", flexDirection: "column", padding: "18px 12px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 14 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--fs-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px var(--fs-font-mono)", color: "#03210c" }}>
            FS
          </div>
          <div style={{ fontWeight: 600, letterSpacing: "-.2px" }}>FilingSentinel</div>
        </div>

        <button onClick={onBackToHome} style={navBtnStyle}>Home</button>
        <button onClick={onGoToChat} style={navBtnStyle}>Ask the filing</button>
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>Filing summary</button>
        {onGoToDiff && <button onClick={onGoToDiff} style={navBtnStyle}>Year-over-year diff</button>}
        {onGoToFinancials && <button onClick={onGoToFinancials} style={navBtnStyle}>Financials table</button>}

        <div style={{ marginTop: "auto" }} />

        <button onClick={logout} style={navBtnStyle}>Sign out</button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "36px 48px", textAlign: "left" }}>
        <div style={{ font: "500 11px var(--fs-font-mono)", letterSpacing: ".1em", color: "var(--fs-text-muted)", marginBottom: 6 }}>
          FILING SUMMARY {summary ? `- GENERATED ${new Date().toISOString().slice(0, 10)}` : ""}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px" }}>{company}</h1>
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            <button onClick={handleExport} style={secondaryBtnStyle} disabled={!summary}>
              Export memo
            </button>
            <button onClick={onGoToChat} style={primaryBtnStyle}>
              Open in chat
            </button>
          </div>
        </div>
        <div style={{ font: "400 12px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginBottom: 24 }}>
          10-K
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, font: "500 11px var(--fs-font-mono)", letterSpacing: ".08em", color: "var(--fs-text-secondary)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fs-accent)" }} />
            Generating summary from the 10-K...
          </div>
        )}

        {error && <div style={{ color: "var(--fs-danger-text)", fontSize: 13 }}>{error}</div>}

        {summary && (
          <>
            {summary.metrics && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                <MetricCard label="Revenue" value={summary.metrics.revenue} units={summary.metrics.units} />
                <MetricCard label="Operating income" value={summary.metrics.operating_income_or_margin} units={summary.metrics.units} />
                <MetricCard label="Net income" value={summary.metrics.net_income} units={summary.metrics.units} />
                <MetricCard label="Cash & equivalents" value={summary.metrics.cash_and_equivalents} units={summary.metrics.units} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Panel title="What the filing says">
                  <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.7, color: "var(--fs-text-body)" }}>
                    {summary.business_overview}
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.7, color: "var(--fs-text-body)" }}>
                    {summary.financial_highlights}
                  </p>
                  <CitationChips sources={[...summary.business_overview_sources, ...summary.financial_highlights_sources]} />
                </Panel>

                <Panel title="Segment financial data">
                  {!summary.segment_revenue && (
                    <div style={{ fontSize: 12.5, color: "var(--fs-text-faint)", fontStyle: "italic" }}>
                      Not confidently found in the retrieved tables for this filing.
                    </div>
                  )}
                  {summary.segment_revenue && (
                    <SegmentBars table={summary.segment_revenue} />
                  )}
                </Panel>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Panel title="Flags" badge={`${summary.key_risks.length} found`}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {summary.key_risks.map((risk, i) => (
                      <div key={i} style={{ paddingBottom: i < summary.key_risks.length - 1 ? 14 : 0, borderBottom: i < summary.key_risks.length - 1 ? "1px solid var(--fs-border)" : "none" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <span style={{ color: "var(--fs-accent)", fontSize: 8, marginTop: 6 }}>â—</span>
                          <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--fs-text-body)" }}>{risk}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <CitationChips sources={summary.key_risks_sources} />
                  </div>
                </Panel>

                <Panel title="Explore">
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <ExploreLink label="Ask the filing" onClick={onGoToChat} />
                    {onGoToDiff && <ExploreLink label="Year-over-year diff" onClick={onGoToDiff} />}
                    {onGoToFinancials && <ExploreLink label="Financials table" onClick={onGoToFinancials} />}
                  </div>
                </Panel>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SegmentBars({ table }) {
  const parsedRows = table.rows
    .map((row) => {
      const label = row[0];
      const numericTokens = row
        .slice(1)
        .map((c) => c.trim())
        .filter((c) => c && c !== "$" && /[\d]/.test(c));
      return { label, values: numericTokens.slice(0, 2) };
    })
    .filter((r) => r.values.length === 2);

  if (parsedRows.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: "var(--fs-text-faint)", fontStyle: "italic" }}>
        Found a related table, but could not parse it into a clean comparison.
      </div>
    );
  }

  const magnitudes = parsedRows.map((r) => Math.abs(parseFloat(r.values[0].replace(/[^0-9.-]/g, "")) || 0));
  const maxMagnitude = Math.max(...magnitudes, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {parsedRows.map((row, i) => {
        const numeric = Math.abs(parseFloat(row.values[0].replace(/[^0-9.-]/g, "")) || 0);
        const pct = Math.max(4, Math.round((numeric / maxMagnitude) * 100));
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fs-text-body)", marginBottom: 5 }}>
              <span>{row.label}</span>
              <span style={{ font: "500 12px var(--fs-font-mono)", color: "var(--fs-text-secondary)" }}>
                {row.values[1]} &rarr; {row.values[0]}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--fs-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--fs-accent)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExploreLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 4px",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--fs-border)",
        color: "var(--fs-text-body)",
        font: "400 13px var(--fs-font-sans)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {label}
      <span style={{ color: "var(--fs-text-muted)" }}>&rarr;</span>
    </button>
  );
}

function MetricCard({ label, value, units }) {
  const unitSuffix = units === "billions" ? "B" : units === "thousands" ? "K" : units === "millions" ? "M" : "";
  return (
    <div style={{ border: "1px solid var(--fs-border-strong)", borderRadius: 12, padding: 16, background: "var(--fs-card)" }}>
      <div style={{ fontSize: 12, color: "var(--fs-text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ font: value ? "600 20px var(--fs-font-mono)" : "400 14px var(--fs-font-sans)", color: value ? "var(--fs-text-primary)" : "var(--fs-text-faint)" }}>
        {value ? `$${value.replace(/^\$/, "")}${unitSuffix}` : "Not disclosed"}
      </div>
    </div>
  );
}

function CitationChips({ sources }) {
  if (!sources || sources.length === 0) return null;
  const seen = new Set();
  const unique = sources.filter((s) => {
    const key = `${s.company}-${s.chunk_index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {unique.map((src, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 6,
            background: "var(--fs-hover-bg)",
            border: "1px solid var(--fs-border)",
            padding: "3px 8px",
            font: "500 11px var(--fs-font-mono)",
            color: "var(--fs-text-secondary)",
          }}
        >
          chunk {src.chunk_index}
        </div>
      ))}
    </div>
  );
}

function Panel({ title, badge, children }) {
  return (
    <div style={{ border: "1px solid var(--fs-border-strong)", borderRadius: 12, padding: 18, background: "var(--fs-card)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {badge && <div style={{ font: "400 11.5px var(--fs-font-mono)", color: "var(--fs-text-muted)" }}>{badge}</div>}
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
  width: "100%",
};

const primaryBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--fs-accent)",
  color: "#03210c",
  font: "600 12.5px var(--fs-font-sans)",
  cursor: "pointer",
};

const secondaryBtnStyle = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--fs-border-strong)",
  background: "transparent",
  color: "var(--fs-text-secondary)",
  font: "500 12.5px var(--fs-font-sans)",
  cursor: "pointer",
};

