'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Дашборд', icon: '▣' },
  { href: '/clients', label: 'Клиенты', icon: '👥' },
  { href: '/follow-ups', label: 'Follow-ups', icon: '💬' },
  { href: '/logs', label: 'Логи системы', icon: '📄' },
  { href: '/settings', label: 'Настройки', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/login');
    router.refresh();
  };

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/buildCRM.png" alt="" width={36} height={36} style={{ borderRadius: 8, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)' }}>BuildCRM</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Global Admin</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '0.75rem 0' }}>
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.6rem 1rem',
                margin: '0 0.5rem',
                borderRadius: 8,
                color: isActive ? 'var(--accent)' : 'var(--text)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              <span style={{ opacity: 0.9 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1rem' }}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '0.5rem 0.75rem',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-muted)',
          }}
        >
          <span>→</span> Выйти
        </button>
      </div>
    </aside>
  );
}
