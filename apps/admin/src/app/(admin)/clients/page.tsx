'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminTenants, type AdminTenant } from '@/lib/api';

export default function ClientsPage() {
  const [list, setList] = useState<AdminTenant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    adminTenants.list().then(setList).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = list.filter((t) => t.status === 'active').length;
  const pauseCount = list.filter((t) => t.status === 'pause').length;
  const errorCount = list.filter((t) => t.status === 'error').length;

  const statusPill = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      active: { bg: 'var(--success-bg)', color: 'var(--success)' },
      pause: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
      error: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
    };
    const s = styles[status] || { bg: 'var(--sidebar-bg)', color: 'var(--text-muted)' };
    const labels: Record<string, string> = { active: 'Активен', pause: 'Пауза', error: 'Ошибка' };
    return (
      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, background: s.bg, color: s.color }}>
        {labels[status] || status}
      </span>
    );
  };

  const toggleAi = async (tenant: AdminTenant) => {
    const current = tenant.settings?.aiEnabled ?? true;
    setTogglingId(tenant.id);
    try {
      const updatedSettings = await adminTenants.updateSettings(tenant.id, { aiEnabled: !current });
      setList((prev) =>
        prev.map((t) =>
          t.id === tenant.id
            ? {
                ...t,
                settings: {
                  ...(t.settings || { aiEnabled: true }),
                  aiEnabled: updatedSettings.aiEnabled,
                },
              }
            : t,
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Список клиентов</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="search"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: 8,
              width: 220,
            }}
          />
          <Link
            href="/clients/new"
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            + Добавить клиента
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, padding: '1rem', background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'var(--success)', fontSize: '1.25rem' }}>✓</span>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Активные клиенты</div>
            <div style={{ fontWeight: 700 }}>{loading ? '—' : activeCount}</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '1rem', background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'var(--warning)', fontSize: '1.25rem' }}>‖</span>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>На паузе</div>
            <div style={{ fontWeight: 700 }}>{pauseCount}</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '1rem', background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'var(--danger)', fontSize: '1.25rem' }}>!</span>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Требуют внимания</div>
            <div style={{ fontWeight: 700 }}>{errorCount}</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--sidebar-bg)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Название клиента</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Статус</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>WhatsApp</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>AI Бот</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Последняя активность</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Действие</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1.25rem' }}>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: #{t.id.slice(-6)}</div>
                </td>
                <td style={{ padding: '0.75rem 1.25rem' }}>{statusPill(t.status)}</td>
                <td style={{ padding: '0.75rem 1.25rem' }}>{t.settings ? (t.settings.aiEnabled ? '✓' : '—') : '—'}</td>
                <td style={{ padding: '0.75rem 1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => toggleAi(t)}
                    disabled={togglingId === t.id}
                    style={{
                      padding: '2px 10px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: t.settings?.aiEnabled ? 'var(--accent-light)' : 'var(--sidebar-bg)',
                      color: t.settings?.aiEnabled ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: 12,
                    }}
                  >
                    {t.settings?.aiEnabled ? 'AI Вкл' : 'AI Выкл'}
                  </button>
                </td>
                <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontSize: 14 }}>{new Date(t.createdAt).toLocaleDateString('ru-RU')}</td>
                <td style={{ padding: '0.75rem 1.25rem' }}>
                  <Link href={`/clients/${t.id}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    Открыть →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {loading ? 'Загрузка...' : 'Нет клиентов'}
          </div>
        )}
      </div>
    </div>
  );
}
