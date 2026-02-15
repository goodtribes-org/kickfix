const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Sätt inte Content-Type för FormData (browser sätter multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Något gick fel");
  }

  return data;
}
