// Central API client for the StaffFlow backend.
// Base URL comes from NEXT_PUBLIC_API_URL (set in .env.local / Vercel env).

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

const TOKEN_KEY = "staffflow_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
};

export async function apiFetch<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, params, auth = true } = opts;

  let url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
    }
    throw new ApiError(res.status, data?.message || `Request failed (${res.status})`, data?.details);
  }

  return data as T;
}

// ---- typed helpers per resource ----
export const api = {
  // auth
  login: (email: string, password: string) =>
    apiFetch("/api/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => apiFetch("/api/auth/me"),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),

  // dashboards
  managerDashboard: () => apiFetch("/api/dashboard/manager"),
  employeeDashboard: () => apiFetch("/api/dashboard/employee"),

  // employees
  listEmployees: (params?: Record<string, any>) => apiFetch("/api/employees", { params }),
  getEmployee: (id: string) => apiFetch(`/api/employees/${id}`),
  createEmployee: (body: any) => apiFetch("/api/employees", { method: "POST", body }),
  updateEmployee: (id: string, body: any) => apiFetch(`/api/employees/${id}`, { method: "PATCH", body }),
  deleteEmployee: (id: string) => apiFetch(`/api/employees/${id}`, { method: "DELETE" }),
  updateMe: (body: any) => apiFetch("/api/employees/me", { method: "PATCH", body }),

  // shifts
  listShifts: (params?: Record<string, any>) => apiFetch("/api/shifts", { params }),
  createShift: (body: any) => apiFetch("/api/shifts", { method: "POST", body }),
  updateShift: (id: string, body: any) => apiFetch(`/api/shifts/${id}`, { method: "PATCH", body }),
  deleteShift: (id: string) => apiFetch(`/api/shifts/${id}`, { method: "DELETE" }),
  respondShift: (id: string, action: "confirm" | "decline") =>
    apiFetch(`/api/shifts/${id}/respond`, { method: "POST", body: { action } }),

  // scheduling / recommendations
  generateSchedule: (body: any) => apiFetch("/api/schedule/generate", { method: "POST", body }),
  publishSchedule: (shifts: any[]) => apiFetch("/api/schedule/publish", { method: "POST", body: { shifts } }),
  recommendStaff: (params: Record<string, any>) => apiFetch("/api/schedule/recommend", { params }),

  // payroll & reports
  payroll: (params?: Record<string, any>) => apiFetch("/api/payroll", { params }),
  payrollTrend: () => apiFetch("/api/payroll/trend"),
  reports: (params?: Record<string, any>) => apiFetch("/api/reports", { params }),

  // notifications
  notifications: (params?: Record<string, any>) => apiFetch("/api/notifications", { params }),
  markNotificationRead: (id: string) => apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => apiFetch("/api/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id: string) => apiFetch(`/api/notifications/${id}`, { method: "DELETE" }),
};

export { API_BASE };
