'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { pipeline, leads, topics, type Stage, type Lead, type Topic } from '@/lib/api';

type ViewMode = 'kanban' | 'list';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 768px)');
    const upd = () => setIsMobile(m.matches);
    upd();
    m.addEventListener('change', upd);
    return () => m.removeEventListener('change', upd);
  }, []);
  return isMobile;
}

function scoreNum(lead: Lead): number {
  if (lead.leadScore === 'hot') return 90;
  if (lead.leadScore === 'warm') return 60;
  return 40;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'Только что';
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}ч`;
  return `${Math.floor(h / 24)}д`;
}

/** Формат как в референсе: "Сегодня, 10:45", "Вчера, 18:20", "2 мин назад", "15 мин назад", "3 дня" */
function timeAgoExtended(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const min = Math.floor((now.getTime() - d.getTime()) / 60000);
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  if (min < 1) return 'Только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (sameDay && h < 24) return `Сегодня, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (isYesterday) return `Вчера, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days === 1) return '1 день';
  if (days < 7) return `${days} дн`;
  return `${days} дн`;
}

/** Для колонки "Не ответили": подпись "24ч+ без ответа" или "N дн" по noResponseSince */
function noResponseLabel(noResponseSince: string | null): string | null {
  if (!noResponseSince) return null;
  const min = Math.floor((Date.now() - new Date(noResponseSince).getTime()) / 60000);
  const h = Math.floor(min / 60);
  const days = Math.floor(h / 24);
  if (days >= 1) return days === 1 ? '24ч+ без ответа' : `${days} дн`;
  if (h >= 1) return '24ч+ без ответа';
  return null;
}

export default function LeadsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [mobileTabIndex, setMobileTabIndex] = useState(0);

  const load = () => {
    setLoading(true);
    Promise.all([
      pipeline.list(),
      topics.list(),
      leads.list({ onlyMine, stageId: stageFilter || undefined, topicId: topicFilter || undefined }),
    ]).then(([s, top, l]) => {
      setStages(s);
      setTopicsList(top);
      setLeadsList(l);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [onlyMine, stageFilter, topicFilter]);

  const filtered = search.trim()
    ? leadsList.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
          l.phone.includes(search)
      )
    : leadsList;

  const leadsByStage = stages.map((stage) => {
    const stageLeads = filtered.filter((l) => l.stageId === stage.id);
    const sorted =
      stage.type === 'wants_call'
        ? [...stageLeads].sort((a, b) => {
            const atA = (a.metadata as Record<string, unknown> | null)?.suggestedCallAt;
            const atB = (b.metadata as Record<string, unknown> | null)?.suggestedCallAt;
            const timeA = atA ? new Date(String(atA)).getTime() : Infinity;
            const timeB = atB ? new Date(String(atB)).getTime() : Infinity;
            return timeA - timeB;
          })
        : stageLeads;
    return { ...stage, leads: sorted };
  });

  const moveLeadToStage = useCallback((leadId: string, targetStageId: string, col: { id: string; name: string; type: string }) => {
    const lead = leadsList.find((l) => l.id === leadId);
    if (!lead || lead.stageId === targetStageId) return;
    setMovingLeadId(leadId);
    leads
      .update(leadId, { stageId: targetStageId })
      .then(() => {
        setLeadsList((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, stageId: targetStageId, stage: { id: col.id, name: col.name, type: col.type } } : l
          )
        );
      })
      .catch(console.error)
      .finally(() => setMovingLeadId(null));
  }, [leadsList]);

  const scoreLabel = (s: string) => (s === 'hot' ? 'Горячий' : s === 'warm' ? 'Тёплый' : 'Холодный');
  const scoreTagText = (s: string) => (s === 'hot' ? 'High Priority' : s === 'warm' ? 'Demo' : 'Cold');
  const scoreTagClass = (s: string) => (s === 'hot' ? 'tag-high-priority' : s === 'warm' ? 'tag-demo' : 'tag-cold');
  const scoreBadgeBg = (s: string) => (s === 'hot' ? 'var(--tag-high-bg)' : s === 'warm' ? 'var(--tag-demo-bg)' : 'var(--tag-cold-bg)');
  const scoreBadgeColor = (s: string) => (s === 'hot' ? 'var(--tag-high-text)' : s === 'warm' ? 'var(--tag-demo-text)' : 'var(--tag-cold-text)');

  if (loading && stages.length === 0) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>Загрузка заявок...</div>
    );
  }

  const mobileTabLabels = ['Новые', 'В работе', 'Завершённые'] as const;
  const mobileTabTypes: Record<number, string[]> = {
    0: ['new'],
    1: ['in_progress', 'wants_call'],
    2: ['success'],
  };
  const mobileTabTypeList = mobileTabTypes[mobileTabIndex] ?? [];
  const mobileLeads = filtered.filter((l) => mobileTabTypeList.includes(l.stage.type));
  const mobileTabCounts = [0, 1, 2].map((idx) => {
    const types = mobileTabTypes[idx] ?? [];
    return filtered.filter((l) => types.includes(l.stage.type)).length;
  });

  if (isMobile) {
    return (
      <div className="page-content mobile-leads-page" style={{ background: 'var(--bg)', paddingLeft: 0, paddingRight: 0 }}>
        <div className="mobile-leads-tabs-wrap" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1rem', paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {mobileTabLabels.map((label, idx) => {
              const active = mobileTabIndex === idx;
              const count = mobileTabCounts[idx] ?? 0;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMobileTabIndex(idx)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    marginRight: 8,
                    border: 'none',
                    background: 'none',
                    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '1rem', paddingBottom: 'calc(1.25rem + var(--bottom-nav-h) + var(--safe-bottom))' }}>
          {mobileLeads.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: 14 }}>Нет заявок в этой стадии</div>
          ) : (
            mobileLeads.map((lead) => {
              const statusOk = !lead.noResponseSince && lead.lastMessageAt;
              const preview = lead.lastMessagePreview || (lead.stage.type === 'wants_call' ? 'Жду звонка!' : 'Когда можем обсудить?');
              const initials = (lead.name || lead.phone).slice(0, 2).toUpperCase();
              return (
                <Link key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 12 }}>
                  <div
                    className="mobile-lead-card"
                    style={{
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: '1rem 1.25rem',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      border: '1px solid var(--border)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.name || lead.phone}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 13 }}>
                            {lead.leadScore === 'hot' && <span style={{ color: 'var(--tag-high-text)', fontWeight: 600 }}>«Горячий»</span>}
                            {lead.leadScore === 'warm' && <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Тёплый</span>}
                            {lead.leadScore === 'cold' && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Холодный</span>}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: statusOk ? 'var(--success-bg)' : 'var(--warning-bg)',
                          color: statusOk ? 'var(--success)' : 'var(--warning)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                      >
                        {statusOk ? '✓' : '◷'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
                      <span style={{ opacity: 0.9 }}>{lead.stage.type === 'wants_call' ? '📞' : '💬'}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ background: 'var(--bg)', paddingLeft: 0, paddingRight: 0 }}>
      {/* Тулбар: на мобилке компактный стек */}
      <div className="leads-toolbar-mobile" style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1rem 1.25rem',
        marginLeft: 0,
        marginRight: 0,
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          maxWidth: 1200,
          margin: '0 auto',
          paddingLeft: '0',
          paddingRight: '0',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2 }}>Заявки</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>Воронка продаж WhatsApp</p>
          </div>
          <div className="leads-toolbar-row2" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: 540 }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0, maxWidth: '100%' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }} aria-hidden>🔍</span>
              <input
                type="search"
                placeholder="Поиск по имени, телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              />
            </div>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.6rem 0.9rem',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 700,
              }}
              title="Фильтры"
            >
              <span aria-hidden>⚙</span> Фильтры
            </button>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              title="Стадия"
              style={{
                padding: '0.6rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <option value="">Все стадии</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              title="Тема"
              style={{
                padding: '0.6rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <option value="">Все темы</option>
              {topicsList.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Мои
            </label>
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 2 }}>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'kanban' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'kanban' ? 'white' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Канбан
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Список
              </button>
            </div>
            <Link
              href="/leads/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.6rem 1rem',
                background: 'var(--accent)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(19,127,236,0.35)',
              }}
            >
              <span aria-hidden>+</span> Новая заявка
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 1rem 1rem', maxWidth: 1200, margin: '0 auto' }}>
      {viewMode === 'kanban' && (
        <div className="leads-kanban-scroll kanban-scroll" style={{ background: 'var(--bg)' }}>
          <div style={{ display: 'flex', gap: '1rem', minHeight: 400, alignItems: 'flex-start', minWidth: 'max-content' }}>
          {leadsByStage.map((col) => {
            const isUrgent = col.type === 'wants_call';
            const isAiColumn = col.type === 'in_progress';
            const isDropOver = dragOverStageId === col.id;
            return (
              <div
                key={col.id}
                className="kanban-column"
                style={{
                  minWidth: 280,
                  maxWidth: 320,
                  flexShrink: 0,
                  width: '100%',
                  background: isAiColumn ? 'linear-gradient(to bottom, rgba(19,127,236,0.08), transparent)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: isAiColumn ? '4px solid var(--accent)' : isUrgent ? '4px solid var(--danger)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '0.875rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  paddingLeft: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isAiColumn && <span style={{ fontSize: 20, color: 'var(--accent)' }} title="AI ведёт диалог">🤖</span>}
                    <h3 style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: 15,
                      color: isUrgent ? 'var(--danger)' : 'var(--text)',
                    }}>{col.name}</h3>
                    <span style={{
                      background: isUrgent ? 'var(--danger-bg)' : isAiColumn ? 'var(--accent-light)' : 'var(--sidebar-bg)',
                      color: isUrgent ? 'var(--danger)' : isAiColumn ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}>{col.leads.length}</span>
                  </div>
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4, cursor: 'pointer', fontSize: 18 }} aria-label="Ещё">⋮</button>
                </div>
                <div
                  className={`kanban-column-drop-zone ${isDropOver ? 'drag-over' : ''}`}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: isDropOver ? 8 : 0 }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStageId(col.id); }}
                  onDragLeave={() => setDragOverStageId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStageId(null);
                    try {
                      const raw = e.dataTransfer.getData('application/json');
                      if (!raw) return;
                      const { leadId } = JSON.parse(raw) as { leadId: string };
                      if (leadId && col.id) moveLeadToStage(leadId, col.id, { id: col.id, name: col.name, type: col.type });
                    } catch (_) {}
                  }}
                >
                  {col.leads.map((lead) => {
                    const isDragging = draggedLeadId === lead.id;
                    const isMoving = movingLeadId === lead.id;
                    const noResp = noResponseLabel(lead.noResponseSince);
                    const cardBorderLeft = isUrgent && lead.leadScore === 'hot' ? '4px solid var(--danger)' : isAiColumn ? '4px solid var(--accent)' : lead.leadScore === 'hot' ? '4px solid var(--danger)' : '4px solid transparent';
                    const isHotUrgent = isUrgent || lead.leadScore === 'hot';
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedLeadId(lead.id);
                          e.dataTransfer.setData('application/json', JSON.stringify({ leadId: lead.id }));
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', lead.name || lead.phone);
                        }}
                        onDragEnd={() => setDraggedLeadId(null)}
                        className={`kanban-card ${isDragging ? 'kanban-card-dragging' : ''}`}
                        style={{
                          position: 'relative',
                          padding: '1rem',
                          paddingLeft: cardBorderLeft !== '4px solid transparent' ? 14 : 12,
                          background: 'var(--surface)',
                          border: isHotUrgent ? '1px solid rgba(220,38,38,0.25)' : '1px solid transparent',
                          borderRadius: 'var(--radius-xl)',
                          boxShadow: 'var(--shadow-sm)',
                          borderLeft: cardBorderLeft,
                          cursor: isMoving ? 'wait' : 'grab',
                          opacity: isMoving ? 0.8 : noResp ? 0.92 : 1,
                        }}
                      >
                        <Link href={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', position: 'relative', zIndex: 1 }} onClick={(e) => isMoving && e.preventDefault()}>
                          {isUrgent && (lead.metadata as Record<string, unknown> | null)?.suggestedCallAt != null && (
                            <div style={{ marginBottom: 6, padding: '0.4rem 0.5rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span aria-hidden>📞</span>
                              {(lead.metadata as Record<string, unknown>).suggestedCallNote != null
                                ? String((lead.metadata as Record<string, unknown>).suggestedCallNote)
                                : new Date(String((lead.metadata as Record<string, unknown>).suggestedCallAt)).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="lead-card-name" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name || lead.phone}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Стадия: {lead.stage.name}</div>
                              {lead.channel && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Канал: {lead.channel.name}</div>
                              )}
                              {noResp ? (
                                <div style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span aria-hidden>🕐</span> {noResp}
                                </div>
                              ) : isUrgent && lead.leadScore === 'hot' ? (
                                <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span aria-hidden>⚠</span> Требует внимания
                                </div>
                              ) : (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgoExtended(lead.lastMessageAt)}</div>
                              )}
                            </div>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: lead.aiActive ? 'var(--accent-light)' : 'rgba(37,211,102,0.15)',
                              color: lead.aiActive ? 'var(--accent)' : 'var(--whatsapp)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              flexShrink: 0,
                            }} title={lead.aiActive ? 'AI ведёт диалог' : 'WhatsApp'}>
                              {lead.aiActive ? '🔄' : '💬'}
                            </div>
                          </div>
                          {lead.aiActive && lead.aiNotes && (
                            <div style={{ background: 'var(--accent-light)', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                              <p style={{ margin: 0, fontSize: 11, color: 'var(--text)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                                {lead.aiNotes.length > 80 ? `${lead.aiNotes.slice(0, 80)}…` : lead.aiNotes}
                              </p>
                            </div>
                          )}
                          {lead.metadata && typeof lead.metadata === 'object' && (lead.metadata.suggestedCallAt != null || lead.metadata.suggestedCallNote != null) ? (
                            <div style={{ marginBottom: 6, padding: '0.35rem 0.5rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span aria-hidden>📞</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lead.metadata.suggestedCallNote != null
                                  ? String(lead.metadata.suggestedCallNote)
                                  : lead.metadata.suggestedCallAt != null
                                    ? new Date(String(lead.metadata.suggestedCallAt)).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : ''}
                              </span>
                            </div>
                          ) : null}
                          {lead.lastMessagePreview && (
                            <p style={{ margin: '0 0 6px', fontSize: 12, color: lead.aiActive ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties} title={lead.lastMessagePreview}>
                              {lead.lastMessagePreview}
                            </p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <span className={scoreTagClass(lead.leadScore)} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                              {scoreTagText(lead.leadScore)}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Чат →</span>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <Link
                  href={`/leads/new?stageId=${col.id}`}
                  className="leads-add-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    padding: '0.6rem',
                    marginTop: '0.75rem',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: 'none',
                    background: 'transparent',
                  }}
                >
                  <span aria-hidden>+</span> Добавить
                </Link>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr style={{ background: 'var(--sidebar-bg)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Контакт</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Стадия</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Оценка</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>AI / Человек</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Последнее</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link href={`/leads/${lead.id}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>
                      {lead.name || lead.phone}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.phone}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: 14 }}>{lead.stage.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, background: scoreBadgeBg(lead.leadScore), color: scoreBadgeColor(lead.leadScore) }}>
                      {scoreLabel(lead.leadScore)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: 14 }}>
                    {lead.aiActive ? 'AI' : lead.assignedUser?.name || lead.assignedUser?.email || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: 14 }}>
                    {lead.lastMessagePreview ? lead.lastMessagePreview.slice(0, 35) + (lead.lastMessagePreview.length > 35 ? '…' : '') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Нет заявок</div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
