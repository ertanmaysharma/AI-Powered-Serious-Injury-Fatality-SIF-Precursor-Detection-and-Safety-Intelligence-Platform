const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getMe: () => request('/me'),

  // Reports
  getReports: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports${qs}`);
  },

  getReport: (reportId: string) => request(`/reports/${reportId}`),

  analyzeText: (data: any) =>
    request('/analyze-text', { method: 'POST', body: JSON.stringify(data) }),

  analyzeReport: (reportId: string) =>
    request(`/reports/${reportId}/analyze`, { method: 'POST' }),

  createReport: (data: any) =>
    request('/reports', { method: 'POST', body: JSON.stringify(data) }),

  batchUpload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/batch-upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  exportCsv: () => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/export-csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => r.blob());
  },

  downloadSampleCsv: () => fetch(`${API_BASE}/sample-csv`).then(r => r.blob()),

  // Analytics
  getDashboard: () => request('/analytics/dashboard'),
  getSifDistribution: () => request('/analytics/sif'),
  getSifTrend: () => request('/analytics/sif-trend'),
  getIogpDistribution: () => request('/analytics/iogp'),
  getHazardDistribution: () => request('/analytics/hazards'),
  getControlDistribution: () => request('/analytics/controls'),
  getLocationDistribution: () => request('/analytics/locations'),
  getActivityDistribution: () => request('/analytics/activities'),
  getAiHumanAgreement: () => request('/analytics/ai-human'),
  getInsights: () => request('/analytics/insights'),

  // Reviews
  getReviews: () => request('/reviews'),
  getPendingReviews: () => request('/pending-reviews'),
  createReview: (data: any) =>
    request('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // Knowledge
  getIogpRules: () => request('/iogp-rules'),
  getModelPerformance: () => request('/model/performance'),

  health: () => request('/health'),
};
