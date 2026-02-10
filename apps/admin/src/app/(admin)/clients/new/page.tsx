'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminTenants } from '@/lib/api';

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tenant = await adminTenants.create(name);
      router.push(`/clients/${tenant.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/clients" style={{ fontSize: 14, color: 'var(--text-muted)' }}>Клиенты</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: 14 }}>Добавить клиента</span>
      </div>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem' }}>Добавить клиента</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 480,
          padding: '1.5rem',
          background: 'var(--page-bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
      >
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: 14, color: 'var(--text-muted)' }}>Название</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ООО Компания"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </label>
        {error && <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: '1rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
          <Link href="/clients" style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', textDecoration: 'none' }}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
