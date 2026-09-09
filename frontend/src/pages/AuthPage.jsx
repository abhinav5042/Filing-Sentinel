import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import "../styles/tokens.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, fullName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0,1.05fr) minmax(420px,.95fr)",
        background: "var(--fs-bg)",
        color: "var(--fs-text-primary)",
        fontFamily: "var(--fs-font-sans)",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          padding: "44px 52px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "var(--fs-panel)",
          borderRight: "1px solid var(--fs-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--fs-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "600 12px var(--fs-font-mono)",
              color: "#03210c",
            }}
          >
            FS
          </div>
          <div style={{ fontWeight: 600, letterSpacing: "-.2px" }}>FilingSentinel</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 440 }}>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.8px", lineHeight: 1.2 }}>
            Every answer traced back to the page it came from.
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--fs-text-secondary)" }}>
            Ask a question about any public company 10-K. FilingSentinel retrieves the
            relevant passage, checks its own answer for hallucination, and shows you exactly
            which chunk it came from.
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 9,
              font: "400 12.5px var(--fs-font-mono)",
              color: "var(--fs-text-muted)",
            }}
          >
            <div>Agentic RAG - self-correcting retrieval</div>
            <div>Any US public company - fetched on demand from SEC EDGAR</div>
          </div>
        </div>

        <div style={{ font: "400 11.5px var(--fs-font-mono)", color: "var(--fs-text-faint)" }}>
          Not investment advice. Source documents are public SEC filings.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 352, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.3px" }}>
              {mode === "login" ? "Sign in" : "Create account"}
            </div>
            <div style={{ fontSize: 13, color: "var(--fs-text-secondary)" }}>
              {mode === "login" ? "Welcome back." : "Start asking questions about any filing."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: mode === "login" ? "1px solid var(--fs-accent-border)" : "1px solid var(--fs-border-strong)",
                background: mode === "login" ? "var(--fs-accent-bg)" : "transparent",
                color: mode === "login" ? "var(--fs-accent-hover)" : "var(--fs-text-label)",
                font: "500 12.5px var(--fs-font-sans)",
                cursor: "pointer",
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: mode === "signup" ? "1px solid var(--fs-accent-border)" : "1px solid var(--fs-border-strong)",
                background: mode === "signup" ? "var(--fs-accent-bg)" : "transparent",
                color: mode === "signup" ? "var(--fs-accent-hover)" : "var(--fs-text-label)",
                font: "500 12.5px var(--fs-font-sans)",
                cursor: "pointer",
              }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    font: "500 11.5px var(--fs-font-mono)",
                    letterSpacing: ".06em",
                    color: "var(--fs-text-secondary)",
                  }}
                >
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  font: "500 11.5px var(--fs-font-mono)",
                  letterSpacing: ".06em",
                  color: "var(--fs-text-secondary)",
                }}
              >
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  font: "500 11.5px var(--fs-font-mono)",
                  letterSpacing: ".06em",
                  color: "var(--fs-text-secondary)",
                }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="**********"
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ color: "var(--fs-danger-text)", fontSize: 12.5, margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: 11,
                borderRadius: 9,
                border: "none",
                background: "var(--fs-accent)",
                color: "#03210c",
                font: "600 13.5px var(--fs-font-sans)",
                cursor: "pointer",
              }}
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Sign up"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 9,
  border: "1px solid var(--fs-border-strong)",
  background: "var(--fs-panel)",
  color: "var(--fs-text-primary)",
  font: "400 13.5px var(--fs-font-sans)",
  outline: "none",
};
