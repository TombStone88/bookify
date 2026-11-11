import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_BASE };

// Resolve relative server paths into absolute URLs.
// Appends authentication token for protected PDF uploads while leaving public assets clean.
export function resolveFileUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const token = localStorage.getItem('token');
  if (
    token &&
    path.startsWith('/uploads') &&
    !path.startsWith('/uploads/profile') &&
    !path.startsWith('/uploads/covers')
  ) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return baseUrl;
}

// Generate URL for optimized, resized, and cached WebP image
export function getOptimizedImageUrl(rawUrl, { width = 240, format = 'webp', quality = 80 } = {}) {
  if (!rawUrl) return '';
  // SVGs are vector and already lightweight; pass through directly
  if (rawUrl.toLowerCase().endsWith('.svg') || rawUrl.includes('.svg?')) {
    return resolveFileUrl(rawUrl);
  }
  const resolved = resolveFileUrl(rawUrl);
  return `${API_BASE}/api/images/optimize?url=${encodeURIComponent(resolved)}&w=${width}&fmt=${format}&q=${quality}`;
}
