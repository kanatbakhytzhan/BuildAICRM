const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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

export type Tenant = { id: string; name: string };
export type User = { id: string; email: string; name: string | null; tenantId?: string; role: string; visibleTopicIds?: string[] };
export type Stage = { id: string; name: string; type: string; order: number; topicId?: string | null; topic?: { id: string; name: string } | null; _count?: { leads: number } };
export type Channel = { id: string; name: string; externalId: string };
export type Topic = { id: string; name: string; sortOrder: number; scenarioText?: string | null; mediaUrl?: string | null };
export type Lead = {
  id: string;
  stageId: string;
  channelId?: string | null;
  topicId?: string | null;
  phone: string;
  name: string | null;
  leadScore: string;
  aiActive: boolean;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  noResponseSince: string | null;
  aiNotes?: string | null;
  metadata?: Record<string, unknown> | null;
  dealAmount?: number | string | null;
  stage: { id: string; name: string; type: string };
  assignedUser?: { id: string; name: string | null; email: string } | null;
  channel?: Channel | null;
  topic?: Topic | null;
};
export type Message = { id: string; source: string; direction: string; body: string | null; mediaUrl?: string | null; createdAt: string };

export const auth = {
  login: (tenantId: string, email: string, password: string) =>
    api<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tenantId, email, password }),
    }),
};

export const tenants = {
  list: () => api<Tenant[]>('/tenants'),
};

export const users = {
  me: () => api<User>('/users/me'),
  list: () => api<User[]>('/users'),
  create: (data: { email: string; password: string; name?: string; role: string; visibleTopicIds?: string[] }) =>
    api<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateVisibleTopics: (userId: string, visibleTopicIds: string[]) =>
    api<User>(`/users/${userId}/visible-topics`, { method: 'PATCH', body: JSON.stringify({ visibleTopicIds }) }),
};

export const pipeline = {
  list: () => api<Stage[]>('/pipeline'),
  create: (data: { name: string; type: string; topicId?: string }) =>
    api<Stage>('/pipeline', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; type?: string; order?: number; topicId?: string | null }) =>
    api<Stage>(`/pipeline/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<void>(`/pipeline/${id}`, { method: 'DELETE' }),
};

export const channels = {
  list: () => api<Channel[]>('/channels'),
  create: (data: { name: string; externalId: string }) =>
    api<Channel>('/channels', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; externalId?: string }) =>
    api<Channel>(`/channels/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<void>(`/channels/${id}`, { method: 'DELETE' }),
};

export const topics = {
  list: () => api<Topic[]>('/topics'),
  create: (data: { name: string; sortOrder?: number; scenarioText?: string; mediaUrl?: string }) =>
    api<Topic>('/topics', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; sortOrder?: number; scenarioText?: string | null; mediaUrl?: string | null }) =>
    api<Topic>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<void>(`/topics/${id}`, { method: 'DELETE' }),
};

export const leads = {
  list: (params?: { stageId?: string; topicId?: string; onlyMine?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.stageId) q.set('stageId', params.stageId);
    if (params?.topicId) q.set('topicId', params.topicId);
    if (params?.onlyMine) q.set('onlyMine', 'true');
    const query = q.toString();
    return api<Lead[]>(`/leads${query ? `?${query}` : ''}`);
  },
  one: (id: string) => api<Lead & { metadata?: Record<string, unknown> }>(`/leads/${id}`),
  create: (data: { stageId: string; phone: string; name?: string }) =>
    api<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ stageId: string; assignedUserId: string | null; leadScore: string; aiActive: boolean; name: string; dealAmount: number | null }>) =>
    api<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  analytics: (period: 'day' | 'week' | 'month' | 'year') =>
    api<{ totalRevenue: number; dealsCount: number; byPeriod: { label: string; revenue: number; count: number }[] }>(`/leads/analytics?period=${period}`),
  remove: (id: string) => api<void>(`/leads/${id}`, { method: 'DELETE' }),
};

export const messages = {
  list: (leadId: string) => api<Message[]>(`/leads/${leadId}/messages`),
  create: (leadId: string, body: string, mediaUrl?: string) =>
    api<Message>(`/leads/${leadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, ...(mediaUrl && { mediaUrl }) }),
    }),
  uploadMedia: async (leadId: string, file: File): Promise<{ mediaUrl: string }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/leads/${leadId}/messages/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Upload failed');
    }
    return res.json();
  },
};

export const ai = {
  takeOver: (leadId: string) =>
    api<Lead>(`/ai/leads/${leadId}/handoff/take`, { method: 'POST' }),
  release: (leadId: string) =>
    api<Lead>(`/ai/leads/${leadId}/handoff/release`, { method: 'POST' }),
};
