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
        width: 260,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logoskaicrmm.png" alt="" width={40} height={40} style={{ borderRadius: 10, objectFit: 'contain', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.02em' }}>SKAI CRM</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: 500 }}>Панель администратора</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0.75rem 1rem',
                marginBottom: 4,
                borderRadius: 10,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                fontSize: 14,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: 18, opacity: isActive ? 1 : 0.85 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1rem 1rem 1.5rem' }}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '0.65rem 1rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
