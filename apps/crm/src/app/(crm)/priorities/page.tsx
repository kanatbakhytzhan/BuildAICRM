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

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem 1rem',
    marginBottom: '0.75rem',
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <div className="page-content" style={{ background: 'var(--bg)' }}>
      <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Приоритеты
      </h1>

      <section className="priority-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="priority-section-title" style={{ margin: '0 0 0.75rem', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Просит звонок
          {wantsCall.length > 0 && (
            <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {wantsCall.length} NEW
            </span>
          )}
        </h2>
        {wantsCall.length === 0 ? (
          <EmptyState icon="📞" title="Нет заявок" sub="Новые заявки появятся здесь" />
        ) : (
          wantsCall.map((lead) => (
            <div key={lead.id} className="priority-card" style={{ ...cardStyle, borderLeft: '4px solid var(--danger)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1.0625rem' }}>{lead.name || lead.phone}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {lead.stage.name}
                  </span>
                  <span>Ждёт: {waitingMins(lead.lastMessageAt)}м</span>
                </div>
              </div>
              <a
                href={`tel:${lead.phone}`}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--success)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
                title="Позвонить"
              >
                <span style={{ fontSize: 22 }}>📞</span>
              </a>
            </div>
          ))
        )}
      </section>

      <section className="priority-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="priority-section-title" style={{ margin: '0 0 0.75rem', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Горячие лиды
        </h2>
        {hotLeads.length === 0 ? (
          <EmptyState icon="🔥" title="Нет горячих лидов" sub="Лиды с высокой оценкой появятся здесь" />
        ) : (
          hotLeads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="priority-card" style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '1.0625rem' }}>{lead.name || lead.phone}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: 'var(--success-bg)', color: 'var(--success)' }}>
                      Горячий
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Активность: {timeAgo(lead.lastMessageAt)}</span>
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>›</span>
              </div>
            </Link>
          ))
        )}
      </section>

      <section className="priority-section">
        <h2 className="priority-section-title" style={{ margin: '0 0 0.75rem', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Долго без ответа
        </h2>
        {longNoResponse.length === 0 ? (
          <EmptyState icon="✅" title="Всё под контролем" sub="Нет заявок без ответа больше 24 часов" />
        ) : (
          longNoResponse.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="priority-card" style={cardStyle}>
                <div style={{ fontWeight: 600, fontSize: '1.0625rem' }}>{lead.name || lead.phone}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Без ответа с {lead.noResponseSince ? new Date(lead.noResponseSince).toLocaleDateString('ru-RU') : '—'}
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
