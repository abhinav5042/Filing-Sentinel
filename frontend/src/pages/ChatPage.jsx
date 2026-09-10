import { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { queryFilingSentinel } from "../lib/api";
import "../styles/tokens.css";

export default function ChatPage({ initialCompany = "", initialQuestion = "", onBackToHome, onGoToSummary, onGoToDiff }) {
  const { token, logout } = useAuth();
  const [company, setCompany] = useState(initialCompany);
  const [draft, setDraft] = useState(initialQuestion);
  const [turns, setTurns] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function handleSend(e) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || !company.trim()) return;

    const id = Date.now();
    setTurns((prev) => [...prev, { id, question, company: company.trim(), loading: true }]);
    setDraft("");

    try {
      const result = await queryFilingSentinel(question, company.trim(), token);
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, loading: false, ...result } : t))
      );
    } catch (err) {
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, loading: false, error: err.message } : t))
      );
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--fs-bg)", color: "var(--fs-text-primary)", fontFamily: "var(--fs-font-sans)", fontSize: 14, lineHeight: 1.5 }}>
      <nav style={{ width: 224, flex: "none", background: "var(--fs-panel)", borderRight: "1px solid var(--fs-border)", display: "flex", flexDirection: "column", padding: "18px 12px", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px" }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--fs-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px var(--fs-font-mono)", color: "#03210c" }}>
            FS
          </div>
          <div style={{ fontWeight: 600, letterSpacing: "-.2px" }}>FilingSentinel</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", background: "transparent", color: "var(--fs-text-muted)", cursor: "pointer", font: "400 13px var(--fs-font-sans)", textAlign: "left" }}
            >
              Home
            </button>
          )}
          <button style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", background: "var(--fs-active-bg)", color: "var(--fs-text-primary)", cursor: "pointer", font: "400 13px var(--fs-font-sans)", textAlign: "left" }}>
            Ask the filing
          </button>
          {onGoToSummary && (
            <button
              onClick={onGoToSummary}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", background: "transparent", color: "var(--fs-text-muted)", cursor: "pointer", font: "400 13px var(--fs-font-sans)", textAlign: "left" }}
            >
              Filing summary
            </button>
          )}
          {onGoToDiff && (
            <button
              onClick={onGoToDiff}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", background: "transparent", color: "var(--fs-text-muted)", cursor: "pointer", font: "400 13px var(--fs-font-sans)", textAlign: "left" }}
            >
              Year-over-year diff
            </button>
          )}
        </div>

        <div style={{ marginTop: "auto" }} />

        {onBackToHome && (
          <button
            onClick={onBackToHome}
            style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 9, border: "none", background: "transparent", color: "var(--fs-text-muted)", cursor: "pointer", font: "400 13px var(--fs-font-sans)", textAlign: "left" }}
          >
            â† Search companies
          </button>
        )}

        <button
          onClick={logout}
          style={{
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
          }}
        >
          Sign out
        </button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "40px 56px", width: "100%", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.6px" }}>
            Ask a question about any company's 10-K
          </h1>
          {turns.length > 0 && (
            <button
              onClick={() => setTurns([])}
              style={{
                flex: "none",
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--fs-border-strong)",
                background: "transparent",
                color: "var(--fs-text-secondary)",
                font: "500 12.5px var(--fs-font-sans)",
                cursor: "pointer",
              }}
            >
              New chat
            </button>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ font: "500 11.5px var(--fs-font-mono)", letterSpacing: ".06em", color: "var(--fs-text-secondary)" }}>
            COMPANY
          </label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Apple, Tesla, NVDA..."
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "11px 13px",
              borderRadius: 9,
              border: "1px solid var(--fs-border-strong)",
              background: "var(--fs-card)",
              color: "var(--fs-text-primary)",
              font: "400 13.5px var(--fs-font-sans)",
              outline: "none",
            }}
          />
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
          {turns.map((t) => (
            <Turn key={t.id} turn={t} />
          ))}
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", gap: 10 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What are the main risks mentioned in the filing?"
            style={{
              flex: 1,
              padding: "12px 15px",
              borderRadius: 10,
              border: "1px solid var(--fs-border-strong)",
              background: "var(--fs-card)",
              color: "var(--fs-text-primary)",
              font: "400 14px var(--fs-font-sans)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--fs-accent)",
              color: "#03210c",
              font: "600 13.5px var(--fs-font-sans)",
              cursor: "pointer",
            }}
          >
            Ask
          </button>
        </form>
      </main>
    </div>
  );
}

