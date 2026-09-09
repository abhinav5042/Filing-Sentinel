import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import "../styles/tokens.css";

const API_BASE_URL = "http://127.0.0.1:8000";

async function getWatchlist(token) {
  const response = await fetch(`${API_BASE_URL}/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  return response.json();
}

async function addToWatchlist(company, token) {
  const response = await fetch(`${API_BASE_URL}/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ company }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to add to watchlist");
  }
  return response.json();
}

async function acknowledgeAlert(id, token) {
  await fetch(`${API_BASE_URL}/watchlist/${id}/acknowledge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function removeFromWatchlist(id, token) {
  await fetch(`${API_BASE_URL}/watchlist/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export default function AlertsPage({ onBackToHome }) {
  const { token, logout } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCompany, setNewCompany] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function refresh() {
    setLoading(true);
    getWatchlist(token)
      .then(setEntries)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newCompany.trim()) return;
    setAdding(true);
    setError("");
    try {
      await addToWatchlist(newCompany.trim(), token);
      setNewCompany("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleAcknowledge(id) {
    await acknowledgeAlert(id, token);
    refresh();
  }

  async function handleRemove(id) {
    await removeFromWatchlist(id, token);
    refresh();
  }

  const newAlertsCount = entries.filter((e) => e.has_new_filing).length;

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
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>Alerts</button>

        <div style={{ marginTop: "auto" }} />

        <button onClick={logout} style={navBtnStyle}>Sign out</button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "36px 48px", textAlign: "left" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px" }}>
          Alerts
        </h1>
        <div style={{ font: "400 12px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginBottom: 24 }}>
          Checks SEC EDGAR live for new 10-K filings from companies you are watching
        </div>

        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          <input
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="Add a company to watch (e.g. Apple, Tesla, NVDA)..."
            style={{
              flex: 1,
              padding: "10px 13px",
              borderRadius: 8,
              border: "1px solid var(--fs-border-strong)",
              background: "var(--fs-card)",
              color: "var(--fs-text-primary)",
              font: "400 13.5px var(--fs-font-sans)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={adding}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--fs-accent)",
              color: "#03210c",
              font: "600 12.5px var(--fs-font-sans)",
              cursor: "pointer",
            }}
          >
            {adding ? "Adding..." : "Add to watchlist"}
          </button>
        </form>

        {error && <div style={{ color: "var(--fs-danger-text)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loading && (
          <div style={{ font: "500 11px var(--fs-font-mono)", color: "var(--fs-text-secondary)" }}>Checking SEC EDGAR...</div>
        )}

        {!loading && entries.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--fs-text-faint)", fontStyle: "italic" }}>
            No companies on your watchlist yet.
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div style={{ font: "500 11px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginBottom: 14 }}>
            {newAlertsCount > 0 ? `${newAlertsCount} new filing${newAlertsCount > 1 ? "s" : ""}` : "Up to date"} - {entries.length} watched
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: entry.has_new_filing ? "1px solid var(--fs-accent-border)" : "1px solid var(--fs-border)",
                borderLeft: entry.has_new_filing ? "3px solid var(--fs-accent)" : "1px solid var(--fs-border)",
                borderRadius: 10,
                padding: "13px 16px",
                background: "var(--fs-card)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.company}</div>
                <div style={{ font: "400 11.5px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginTop: 2 }}>
                  {entry.has_new_filing
                    ? `New 10-K filed ${entry.latest_filing_date} (previously ${entry.last_seen_filing_date})`
                    : `Last filing: ${entry.latest_filing_date || "unknown"}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                {entry.has_new_filing && (
                  <button
                    onClick={() => handleAcknowledge(entry.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 7,
                      border: "1px solid var(--fs-accent-border)",
                      background: "var(--fs-accent-bg)",
                      color: "var(--fs-accent-hover)",
                      font: "500 12px var(--fs-font-sans)",
                      cursor: "pointer",
                    }}
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={() => handleRemove(entry.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: "1px solid var(--fs-border-strong)",
                    background: "transparent",
                    color: "var(--fs-text-muted)",
                    font: "500 12px var(--fs-font-sans)",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
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
