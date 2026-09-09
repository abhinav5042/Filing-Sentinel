import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import "../styles/tokens.css";

const API_BASE_URL = "http://127.0.0.1:8000";

async function getMe(token) {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

async function updateProfile(fullName, token) {
  const response = await fetch(`${API_BASE_URL}/account/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ full_name: fullName }),
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
}

async function changePassword(currentPassword, newPassword, token) {
  const response = await fetch(`${API_BASE_URL}/account/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to change password");
  }
  return response.json();
}

async function resendVerification(token) {
  const response = await fetch(`${API_BASE_URL}/account/resend-verification`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to resend verification email");
  return response.json();
}

export default function AccountPage({ onBackToHome }) {
  const { token, logout } = useAuth();
  const [me, setMe] = useState(null);
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    getMe(token).then((data) => {
      setMe(data);
      setFullName(data?.full_name || "");
    });
  }, [token]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const updated = await updateProfile(fullName, token);
      setMe(updated);
      setProfileMsg("Saved.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg("");
    setPasswordErr("");
    try {
      await changePassword(currentPassword, newPassword, token);
      setPasswordMsg("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordErr(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMsg("");
    try {
      await resendVerification(token);
      setResendMsg("Verification email sent - check your inbox.");
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResending(false);
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
        <button style={{ ...navBtnStyle, background: "var(--fs-active-bg)", color: "var(--fs-text-primary)" }}>Account</button>

        <div style={{ marginTop: "auto" }} />

        <button onClick={logout} style={navBtnStyle}>Sign out</button>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "36px 48px", textAlign: "left", maxWidth: 560 }}>
        <h1 style={{ margin: "0 0 24px", fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px" }}>
          Account
        </h1>

        {me && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Panel title="Profile">
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>EMAIL</label>
                <div style={{ fontSize: 13.5, color: "var(--fs-text-body)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  {me.email}
                  {me.is_verified ? (
                    <span style={{ fontSize: 11, color: "var(--fs-success-text)", border: "1px solid var(--fs-border)", borderRadius: 5, padding: "2px 6px" }}>
                      Verified
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--fs-danger-text)", border: "1px solid var(--fs-border)", borderRadius: 5, padding: "2px 6px" }}>
                      Not verified
                    </span>
                  )}
                </div>
                {!me.is_verified && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={handleResend}
                      disabled={resending}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 7,
                        border: "1px solid var(--fs-border-strong)",
                        background: "transparent",
                        color: "var(--fs-text-secondary)",
                        font: "500 12px var(--fs-font-sans)",
                        cursor: "pointer",
                      }}
                    >
                      {resending ? "Sending..." : "Resend verification email"}
                    </button>
                    {resendMsg && (
                      <div style={{ fontSize: 12, color: "var(--fs-text-muted)", marginTop: 6 }}>{resendMsg}</div>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveProfile}>
                <label style={labelStyle}>FULL NAME</label>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={inputStyle}
                  />
                  <button type="submit" disabled={savingProfile} style={btnStyle}>
                    {savingProfile ? "Saving..." : "Save"}
                  </button>
                </div>
                {profileMsg && <div style={{ fontSize: 12, color: "var(--fs-success-text)", marginTop: 6 }}>{profileMsg}</div>}
              </form>
            </Panel>

            <Panel title="Change password">
              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>CURRENT PASSWORD</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ ...inputStyle, width: "100%", marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>NEW PASSWORD</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ ...inputStyle, width: "100%", marginTop: 4 }}
                  />
                </div>
                <button type="submit" disabled={savingPassword} style={{ ...btnStyle, alignSelf: "flex-start" }}>
                  {savingPassword ? "Saving..." : "Change password"}
                </button>
                {passwordMsg && <div style={{ fontSize: 12, color: "var(--fs-success-text)" }}>{passwordMsg}</div>}
                {passwordErr && <div style={{ fontSize: 12, color: "var(--fs-danger-text)" }}>{passwordErr}</div>}
              </form>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ border: "1px solid var(--fs-border-strong)", borderRadius: 12, padding: 18, background: "var(--fs-card)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{title}</div>
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

const labelStyle = {
  font: "500 11px var(--fs-font-mono)",
  letterSpacing: ".06em",
  color: "var(--fs-text-secondary)",
};

const inputStyle = {
  padding: "8px 11px",
  borderRadius: 7,
  border: "1px solid var(--fs-border-strong)",
  background: "var(--fs-panel)",
  color: "var(--fs-text-primary)",
  font: "400 13px var(--fs-font-sans)",
  outline: "none",
  flex: 1,
};

const btnStyle = {
  padding: "8px 14px",
  borderRadius: 7,
  border: "none",
  background: "var(--fs-accent)",
  color: "#03210c",
  font: "600 12.5px var(--fs-font-sans)",
  cursor: "pointer",
};