function Turn({ turn }) {
  const [showTrace, setShowTrace] = useState(false);
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);

  useEffect(() => {
    if (!turn.loading) {
      setShowLongWaitMessage(false);
      return;
    }
    const timer = setTimeout(() => setShowLongWaitMessage(true), 6000);
    return () => clearTimeout(timer);
  }, [turn.loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ maxWidth: "78%", background: "var(--fs-active-bg)", border: "1px solid var(--fs-border-strong)", borderRadius: "12px 12px 4px 12px", padding: "11px 14px", fontSize: 13.5 }}>
          <div style={{ font: "500 10.5px var(--fs-font-mono)", color: "var(--fs-accent-label)", marginBottom: 4 }}>
            {turn.company}
          </div>
          {turn.question}
        </div>
      </div>

      {turn.loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, font: "500 11px var(--fs-font-mono)", letterSpacing: ".08em", color: "var(--fs-text-secondary)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fs-accent)" }} />
            SEARCHING {turn.company.toUpperCase()} 10-K...
          </div>
          {showLongWaitMessage && (
            <div style={{ fontSize: 12.5, color: "var(--fs-text-muted)", maxWidth: 480 }}>
              First time looking up {turn.company} â€” fetching its 10-K from SEC EDGAR and indexing
              it for search. This usually takes 1-3 minutes for a new company; every question after
              this one will be fast.
            </div>
          )}
        </div>
      )}

      {turn.error && (
        <div style={{ color: "var(--fs-danger-text)", fontSize: 13 }}>{turn.error}</div>
      )}

      {turn.answer && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: "var(--fs-text-body)", whiteSpace: "pre-wrap" }}>
            {turn.answer}
          </div>

          {turn.sources && turn.sources.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 2 }}>
              {turn.sources.map((src, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 6,
                    background: i === 0 ? "var(--fs-accent-bg)" : "var(--fs-card)",
                    border: `1px solid ${i === 0 ? "var(--fs-accent-border)" : "var(--fs-border)"}`,
                    padding: "4px 9px",
                    font: "500 11.5px var(--fs-font-mono)",
                    color: i === 0 ? "var(--fs-accent-hover)" : "var(--fs-text-secondary)",
                  }}
                >
                  <sup style={{ fontSize: 9 }}>{i + 1}</sup>
                  {src.company}, ch. {src.chunk_index}
                </div>
              ))}
            </div>
          )}

          {turn.trace && turn.trace.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <button
                onClick={() => setShowTrace((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  font: "500 12px var(--fs-font-sans)",
                  color: "var(--fs-text-muted)",
                }}
              >
                <span style={{ display: "inline-block", transform: showTrace ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                  â–¸
                </span>
                {showTrace ? "Hide reasoning" : `See how it got here (${turn.trace.length} steps)`}
              </button>
              {showTrace && (
                <div
                  style={{
                    marginTop: 10,
                    borderLeft: "2px solid var(--fs-accent)",
                    background: "#0b0a0d",
                    borderRadius: "0 8px 8px 0",
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {turn.trace.map((step, i) => (
                    <div key={i} style={{ font: "400 12px var(--fs-font-mono)", color: "var(--fs-success-text)", display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--fs-text-faint)" }}>{String(i + 1).padStart(2, "0")}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  <div style={{ font: "400 12px var(--fs-font-mono)", color: "var(--fs-text-faint)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ color: "var(--fs-accent)" }}>â–Š</span>
                    done
                  </div>
                </div>
              )}
            </div>
          )}

          {turn.grounded === false && (
            <div style={{ font: "400 11.5px var(--fs-font-mono)", color: "var(--fs-danger-text)" }}>
              Note: this answer could not be fully verified against the source text.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


