'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminTenants, adminFollowUps } from '@/lib/api';

const DELAY_OPTIONS = [
  { label: '+5 мин', minutes: 5 },
  { label: '+15 мин', minutes: 15 },
  { label: '+1 час', minutes: 60 },
  { label: '+24 часа', minutes: 1440 },
  { label: '+7 дней', minutes: 10080 },
];

export default function NewFollowUpPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [name, setName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [delayIndex, setDelayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminTenants.one(id).then(setTenant).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const opt = DELAY_OPTIONS[delayIndex];
    setSaving(true);
    try {
      await adminFollowUps.create(id, { name, messageText, delayLabel: opt.label, delayMinutes: opt.minutes });
      router.push(`/follow-ups`);
      router.refresh();
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
        Новый Follow-up
      </div>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem' }}>Создать шаблон Follow-up</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Название</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Первое касание" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }} />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Текст сообщения</span>
          <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} required rows={4} placeholder="Здравствуйте! Спасибо за интерес..." style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }} />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Тайминг</span>
          <select value={delayIndex} onChange={(e) => setDelayIndex(Number(e.target.value))} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 8 }}>
            {DELAY_OPTIONS.map((o, i) => (
              <option key={i} value={i}>{o.label}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>{saving ? 'Создание...' : 'Создать'}</button>
          <Link href="/follow-ups" style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', textDecoration: 'none' }}>Отмена</Link>
        </div>
      </form>
    </div>
  );
}
