'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { pipeline, leads, type Stage, type Lead } from '@/lib/api';

type ViewMode = 'kanban' | 'list';

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
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [onlyMine, setOnlyMine] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      pipeline.list(),
      leads.list({ onlyMine, stageId: stageFilter || undefined }),
    ]).then(([s, l]) => {
      setStages(s);
      setLeadsList(l);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [onlyMine, stageFilter]);

  const filtered = search.trim()
    ? leadsList.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
          l.phone.includes(search)
      )
    : leadsList;

  const leadsByStage = stages.map((stage) => ({
    ...stage,
    leads: filtered.filter((l) => l.stageId === stage.id),
  }));

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

  return (
    <div className="page-content" style={{ background: 'var(--bg)', paddingLeft: 0, paddingRight: 0 }}>
      {/* Тулбар как в референсе: белая полоса, граница, отступы */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1.25rem 2rem',
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
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2 }}>Заявки</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Воронка продаж WhatsApp</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: 540 }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0, maxWidth: 320 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} aria-hidden>🔍</span>
              <input
                type="search"
                placeholder="Поиск по имени, телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.5rem',
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
                padding: '0.65rem 1rem',
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
                padding: '0.65rem 0.75rem',
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Мои
            </label>
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 2 }}>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'kanban' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'kanban' ? 'white' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Канбан
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 14,
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
                padding: '0.65rem 1.25rem',
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
        <div className="leads-kanban-scroll kanban-scroll" style={{ background: 'var(--bg)', margin: '0 -1rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', minHeight: 440, alignItems: 'flex-start', minWidth: 'max-content' }}>
          {leadsByStage.map((col) => {
            const isUrgent = col.type === 'wants_call';
            const isAiColumn = col.type === 'in_progress';
            const isDropOver = dragOverStageId === col.id;
            return (
              <div
                key={col.id}
                className="kanban-column"
                style={{
                  minWidth: 320,
                  maxWidth: 320,
                  flexShrink: 0,
                  background: isAiColumn ? 'linear-gradient(to bottom, rgba(19,127,236,0.08), transparent)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: isAiColumn ? '4px solid var(--accent)' : isUrgent ? '4px solid var(--danger)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1rem',
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{lead.name || lead.phone}</div>
                              {noResp ? (
                                <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span aria-hidden>🕐</span> {noResp}
                                </div>
                              ) : isUrgent && lead.leadScore === 'hot' ? (
                                <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span aria-hidden>⚠</span> Требует внимания
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgoExtended(lead.lastMessageAt)}</div>
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
                            <div style={{ background: 'var(--accent-light)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', marginBottom: 8 }}>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.35 }}>
                                AI: {lead.aiNotes.slice(0, 60)}{lead.aiNotes.length > 60 ? '…' : ''}
                              </p>
                            </div>
                          )}
                          {lead.lastMessagePreview && (
                            <p style={{ margin: '0 0 8px', fontSize: 13, color: lead.aiActive ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties} title={lead.lastMessagePreview}>
                              {lead.lastMessagePreview.slice(0, 80)}{lead.lastMessagePreview.length > 80 ? '…' : ''}
                            </p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <span className={scoreTagClass(lead.leadScore)} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                              {scoreTagText(lead.leadScore)}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Чат →</span>
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
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
