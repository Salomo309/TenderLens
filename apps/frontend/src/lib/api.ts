const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.message || `Request failed: ${res.status} ${res.statusText}`,
      res.status,
      body,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface AuthResponse {
  access_token: string;
  user: { id: string; email: string; name: string | null };
  tenant: { id: string; name: string; slug: string };
}

export interface MeResponse {
  user: { id: string; email: string; name: string | null; role: string };
  tenant: { id: string; name: string; slug: string };
}

export function authApi() {
  return {
    login: (email: string, password: string) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (data: { companyName: string; adminName: string; email: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => apiFetch<MeResponse>('/auth/me'),
  };
}
