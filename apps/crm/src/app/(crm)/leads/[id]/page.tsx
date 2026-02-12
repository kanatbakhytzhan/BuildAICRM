'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { leads, messages, pipeline, ai, users, type Lead, type Message, type Stage } from '@/lib/api';

function MobileTimelineSection({ eventHistory, scoreValue }: { eventHistory: { type: string; createdAt: string; title: string; desc: string; color: string }[]; scoreValue: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lead-detail-timeline-mobile" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: 'none',
          background: 'transparent',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text)',
        }}
      >
        История событий · Вероятность сделки
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            <span>Вероятность сделки</span>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{scoreValue}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ width: `${scoreValue}%`, height: '100%', background: 'var(--success)', borderRadius: 999 }} />
          </div>
          <div style={{ position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
            {eventHistory.map((ev, i) => (
              <div key={`${ev.type}-${ev.createdAt}-${i}`} style={{ position: 'relative', marginBottom: '1rem' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: -21,
                    top: 2,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: ev.color === 'green' ? 'var(--success)' : ev.color === 'blue' ? 'var(--accent)' : ev.color === 'orange' ? 'var(--warning)' : 'var(--tag-demo-text)',
                    border: '2px solid var(--surface)',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(ev.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <h4 style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ev.title}</h4>
                {ev.type === 'stage' ? (
                  <span style={{ fontSize: 12, color: 'var(--warning)', background: 'var(--warning-bg)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>{ev.desc}</span>
                ) : (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{ev.desc}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type LeadWithMeta = Lead & { metadata?: Record<string, unknown> | null };

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [lead, setLead] = useState<LeadWithMeta | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [dealAmountInput, setDealAmountInput] = useState('');
  const [savingDeal, setSavingDeal] = useState(false);

  useEffect(() => {
    users.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([leads.one(id), messages.list(id), pipeline.list()])
      .then(([l, m, s]) => {
        setLead(l);
        setMsgs(m);
        setStages(s);
        const amt = l.dealAmount != null ? String(l.dealAmount) : '';
        setDealAmountInput(amt);
      })
      .catch(() => router.replace('/leads'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const updateStage = (stageId: string) => {
    if (!lead) return;
    setSaving(true);
    leads.update(lead.id, { stageId }).then(setLead).catch(console.error).finally(() => setSaving(false));
  };

  const scoreLabel = (s: string) => (s === 'hot' ? 'Горячий' : s === 'warm' ? 'Тёплый' : 'Холодный');
  const scoreNum = (s: string) => (s === 'hot' ? 85 : s === 'warm' ? 60 : 40);

  const handleHandoff = async () => {
    if (!lead) return;
    setHandoffError(null);
    setHandoffLoading(true);
    try {
      const updated = lead.aiActive
        ? await ai.takeOver(lead.id)
        : await ai.release(lead.id);
      setLead(updated as LeadWithMeta);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при смене режима диалога';
      setHandoffError(message);
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lead || !window.confirm('Удалить этого лида? Это действие нельзя отменить.')) return;
    setDeleting(true);
    try {
      await leads.remove(lead.id);
      router.replace('/leads');
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : 'Не удалось удалить лида');
    } finally {
      setDeleting(false);
    }
  };

  /** События для блока «История событий»: по первому входящему, первому AI, текущий этап */
  const eventHistory = (() => {
    if (!lead) return [];
    const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const firstIn = sorted.find((m) => m.direction === 'in');
    const firstAi = sorted.find((m) => m.source === 'ai');
    const events: { type: string; createdAt: string; title: string; desc: string; color: 'green' | 'blue' | 'orange' | 'purple' }[] = [];
    if (firstIn) {
      events.push({
        type: 'new_lead',
        createdAt: firstIn.createdAt,
        title: 'Новый лид',
        desc: 'Клиент написал первое сообщение из WhatsApp',
        color: 'green',
      });
    }
    if (firstAi) {
      events.push({
        type: 'ai',
        createdAt: firstAi.createdAt,
        title: 'AI подключился',
        desc: 'Автоматический ответ на приветствие',
        color: 'blue',
      });
    }
    const stageTime = lead.lastMessageAt || firstIn?.createdAt || new Date().toISOString();
    events.push({
      type: 'stage',
      createdAt: stageTime,
      title: 'Смена этапа',
      desc: lead.stage.name,
      color: 'orange',
    });
    events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return events;
  })();

  const formatSilence = (iso: string | null) => {
    if (!iso) return null;
    const since = new Date(iso);
    const diffMs = Date.now() - since.getTime();
    if (diffMs < 0) return null;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '< 1 мин';
    if (diffMin < 60) return `${diffMin} мин`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !input.trim()) return;
    const text = input.trim();
    setSending(true);
    try {
      const msg = await messages.create(lead.id, text);
      setMsgs((prev) => [...prev, msg]);
      const nowIso = new Date().toISOString();
      setLead((prev) =>
        prev
          ? {
              ...prev,
              lastMessageAt: nowIso,
              lastMessagePreview: text,
              noResponseSince: nowIso,
            }
          : prev,
      );
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading || !lead) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>Загрузка...</div>
    );
  }

  return (
    <div className="page-content lead-detail-root">
      <div className="lead-detail-sidebar">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/leads" style={{ fontSize: 14, color: 'var(--text-muted)', minHeight: 'auto' }}>← Заявки</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
            {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{lead.name || lead.phone}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{lead.phone}</div>
          </div>
        </div>
        <a href={`tel:${lead.phone}`} style={{ display: 'inline-block', marginBottom: '0.5rem', padding: '0.5rem 1rem', background: 'var(--success)', color: 'white', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 500 }}>
          Позвонить
        </a>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{ display: 'inline-block', marginBottom: '1rem', padding: '0.5rem 1rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, cursor: deleting ? 'wait' : 'pointer' }}
        >
          {deleting ? 'Удаление…' : 'Удалить лида'}
        </button>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Стадия</div>
          <select
            value={lead.stageId}
            onChange={(e) => updateStage(e.target.value)}
            disabled={saving}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
            }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {lead.stage.type === 'success' && (currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 14, border: '2px solid rgba(37,211,102,0.35)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Сумма сделки, ₸</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                min={0}
                step={1}
                value={dealAmountInput}
                onChange={(e) => setDealAmountInput(e.target.value)}
                placeholder="0"
                style={{ flex: '1 1 120px', minWidth: 0, padding: '0.65rem 0.75rem', fontSize: 16, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}
              />
              {(() => {
                const savedStr = lead.dealAmount != null ? String(lead.dealAmount) : '';
                const isDirty = dealAmountInput !== savedStr;
                if (!isDirty) return null;
                return (
                  <button
                    type="button"
                    disabled={savingDeal}
                    onClick={async () => {
                      const num = dealAmountInput.trim() ? Math.round(Number(dealAmountInput)) : null;
                      if (num != null && (Number.isNaN(num) || num < 0)) return;
                      setSavingDeal(true);
                      try {
                        const updated = await leads.update(lead.id, { dealAmount: num ?? null });
                        setLead(updated as LeadWithMeta);
                        setDealAmountInput(updated.dealAmount != null ? String(updated.dealAmount) : '');
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setSavingDeal(false);
                      }
                    }}
                    style={{ padding: '0.65rem 1.25rem', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: savingDeal ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {savingDeal ? '…' : 'Сохранить'}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
        <div style={{ fontSize: 14, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Оценка: </span>
          {scoreLabel(lead.leadScore)}
        </div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Ведёт: </span>
          {lead.aiActive ? 'AI' : lead.assignedUser?.name || lead.assignedUser?.email || '—'}
        </div>
        {lead.channel && (
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>Пишет на номер: </span>
            {lead.channel.name}
          </div>
        )}
        {lead.topic && (
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>Тема: </span>
            {lead.topic.name}
          </div>
        )}
        {lead.aiNotes && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: 13 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Решения AI</div>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{lead.aiNotes}</div>
          </div>
        )}
        {lead.metadata && typeof lead.metadata === 'object' && (lead.metadata.suggestedCallAt != null || lead.metadata.suggestedCallNote != null) ? (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--warning)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>📞 Позвонить</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {lead.metadata.suggestedCallNote != null
                ? String(lead.metadata.suggestedCallNote)
                : lead.metadata.suggestedCallAt != null
                  ? new Date(String(lead.metadata.suggestedCallAt)).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : ''}
            </div>
          </div>
        ) : null}
        {lead.metadata && typeof lead.metadata === 'object' && Object.keys(lead.metadata).length > 0 && (() => {
          const m = lead.metadata as Record<string, unknown>;
          const items: { label: string; value: string }[] = [];
          if (m.city != null) items.push({ label: 'Город', value: String(m.city) });
          if (m.dimensions != null && typeof m.dimensions === 'object' && !Array.isArray(m.dimensions)) {
            const d = m.dimensions as { length?: number; width?: number };
            if (d.length != null && d.width != null) items.push({ label: 'Размеры', value: `${d.length} × ${d.width} м` });
          }
          if (m.foundation != null) items.push({ label: 'Фундамент', value: String(m.foundation) });
          if (m.windowsCount != null) items.push({ label: 'Окон', value: String(m.windowsCount) });
          if (m.doorsCount != null) items.push({ label: 'Дверей', value: String(m.doorsCount) });
          if (m.suggestedCallNote != null) items.push({ label: 'Перезвонить', value: String(m.suggestedCallNote) });
          else if (m.suggestedCallAt != null) items.push({ label: 'Перезвонить', value: new Date(String(m.suggestedCallAt)).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) });
          if (items.length === 0) return null;
          return (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Данные</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map(({ label, value }) => (
                  <div key={label} style={{ fontSize: 14, display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{label}:</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="lead-detail-chat">
        {/* Верхняя панель чата — как в референсе */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent)' }}>
              {(lead.name || lead.phone).slice(0, 1).toUpperCase()}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{lead.name || lead.phone}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.aiActive ? 'AI анализирует контекст…' : 'Диалог ведёт менеджер'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 600 }}>
              SCORE {scoreNum(lead.leadScore)}/100
            </span>
            {lead.noResponseSince && (
              <span style={{ fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span aria-hidden>🕐</span> Клиент молчит: {formatSilence(lead.noResponseSince)}
              </span>
            )}
            <button
              type="button"
              onClick={handleHandoff}
              disabled={handoffLoading}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: lead.aiActive ? '#fee2e2' : 'var(--accent-light)',
                color: lead.aiActive ? 'var(--danger)' : 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
                opacity: handoffLoading ? 0.7 : 1,
              }}
            >
              {handoffLoading ? '…' : lead.aiActive ? 'Забрать диалог' : 'Вернуть AI'}
            </button>
            {handoffError && (
              <span style={{ fontSize: 12, color: 'var(--danger)', width: '100%' }}>{handoffError}</span>
            )}
          </div>
        </div>
        <div style={{ flex: 1, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(to bottom, #f5eee7, #f6f7f8)' }}>
          <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
            {msgs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Нет сообщений</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {msgs.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: m.direction === 'out' ? 'flex-end' : 'flex-start',
                      maxWidth: '100%',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '0.6rem 0.9rem',
                        borderRadius: m.direction === 'out' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background:
                          m.source === 'ai'
                            ? '#dcfce7'
                            : m.direction === 'out'
                            ? 'var(--accent)'
                            : 'var(--surface)',
                        color: m.source === 'ai' ? '#14532d' : m.direction === 'out' ? '#f9fafb' : 'var(--text)',
                        border: m.direction === 'in' && m.source !== 'ai' ? '1px solid var(--border)' : 'none',
                        boxShadow: 'var(--shadow-sm)',
                        fontSize: 14,
                      }}
                    >
                      {m.body}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(m.createdAt).toLocaleString('ru-RU')} ·{' '}
                      {m.direction === 'in' ? 'Клиент' : m.source === 'ai' ? 'AI' : 'Менеджер'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Быстрые действия и поле ввода как в референсе */} 
          <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 0.75rem 0.9rem', border: '1px solid rgba(148,163,184,0.3)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', overflowX: 'auto' }}>
              <button
                type="button"
                onClick={() => setInput('Давайте назначим встречу, чтобы подробнее обсудить детали.')}
                style={{ whiteSpace: 'nowrap', padding: '0.35rem 0.8rem', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, color: 'var(--text-muted)' }}
              >
                Назначить встречу
              </button>
              <button
                type="button"
                onClick={() => setInput('Отправляю вам презентацию по проекту.')}
                style={{ whiteSpace: 'nowrap', padding: '0.35rem 0.8rem', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, color: 'var(--text-muted)' }}
              >
                Отправить презентацию
              </button>
              <button
                type="button"
                onClick={() => setInput('Подскажите, пожалуйста, какой у вас ориентировочный бюджет?')}
                style={{ whiteSpace: 'nowrap', padding: '0.35rem 0.8rem', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, color: 'var(--text-muted)' }}
              >
                Запросить бюджет
              </button>
            </div>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button type="button" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', padding: 6 }} aria-label="Добавить вложение">
                +
              </button>
              <div style={{ flex: 1, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите сообщение..."
                  rows={1}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: 'none',
                    resize: 'none',
                    fontSize: 14,
                    background: 'transparent',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={sending || !input.trim()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  fontWeight: 600,
                  opacity: sending || !input.trim() ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
                aria-label="Отправить"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      </div>

      <MobileTimelineSection eventHistory={eventHistory} scoreValue={scoreNum(lead.leadScore)} />

      {/* Правая колонка: история событий */}
      <aside className="lead-detail-timeline" style={{
        width: 280,
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            История событий
          </h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ position: 'relative', paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
            {eventHistory.map((ev, i) => (
              <div key={`${ev.type}-${ev.createdAt}-${i}`} style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: -21,
                    top: 2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: ev.color === 'green' ? 'var(--success)' : ev.color === 'blue' ? 'var(--accent)' : ev.color === 'orange' ? 'var(--warning)' : 'var(--tag-demo-text)',
                    border: '2px solid var(--surface)',
                    boxShadow: ev.color === 'blue' ? '0 0 0 2px rgba(19,127,236,0.2)' : undefined,
                  }}
                  aria-hidden
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {new Date(ev.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ev.color === 'blue' ? 'var(--accent)' : 'var(--text)' }}>
                    {ev.type === 'ai' && <span style={{ marginRight: 4 }} aria-hidden>🤖</span>}
                    {ev.title}
                  </h4>
                  {ev.type === 'stage' ? (
                    <span style={{ fontSize: 12, color: 'var(--warning)', background: 'var(--warning-bg)', padding: '2px 6px', borderRadius: 4, width: 'fit-content' }}>
                      {ev.desc}
                    </span>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', padding: '6px 8px', borderRadius: 6 }}>
                      {ev.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Вероятность сделки</span>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{scoreNum(lead.leadScore)}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${scoreNum(lead.leadScore)}%`,
                height: '100%',
                background: 'var(--success)',
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
