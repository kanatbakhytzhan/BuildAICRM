'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { leads, pipeline, type Lead, type Stage } from '@/lib/api';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'Только что';
  if (min < 60) return `${min}м`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}ч`;
  return `${Math.floor(h / 24)}д`;
}

function waitingMins(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function isLongNoResponse(noResponseSince: string | null): boolean {
  if (!noResponseSince) return false;
  const hours = (Date.now() - new Date(noResponseSince).getTime()) / 3600000;
  return hours >= 24;
}

function noResponseDays(noResponseSince: string | null): number {
  if (!noResponseSince) return 0;
  return Math.floor((Date.now() - new Date(noResponseSince).getTime()) / 86400000);
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-sub">{sub}</div>
    </div>
  );
}

export default function PrioritiesPage() {
  const [list, setList] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([leads.list(), pipeline.list()])
      .then(([l, s]) => {
        setList(l);
        setStages(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const wantsCallStageId = (() => {
    const stage = stages.find((s) => s.type === 'wants_call');
    return stage ? stage.id : stages.length ? stages[0].id : '';
  })();

  const wantsCall = list.filter((l) => l.stageId === wantsCallStageId).slice(0, 10);
  const hotLeads = list.filter((l) => l.leadScore === 'hot').slice(0, 10);
  const longNoResponse = list.filter((l) => isLongNoResponse(l.noResponseSince));

  if (loading) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-muted)' }}>Загрузка...</span>
      </div>
    );
  }

  const priorityCardBase: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '1rem 1.25rem',
    marginBottom: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  };

  return (
    <div className="page-content" style={{ background: 'var(--bg)', paddingBottom: 'calc(1.25rem + var(--bottom-nav-h) + var(--safe-bottom))' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text)' }}>
        Приоритеты
      </h1>

      <section className="priority-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="priority-section-title" style={{ margin: '0 0 0.75rem', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
          Нужен звонок ({wantsCall.length})
        </h2>
        {wantsCall.length === 0 ? (
          <EmptyState icon="📞" title="Нет заявок" sub="Новые заявки появятся здесь" />
        ) : (
          wantsCall.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ ...priorityCardBase }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{lead.name || lead.phone}</div>
                    <div style={{ marginTop: 4, fontSize: 13 }}>
                      {lead.leadScore === 'hot' ? <span style={{ color: 'var(--tag-high-text)', fontWeight: 600 }}>«Горячий»</span> : <span style={{ color: 'var(--text-muted)' }}>• Тёплый</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      <span>📞</span>
                      <span>Перезвоните мне!</span>
                    </div>
                  </div>
                </div>
                <a
                  href={`tel:${lead.phone}`}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0, fontSize: 18 }}
                  title="Позвонить"
                >
                  ✓
                </a>
              </div>
            </Link>
          ))
        )}
      </section>

      <section className="priority-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="priority-section-title" style={{ margin: '0 0 0.75rem', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
          Горячие лиды
        </h2>
        {hotLeads.length === 0 ? (
          <EmptyState icon="🔥" title="Нет горячих лидов" sub="Лиды с высокой оценкой появятся здесь" />
        ) : (
          hotLeads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ ...priorityCardBase }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{lead.name || lead.phone}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: 'var(--tag-high-text)', fontWeight: 600 }}>«Горячий»</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      <span>💬</span>
                      <span>Жду ответа...</span>
                    </div>
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>◷</div>
              </div>
            </Link>
          ))
        )}
      </section>

      <section className="priority-section">
        <h2 className="priority-section-title" style={{ margin: '0 0 0.75rem', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
          Давние без ответа
        </h2>
        {longNoResponse.length === 0 ? (
          <EmptyState icon="✅" title="Всё под контролем" sub="Нет заявок без ответа больше 24 часов" />
        ) : (
          longNoResponse.map((lead) => {
            const days = noResponseDays(lead.noResponseSince);
            return (
              <Link key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ ...priorityCardBase }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{lead.name || lead.phone}</div>
                      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                        {days === 1 ? '1 день без ответа' : `${days} дней без ответа`}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>📞</div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
