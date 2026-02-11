'use client';

import { useEffect, useState } from 'react';
import { users, channels, topics, pipeline, type Channel, type Topic, type Stage } from '@/lib/api';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [channelsList, setChannelsList] = useState<Channel[]>([]);
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [stagesList, setStagesList] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chName, setChName] = useState('');
  const [chExternalId, setChExternalId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [stageName, setStageName] = useState('');
  const [stageType, setStageType] = useState('new');
  const [stageTopicId, setStageTopicId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageType, setEditStageType] = useState('new');
  const [editStageTopicId, setEditStageTopicId] = useState<string>('');
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [editTopicName, setEditTopicName] = useState('');
  const [editTopicScenario, setEditTopicScenario] = useState('');
  const [editTopicMedia, setEditTopicMedia] = useState('');

  const canEdit = currentUser?.role === 'owner' || currentUser?.role === 'rop';

  useEffect(() => {
    users.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    Promise.all([channels.list(), topics.list(), pipeline.list()])
      .then(([ch, top, st]) => {
        setChannelsList(ch);
        setTopicsList(top);
        setStagesList(st);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [canEdit]);

  const loadAll = () => {
    if (!canEdit) return;
    channels.list().then(setChannelsList);
    topics.list().then(setTopicsList);
    pipeline.list().then(setStagesList);
  };

  if (!currentUser) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>Загрузка...</div>
    );
  }

  if (!canEdit) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Настройки доступны только владельцу и РОП.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>Загрузка настроек...</div>
    );
  }

  return (
    <div className="page-content" style={{ background: 'var(--bg)' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Настройки</h1>

      {/* Каналы */}
      <section style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>Каналы (WhatsApp-номера)</h2>
        <p style={{ margin: '0 0 1rem', fontSize: 13, color: 'var(--text-muted)' }}>
          Для одного webhook с несколькими номерами укажите externalId (instance_id из ChatFlow) для каждого канала.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          {channelsList.map((ch) => (
            <li key={ch.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500 }}>{ch.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({ch.externalId})</span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Удалить канал?')) {
                    channels.remove(ch.id).then(loadAll).catch((e) => setError(e.message));
                  }
                }}
                style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--danger)' }}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setSaving(true);
            channels
              .create({ name: chName, externalId: chExternalId })
              .then(() => {
                setChName('');
                setChExternalId('');
                loadAll();
              })
              .catch((e) => setError(e.message))
              .finally(() => setSaving(false));
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}
        >
          <input
            type="text"
            placeholder="Название (например: Номер 1)"
            value={chName}
            onChange={(e) => setChName(e.target.value)}
            required
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 160 }}
          />
          <input
            type="text"
            placeholder="externalId (instance_id из ChatFlow)"
            value={chExternalId}
            onChange={(e) => setChExternalId(e.target.value)}
            required
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 180 }}
          />
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            {saving ? '…' : 'Добавить канал'}
          </button>
        </form>
        {error && <p style={{ marginTop: 8, color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
      </section>

      {/* Темы */}
      <section style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>Темы лидов</h2>
        <p style={{ margin: '0 0 1rem', fontSize: 13, color: 'var(--text-muted)' }}>
          Категории для лидов (панели, ламинат, линолеум и т.д.). У менеджера можно ограничить видимость по темам.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          {topicsList.map((t) => (
            <li key={t.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500 }}>{t.name}</span>
              <button type="button" onClick={() => { setEditTopic(t); setEditTopicName(t.name); setEditTopicScenario(t.scenarioText ?? ''); setEditTopicMedia(t.mediaUrl ?? ''); }} style={{ fontSize: 12, color: 'var(--accent)' }}>Изменить</button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Удалить тему?')) {
                    topics.remove(t.id).then(loadAll).catch((e) => setError(e.message));
                  }
                }}
                style={{ fontSize: 12, color: 'var(--danger)' }}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
        {editTopic && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Редактировать тему: {editTopic.name}</div>
            <input type="text" placeholder="Название" value={editTopicName} onChange={(e) => setEditTopicName(e.target.value)} style={{ width: '100%', maxWidth: 280, padding: '0.5rem 0.75rem', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block' }} />
            <textarea placeholder="Сценарий для AI (инструкция по теме)" value={editTopicScenario} onChange={(e) => setEditTopicScenario(e.target.value)} rows={4} style={{ width: '100%', maxWidth: 480, padding: '0.5rem 0.75rem', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block', resize: 'vertical' }} />
            <input type="url" placeholder="Ссылка на медиа (когда готово)" value={editTopicMedia} onChange={(e) => setEditTopicMedia(e.target.value)} style={{ width: '100%', maxWidth: 380, padding: '0.5rem 0.75rem', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setEditTopic(null)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Отмена</button>
              <button type="button" onClick={() => { setSaving(true); topics.update(editTopic.id, { name: editTopicName, scenarioText: editTopicScenario || null, mediaUrl: editTopicMedia || null }).then(loadAll).then(() => setEditTopic(null)).catch((e) => setError(e.message)).finally(() => setSaving(false)); }} disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>{saving ? '…' : 'Сохранить'}</button>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setSaving(true);
            topics
              .create({ name: topicName })
              .then(() => {
                setTopicName('');
                loadAll();
              })
              .catch((e) => setError(e.message))
              .finally(() => setSaving(false));
          }}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <input
            type="text"
            placeholder="Название темы"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            required
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 200 }}
          />
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            {saving ? '…' : 'Добавить тему'}
          </button>
        </form>
      </section>

      {/* Воронка */}
      <section style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>Этапы воронки</h2>
        <p style={{ margin: '0 0 1rem', fontSize: 13, color: 'var(--text-muted)' }}>
          Порядок и названия этапов. Можно привязать этап к теме (оставьте пустым для общих этапов вроде Успех/Отказ).
        </p>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', marginBottom: '1rem' }}>
          {stagesList.map((s, idx) => (
            <li key={s.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>{idx + 1}. {s.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({s.type})</span>
              {s.topic && <span style={{ fontSize: 12, background: 'var(--accent-light)', padding: '2px 6px', borderRadius: 4 }}>{s.topic.name}</span>}
              <button type="button" onClick={() => { setEditStage(s); setEditStageName(s.name); setEditStageType(s.type); setEditStageTopicId(s.topicId ?? ''); }} style={{ fontSize: 12, color: 'var(--accent)' }}>Изменить</button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Удалить этап?')) {
                    pipeline.remove(s.id).then(loadAll).catch((e) => setError(e.message));
                  }
                }}
                style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--danger)' }}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
        {editStage && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Редактировать этап</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <input type="text" placeholder="Название" value={editStageName} onChange={(e) => setEditStageName(e.target.value)} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 140 }} />
              <select value={editStageType} onChange={(e) => setEditStageType(e.target.value)} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <option value="new">new</option>
                <option value="in_progress">in_progress</option>
                <option value="wants_call">wants_call</option>
                <option value="full_data">full_data</option>
                <option value="success">success</option>
                <option value="refused">refused</option>
              </select>
              <select value={editStageTopicId} onChange={(e) => setEditStageTopicId(e.target.value)} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 140 }}>
                <option value="">Без темы</option>
                {topicsList.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setEditStage(null)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Отмена</button>
              <button type="button" onClick={() => { setSaving(true); pipeline.update(editStage.id, { name: editStageName, type: editStageType, topicId: editStageTopicId || null }).then(loadAll).then(() => setEditStage(null)).catch((e) => setError(e.message)).finally(() => setSaving(false)); }} disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>{saving ? '…' : 'Сохранить'}</button>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setSaving(true);
            pipeline
              .create({
                name: stageName,
                type: stageType,
                topicId: stageTopicId || undefined,
              })
              .then(() => {
                setStageName('');
                setStageType('new');
                setStageTopicId('');
                loadAll();
              })
              .catch((e) => setError(e.message))
              .finally(() => setSaving(false));
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}
        >
          <input
            type="text"
            placeholder="Название этапа"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            required
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 140 }}
          />
          <select
            value={stageType}
            onChange={(e) => setStageType(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          >
            <option value="new">new</option>
            <option value="in_progress">in_progress</option>
            <option value="wants_call">wants_call</option>
            <option value="full_data">full_data</option>
            <option value="success">success</option>
            <option value="refused">refused</option>
          </select>
          <select
            value={stageTopicId}
            onChange={(e) => setStageTopicId(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 140 }}
          >
            <option value="">Без темы</option>
            {topicsList.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            {saving ? '…' : 'Добавить этап'}
          </button>
        </form>
      </section>
    </div>
  );
}
