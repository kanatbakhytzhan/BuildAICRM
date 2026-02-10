'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminTenants } from '@/lib/api';
import type { TenantSettings } from '@/lib/api';

export default function ClientAIPage() {
  const params = useParams();
  const id = params.id as string;
  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [form, setForm] = useState({
    openaiApiKey: '',
    systemPrompt: '',
    respondFirst: true,
    suggestCall: true,
    askQuestions: true,
    nightModeEnabled: false,
    nightModeStart: '22:00',
    nightModeEnd: '08:00',
    nightModeMessage: '',
    followUpEnabled: true,
    followUpDelay: '15',
    followUpMessage: '',
    aiEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([adminTenants.one(id), adminTenants.getSettings(id)])
      .then(([t, s]) => {
        setTenant(t);
        setSettings(s);
        setForm({
          openaiApiKey: s.openaiApiKey && s.openaiApiKey !== '••••••••' ? s.openaiApiKey : '',
          systemPrompt: s.systemPrompt || '',
          respondFirst: s.respondFirst,
          suggestCall: s.suggestCall,
          askQuestions: s.askQuestions,
          nightModeEnabled: s.nightModeEnabled,
          nightModeStart: s.nightModeStart || '22:00',
          nightModeEnd: s.nightModeEnd || '08:00',
          nightModeMessage: s.nightModeMessage || '',
          followUpEnabled: s.followUpEnabled,
          followUpDelay: s.followUpDelay || '15',
          followUpMessage: s.followUpMessage || '',
          aiEnabled: s.aiEnabled,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminTenants.updateSettings(id, form);
      const s = await adminTenants.getSettings(id);
      setSettings(s);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !tenant) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ marginBottom: '1rem', fontSize: 14, color: 'var(--text-muted)' }}>
        <Link href="/clients" style={{ color: 'var(--accent)' }}>Клиенты</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        <Link href={`/clients/${id}`} style={{ color: 'var(--accent)' }}>{tenant.name}</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        AI-настройки
      </div>
      <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>AI-настройки клиента</h1>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)' }}>Управление поведением и параметрами AI-ассистента для WhatsApp</p>

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button type="button" style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 8, background: 'white' }}>Сбросить</button>
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>
            Сохранить изменения
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>OpenAI API ключ (для GPT-ответов)</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: 14, color: 'var(--text-muted)' }}>Без ключа AI отвечает шаблонными фразами. Ключ берётся в <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>platform.openai.com/api-keys</a>. Хранится только у этого клиента.</p>
          <input
            type="password"
            value={form.openaiApiKey}
            onChange={(e) => setForm((f) => ({ ...f, openaiApiKey: e.target.value }))}
            placeholder="sk-... (оставьте пустым, чтобы не менять)"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          {settings?.openaiApiKey === '••••••••' && !form.openaiApiKey && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Ключ уже задан. Введите новый, чтобы заменить.</div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Системный промпт AI</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: 14, color: 'var(--text-muted)' }}>Инструкция для AI — определяет личность и тон общения</p>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
            rows={6}
            placeholder="Ты — полезный ассистент компании..."
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Поведение AI</h3>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span>Отвечать первым (при новом лиде)</span>
            <input type="checkbox" checked={form.respondFirst} onChange={(e) => setForm((f) => ({ ...f, respondFirst: e.target.checked }))} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span>Предлагать звонок (если клиент задал более 3 вопросов)</span>
            <input type="checkbox" checked={form.suggestCall} onChange={(e) => setForm((f) => ({ ...f, suggestCall: e.target.checked }))} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Задавать вопросы (заканчивать сообщение вопросом)</span>
            <input type="checkbox" checked={form.askQuestions} onChange={(e) => setForm((f) => ({ ...f, askQuestions: e.target.checked }))} />
          </label>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Работа ночью</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={form.nightModeEnabled} onChange={(e) => setForm((f) => ({ ...f, nightModeEnabled: e.target.checked }))} />
            Ночной режим активен
          </label>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
            <label><span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Начало</span><input type="time" value={form.nightModeStart} onChange={(e) => setForm((f) => ({ ...f, nightModeStart: e.target.value }))} style={{ marginLeft: 8, padding: 4 }} /></label>
            <label><span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Конец</span><input type="time" value={form.nightModeEnd} onChange={(e) => setForm((f) => ({ ...f, nightModeEnd: e.target.value }))} style={{ marginLeft: 8, padding: 4 }} /></label>
          </div>
          <textarea
            value={form.nightModeMessage}
            onChange={(e) => setForm((f) => ({ ...f, nightModeMessage: e.target.value }))}
            rows={2}
            placeholder="Мы сейчас не работаем..."
            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Follow-up логика</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={form.followUpEnabled} onChange={(e) => setForm((f) => ({ ...f, followUpEnabled: e.target.checked }))} />
            Включить Follow-up (напоминать, если клиент молчит)
          </label>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Задержка перед отправкой</span>
            <select value={form.followUpDelay} onChange={(e) => setForm((f) => ({ ...f, followUpDelay: e.target.value }))} style={{ marginLeft: 8, padding: 4 }}>
              <option value="15">15 мин</option>
              <option value="30">30 мин</option>
              <option value="60">1 час</option>
              <option value="1440">24 часа</option>
            </select>
          </label>
          <textarea
            value={form.followUpMessage}
            onChange={(e) => setForm((f) => ({ ...f, followUpMessage: e.target.value }))}
            rows={2}
            placeholder="Вам удалось ознакомиться с нашим предложением?"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </div>

        <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>
    </div>
  );
}
