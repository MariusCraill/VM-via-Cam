import { SiteSettings } from '../types';

const TOKEN_KEY = 'gatepass_admin_token';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode); session lasts until reload
  }
}

/** fetch() with the admin bearer token attached; throws with the server's error message. */
export async function adminFetch<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && token && url !== '/api/admin/password') setAdminToken(null);
  if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status });
  return json as T;
}

export async function fetchAdminStatus(): Promise<{ passwordSet: boolean; authenticated: boolean }> {
  return adminFetch('/api/admin/status');
}

export async function adminLogin(password: string, firstRun: boolean): Promise<void> {
  const json = await adminFetch<{ token: string }>(firstRun ? '/api/admin/setup' : '/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  setAdminToken(json.token);
}

export async function adminLogout(): Promise<void> {
  await adminFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
  setAdminToken(null);
}

export async function saveSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const json = await adminFetch<{ settings: SiteSettings }>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  return json.settings;
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  const json = await adminFetch<{ token: string }>('/api/admin/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  setAdminToken(json.token);
}

/** Resizes an uploaded image to fit `maxSide` and returns a PNG/WebP data URL. */
export function resizeImageToDataUrl(file: File, maxSide = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Not a valid image'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // PNG keeps transparency; fall back to WebP if the PNG is large.
        let url = canvas.toDataURL('image/png');
        if (url.length > 400_000) url = canvas.toDataURL('image/webp', 0.9);
        resolve(url);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
