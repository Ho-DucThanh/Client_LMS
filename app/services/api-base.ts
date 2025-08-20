const API_BASE_URL = "http://localhost:3000";

class ApiService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // If authToken wasn't explicitly set, try reading it from localStorage (fallback)
    let effectiveToken = this.authToken;
    try {
      if (!effectiveToken && typeof window !== "undefined") {
        effectiveToken = localStorage.getItem("token") || null;
      }
    } catch {}

    const config: RequestInit = {
      credentials: "include", // Include cookies in requests
      headers: {
        "Content-Type": "application/json",
        ...(effectiveToken && { Authorization: `Bearer ${effectiveToken}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      const contentType = response.headers.get("content-type") || "";

      // Handle non-OK responses: best-effort parse body for message
      if (!response.ok) {
        let parsedMessage: string | undefined;
        try {
          const errorText = await response.text();
          if (errorText) {
            if (contentType.includes("application/json")) {
              const errJson = JSON.parse(errorText);
              parsedMessage = errJson?.message || errJson?.error || undefined;
            } else {
              parsedMessage = errorText;
            }
          }
        } catch {}
        throw new Error(
          parsedMessage || `HTTP error! status: ${response.status}`
        );
      }

      // Short-circuit for No Content
      if (response.status === 204) {
        return null;
      }

      // Some endpoints may return empty body with 200; parse safely
      const text = await response.text();
      if (!text) {
        return null;
      }

      if (contentType.includes("application/json")) {
        try {
          return JSON.parse(text);
        } catch (e) {
          console.warn("API JSON parse warning:", e);
          return null;
        }
      }

      // Fallback: return raw text for non-JSON responses
      return text;
    } catch (error) {
      console.debug("API request failed:", error);
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: "DELETE" });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

export const baseApi = new ApiService(API_BASE_URL);
