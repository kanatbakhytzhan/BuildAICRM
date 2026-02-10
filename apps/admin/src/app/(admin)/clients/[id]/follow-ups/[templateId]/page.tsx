'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminTenants, adminFollowUps, type FollowUpTemplate } from '@/lib/api';

const DELAY_OPTIONS = [
  { label: '+5 мин', minutes: 5 },
  { label: '+15 мин', minutes: 15 },
  { label: '+1 час', minutes: 60 },
  { label: '+24 часа', minutes: 1440 },
  { label: '+7 дней', minutes: 10080 },
];

export default function EditFollowUpPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const templateId = params.templateId as string;
  const router = useRouter();

  const [tenant, setTenant] = useState<{ name: string } | null>(null);
  const [template, setTemplate] = useState<FollowUpTemplate | null>(null);
  const [name, setName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [delayIndex, setDelayIndex] = useState(0);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([adminTenants.one(tenantId), adminFollowUps.list(tenantId)])
      .then(([t, list]) => {
        setTenant(t);
        const tpl = list.find((x) => x.id === templateId) || null;
        if (tpl) {
          setTemplate(tpl);
          setName(tpl.name);
          setMessageText(tpl.messageText);
          const idx = DELAY_OPTIONS.findIndex((o) => o.minutes === tpl.delayMinutes);
          setDelayIndex(idx >= 0 ? idx : 0);
          setActive(tpl.active);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId, templateId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    const opt = DELAY_OPTIONS[delayIndex];
    setSaving(true);
    try {
      const updated = await adminFollowUps.update(tenantId, template.id, {
        name,
        messageText,
        delayLabel: opt.label,
        delayMinutes: opt.minutes,
        active,
      });
      setTemplate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (!window.confirm('Удалить этот шаблон Follow-up?')) return;
    setDeleting(true);
    try {
      await adminFollowUps.remove(tenantId, template.id);
      router.push('/follow-ups');
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !tenant || !template) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ marginBottom: '1rem', fontSize: 14, color: 'var(--text-muted)' }}>
        <Link href="/clients" style={{ color: 'var(--accent)' }}>Клиенты</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        <Link href={`/clients/${tenantId}`} style={{ color: 'var(--accent)' }}>{tenant.name}</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        Редактировать Follow-up
      </div>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem' }}>Редактирование шаблона Follow-up</h1>
      <form onSubmit={handleSave} style={{ maxWidth: 560 }}>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Название</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Первое касание"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Текст сообщения</span>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            required
            rows={4}
            placeholder="Здравствуйте! Спасибо за интерес..."
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Тайминг</span>
          <select
            value={delayIndex}
            onChange={(e) => setDelayIndex(Number(e.target.value))}
            style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 8 }}
          >
            {DELAY_OPTIONS.map((o, i) => (
              <option key={i} value={i}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Активен
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--danger)',
              borderRadius: 8,
              color: 'var(--danger)',
              background: 'white',
            }}
          >
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
          <Link
            href="/follow-ups"
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              textDecoration: 'none',
            }}
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}

