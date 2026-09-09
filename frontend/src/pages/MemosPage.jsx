import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import "../styles/tokens.css";

const API_BASE_URL = "http://127.0.0.1:8000";

async function listMemos(company, token) {
  const params = new URLSearchParams({ company });
  const response = await fetch(`${API_BASE_URL}/memos?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  return response.json();
}

async function createMemo(company, title, content, token) {
  const response = await fetch(`${API_BASE_URL}/memos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ company, title, content }),
  });
  if (!response.ok) throw new Error("Failed to save memo");
  return response.json();
}

async function deleteMemo(id, token) {
  await fetch(`${API_BASE_URL}/memos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export default function MemosPage({ company, onBackToHome, onGoToChat, onGoToSummary, onGoToDiff, onGoToFinancials }) {
  const { token, logout } = useAuth();
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    setLoading(true);
    listMemos(company, token)
      .then(setMemos)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function handleSave(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await createMemo(company, title.trim(), content.trim(), token);
      setTitle("");
      setContent("");
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await deleteMemo(id, token);
    refresh();
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
        <button onClick={onGoToChat} style={navBtnStyle}>Ask the filing</button>
        <button onClick={onGoToSummary} style={navBtnStyle}>Filing summary</button>
        {onGoToDiff && <button onClick={onGoToDiff} style={navBtnStyle}>Year-over-year diff</button>}
        {onGoToFinancials && <button onClick={onGoToFinancials} style={navBtnStyle}>Financials table</button>}
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>Memos</button>

        <div style={{ marginTop: "auto" }} />

        <button onClick={logout} style={navBtnStyle}>Sign out</button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "36px 48px", textAlign: "left" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px" }}>
          {company} - Memos
        </h1>
        <div style={{ font: "400 12px var(--fs-font-mono)", color: "var(--fs-text-muted)", marginBottom: 24 }}>
          Personal notes, only visible to you
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, border: "1px solid var(--fs-border-strong)", borderRadius: 12, padding: 16, background: "var(--fs-card)" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Memo title..."
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid var(--fs-border-strong)",
              background: "var(--fs-panel)",
              color: "var(--fs-text-primary)",
              font: "500 13.5px var(--fs-font-sans)",
              outline: "none",
            }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            rows={4}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid var(--fs-border-strong)",
              background: "var(--fs-panel)",
              color: "var(--fs-text-primary)",
              font: "400 13.5px var(--fs-font-sans)",
              outline: "none",
              resize: "vertical",
            }}
          />
          <button
            type="submit"
            disabled={saving}
            style={{
              alignSelf: "flex-end",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--fs-accent)",
              color: "#03210c",
              font: "600 12.5px var(--fs-font-sans)",
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : "Save memo"}
          </button>
        </form>

        {loading && (
          <div style={{ font: "500 11px var(--fs-font-mono)", color: "var(--fs-text-secondary)" }}>Loading...</div>
        )}

        {!loading && memos.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--fs-text-faint)", fontStyle: "italic" }}>
            No memos yet for {company}.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {memos.map((memo) => (
            <div key={memo.id} style={{ border: "1px solid var(--fs-border)", borderRadius: 10, padding: 14, background: "var(--fs-card)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{memo.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ font: "400 11px var(--fs-font-mono)", color: "var(--fs-text-muted)" }}>
                    {new Date(memo.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(memo.id)}
                    style={{ background: "transparent", border: "none", color: "var(--fs-danger-text)", cursor: "pointer", font: "400 12px var(--fs-font-sans)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--fs-text-body)", whiteSpace: "pre-wrap" }}>
                {memo.content}
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
