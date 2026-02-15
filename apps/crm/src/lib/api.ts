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
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

/** Загрузка файла, возвращает { url: string } */
export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return api<{ url: string }>('/upload', {
    method: 'POST',
    body: formData,
  });
}

export type Tenant = { id: string; name: string };
export type User = { id: string; email: string; name: string | null; tenantId?: string; role: string; visibleTopicIds?: string[] };
export type Stage = { id: string; name: string; type: string; order: number; topicId?: string | null; topic?: { id: string; name: string } | null; _count?: { leads: number } };
export type Channel = { id: string; name: string; externalId: string };
export type Topic = { id: string; name: string; sortOrder: number; scenarioText?: string | null; mediaUrl?: string | null; welcomeVoiceUrl?: string | null; welcomeImageUrl?: string | null; welcomeImageUrls?: string[] | null; addressText?: string | null };
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
  login: (email: string, password: string) =>
    api<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

export const tenants = {
  list: () => api<Tenant[]>('/tenants'),
};

export const users = {
  me: () => api<User>('/users/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<void>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  list: () => api<User[]>('/users'),
  create: (data: { email: string; password: string; name?: string; role: string; visibleTopicIds?: string[] }) =>
    api<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateVisibleTopics: (userId: string, visibleTopicIds: string[]) =>
    api<User>(`/users/${userId}/visible-topics`, { method: 'PATCH', body: JSON.stringify({ visibleTopicIds }) }),
  remove: (userId: string) =>
    api<void>(`/users/${userId}`, { method: 'DELETE' }),
  resetPassword: (userId: string, newPassword: string) =>
    api<void>(`/users/${userId}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }),
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

export type QuickReplyTemplate = { id: string; label: string; messageText: string; sortOrder: number };
export const quickReplies = {
  list: () => api<QuickReplyTemplate[]>('/quick-replies'),
  create: (data: { label: string; messageText: string; sortOrder?: number }) =>
    api<QuickReplyTemplate>('/quick-replies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { label?: string; messageText?: string; sortOrder?: number }) =>
    api<QuickReplyTemplate>(`/quick-replies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<void>(`/quick-replies/${id}`, { method: 'DELETE' }),
};

export const topics = {
  list: () => api<Topic[]>('/topics'),
  create: (data: { name: string; sortOrder?: number; scenarioText?: string; mediaUrl?: string; welcomeVoiceUrl?: string; welcomeImageUrl?: string; welcomeImageUrls?: string[]; addressText?: string | null }) =>
    api<Topic>('/topics', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; sortOrder?: number; scenarioText?: string | null; mediaUrl?: string | null; welcomeVoiceUrl?: string | null; welcomeImageUrl?: string | null; welcomeImageUrls?: string[] | null; addressText?: string | null }) =>
    api<Topic>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<void>(`/topics/${id}`, { method: 'DELETE' }),
};

export const config = {
  get: () => api<{ revenueGoal: number | null }>('/config'),
  update: (data: { revenueGoal?: number | null }) =>
    api<{ revenueGoal: number | null }>('/config', { method: 'PATCH', body: JSON.stringify(data) }),
};

export const shifts = {
  getToday: () => api<{ date: string; userIds: string[] }>('/shifts/today'),
  setToday: (userIds: string[]) =>
    api<{ date: string; userIds: string[]; distributedCount?: number }>('/shifts/today', {
      method: 'PUT',
      body: JSON.stringify({ userIds }),
    }),
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
    api<{
      totalRevenue: number;
      dealsCount: number;
      avgValue: number;
      avgDealTimeDays: number;
      funnel: { stageId: string; stageName: string; count: number }[];
      byTopic: { topicId: string | null; topicName: string; count: number; revenue: number }[];
      byPeriod: { label: string; revenue: number; count: number }[];
      leadsByPeriod: { label: string; count: number }[];
    }>(`/leads/analytics?period=${period}`),
  remove: (id: string) => api<void>(`/leads/${id}`, { method: 'DELETE' }),
};

export const messages = {
  list: (leadId: string) => api<Message[]>(`/leads/${leadId}/messages`),
  create: (leadId: string, body: string, mediaUrl?: string) =>
    api<Message>(`/leads/${leadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(mediaUrl ? { body: body || '', mediaUrl } : { body }),
    }),
};

export const ai = {
  takeOver: (leadId: string) =>
    api<Lead>(`/ai/leads/${leadId}/handoff/take`, { method: 'POST' }),
  release: (leadId: string) =>
    api<Lead>(`/ai/leads/${leadId}/handoff/release`, { method: 'POST' }),
};
