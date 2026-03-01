import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 60000, // 60s — generous timeout for Render free tier cold starts
});

// ============================================================
// Retry Interceptor — Auto-retry on network errors (cold starts)
// Render free tier takes ~50s to spin up after inactivity.
// This ensures the frontend retries instead of showing an error.
// ============================================================
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000; // 3 seconds between retries

const isRetryableError = (error: any): boolean => {
  // Network errors (server not responding yet)
  if (!error.response && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
    return true;
  }
  // 503 Service Unavailable (Render returning before app is ready)
  if (error.response?.status === 503) return true;
  // 502 Bad Gateway (Render proxy before backend is up)
  if (error.response?.status === 502) return true;
  return false;
};

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (!config || config._retryCount >= MAX_RETRIES || !isRetryableError(error)) {
    return Promise.reject(error);
  }

  config._retryCount = (config._retryCount || 0) + 1;
  console.log(`[API] Request failed (${error.code || error.response?.status}). Retrying ${config._retryCount}/${MAX_RETRIES} in ${RETRY_DELAY_MS / 1000}s...`);

  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * config._retryCount));
  return api(config);
});

// ============================================================
// Request Interceptor — Attach JWT token to every request
// ============================================================
api.interceptors.request.use(
  (config) => {
    // Attach token from localStorage if present
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // If the data is FormData, let the browser set the Content-Type automatically with boundaries
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// Response Interceptor — Handle 401 (token expired) globally
// ============================================================
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: string) => void, reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token || undefined);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string | undefined>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          );

          localStorage.setItem('access_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

          processQueue(null, data.access_token);
          return api(originalRequest);
        } else {
          processQueue(new Error('No refresh token'));
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        console.warn('Token refresh failed, user session expired');
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ============================================================
// API Endpoints
// ============================================================

export const healthApi = {
  check: () => api.get('/health'),
};

export const documentApi = {
  searchUsers: (query: string) => api.post('/auth/users/search', { query }),
  addCollaborator: (docId: string, userId: string, role: string, accessMode?: string) =>
    api.post(`/documents/${docId}/collaborators`, { userId, role, accessMode }),
  removeCollaborator: (docId: string, userId: string) =>
    api.delete(`/documents/${docId}/collaborators/${userId}`),
  getOne: (docId: string) => api.get(`/documents/${docId}`),
};

export const commentApi = {
  list: (docId: string) => api.get(`/documents/${docId}/comments`),
  create: (docId: string, data: Record<string, unknown>) => api.post(`/documents/${docId}/comments`, data),
  resolve: (docId: string, id: string) => api.patch(`/documents/${docId}/comments/${id}/resolve`),
  delete: (docId: string, id: string) => api.delete(`/documents/${docId}/comments/${id}`),
  reply: (docId: string, id: string, data: { text: string }) => api.post(`/documents/${docId}/comments/${id}/replies`, data),
};

export const auditApi = {
  list: (documentId: string, page = 1, limit = 50) =>
    api.get(`/documents/${documentId}/audit-logs`, { params: { page, limit } }),
  activity: (documentId: string, cursor?: string, limit = 50) =>
    api.get(`/documents/${documentId}/activity`, { params: { cursor, limit } }),
};

export const versionApi = {
  create: (docId: string, data: Record<string, unknown>) => api.post(`/documents/${docId}/versions`, data),
  getAll: (docId: string) => api.get(`/documents/${docId}/versions`),
  getSnapshot: (docId: string, id: string) => api.get(`/versions/${id}/snapshot`), // Wait, did I change VersionController? Let me just keep the original path logic in VersionController for now since it wasn't broken by `RequireMode`, but wait, I didn't change VersionController for `getSnapshot`. I only checked it.
  // Actually, I did NOT change VersionController. Let me leave this as `(`/versions/${id}/snapshot`)`.
};

export const clauseApi = {
  create: (docId: string, data: Record<string, unknown>) =>
    api.post(`/documents/${docId}/clauses`, data),
  getAll: (docId: string) => api.get(`/documents/${docId}/clauses`),
};

export const approvalApi = {
  processAction: (clauseId: string, action: string, reason?: string) =>
    api.post(`/clauses/${clauseId}/action`, { action, reason }),
};

export const suggestionApi = {
  create: (docId: string, data: Record<string, unknown>) =>
    api.post(`/documents/${docId}/suggestions`, data),
  createBatch: (docId: string, data: Record<string, unknown>) =>
    api.post(`/documents/${docId}/suggestions/batch`, data),
  list: (docId: string) => api.get(`/documents/${docId}/suggestions`),
  review: (id: string, status: string) => api.post(`/suggestions/${id}/review`, { status }),
};

export default api;
