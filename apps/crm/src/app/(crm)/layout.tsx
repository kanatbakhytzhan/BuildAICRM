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

  const navLink = (href: string, _label: string, active: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '0.5rem 0.25rem',
    borderRadius: 10,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    background: 'transparent',
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
            <img src="/buildCRM.png" alt="" width={36} height={36} style={{ borderRadius: 8, objectFit: 'contain', display: 'block' }} />
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
        <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)' }}>
          <img src="/buildCRM.png" alt="" width={40} height={40} style={{ borderRadius: 10, objectFit: 'contain', display: 'block', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)' }}>BuildCRM</span>
        </Link>
        <span className="crm-mobile-header-title" style={{ marginLeft: 'auto', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
          {pathname.startsWith('/leads') ? 'Заявки' : pathname === '/priorities' ? 'Приоритеты' : pathname === '/users' ? 'Пользователи' : pathname === '/analytics' ? 'Аналитика' : pathname === '/settings' ? 'Настройки' : ''}
        </span>
      </header>
      <main className="crm-main">
        {children}
      </main>
      <nav className="crm-bottom-nav" aria-label="Навигация">
        <Link href="/leads" style={navLink('/leads', 'Заявки', pathname.startsWith('/leads'))}>
          <span className="crm-nav-icon" style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
          </span>
          <span>Заявки</span>
        </Link>
        <Link href="/priorities" style={navLink('/priorities', 'Приоритеты', pathname === '/priorities')}>
          <span className="crm-nav-icon" style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <span>Приоритеты</span>
        </Link>
        <Link href="/users" style={navLink('/users', 'Пользователи', pathname === '/users')}>
          <span className="crm-nav-icon" style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </span>
          <span>Пользователь</span>
        </Link>
        {(currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
          <Link href="/analytics" style={navLink('/analytics', 'Аналитика', pathname === '/analytics')}>
            <span className="crm-nav-icon" style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </span>
            <span>Аналитика</span>
          </Link>
        )}
        {(currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
          <Link href="/settings" style={navLink('/settings', 'Настройки', pathname === '/settings')}>
            <span className="crm-nav-icon" style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </span>
            <span>Настройки</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
