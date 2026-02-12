const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const adminAuth = {
  login: (email: string, password: string) =>
    api<{ access_token: string; user: { id: string; email: string; name: string | null } }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

export const adminTenants = {
  list: () => api<AdminTenant[]>('/admin/tenants'),
  one: (id: string) => api<AdminTenantDetail>(`/admin/tenants/${id}`),
  create: (data: { name: string; loginEmail?: string; loginPassword?: string }) =>
    api<AdminTenant>('/admin/tenants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; status?: string }) =>
    api<AdminTenant>(`/admin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getSettings: (id: string) => api<TenantSettings>(`/admin/tenants/${id}/settings`),
  updateSettings: (id: string, data: Record<string, unknown>) =>
    api<TenantSettings>(`/admin/tenants/${id}/settings`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const adminFollowUps = {
  list: (tenantId: string) => api<FollowUpTemplate[]>(`/admin/tenants/${tenantId}/follow-ups`),
  create: (tenantId: string, data: { name: string; messageText: string; delayLabel: string; delayMinutes: number }) =>
    api<FollowUpTemplate>(`/admin/tenants/${tenantId}/follow-ups`, { method: 'POST', body: JSON.stringify(data) }),
  update: (tenantId: string, id: string, data: Partial<FollowUpTemplate>) =>
    api<FollowUpTemplate>(`/admin/tenants/${tenantId}/follow-ups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (tenantId: string, id: string) =>
    api<void>(`/admin/tenants/${tenantId}/follow-ups/${id}`, { method: 'DELETE' }),
};

export type AdminLead = {
  id: string;
  phone: string;
  name: string | null;
  dealAmount: number | string | null;
  updatedAt: string;
  stage: { id: string; name: string; type: string };
  topic: { id: string; name: string } | null;
};

export const adminLeads = {
  listSuccess: (tenantId: string) => api<AdminLead[]>(`/admin/tenants/${tenantId}/leads`),
  updateDealAmount: (tenantId: string, leadId: string, dealAmount: number | null) =>
    api<AdminLead>(`/admin/tenants/${tenantId}/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ dealAmount }),
    }),
};

export const adminAnalytics = {
  get: (tenantId: string, period: 'day' | 'week' | 'month' | 'year') =>
    api<{ totalRevenue: number; dealsCount: number; byPeriod: { label: string; revenue: number; count: number }[] }>(
      `/admin/tenants/${tenantId}/analytics?period=${period}`,
    ),
};

export type SystemSettings = {
  id: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  aiGlobalEnabled: boolean;
};

export type SystemLog = {
  id: string;
  tenantId: string | null;
  category: 'whatsapp' | 'ai' | 'system';
  message: string;
  createdAt: string;
  tenant?: { id: string; name: string };
  meta?: Record<string, unknown> | null;
};

export const adminSystem = {
  getSettings: () => api<SystemSettings>('/admin/system/settings'),
  updateSettings: (data: Partial<SystemSettings>) =>
    api<SystemSettings>('/admin/system/settings', { method: 'PATCH', body: JSON.stringify(data) }),
};

export const adminLogs = {
  list: (params?: { tenantId?: string; category?: 'all' | 'whatsapp' | 'ai' | 'system'; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.tenantId && params.tenantId !== 'all') q.set('tenantId', params.tenantId);
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    const query = q.toString();
    return api<SystemLog[]>(`/admin/logs${query ? `?${query}` : ''}`);
  },
};

export type AdminTenant = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  settings?: { aiEnabled: boolean } | null;
  _count?: { leads: number };
};

export type AdminTenantDetail = AdminTenant & { settings: TenantSettings | null };

export type TenantSettings = {
  id: string;
  tenantId: string;
  aiEnabled: boolean;
  openaiApiKey: string | null;
  openaiModel: string | null;
  chatflowInstanceId: string | null;
  chatflowApiToken: string | null;
  webhookUrl: string | null;
  webhookKey: string | null;
  systemPrompt: string | null;
  respondFirst: boolean;
  suggestCall: boolean;
  askQuestions: boolean;
  nightModeEnabled: boolean;
  nightModeStart: string | null;
  nightModeEnd: string | null;
  nightModeMessage: string | null;
  followUpEnabled: boolean;
  followUpDelay: string | null;
  followUpMessage: string | null;
};

export type FollowUpTemplate = {
  id: string;
  tenantId: string;
  name: string;
  messageText: string;
  delayLabel: string;
  delayMinutes: number;
  active: boolean;
};
