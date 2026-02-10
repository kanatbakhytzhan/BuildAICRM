'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminTenants, adminFollowUps } from '@/lib/api';
import type { AdminTenant, FollowUpTemplate } from '@/lib/api';

export default function FollowUpsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [templates, setTemplates] = useState<FollowUpTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminTenants.list().then((list) => {
      setTenants(list);
      if (list.length && !selectedTenantId) setSelectedTenantId(list[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    adminFollowUps.list(selectedTenantId).then(setTemplates).catch(console.error).finally(() => setLoading(false));
  }, [selectedTenantId]);

  const filtered = templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.messageText.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ marginBottom: '1rem', fontSize: 14, color: 'var(--text-muted)' }}>
        Главная / Теннанты / Follow-ups
      </div>
      <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>Управление Follow-ups</h1>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)' }}>Настройка автоматических сообщений для WhatsApp менеджеров</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8 }}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Поиск по названию шаблона..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8, width: 280 }}
          />
        </div>
        <Link
          href={selectedTenantId ? `/clients/${selectedTenantId}/follow-ups/new` : '#'}
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
          + Создать шаблон
        </Link>
      </div>

      <div style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--sidebar-bg)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>НАЗВАНИЕ</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ТЕКСТ (PREVIEW)</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ТАЙМИНГ</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>СТАТУС</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ДЕЙСТВИЯ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '0.75rem 1.25rem', fontSize: 14, color: 'var(--text-muted)' }}>{t.messageText.slice(0, 50)}{t.messageText.length > 50 ? '…' : ''}</td>
                <td style={{ padding: '0.75rem 1.25rem' }}>
                  <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent)' }}>{t.delayLabel}</span>
                </td>
                <td style={{ padding: '0.75rem 1.25rem' }}>{t.active ? 'Активен' : 'Выкл'}</td>
                <td style={{ padding: '0.75rem 1.25rem' }}>
                  <Link href={`/clients/${selectedTenantId}/follow-ups/${t.id}`} style={{ marginRight: '1rem', color: 'var(--accent)' }}>Изменить</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Нет шаблонов. Создайте первый.</div>
        )}
      </div>
    </div>
  );
}
