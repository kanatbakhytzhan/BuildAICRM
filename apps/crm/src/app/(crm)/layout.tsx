'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { users } from '@/lib/api';

export default function CrmLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string | null; email: string; role: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    users.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, [mounted, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.replace('/login');
    router.refresh();
  };

  const roleLabel = (r: string) => (r === 'owner' ? 'Владелец' : r === 'rop' ? 'РОП' : 'Менеджер');

  if (!mounted) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg)' }}>
        Загрузка...
      </div>
    );
  }

  const navLink = (href: string, label: string, icon: string, active: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius)',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    background: active ? 'var(--accent-light)' : 'transparent',
    fontWeight: active ? 600 : 400,
    textDecoration: 'none',
    fontSize: 11,
    minHeight: 'var(--touch-min)',
    minWidth: 'var(--touch-min)',
  });

  return (
    <div className="crm-root" style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg)' }}>
      <aside
        className="crm-sidebar"
        style={{
          width: '260px',
          flexShrink: 0,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)' }}>
            <span style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>B</span>
            <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>BuildCRM</span>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          <Link
            href="/leads"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.6rem 1rem',
              margin: '0 0.5rem',
              borderRadius: 'var(--radius)',
              color: pathname.startsWith('/leads') ? 'var(--accent)' : 'var(--text)',
              background: pathname.startsWith('/leads') ? 'var(--accent-light)' : 'transparent',
              fontWeight: pathname.startsWith('/leads') ? 600 : 400,
              textDecoration: 'none',
            }}
          >
            <span style={{ opacity: 0.85 }}>📋</span> Заявки
          </Link>
          <Link
            href="/priorities"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.6rem 1rem',
              margin: '0 0.5rem',
              borderRadius: 'var(--radius)',
              color: pathname === '/priorities' ? 'var(--accent)' : 'var(--text)',
              background: pathname === '/priorities' ? 'var(--accent-light)' : 'transparent',
              fontWeight: pathname === '/priorities' ? 600 : 400,
              textDecoration: 'none',
            }}
          >
            <span style={{ opacity: 0.85 }}>⚠</span> Приоритеты
          </Link>
          <Link
            href="/users"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.6rem 1rem',
              margin: '0 0.5rem',
              borderRadius: 'var(--radius)',
              color: pathname === '/users' ? 'var(--accent)' : 'var(--text)',
              background: pathname === '/users' ? 'var(--accent-light)' : 'transparent',
              fontWeight: pathname === '/users' ? 600 : 400,
              textDecoration: 'none',
            }}
          >
            <span style={{ opacity: 0.85 }}>👥</span> Пользователи
          </Link>
          {(currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
            <Link
              href="/analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.6rem 1rem',
                margin: '0 0.5rem',
                borderRadius: 'var(--radius)',
                color: pathname === '/analytics' ? 'var(--accent)' : 'var(--text)',
                background: pathname === '/analytics' ? 'var(--accent-light)' : 'transparent',
                fontWeight: pathname === '/analytics' ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              <span style={{ opacity: 0.85 }}>📊</span> Аналитика
            </Link>
          )}
          {(currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
            <Link
              href="/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.6rem 1rem',
                margin: '0 0.5rem',
                borderRadius: 'var(--radius)',
                color: pathname === '/settings' ? 'var(--accent)' : 'var(--text)',
                background: pathname === '/settings' ? 'var(--accent-light)' : 'transparent',
                fontWeight: pathname === '/settings' ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              <span style={{ opacity: 0.85 }}>⚙</span> Настройки
            </Link>
          )}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          {currentUser && (
            <div style={{ marginBottom: '0.75rem', fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>{currentUser.name || currentUser.email}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{roleLabel(currentUser.role)}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            Выйти
          </button>
        </div>
      </aside>
      <header className="crm-mobile-header">
        <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)' }}>
          <span style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>B</span>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>BuildCRM</span>
        </Link>
        <span style={{ marginLeft: 'auto', fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
          {pathname.startsWith('/leads') ? 'Заявки' : pathname === '/priorities' ? 'Приоритеты' : pathname === '/users' ? 'Пользователи' : pathname === '/analytics' ? 'Аналитика' : pathname === '/settings' ? 'Настройки' : ''}
        </span>
      </header>
      <main className="crm-main">
        {children}
      </main>
      <nav className="crm-bottom-nav" aria-label="Навигация">
        <Link href="/leads" style={navLink('/leads', 'Заявки', '📋', pathname.startsWith('/leads'))}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span>Заявки</span>
        </Link>
        <Link href="/priorities" style={navLink('/priorities', 'Приоритет', '!', pathname === '/priorities')}>
          <span style={{ fontSize: 20 }}>!</span>
          <span>Приоритет</span>
        </Link>
        <Link href="/users" style={navLink('/users', 'Пользователи', '👥', pathname === '/users')}>
          <span style={{ fontSize: 20 }}>👥</span>
          <span>Пользователи</span>
        </Link>
        {(currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
          <Link href="/analytics" style={navLink('/analytics', 'Аналитика', '📊', pathname === '/analytics')}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span>Аналитика</span>
          </Link>
        )}
        {(currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
          <Link href="/settings" style={navLink('/settings', 'Настройки', '⚙', pathname === '/settings')}>
            <span style={{ fontSize: 20 }}>⚙</span>
            <span>Настройки</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
