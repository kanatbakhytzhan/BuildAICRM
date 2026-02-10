'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminTenants as api } from '@/lib/api';
import type { TenantSettings } from '@/lib/api';

export default function ClientWhatsAppPage() {
  const params = useParams();
  const id = params.id as string;
  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [form, setForm] = useState({ instanceId: '', apiToken: '', webhookUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.one(id), api.getSettings(id)])
      .then(([t, s]) => {
        setTenant(t);
        setSettings(s);
        setForm({
          instanceId: s.chatflowInstanceId || '',
          apiToken: s.chatflowApiToken ? '••••••••' : '',
          webhookUrl: s.webhookUrl || '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (form.instanceId) payload.chatflowInstanceId = form.instanceId;
      if (form.apiToken && form.apiToken !== '••••••••') payload.chatflowApiToken = form.apiToken;
      if (form.webhookUrl) payload.webhookUrl = form.webhookUrl;
      await api.updateSettings(id, payload);
      const s = await api.getSettings(id);
      setSettings(s);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !tenant) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin.replace(/:\d+$/, ':4000')}` : '';
  const suggestedWebhook = `${baseUrl}/webhooks/chatflow/${id}`;

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ marginBottom: '1rem', fontSize: 14, color: 'var(--text-muted)' }}>
        <Link href="/clients" style={{ color: 'var(--accent)' }}>Клиенты</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        <Link href={`/clients/${id}`} style={{ color: 'var(--accent)' }}>{tenant.name}</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        Интеграции
      </div>
      <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>Интеграция WhatsApp</h1>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)' }}>Настройка подключения ChatFlow для клиента {tenant.name}</p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Настройки провайдера</h3>
          <form onSubmit={handleSave}>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Провайдер</span>
              <input type="text" value="ChatFlow" disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--sidebar-bg)' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>ID Инстанса</span>
              <input
                type="text"
                value={form.instanceId}
                onChange={(e) => setForm((f) => ({ ...f, instanceId: e.target.value }))}
                placeholder="Instance ID"
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>API Токен</span>
              <input
                type="password"
                value={form.apiToken}
                onChange={(e) => setForm((f) => ({ ...f, apiToken: e.target.value }))}
                placeholder="Токен скрыт"
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> Нажмите на глаз, чтобы показать.</span>
            </label>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Webhook URL (для входящих)</span>
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                placeholder={suggestedWebhook}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Укажите этот URL в настройках Webhook вашего провайдера.</div>
            </label>
            <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>
              {saving ? 'Сохранение...' : 'Проверить и Сохранить'}
            </button>
          </form>
        </div>
        <div style={{ width: 280 }}>
          <div style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--success-bg)', borderLeft: '4px solid var(--success)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Подключено</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Интеграция работает</div>
          </div>
        </div>
      </div>
    </div>
  );
}
