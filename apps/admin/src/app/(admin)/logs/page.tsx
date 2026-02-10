'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminLogs, adminTenants, type AdminTenant, type SystemLog } from '@/lib/api';

type CategoryFilter = 'all' | 'whatsapp' | 'ai' | 'system';

export default function LogsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  useEffect(() => {
    adminTenants
      .list()
      .then(setTenants)
      .catch(console.error);
  }, []);

  const fetchLogs = () => {
    setLoading(true);
    adminLogs
      .list({
        tenantId: clientFilter !== 'all' ? clientFilter : undefined,
        category,
        search: search || undefined,
        limit: 200,
      })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFilter, category]);

  const categoryLabel = (c: CategoryFilter | SystemLog['category']) =>
    c === 'whatsapp' ? 'WhatsApp' : c === 'ai' ? 'AI' : 'Система';

  const clientOptions = useMemo(
    () => [
      { id: 'all', name: 'Все клиенты' },
      ...tenants.map((t) => ({ id: t.id, name: t.name })),
    ],
    [tenants],
  );

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Логи системы</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="search"
            placeholder="Поиск по логам..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8, width: 260 }}
          />
          <button
            type="button"
            onClick={fetchLogs}
            style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8 }}
          >
            Обновить
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 8 }}
        >
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'whatsapp', 'ai', 'system'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                padding: '0.4rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: category === c ? 'var(--accent-light)' : 'white',
                color: category === c ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {c === 'all' ? 'Все' : categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--sidebar-bg)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ДАТА/ВРЕМЯ</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>КЛИЕНТ</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ТИП</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>СООБЩЕНИЕ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setSelectedLog(log)}
              >
                <td style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}>
                  {new Date(log.createdAt).toLocaleString('ru-RU')}
                </td>
                <td style={{ padding: '0.75rem 1.25rem' }}>{log.tenant?.name || 'System'}</td>
                <td style={{ padding: '0.75rem 1.25rem' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 12,
                      background: 'var(--sidebar-bg)',
                    }}
                  >
                    {categoryLabel(log.category)}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}>
                  {log.message}
                  {log.category === 'ai' && log.meta && (log.meta as any).leadId && (
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Лид: {(log.meta as any).leadId}
                      {(log.meta as any).leadScore && ` · Score: ${(log.meta as any).leadScore}`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Логи отсутствуют
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text-muted)' }}>
          {loading ? 'Загрузка…' : `Показано ${logs.length} записей. Клик по строке — открыть детали и meta.`}
        </div>
      </div>

      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: 'var(--page-bg)',
              borderRadius: 12,
              padding: '1.5rem',
              maxWidth: 560,
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Детали лога</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6, background: 'white', cursor: 'pointer' }}
              >
                Закрыть
              </button>
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: 'var(--text-muted)' }}>
              {new Date(selectedLog.createdAt).toLocaleString('ru-RU')} · {selectedLog.tenant?.name || 'System'} · {categoryLabel(selectedLog.category)}
            </p>
            <p style={{ margin: '0 0 0.75rem', fontSize: 14, fontWeight: 500 }}>{selectedLog.message}</p>
            {selectedLog.meta != null && Object.keys(selectedLog.meta).length > 0 ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Meta (тело/данные):</div>
                <pre
                  style={{
                    margin: 0,
                    padding: '0.75rem',
                    background: 'var(--sidebar-bg)',
                    borderRadius: 8,
                    fontSize: 12,
                    overflow: 'auto',
                    maxHeight: 320,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(selectedLog.meta, null, 2)}
                </pre>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Meta отсутствует</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
