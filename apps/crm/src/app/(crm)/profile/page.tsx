'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { users, topics, type User } from '@/lib/api';

function roleLabel(r: string) {
  if (r === 'owner') return 'Владелец';
  if (r === 'rop') return 'РОП';
  return 'Менеджер';
}

function initials(name: string | null, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [topicsList, setTopicsList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    users.me().then((u) => setUser(u)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role === 'manager') topics.list().then(setTopicsList).catch(() => {});
  }, [user?.role]);

  if (loading) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>Загрузка...</div>
    );
  }

  if (!user) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Не удалось загрузить профиль</p>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError('Новый пароль не менее 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    setPasswordSaving(true);
    try {
      await users.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Ошибка при смене пароля');
    } finally {
      setPasswordSaving(false);
    }
  };

  const visibleTopicsLabel =
    user.role === 'manager'
      ? (user.visibleTopicIds?.length ?? 0) > 0
        ? (user.visibleTopicIds ?? [])
            .map((id) => topicsList.find((t) => t.id === id)?.name)
            .filter(Boolean)
            .join(', ') || '—'
        : 'Все темы'
      : null;

  return (
    <div className="page-content" style={{ background: 'var(--bg)' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Профиль</h1>
      <div
        style={{
          maxWidth: 480,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.5rem' }}>
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            {initials(user.name, user.email)}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{user.name || user.email}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user.email}</div>
            <span
              style={{
                display: 'inline-block',
                marginTop: 6,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                background: 'var(--accent-light)',
                color: 'var(--accent)',
              }}
            >
              {roleLabel(user.role)}
            </span>
          </div>
        </div>
        <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
          <div>
            <dt style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Имя</dt>
            <dd style={{ margin: '0.25rem 0 0', fontSize: 15 }}>{user.name || '—'}</dd>
          </div>
          <div>
            <dt style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Email</dt>
            <dd style={{ margin: '0.25rem 0 0', fontSize: 15 }}>{user.email}</dd>
          </div>
          <div>
            <dt style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Роль</dt>
            <dd style={{ margin: '0.25rem 0 0', fontSize: 15 }}>{roleLabel(user.role)}</dd>
          </div>
          {user.role === 'manager' && visibleTopicsLabel !== null && (
            <div>
              <dt style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Доступ к темам</dt>
              <dd style={{ margin: '0.25rem 0 0', fontSize: 15 }}>{visibleTopicsLabel}</dd>
            </div>
          )}
        </dl>
        <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Сменить пароль</h3>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Текущий пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                fontSize: 14,
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Минимум 6 символов</span>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Повторите новый пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                fontSize: 14,
              }}
            />
          </div>
          {passwordError && (
            <div style={{ color: 'var(--danger)', fontSize: 13 }}>{passwordError}</div>
          )}
          {passwordSuccess && (
            <div style={{ color: 'var(--accent)', fontSize: 13 }}>Пароль успешно изменён</div>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              cursor: passwordSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {passwordSaving ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
        <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('token');
            router.replace('/login');
            router.refresh();
          }}
          style={{
            width: '100%',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
