'use client';

import { useEffect, useState } from 'react';
import { users, topics, pipeline, quickReplies, type Topic, type Stage, type QuickReplyTemplate } from '@/lib/api';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [stagesList, setStagesList] = useState<Stage[]>([]);
  const [quickRepliesList, setQuickRepliesList] = useState<QuickReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [editTopicScenarioText, setEditTopicScenarioText] = useState('');
  const [editTopicWelcomeVoiceUrl, setEditTopicWelcomeVoiceUrl] = useState('');
  const [editTopicWelcomeImageUrl, setEditTopicWelcomeImageUrl] = useState('');
  const [editTopicWelcomeImageUrls, setEditTopicWelcomeImageUrls] = useState<string[]>([]);
  const [qrLabel, setQrLabel] = useState('');
  const [qrMessageText, setQrMessageText] = useState('');
  const [editQr, setEditQr] = useState<QuickReplyTemplate | null>(null);
  const [editQrLabel, setEditQrLabel] = useState('');
  const [editQrMessageText, setEditQrMessageText] = useState('');

  const canEdit = currentUser?.role === 'owner' || currentUser?.role === 'rop';

  useEffect(() => {
    users.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    Promise.all([topics.list(), pipeline.list(), quickReplies.list()])
      .then(([top, st, qr]) => {
        setTopicsList(top);
        setStagesList(st);
        setQuickRepliesList(qr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [canEdit]);

  const loadAll = () => {
    if (!canEdit) return;
    topics.list().then(setTopicsList);
    pipeline.list().then(setStagesList);
    quickReplies.list().then(setQuickRepliesList);
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
              <button type="button" onClick={() => {
                setEditTopic(t);
                setEditTopicName(t.name);
                setEditTopicScenarioText(t.scenarioText ?? '');
                setEditTopicWelcomeVoiceUrl(t.welcomeVoiceUrl ?? '');
                setEditTopicWelcomeImageUrl(t.welcomeImageUrl ?? '');
                setEditTopicWelcomeImageUrls(Array.isArray(t.welcomeImageUrls) ? t.welcomeImageUrls : []);
              }} style={{ padding: '6px 12px', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Изменить</button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Удалить тему?')) {
                    topics.remove(t.id).then(loadAll).catch((e) => setError(e.message));
                  }
                }}
                style={{ padding: '6px 12px', border: 'none', borderRadius: 'var(--radius)', background: 'var(--danger)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
        {editTopic && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Редактировать тему: {editTopic.name}</div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Название</span>
              <input type="text" placeholder="Название темы" value={editTopicName} onChange={(e) => setEditTopicName(e.target.value)} style={{ width: '100%', maxWidth: 400, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Сценарий для AI (текст приветствия)</span>
              <textarea placeholder="Текст, который AI использует для приветствия по этой теме" value={editTopicScenarioText} onChange={(e) => setEditTopicScenarioText(e.target.value)} rows={3} style={{ width: '100%', maxWidth: 480, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block', resize: 'vertical' }} />
            </label>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Приветственные сообщения по теме</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>URL должны быть доступны из интернета (https://...). ChatFlow отправляет их в WhatsApp при первом сообщении.</p>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Голосовое приветствие (URL .mp3, .ogg)</span>
                <input type="url" placeholder="https://..." value={editTopicWelcomeVoiceUrl} onChange={(e) => setEditTopicWelcomeVoiceUrl(e.target.value)} style={{ width: '100%', maxWidth: 480, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Главное фото приветствия (URL)</span>
                <input type="url" placeholder="https://..." value={editTopicWelcomeImageUrl} onChange={(e) => setEditTopicWelcomeImageUrl(e.target.value)} style={{ width: '100%', maxWidth: 480, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Доп. фото (по одному URL на строку — прайсы и т.д.)</span>
                <textarea placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg" value={editTopicWelcomeImageUrls.join('\n')} onChange={(e) => setEditTopicWelcomeImageUrls(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={2} style={{ width: '100%', maxWidth: 480, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block', resize: 'vertical' }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setEditTopic(null)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Отмена</button>
              <button type="button" onClick={() => {
                setSaving(true);
                topics.update(editTopic.id, {
                  name: editTopicName,
                  scenarioText: editTopicScenarioText.trim() || null,
                  welcomeVoiceUrl: editTopicWelcomeVoiceUrl.trim() || null,
                  welcomeImageUrl: editTopicWelcomeImageUrl.trim() || null,
                  welcomeImageUrls: editTopicWelcomeImageUrls.length > 0 ? editTopicWelcomeImageUrls : null,
                }).then(loadAll).then(() => setEditTopic(null)).catch((e) => setError(e.message)).finally(() => setSaving(false));
              }} disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>{saving ? '…' : 'Сохранить'}</button>
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

      {/* Шаблоны быстрых ответов */}
      <section style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>Шаблоны быстрых ответов</h2>
        <p style={{ margin: '0 0 1rem', fontSize: 13, color: 'var(--text-muted)' }}>
          Кнопки, которые менеджер вставляет в чат одним кликом. Примеры: «Отправляю КП», «Скоро перезвоню», «Когда вам удобно?»
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          {quickRepliesList.map((qr) => (
            <li key={qr.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500 }}>{qr.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {qr.messageText.length > 40 ? qr.messageText.slice(0, 40) + '…' : qr.messageText}</span>
              <button type="button" onClick={() => { setEditQr(qr); setEditQrLabel(qr.label); setEditQrMessageText(qr.messageText); }} style={{ padding: '6px 12px', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Изменить</button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Удалить шаблон?')) {
                    quickReplies.remove(qr.id).then(loadAll).catch((e) => setError(e.message));
                  }
                }}
                style={{ padding: '6px 12px', border: 'none', borderRadius: 'var(--radius)', background: 'var(--danger)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
        {editQr && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Редактировать шаблон</div>
            <input type="text" placeholder="Текст кнопки (короткий)" value={editQrLabel} onChange={(e) => setEditQrLabel(e.target.value)} style={{ width: '100%', maxWidth: 280, padding: '0.5rem 0.75rem', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block' }} />
            <textarea placeholder="Текст сообщения (полный)" value={editQrMessageText} onChange={(e) => setEditQrMessageText(e.target.value)} rows={3} style={{ width: '100%', maxWidth: 480, padding: '0.5rem 0.75rem', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setEditQr(null)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Отмена</button>
              <button type="button" onClick={() => { setSaving(true); quickReplies.update(editQr.id, { label: editQrLabel, messageText: editQrMessageText }).then(loadAll).then(() => setEditQr(null)).catch((e) => setError(e.message)).finally(() => setSaving(false)); }} disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>{saving ? '…' : 'Сохранить'}</button>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setSaving(true);
            quickReplies
              .create({ label: qrLabel, messageText: qrMessageText })
              .then(() => {
                setQrLabel('');
                setQrMessageText('');
                loadAll();
              })
              .catch((e) => setError(e.message))
              .finally(() => setSaving(false));
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}
        >
          <input
            type="text"
            placeholder="Текст кнопки (например: Отправляю КП)"
            value={qrLabel}
            onChange={(e) => setQrLabel(e.target.value)}
            required
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minWidth: 260 }}
          />
          <textarea
            placeholder="Текст сообщения"
            value={qrMessageText}
            onChange={(e) => setQrMessageText(e.target.value)}
            required
            rows={2}
            style={{ width: '100%', maxWidth: 400, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', resize: 'vertical' }}
          />
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            {saving ? '…' : 'Добавить шаблон'}
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
              <button type="button" onClick={() => { setEditStage(s); setEditStageName(s.name); setEditStageType(s.type); setEditStageTopicId(s.topicId ?? ''); }} style={{ padding: '6px 12px', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Изменить</button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Удалить этап?')) {
                    pipeline.remove(s.id).then(loadAll).catch((e) => setError(e.message));
                  }
                }}
                style={{ marginLeft: 'auto', padding: '6px 12px', border: 'none', borderRadius: 'var(--radius)', background: 'var(--danger)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
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
