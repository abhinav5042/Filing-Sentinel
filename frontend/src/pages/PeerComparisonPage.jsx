import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import "../styles/tokens.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function comparePeers(companies, token) {
  const response = await fetch(`${API_BASE_URL}/peer-comparison`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ companies }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to compare companies");
  }
  return response.json();
}

const METRIC_LABELS = {
  revenue: "Revenue",
  operating_income_or_margin: "Operating income",
  net_income: "Net income",
  cash_and_equivalents: "Cash & equivalents",
};

export default function PeerComparisonPage({ onBackToHome }) {
  const { token, logout } = useAuth();
  const [companyInputs, setCompanyInputs] = useState(["", ""]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateInput(index, value) {
    const updated = [...companyInputs];
    updated[index] = value;
    setCompanyInputs(updated);
  }

  function addInput() {
    if (companyInputs.length < 4) setCompanyInputs([...companyInputs, ""]);
  }

  async function handleCompare(e) {
    e.preventDefault();
    const companies = companyInputs.map((c) => c.trim()).filter(Boolean);
    if (companies.length < 2) {
      setError("Enter at least 2 companies.");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const data = await comparePeers(companies, token);
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>Peer comparison</button>

        <div style={{ marginTop: "auto" }} />

        <button onClick={logout} style={navBtnStyle}>Sign out</button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "36px 48px", textAlign: "left" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px" }}>
          Peer comparison
        </h1>
        <div style={{ font: "400 12px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginBottom: 24 }}>
          Compare real financial metrics across 2-4 companies, side by side
        </div>

        <form onSubmit={handleCompare} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {companyInputs.map((val, i) => (
              <input
                key={i}
                value={val}
                onChange={(e) => updateInput(i, e.target.value)}
                placeholder={`Company ${i + 1} (e.g. Apple, Tesla, NVDA)...`}
                style={{
                  padding: "10px 13px",
                  borderRadius: 8,
                  border: "1px solid var(--fs-border-strong)",
                  background: "var(--fs-card)",
                  color: "var(--fs-text-primary)",
                  font: "400 13.5px var(--fs-font-sans)",
                  outline: "none",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {companyInputs.length < 4 && (
              <button
                type="button"
                onClick={addInput}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--fs-border-strong)",
                  background: "transparent",
                  color: "var(--fs-text-secondary)",
                  font: "500 12.5px var(--fs-font-sans)",
                  cursor: "pointer",
                }}
              >
                + Add company
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--fs-accent)",
                color: "#03210c",
                font: "600 12.5px var(--fs-font-sans)",
                cursor: "pointer",
              }}
            >
              {loading ? "Comparing..." : "Compare"}
            </button>
          </div>
        </form>

        {error && <div style={{ color: "var(--fs-danger-text)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {results && (
          <div style={{ overflowX: "auto", border: "1px solid var(--fs-border-strong)", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", font: "400 13px var(--fs-font-mono)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--fs-border-strong)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--fs-text-secondary)", fontWeight: 500 }}>Metric</th>
                  {results.map((r) => (
                    <th key={r.company} style={{ padding: "10px 14px", textAlign: "left", color: "var(--fs-text-primary)", fontWeight: 600 }}>
                      {r.company}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <tr key={key} style={{ borderBottom: "1px solid var(--fs-border)" }}>
                    <td style={{ padding: "10px 14px", color: "var(--fs-text-secondary)" }}>{label}</td>
                    {results.map((r) => {
                      const value = r.metrics[key];
                      const units = r.metrics.units;
                      const suffix = units === "billions" ? "B" : units === "thousands" ? "K" : units === "millions" ? "M" : "";
                      return (
                        <td key={r.company} style={{ padding: "10px 14px", color: value ? "var(--fs-text-primary)" : "var(--fs-text-faint)" }}>
                          {value ? `$${value}${suffix}` : "Not disclosed"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
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

