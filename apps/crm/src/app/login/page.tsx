'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await auth.login(email, password);
      localStorage.setItem('token', access_token);
      router.push('/leads');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <img src="/logoskaicrmm.png" alt="" width={48} height={48} style={{ borderRadius: 10, objectFit: 'contain' }} />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>SKAI CRM</h1>
        </div>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: 14 }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
            }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: 14 }}>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
            }}
          />
        </label>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: '1rem' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontWeight: 600,
          }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
