const STORAGE_KEY = "fs_recent_companies";
const MAX_RECENT = 5;

export function getRecentCompanies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentCompany({ name, ticker }) {
  const existing = getRecentCompanies().filter((c) => c.name !== name);
  const updated = [{ name, ticker, viewedAt: Date.now() }, ...existing].slice(0, 5);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
  }
  return updated;
}

