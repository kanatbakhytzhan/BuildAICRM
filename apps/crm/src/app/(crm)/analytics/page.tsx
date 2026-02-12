'use client';

import { useEffect, useState } from 'react';
import { leads, users } from '@/lib/api';

type Period = 'day' | 'week' | 'month' | 'year';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat('ru-KZ', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' ₸';
}

export default function AnalyticsPage() {
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<{ totalRevenue: number; dealsCount: number; byPeriod: { label: string; revenue: number; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    users.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'rop')) {
      setLoading(true);
      leads.analytics(period).then(setData).catch(console.error).finally(() => setLoading(false));
    }
  }, [currentUser, period]);

  if (currentUser && currentUser.role !== 'owner' && currentUser.role !== 'rop') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Доступ только для владельца и РОП.
      </div>
    );
  }

  const maxRevenue = data?.byPeriod?.length ? Math.max(...data.byPeriod.map((p) => p.revenue), 1) : 1;

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Аналитика</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius)',
              border: period === p.value ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: period === p.value ? 'var(--accent-light)' : 'var(--surface)',
              color: period === p.value ? 'var(--accent)' : 'var(--text)',
              fontWeight: period === p.value ? 600 : 400,
              fontSize: 14,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>
      )}

      {!loading && data && (
        <>
          <div
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, #0ea5e9 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              color: 'white',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Заработано за период</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {formatMoney(data.totalRevenue)}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
              {data.dealsCount} {data.dealsCount === 1 ? 'сделка' : data.dealsCount < 5 ? 'сделки' : 'сделок'}
            </div>
          </div>

          {data.byPeriod.length > 0 && (
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
                По периодам
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.byPeriod.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1.25rem',
                      borderBottom: i < data.byPeriod.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ flex: '0 0 80px', fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                    <div
                      style={{
                        flex: 1,
                        height: 24,
                        background: 'var(--accent-light)',
                        borderRadius: 4,
                        overflow: 'hidden',
                        minWidth: 60,
                      }}
                    >
                      <div
                        style={{
                          width: `${(item.revenue / maxRevenue) * 100}%`,
                          height: '100%',
                          background: 'var(--accent)',
                          borderRadius: 4,
                          minWidth: item.revenue > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                    <span style={{ flex: '0 0 90px', textAlign: 'right', fontWeight: 600, fontSize: 14 }}>
                      {formatMoney(item.revenue)}
                    </span>
                    <span style={{ flex: '0 0 50px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {item.count} шт.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.byPeriod.length === 0 && data.dealsCount === 0 && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
            >
              Нет закрытых сделок за выбранный период. Перенесите лиды в этап «Успех» и укажите сумму сделки.
            </div>
          )}
        </>
      )}
    </div>
  );
}
