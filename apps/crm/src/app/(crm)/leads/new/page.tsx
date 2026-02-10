'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { pipeline, leads } from '@/lib/api';

export default function NewLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [stageId, setStageId] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const stageIdFromUrl = searchParams.get('stageId') || '';

  useEffect(() => {
    pipeline.list().then((s) => {
      setStages(s);
      if (s.length) {
        const preferred = stageIdFromUrl && s.some((st) => st.id === stageIdFromUrl) ? stageIdFromUrl : s[0].id;
        setStageId((prev) => prev || preferred);
      }
    }).catch(console.error);
  }, [stageIdFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageId || !phone.trim()) return;
    setLoading(true);
    try {
      const lead = await leads.create({ stageId, phone: phone.trim(), name: name.trim() || undefined });
      router.push(`/leads/${lead.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content" style={{ background: 'var(--bg)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/leads" style={{ fontSize: 14, color: 'var(--text-muted)' }}>← Заявки</Link>
      </div>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem' }}>Создать заявку</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Стадия</span>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Телефон</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+7 999 123-45-67"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Имя</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Необязательно"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
          <Link href="/leads" style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', textDecoration: 'none' }}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
