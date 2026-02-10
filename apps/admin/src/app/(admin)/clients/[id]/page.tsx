'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminLogs, adminTenants, type AdminTenantDetail, type SystemLog } from '@/lib/api';

type Tab = 'general' | 'whatsapp' | 'ai' | 'logs';

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null);
  const [tab, setTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [summaryLogs, setSummaryLogs] = useState<SystemLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  useEffect(() => {
    Promise.all([
      adminTenants.one(id),
      adminLogs.list({ tenantId: id, limit: 5 }),
    ])
      .then(([tenantData, tenantLogs]) => {
        setTenant(tenantData);
        setSummaryLogs(tenantLogs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab !== 'logs') return;
    setLogsLoading(true);
    adminLogs
      .list({ tenantId: id, limit: 100 })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLogsLoading(false));
  }, [id, tab]);

  if (loading || !tenant) {
    return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'Обзор' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'ai', label: 'AI-настройки' },
    { id: 'logs', label: 'Логи' },
  ];

  return (
    <div style={{ padding: '1.75rem 2.25rem' }}>
      <div style={{ marginBottom: '0.75rem', fontSize: 13, color: 'var(--text-muted)' }}>
        <Link href="/clients" style={{ color: 'var(--accent)' }}>Клиенты</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        {tenant.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Конфигурация клиента</h1>
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
            {tenant.name} · ID #{tenant.id}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              background: tenant.status === 'active' ? 'var(--success-bg)' : tenant.status === 'pause' ? 'var(--warning-bg)' : 'var(--danger-bg)',
              color: tenant.status === 'active' ? 'var(--success)' : tenant.status === 'pause' ? 'var(--warning)' : 'var(--danger)',
              fontWeight: 600,
            }}
          >
            {tenant.status === 'active' ? 'Клиент активен' : tenant.status === 'pause' ? 'Пауза' : 'Ошибка клиента'}
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              background: tenant.settings?.aiEnabled ? 'var(--accent-light)' : 'var(--danger-bg)',
              color: tenant.settings?.aiEnabled ? 'var(--accent)' : 'var(--danger)',
              fontWeight: 600,
            }}
          >
            Статус AI: {tenant.settings?.aiEnabled ? 'Running' : 'Отключён'}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Создан: {new Date(tenant.createdAt).toLocaleDateString('ru-RU')} · Часовой пояс: Europe/Moscow
      </div>

      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Верхний ряд карточек */} 
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div style={{ padding: '1.1rem 1.2rem', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--page-bg)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Компания</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{tenant.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Client ID: {tenant.id}</div>
            </div>
            <div style={{ padding: '1.1rem 1.2rem', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--page-bg)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Часовой пояс</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Europe/Moscow</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>UTC +03:00</div>
            </div>
            <div style={{ padding: '1.1rem 1.2rem', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--page-bg)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Статус клиента</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: tenant.status === 'active' ? 'var(--success)' : tenant.status === 'pause' ? 'var(--warning)' : 'var(--danger)' }} />
                <span style={{ fontWeight: 700 }}>{tenant.status === 'active' ? 'Активен' : tenant.status === 'pause' ? 'На паузе' : 'Ошибка'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Создан {new Date(tenant.createdAt).toLocaleDateString('ru-RU')}</div>
            </div>
            <div style={{ padding: '1.1rem 1.2rem', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--page-bg)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Статус AI</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{tenant.settings?.aiEnabled ? 'Running' : 'Отключён'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Обновлено:{' '}
                {summaryLogs[0]
                  ? new Date(summaryLogs[0].createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </div>
            </div>
          </div>

          {/* Нижний ряд: активность + логи */} 
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.4fr)',
              gap: '1rem',
            }}
          >
            <div style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--page-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>Активность AI ассистента</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>За последние 7 дней</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, idx) => (
                  <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        background: idx === 6 ? 'var(--accent)' : 'var(--accent-light)',
                        height: 30 + idx * 10,
                        opacity: idx === 6 ? 1 : 0.7,
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--page-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>Логи системы</h3>
                <Link href={`/clients/${id}?tab=logs`} style={{ fontSize: 12 }}>Все логи →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {summaryLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ color: 'var(--text)' }}>{log.message}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 11 }}>
                        {log.category === 'ai' ? 'AI' : log.category === 'whatsapp' ? 'WhatsApp' : 'System'}
                      </div>
                    </div>
                    <div style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {!summaryLogs.length && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Пока нет логов для этого клиента.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'whatsapp' && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Настройки провайдера</h3>
            <p style={{ margin: '0.5rem 0', fontSize: 14, color: 'var(--text-muted)' }}>Провайдер: ChatFlow</p>
            <p style={{ margin: '0.5rem 0', fontSize: 14 }}>ID Инстанса: {tenant.settings?.chatflowInstanceId || '—'}</p>
            <p style={{ margin: '0.5rem 0', fontSize: 14 }}>Webhook URL: {tenant.settings?.webhookUrl ? `${tenant.settings.webhookUrl.slice(0, 40)}...` : '—'}</p>
            <Link href={`/clients/${id}/whatsapp`} style={{ display: 'inline-block', marginTop: '0.75rem', color: 'var(--accent)' }}>Настроить интеграцию →</Link>
          </div>
          <div style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--success-bg)', borderLeft: '4px solid var(--success)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Подключено</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Интеграция настроена</div>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div style={{ maxWidth: 800 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Управление поведением и параметрами AI-ассистента для WhatsApp.</p>
          <Link
            href={`/clients/${id}/ai`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Открыть AI-настройки →
          </Link>
        </div>
      )}

      {tab === 'logs' && (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Логи клиента</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {logsLoading ? 'Загрузка…' : `Записей: ${logs.length}. Клик по строке — открыть детали и meta.`}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar-bg)' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1.25rem',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  ДАТА/ВРЕМЯ
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1.25rem',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  ТИП
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1.25rem',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  СООБЩЕНИЕ
                </th>
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
                  <td style={{ padding: '0.75rem 1.25rem', fontSize: 14 }}>
                    {log.category === 'whatsapp' ? 'WhatsApp' : log.category === 'ai' ? 'AI' : 'Система'}
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
              {!logsLoading && logs.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Логи для этого клиента отсутствуют
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
              {new Date(selectedLog.createdAt).toLocaleString('ru-RU')} · {selectedLog.tenant?.name || tenant?.name || '—'} · {selectedLog.category === 'whatsapp' ? 'WhatsApp' : selectedLog.category === 'ai' ? 'AI' : 'Система'}
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
