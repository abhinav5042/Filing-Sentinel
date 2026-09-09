import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/AuthContext";
import { searchCompanies, getStats } from "../lib/api";
import { getRecentCompanies, addRecentCompany } from "../lib/recentCompanies";
import "../styles/tokens.css";

const SUGGESTED_QUESTIONS = [
  "What changed in the risk factors this year?",
  "What are the main risks mentioned in the filing?",
  "Summarize the business overview.",
  "What does the filing say about litigation?",
];

export default function HomePage({ onSelectCompany, onQuickAction, onStartFromQuestion, onGoToAlerts, onGoToAccount, onGoToPeerComparison }) {
  const { token, email, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(getRecentCompanies());
  const [stats, setStats] = useState(null);
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    getStats(token).then(setStats);
  }, [token]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchCompanies(query.trim(), token);
      setResults(data);
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, token]);

  function handleSelect(result) {
    const updated = addRecentCompany(result);
    setRecent(updated);
    onSelectCompany(result.name);
  }

  function handleQuickAction(companyName, view) {
    onQuickAction(companyName, view);
  }

  function handleQuestionClick(question) {
    if (recent.length === 0) return;
    onStartFromQuestion(recent[0].name, question);
  }

  function relativeTime(timestamp) {
    const diffMs = Date.now() - timestamp;
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.round(diffHr / 24)}d ago`;
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

        <div style={sectionLabelStyle}>WORKSPACE</div>
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>Home</button>
        <button style={{ ...navBtnStyle, opacity: 0.55, cursor: "default" }}>Ask the filing</button>
        <button style={{ ...navBtnStyle, opacity: 0.55, cursor: "default" }}>Filing summary</button>
        <button style={{ ...navBtnStyle, opacity: 0.55, cursor: "default" }}>Year-over-year diff</button>

        <div style={{ ...sectionLabelStyle, marginTop: 18 }}>LATER</div>
        {recent.length > 0 ? (
          <button
            onClick={() => onQuickAction(recent[0].name, "financials")}
            style={navBtnStyle}
          >
            Financials table
          </button>
        ) : (
          <div style={disabledItemStyle}>Financials table</div>
        )}
        <button onClick={onGoToPeerComparison} style={navBtnStyle}>Peer comparison</button>
        {recent.length > 0 ? (
          <button onClick={() => onQuickAction(recent[0].name, "memos")} style={navBtnStyle}>
            Memos
          </button>
        ) : (
          <div style={disabledItemStyle}>Memos</div>
        )}
        <button onClick={onGoToAlerts} style={navBtnStyle}>
          Alerts
        </button>

        <div style={{ marginTop: "auto" }} />

        <div style={{ border: "1px solid var(--fs-border)", borderRadius: 9, padding: 11, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, font: "500 11px var(--fs-font-mono)", color: "var(--fs-success-text)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fs-success)" }} />
            EDGAR SYNC
          </div>
          <div style={{ font: "400 11.5px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginTop: 6 }}>
            {stats ? `${stats.chunks_indexed} chunks - ${stats.companies_indexed} companies indexed` : "Loading..."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px" }}>
          <button
            onClick={onGoToAccount}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--fs-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left", padding: 0 }}
          >
            {email || "Signed in"}
          </button>
          <button onClick={logout} style={{ background: "transparent", border: "none", color: "var(--fs-text-muted)", cursor: "pointer", font: "400 12px var(--fs-font-sans)" }}>
            Sign out
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "56px 64px", width: "100%", textAlign: "left" }}>
        <div style={{ font: "500 11px var(--fs-font-mono)", letterSpacing: ".12em", color: "var(--fs-accent-label)", marginBottom: 10 }}>
          ANNUAL REPORT RESEARCH
        </div>
        <h1 style={{ margin: "0 0 28px", fontSize: 34, fontWeight: 600, letterSpacing: "-0.7px", lineHeight: 1.25 }}>
          Read the 10-K once.
          <br />
          <span style={{ color: "var(--fs-text-secondary)" }}>Ask it anything after that.</span>
        </h1>

        <div style={{ position: "relative", marginBottom: 28 }}>
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a company, ticker, or CIK..."
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid var(--fs-border-strong)",
              background: "var(--fs-card)",
              color: "var(--fs-text-primary)",
              font: "400 15px var(--fs-font-sans)",
              outline: "none",
            }}
          />
          {query.trim().length >= 2 && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "var(--fs-dropdown)", border: "1px solid var(--fs-border-strong)", borderRadius: 10, overflow: "hidden", zIndex: 10 }}>
              {loading && <div style={dropdownMsgStyle}>Searching...</div>}
              {!loading && results.length === 0 && <div style={dropdownMsgStyle}>No matching companies found.</div>}
              {!loading &&
                results.map((r, i) => (
                  <button
                    key={r.cik}
                    onClick={() => handleSelect(r)}
                    style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "transparent", border: "none", borderBottom: i < results.length - 1 ? "1px solid var(--fs-border)" : "none", cursor: "pointer", textAlign: "left", color: "var(--fs-text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fs-hover-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ font: "400 13.5px var(--fs-font-sans)" }}>{r.name}</span>
                    <span style={{ font: "500 11.5px var(--fs-font-mono)", color: "var(--fs-accent-label)" }}>{r.ticker}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
            <span style={{ font: "500 11.5px var(--fs-font-mono)", color: "var(--fs-text-muted)" }}>Recent:</span>
            {recent.map((c) => (
              <button
                key={c.name}
                onClick={() => onSelectCompany(c.name)}
                style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid var(--fs-border-strong)", background: "var(--fs-card)", color: "var(--fs-text-label)", font: "400 12px var(--fs-font-mono)", cursor: "pointer" }}
              >
                {c.ticker} - {c.name}
              </button>
            ))}
          </div>
        )}

        {recent.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recently viewed</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              {recent.map((c) => (
                <div key={c.name} style={{ border: "1px solid var(--fs-border-strong)", borderRadius: 12, padding: 16, background: "var(--fs-card)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 3 }}>{c.name}</div>
                  <div style={{ font: "400 11.5px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginBottom: 14 }}>
                    {c.ticker} - 10-K - viewed {relativeTime(c.viewedAt)}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <QuickBtn label="Summary" onClick={() => handleQuickAction(c.name, "summary")} primary />
                    <QuickBtn label="Ask" onClick={() => handleQuickAction(c.name, "chat")} />
                    <QuickBtn label="Diff" onClick={() => handleQuickAction(c.name, "diff")} />
                    <QuickBtn label="Financials" onClick={() => handleQuickAction(c.name, "financials")} />
                    <QuickBtn label="Memos" onClick={() => handleQuickAction(c.name, "memos")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>Start from a question</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleQuestionClick(q)}
                disabled={recent.length === 0}
                title={recent.length === 0 ? "Search a company first" : undefined}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--fs-border-strong)",
                  background: "var(--fs-card)",
                  color: recent.length === 0 ? "var(--fs-text-muted)" : "var(--fs-text-body)",
                  font: "400 13.5px var(--fs-font-sans)",
                  cursor: recent.length === 0 ? "not-allowed" : "pointer",
                  opacity: recent.length === 0 ? 0.6 : 1,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function QuickBtn({ label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "7px 0",
        borderRadius: 7,
        border: primary ? "1px solid var(--fs-accent-border)" : "1px solid var(--fs-border-strong)",
        background: primary ? "var(--fs-accent-bg)" : "transparent",
        color: primary ? "var(--fs-accent-hover)" : "var(--fs-text-secondary)",
        font: "500 12px var(--fs-font-sans)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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

const sectionLabelStyle = {
  font: "500 10.5px var(--fs-font-mono)",
  letterSpacing: ".08em",
  color: "var(--fs-text-faint)",
  padding: "0 8px",
  marginBottom: 6,
};

const disabledItemStyle = {
  padding: "8px",
  color: "var(--fs-text-faint)",
  font: "400 13px var(--fs-font-sans)",
};

const dropdownMsgStyle = {
  padding: 14,
  font: "400 12.5px var(--fs-font-mono)",
  color: "var(--fs-text-muted)",
};
