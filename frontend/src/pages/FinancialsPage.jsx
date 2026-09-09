import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { getFinancials } from "../lib/api";
import "../styles/tokens.css";

export default function FinancialsPage({ company, onBackToHome, onGoToChat, onGoToSummary, onGoToDiff }) {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getFinancials(company, token)
      .then((d) => {
        if (!cancelled) setData(d);
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
      <nav style={{ width: 224, flex: "none", background: "var(--fs-panel)", borderRight: "1px solid var(--fs-border)", display: "flex", flexDirection: "column", padding: "18px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 20 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--fs-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px var(--fs-font-mono)", color: "#03210c" }}>
            FS
          </div>
          <div style={{ fontWeight: 600, letterSpacing: "-.2px" }}>FilingSentinel</div>
        </div>

        <button onClick={onBackToHome} style={navBtnStyle}>Home</button>
        <button onClick={onGoToChat} style={navBtnStyle}>Ask the filing</button>
        <button onClick={onGoToSummary} style={navBtnStyle}>Filing summary</button>
        {onGoToDiff && <button onClick={onGoToDiff} style={navBtnStyle}>Year-over-year diff</button>}
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>Financials table</button>

        <div style={{ marginTop: "auto" }} />

        <button onClick={logout} style={navBtnStyle}>Sign out</button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "40px 56px", textAlign: "left" }}>
        <h1 style={{ margin: "0 0 28px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.6px" }}>
          {company} - Financial Statements
        </h1>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, font: "500 11px var(--fs-font-mono)", letterSpacing: ".08em", color: "var(--fs-text-secondary)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fs-accent)" }} />
            Retrieving statements from the 10-K...
          </div>
        )}

        {error && <div style={{ color: "var(--fs-danger-text)", fontSize: 13 }}>{error}</div>}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <StatementTable title="Income Statement" table={data.income_statement} />
            <StatementTable title="Balance Sheet" table={data.balance_sheet} />
            <StatementTable title="Cash Flow Statement" table={data.cash_flow} />
          </div>
        )}
      </main>
    </div>
  );
}

function StatementTable({ title, table }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fs-text-secondary)", marginBottom: 10 }}>
        {title}
      </div>
      {!table && (
        <div style={{ fontSize: 12.5, color: "var(--fs-text-faint)", fontStyle: "italic", border: "1px solid var(--fs-border)", borderRadius: 8, padding: 14 }}>
          Not confidently found in the retrieved tables for this filing.
        </div>
      )}
      {table && (
        <div style={{ overflowX: "auto", border: "1px solid var(--fs-border-strong)", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", font: "400 12.5px var(--fs-font-mono)" }}>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < table.rows.length - 1 ? "1px solid var(--fs-border)" : "none" }}>
                  {row.filter((cell) => cell !== "").map((cell, j) => (
                    <td key={j} style={{ padding: "7px 12px", color: j === 0 ? "var(--fs-text-body)" : "var(--fs-text-primary)", whiteSpace: "nowrap" }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
