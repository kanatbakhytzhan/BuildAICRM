'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { leads, messages, pipeline, ai, users, quickReplies, uploadFile, type Lead, type Message, type Stage } from '@/lib/api';
import { IconClock, IconRobot } from '@/components/Icons';

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
  const [quickReplyTemplates, setQuickReplyTemplates] = useState<{ id: string; label: string; messageText: string }[]>([]);
  const [sendingVoice, setSendingVoice] = useState(false);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    users.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([leads.one(id), messages.list(id), pipeline.list(), quickReplies.list()])
      .then(([l, m, s, qr]) => {
        setLead(l);
        setMsgs(m);
        setStages(s);
        setQuickReplyTemplates(qr);
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

  const apiBaseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') : '';

  const sendMessage = async (text: string) => {
    if (!lead || !text.trim()) return;
    setSending(true);
    try {
      const msg = await messages.create(lead.id, text.trim());
      setMsgs((prev) => [...prev, msg]);
      const nowIso = new Date().toISOString();
      setLead((prev) =>
        prev
          ? {
              ...prev,
              lastMessageAt: nowIso,
              lastMessagePreview: text.trim().slice(0, 120),
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

  const sendVoiceMessage = async (file: File) => {
    if (!lead) return;
    setSendingVoice(true);
    try {
      const { url } = await uploadFile(file);
      const msg = await messages.create(lead.id, '', url);
      setMsgs((prev) => [...prev, msg]);
      const nowIso = new Date().toISOString();
      setLead((prev) =>
        prev ? { ...prev, lastMessageAt: nowIso, lastMessagePreview: '🎵 Голосовое', noResponseSince: nowIso } : prev,
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSendingVoice(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  if (loading || !lead) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>Загрузка...</div>
    );
  }

  const lastSeenText = lead.lastMessageAt
    ? (() => {
        const d = new Date(lead.lastMessageAt);
        const now = new Date();
        const today = now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth() && yesterday.getFullYear() === d.getFullYear();
        const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        if (today) return `Был сегодня в ${time}`;
        if (isYesterday) return `Был вчера в ${time}`;
        return `Был ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в ${time}`;
      })()
    : 'Нет активности';

  const msgsByDate = (() => {
    const groups: { dateLabel: string; msgs: Message[] }[] = [];
    const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let currentLabel = '';
    let currentGroup: Message[] = [];
    for (const m of sorted) {
      const d = new Date(m.createdAt);
      const now = new Date();
      const today = now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth() && yesterday.getFullYear() === d.getFullYear();
      const label = today ? 'Сегодня' : isYesterday ? 'Вчера' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      if (label !== currentLabel) {
        if (currentGroup.length) groups.push({ dateLabel: currentLabel, msgs: currentGroup });
        currentLabel = label;
        currentGroup = [];
      }
      currentGroup.push(m);
    }
    if (currentGroup.length) groups.push({ dateLabel: currentLabel, msgs: currentGroup });
    return groups;
  })();

  const shortId = `#${lead.id.slice(-8).toUpperCase()}`;

  return (
    <div className="page-content lead-detail-root">
      <div className="lead-detail-sidebar" style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Детали лида</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>ID: {shortId}</p>
        </div>
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: 'var(--accent)', fontSize: 18 }}>📞</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Телефон</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', paddingLeft: 26 }}>{lead.phone}</p>
          </div>
          {lead.channel && (
            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>💬</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Канал</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', paddingLeft: 26 }}>{lead.channel.name}</p>
            </div>
          )}
          {lead.topic && (
            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>🏷</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Тема</span>
              </div>
              <div style={{ paddingLeft: 26, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ padding: '4px 10px', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, borderRadius: 999 }}>{lead.topic.name}</span>
              </div>
            </div>
          )}
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Оценка лида</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{scoreLabel(lead.leadScore)} ({scoreNum(lead.leadScore)})</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${scoreNum(lead.leadScore)}%`, height: '100%', background: 'var(--success)', borderRadius: 999 }} />
            </div>
          </div>
          {lead.stage.type === 'success' && (currentUser?.role === 'owner' || currentUser?.role === 'rop') && (
            <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 14, border: '2px solid rgba(37,211,102,0.35)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
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
          <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Стадия</div>
            <select
              value={lead.stageId}
              onChange={(e) => updateStage(e.target.value)}
              disabled={saving}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 14 }}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Ведёт: </span>
            <span style={{ color: 'var(--text)' }}>{lead.aiActive ? 'AI' : lead.assignedUser?.name || lead.assignedUser?.email || '—'}</span>
          </div>
          {lead.aiNotes && (
            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: 13 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Решения AI</div>
              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{lead.aiNotes}</div>
            </div>
          )}
          {lead.metadata && typeof lead.metadata === 'object' && (lead.metadata.suggestedCallAt != null || lead.metadata.suggestedCallNote != null) ? (
            <div style={{ padding: '0.75rem', background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning)' }}>
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
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
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
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <Link href="/leads" style={{ display: 'inline-block', marginBottom: 8, fontSize: 14, color: 'var(--accent)' }}>← Заявки</Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            ✎ Удалить лида
          </button>
        </div>
      </div>

      <div className="lead-detail-chat" style={{ background: '#e5ddd5', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', border: '2px solid var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>
                  {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
                </span>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, background: 'var(--success)', border: '2px solid var(--surface)', borderRadius: '50%' }} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>{lead.name || lead.phone}</h1>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{lastSeenText}</p>
              </div>
            </div>
            <a
              href={`tel:${lead.phone}`}
              style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 4px 12px rgba(19,127,236,0.35)', flexShrink: 0 }}
              aria-label="Позвонить"
            >
              📞
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0, background: 'var(--sidebar-bg)', padding: 6, borderRadius: 10 }}>
              <select
                value={lead.stageId}
                onChange={(e) => updateStage(e.target.value)}
                disabled={saving}
                style={{ width: '100%', padding: '0.5rem 2rem 0.5rem 0.75rem', border: 'none', borderRadius: 8, background: 'var(--surface)', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%234c739a\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: 18 }}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.25rem 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: lead.leadScore === 'hot' ? 'var(--danger)' : 'var(--warning)' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{scoreLabel(lead.leadScore)} приоритет</span>
            </div>
            <button
              type="button"
              onClick={handleHandoff}
              disabled={handoffLoading}
              style={{ padding: '0.4rem 0.75rem', borderRadius: 999, border: '1px solid var(--border)', background: lead.aiActive ? 'var(--danger-bg)' : 'var(--accent-light)', color: lead.aiActive ? 'var(--danger)' : 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: handoffLoading ? 'wait' : 'pointer' }}
            >
              {handoffLoading ? '…' : lead.aiActive ? 'Забрать диалог' : 'Вернуть AI'}
            </button>
            {lead.noResponseSince && (
              <span style={{ fontSize: 12, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}><IconClock width={14} height={14} style={{ flexShrink: 0 }} /> {formatSilence(lead.noResponseSince)}</span>
            )}
          </div>
          {handoffError && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{handoffError}</span>}
        </header>
        <div className="lead-detail-chat-messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {msgs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>Нет сообщений</p>
          ) : (
            msgsByDate.map(({ dateLabel, msgs: groupMsgs }) => (
              <div key={dateLabel}>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                  <span style={{ background: 'var(--sidebar-bg)', color: 'var(--text-muted)', fontSize: 12, padding: '4px 12px', borderRadius: 999, fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>{dateLabel}</span>
                </div>
                {groupMsgs.map((m) => (
                  <div
                    key={m.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: m.direction === 'out' ? 'flex-end' : 'flex-start', marginBottom: 8, maxWidth: '75%', alignSelf: m.direction === 'out' ? 'flex-end' : 'flex-start' }}
                  >
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: m.direction === 'out' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: m.direction === 'out' ? 'var(--accent)' : 'var(--surface)',
                        color: m.direction === 'out' ? '#fff' : 'var(--text)',
                        boxShadow: m.direction === 'out' ? '0 1px 4px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.06)',
                        fontSize: 15,
                        lineHeight: 1.45,
                      }}
                    >
                      {m.mediaUrl ? (
                        <audio
                          controls
                          src={m.mediaUrl.startsWith('http') ? m.mediaUrl : apiBaseUrl + m.mediaUrl}
                          style={{ maxWidth: '100%', height: 36, minWidth: 200 }}
                        />
                      ) : (
                        m.body
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, paddingLeft: m.direction === 'out' ? 0 : 4, paddingRight: m.direction === 'out' ? 4 : 0, display: 'flex', alignItems: 'center', gap: 4, flexDirection: m.direction === 'out' ? 'row-reverse' : 'row' }}>
                      {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'out' && <span style={{ opacity: 0.8 }}>✓✓</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', boxShadow: '0 -1px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
            {quickReplyTemplates.map((qr) => (
              <button key={qr.id} type="button" onClick={() => setInput(qr.messageText)} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--sidebar-bg)', color: 'var(--text)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{qr.label}</button>
            ))}
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <input
              ref={voiceInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  sendVoiceMessage(file);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => voiceInputRef.current?.click()}
              disabled={sendingVoice}
              title="Отправить голосовое"
              style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sendingVoice ? 'default' : 'pointer', opacity: sendingVoice ? 0.7 : 1, flexShrink: 0 }}
              aria-label="Голосовое сообщение"
            >
              🎤
            </button>
            <div style={{ flex: 1, minWidth: 0, background: 'var(--sidebar-bg)', borderRadius: 12, border: '1px solid transparent', display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Напишите сообщение..."
                rows={1}
                style={{ width: '100%', minHeight: 40, maxHeight: 120, padding: '8px 4px', border: 'none', resize: 'none', fontSize: 15, background: 'transparent', color: 'var(--text)' }}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{ width: 48, height: 48, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending || !input.trim() ? 'default' : 'pointer', opacity: sending || !input.trim() ? 0.7 : 1, flexShrink: 0 }}
              aria-label="Отправить"
            >
              ➤
            </button>
          </form>
        </footer>
      </div>

      <MobileTimelineSection eventHistory={eventHistory} scoreValue={scoreNum(lead.leadScore)} />

      {/* Правая колонка: история событий */}
      <aside className="lead-detail-timeline" style={{
        borderLeft: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
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
                    {ev.type === 'ai' && <span style={{ marginRight: 4, display: 'inline-flex', alignItems: 'center' }} aria-hidden><IconRobot width={16} height={16} /></span>}
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
