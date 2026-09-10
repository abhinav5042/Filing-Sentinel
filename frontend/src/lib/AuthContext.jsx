import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, signup as apiSignup } from "./api";

const AuthContext = createContext(null);

function decodeEmailFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("fs_token"));

  useEffect(() => {
    if (token) {
      sessionStorage.setItem("fs_token", token);
    } else {
      sessionStorage.removeItem("fs_token");
    }
  }, [token]);

  async function login(email, password) {
    const data = await apiLogin(email, password);
    setToken(data.access_token);
  }

  async function signup(email, password, fullName) {
    const data = await apiSignup(email, password, fullName);
    setToken(data.access_token);
  }

  function logout() {
    setToken(null);
  }

  const value = {
    token,
    isAuthenticated: Boolean(token),
    email: token ? decodeEmailFromToken(token) : null,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

