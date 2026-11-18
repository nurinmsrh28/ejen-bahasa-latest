import type { AgentProfile, AuthUser } from './types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export async function fetchAuthSession(): Promise<{ authenticated: boolean; user?: AuthUser }> {
  try {
    const res = await requestJson<{ authenticated?: boolean; user?: AuthUser }>('/api/auth/session');
    if (res.ok && res.data.authenticated && res.data.user) {
      return { authenticated: true, user: res.data.user };
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

export async function loginAgent(payload: {
  username: string;
  password: string;
  rememberMe: boolean;
}): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  const res = await requestJson<{ authenticated?: boolean; user?: AuthUser; error?: string }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  if (res.ok && res.data.user) {
    return { ok: true, user: res.data.user };
  }
  return { ok: false, error: res.data.error || 'Log masuk gagal. Sila cuba lagi.' };
}

export async function registerAgentAccount(payload: {
  username: string;
  password: string;
  rememberMe: boolean;
}): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  const res = await requestJson<{ authenticated?: boolean; user?: AuthUser; error?: string }>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  if (res.ok && res.data.user) {
    return { ok: true, user: res.data.user };
  }
  return { ok: false, error: res.data.error || 'Pendaftaran akaun gagal. Sila cuba lagi.' };
}

export async function resetAgentPassword(payload: {
  username: string;
  recoveryCode: string;
  newPassword: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await requestJson<{ ok?: boolean; message?: string; error?: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  if (res.ok && res.data.ok) {
    return { ok: true, message: res.data.message };
  }
  return { ok: false, error: res.data.error || 'Tetapan semula kata laluan gagal.' };
}

export async function logoutAgent(): Promise<void> {
  await requestJson('/api/auth/logout', { method: 'POST' });
}

export async function saveServerAgentIdentity(payload: {
  name: string;
  className: string;
  codenameBadge: string;
}): Promise<{ ok: boolean; user?: AuthUser; profile?: AgentProfile; error?: string }> {
  const res = await requestJson<{ user?: AuthUser; profile?: AgentProfile; error?: string }>(
    '/api/agent/profile',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  if (res.ok && res.data.profile) {
    return { ok: true, user: res.data.user, profile: res.data.profile };
  }
  return { ok: false, error: res.data.error || 'Pengesahan identiti gagal pada pelayan.' };
}
