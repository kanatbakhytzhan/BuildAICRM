'use client';

import { useEffect, useState } from 'react';
import { users, channels, topics, pipeline, quickReplies, uploadFile, type Channel, type Topic, type Stage, type QuickReplyTemplate } from '@/lib/api';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [channelsList, setChannelsList] = useState<Channel[]>([]);
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [stagesList, setStagesList] = useState<Stage[]>([]);
  const [quickRepliesList, setQuickRepliesList] = useState<QuickReplyTemplate[]>([]);
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
  const [editTopicWelcomeVoice, setEditTopicWelcomeVoice] = useState('');
  const [editTopicWelcomeImage, setEditTopicWelcomeImage] = useState('');
  const [editTopicWelcomeImageUrls, setEditTopicWelcomeImageUrls] = useState<string[]>([]);
  const [editTopicAddress, setEditTopicAddress] = useState('');
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
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
    Promise.all([channels.list(), topics.list(), pipeline.list(), quickReplies.list()])
      .then(([ch, top, st, qr]) => {
        setChannelsList(ch);
        setTopicsList(top);
        setStagesList(st);
        setQuickRepliesList(qr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [canEdit]);

  const loadAll = () => {
    if (!canEdit) return;
    channels.list().then(setChannelsList);
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
              <button type="button" onClick={() => {
                const imgs: string[] = [];
                if (t.welcomeImageUrl) imgs.push(t.welcomeImageUrl);
                const extra = t.welcomeImageUrls ?? [];
                for (const u of extra) {
                  if (typeof u === 'string' && u && !imgs.includes(u)) imgs.push(u);
                }
                setEditTopic(t);
                setEditTopicName(t.name);
                setEditTopicScenario(t.scenarioText ?? '');
                setEditTopicMedia(t.mediaUrl ?? '');
                setEditTopicWelcomeVoice(t.welcomeVoiceUrl ?? '');
                setEditTopicWelcomeImage(t.welcomeImageUrl ?? '');
                setEditTopicWelcomeImageUrls(imgs);
                setEditTopicAddress(t.addressText ?? '');
              }} style={{ fontSize: 12, color: 'var(--accent)' }}>Изменить</button>
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
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Приветственное голосовое</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.75rem', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploadingVoice(true);
                    try {
                      const { url } = await uploadFile(f);
                      setEditTopicWelcomeVoice(url);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
                    } finally {
                      setUploadingVoice(false);
                      e.target.value = '';
                    }
                  }} disabled={uploadingVoice} />
                  {uploadingVoice ? '… Загрузка' : '📁 Загрузить аудио'}
                </label>
                <input type="url" placeholder="или вставьте URL" value={editTopicWelcomeVoice} onChange={(e) => setEditTopicWelcomeVoice(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Приветственные фото (можно несколько)</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.75rem', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    setUploadingImages(true);
                    try {
                      for (let i = 0; i < files.length; i++) {
                        const { url } = await uploadFile(files[i]);
                        setEditTopicWelcomeImageUrls((prev) => [...prev, url]);
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
                    } finally {
                      setUploadingImages(false);
                      e.target.value = '';
                    }
                  }} disabled={uploadingImages} />
                  {uploadingImages ? '… Загрузка' : '📁 Загрузить фото'}
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {editTopicWelcomeImageUrls.map((url, i) => (
                    <div key={url} style={{ position: 'relative', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setEditTopicWelcomeImageUrls((p) => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 4, border: 'none', background: 'rgba(0,0,0,0.6)', color: 'white', cursor: 'pointer', fontSize: 12 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <textarea placeholder="Адрес / местоположение" value={editTopicAddress} onChange={(e) => setEditTopicAddress(e.target.value)} rows={2} style={{ width: '100%', maxWidth: 380, padding: '0.5rem 0.75rem', marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'block', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setEditTopic(null)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Отмена</button>
              <button type="button" onClick={() => {
                const firstImg = editTopicWelcomeImageUrls[0] || editTopicWelcomeImage || null;
                setSaving(true);
                topics.update(editTopic.id, {
                  name: editTopicName,
                  scenarioText: editTopicScenario || null,
                  mediaUrl: editTopicMedia || null,
                  welcomeVoiceUrl: editTopicWelcomeVoice || null,
                  welcomeImageUrl: firstImg,
                  welcomeImageUrls: editTopicWelcomeImageUrls,
                  addressText: editTopicAddress || null,
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
              <button type="button" onClick={() => { setEditQr(qr); setEditQrLabel(qr.label); setEditQrMessageText(qr.messageText); }} style={{ fontSize: 12, color: 'var(--accent)' }}>Изменить</button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Удалить шаблон?')) {
                    quickReplies.remove(qr.id).then(loadAll).catch((e) => setError(e.message));
                  }
                }}
                style={{ fontSize: 12, color: 'var(--danger)' }}
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
