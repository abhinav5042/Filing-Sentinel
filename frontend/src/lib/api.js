const API_BASE_URL = "http://127.0.0.1:8000";

export async function signup(email, password, fullName) {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Signup failed");
  }
  return response.json();
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Login failed");
  }
  return response.json();
}

export async function queryFilingSentinel(question, company, token) {
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, company }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Query failed");
  }
  return response.json();
}

export async function searchCompanies(query, token) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_BASE_URL}/companies/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function getFilingSummary(company, token) {
  const response = await fetch(`${API_BASE_URL}/summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ company }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to generate summary");
  }
  return response.json();
}

export async function getFilingDiff(company, token) {
  const response = await fetch(`${API_BASE_URL}/diff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ company }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to generate comparison");
  }
  return response.json();
}

export async function getStats(token) {
  const response = await fetch(`${API_BASE_URL}/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function getFinancials(company, token) {
  const response = await fetch(`${API_BASE_URL}/financials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ company }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to load financials");
  }
  return response.json();
}
