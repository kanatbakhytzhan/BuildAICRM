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
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string | null } | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<{
    totalRevenue: number;
    dealsCount: number;
    avgValue: number;
    avgDealTimeDays: number;
    funnel: { stageId: string; stageName: string; count: number }[];
    byTopic: { topicId: string | null; topicName: string; count: number; revenue: number }[];
    byPeriod: { label: string; revenue: number; count: number }[];
    leadsByPeriod: { label: string; count: number }[];
  } | null>(null);
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
  const maxLeads = data?.leadsByPeriod?.length ? Math.max(...data.leadsByPeriod.map((p) => p.count), 1) : 1;
  const weeklyTarget = 500000; // плейсхолдер цели
  const targetPercent = weeklyTarget > 0 ? Math.min(100, Math.round((data?.totalRevenue ?? 0) / weeklyTarget * 100)) : 0;

  return (
    <div className="page-content" style={{ maxWidth: 896, margin: '0 auto' }}>
      {/* Controls Row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>Dashboard</h2>
        <div style={{ display: 'flex', background: 'var(--sidebar-bg)', padding: 4, borderRadius: 8, width: '100%', maxWidth: 320 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              style={{
                flex: 1,
                padding: '6px 16px',
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                borderRadius: 6,
                background: period === p.value ? 'var(--surface)' : 'transparent',
                color: period === p.value ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: period === p.value ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>Загрузка...</div>
      )}

      {!loading && data && (
        <>
          {/* Hero Metric Card */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 16,
              padding: '24px 24px 32px',
              marginBottom: 32,
              boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -80, right: -80, width: 256, height: 256, background: 'var(--accent-light)', borderRadius: '50%', opacity: 0.5, filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -40, width: 192, height: 192, background: 'var(--accent-light)', borderRadius: '50%', opacity: 0.3, filter: 'blur(32px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Заработано за период
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    {formatMoney(data.totalRevenue).replace(/\s₸$/, '')}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-muted)' }}>₸</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--sidebar-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 20 }}>✓</div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{data.dealsCount}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Закрыто сделок</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--sidebar-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--tag-demo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tag-demo-text)', fontSize: 18 }}>◷</div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{formatMoney(data.avgValue ?? 0)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Средний чек</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--sidebar-bg)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', fontSize: 18 }}>⏱</div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{data.avgDealTimeDays ?? 0} дн.</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Среднее время сделки</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Воронка */}
          {data.funnel && data.funnel.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>Воронка</h3>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                {data.funnel.map((s) => (
                  <div key={s.stageId} style={{ flexShrink: 0, minWidth: 120, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{s.count}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.stageName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Конверсия по темам */}
          {data.byTopic && data.byTopic.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>Конверсия по темам</h3>
              <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '12px 20px', background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <div>Тема</div>
                  <div style={{ textAlign: 'center' }}>Сделок</div>
                  <div style={{ textAlign: 'right' }}>Выручка</div>
                </div>
                {data.byTopic.map((t) => (
                  <div key={t.topicId ?? 'none'} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t.topicName}</div>
                    <div style={{ textAlign: 'center', color: 'var(--text)' }}>{t.count}</div>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{formatMoney(t.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* График новых лидов */}
          {data.leadsByPeriod && data.leadsByPeriod.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>Новые лиды по периоду</h3>
              <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                  {data.leadsByPeriod.map((p, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: '100%', maxWidth: 24, height: Math.max(8, (p.count / maxLeads) * 100), background: 'var(--accent)', borderRadius: 4 }} />
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>{p.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{p.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Performance Breakdown */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingLeft: 4, paddingRight: 4 }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>Performance Breakdown</h3>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 16, padding: '12px 24px', background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div>Дата</div>
                <div>Объём</div>
                <div style={{ textAlign: 'right' }}>Выручка</div>
              </div>
              {data.byPeriod.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                  Нет данных за выбранный период
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {data.byPeriod.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 2fr 1fr',
                        gap: 16,
                        padding: '16px 24px',
                        alignItems: 'center',
                        borderBottom: i < data.byPeriod.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.count} сделок</div>
                      </div>
                      <div>
                        <div style={{ height: 10, width: '100%', background: 'var(--sidebar-bg)', borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${maxRevenue ? (item.revenue / maxRevenue) * 100 : 0}%`,
                              minWidth: item.revenue > 0 ? 8 : 0,
                              background: 'var(--accent)',
                              borderRadius: 999,
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{formatMoney(item.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, var(--accent) 100%)',
                borderRadius: 12,
                padding: 24,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 8, fontSize: 18 }}>📈</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Прогноз</span>
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 700 }}>Впереди плана</h4>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>
                  При текущей скорости закрытия сделок вы можете выйти на цель к концу месяца.
                </p>
              </div>
            </div>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>Цель периода</h4>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Цель: {formatMoney(weeklyTarget)}</p>
              </div>
              <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={201}
                    strokeDashoffset={201 - (201 * Math.min(100, targetPercent)) / 100}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{targetPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {data.byPeriod.length === 0 && data.dealsCount === 0 && (
            <div
              style={{
                marginTop: 24,
                padding: 24,
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--surface)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                fontSize: 14,
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
