'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminLogs, adminTenants, type SystemLog } from '@/lib/api';

export default function DashboardPage() {
  const [tenants, setTenants] = useState<{ id: string; name: string; status: string; _count?: { leads: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    Promise.all([
      adminTenants.list(),
      adminLogs.list({ limit: 10 }),
    ])
      .then(([ts, ls]) => {
        setTenants(ts);
        setLogs(ls);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active = tenants.filter((t) => t.status === 'active').length;
  const pause = tenants.filter((t) => t.status === 'pause').length;
  const totalLeads = tenants.reduce((s, t) => s + (t._count?.leads ?? 0), 0);

  return (
    <div style={{ padding: '1.75rem 2.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Дашборд</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Обзор состояния системы и ключевые метрики за сегодня</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'var(--page-bg)',
              fontSize: 13,
            }}
          >
            Обновить
          </button>
          <button
            type="button"
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 999,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Новый инцидент
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.35rem',
            background: 'var(--page-bg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            borderLeft: '4px solid var(--success)',
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Общее состояние</div>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            Работает
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Все сервисы активны</div>
        </div>
        <div
          style={{
            padding: '1.25rem 1.35rem',
            background: 'var(--page-bg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            borderLeft: '4px solid var(--success)',
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>WhatsApp Gateway</div>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            Подключен
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Uptime 99.9%</div>
        </div>
        <div
          style={{
            padding: '1.25rem 1.35rem',
            background: 'var(--page-bg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            borderLeft: '4px solid var(--accent)',
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Активные клиенты</div>
          <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>{loading ? '—' : active}</div>
          <div style={{ fontSize: 13, color: 'var(--success)' }}>+за месяц</div>
        </div>
        <div
          style={{
            padding: '1.25rem 1.35rem',
            background: 'var(--page-bg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            borderLeft: '4px solid var(--warning)',
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Ошибки системы</div>
          <div style={{ fontWeight: 700 }}>0 всего</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>2 Крит. / 0 Пред.</div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--page-bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Последние события</h2>
          <Link href="/logs" style={{ fontSize: 14 }}>Все логи →</Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--sidebar-bg)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ВРЕМЯ</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>КЛИЕНТ</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ТИП</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>СОБЫТИЕ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}>
                  {new Date(log.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}>
                  {log.tenant?.name || 'System'}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}>
                  {log.category === 'whatsapp' ? 'WhatsApp' : log.category === 'ai' ? 'AI' : 'System'}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}>
                  {log.message}
                  {log.category === 'ai' && log.meta && (log.meta as any).leadId && (
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Лид: {(log.meta as any).leadId}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '1rem 1.25rem', fontSize: 14, color: 'var(--text-muted)' }}>
                  Нет последних событий
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
