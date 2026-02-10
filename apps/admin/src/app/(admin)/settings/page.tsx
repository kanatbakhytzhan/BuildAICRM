'use client';

import { useEffect, useState } from 'react';
import { adminSystem, type SystemSettings } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [maintenance, setMaintenance] = useState(false);
  const [globalAi, setGlobalAi] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminSystem
      .getSettings()
      .then((s) => {
        setSettings(s);
        setTimezone(s.defaultTimezone);
        setMaintenance(s.maintenanceMode);
        setGlobalAi(s.aiGlobalEnabled);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await adminSystem.updateSettings({
        defaultTimezone: timezone,
        maintenanceMode: maintenance,
        aiGlobalEnabled: globalAi,
      });
      setSettings(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleKillSwitch = async () => {
    setSaving(true);
    try {
      const updated = await adminSystem.updateSettings({ aiGlobalEnabled: false });
      setSettings(updated);
      setGlobalAi(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ marginBottom: '1rem', fontSize: 14, color: 'var(--text-muted)' }}>Главная / Настройки / Системные</div>
      <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>Системные настройки</h1>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)' }}>Управление глобальными параметрами платформы</p>

      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Общие параметры</h3>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Часовой пояс по умолчанию</label>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 8, minWidth: 260 }}>
          <option value="Europe/Moscow">Europe/Moscow (UTC+03:00)</option>
          <option value="Asia/Almaty">Asia/Almaty (UTC+06:00)</option>
        </select>
        <p style={{ margin: '0.5rem 0 0', fontSize: 14, color: 'var(--text-muted)' }}>Используется для новых тенантов</p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8 }}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Режим обслуживания</h3>
        <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 12, background: 'var(--success-bg)', color: 'var(--success)' }}>Система активна</span>
        <p style={{ margin: '0.5rem 0 0.75rem', fontSize: 14, color: 'var(--text-muted)' }}>При включении доступ будет ограничен</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />
          Статус режима
        </label>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>AI Kill-switch</h3>
        <span
          style={{
            marginLeft: 8,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 12,
            background: globalAi ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: globalAi ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {globalAi ? 'AI Работает' : 'AI Отключен'}
        </span>
        <p style={{ margin: '0.5rem 0 0.75rem', fontSize: 14, color: 'var(--text-muted)' }}>Глобально отключить AI для всех клиентов</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={globalAi} onChange={(e) => setGlobalAi(e.target.checked)} />
          Глобальный ИИ
        </label>
      </div>

      <div style={{ padding: '1.25rem', border: '2px solid var(--danger)', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--danger)' }}>Опасная зона</h3>
        <p style={{ margin: '0.5rem 0 0.75rem', fontSize: 14 }}>Экстренная остановка всех сообщений WhatsApp для всех клиентов</p>
        <button
          type="button"
          onClick={handleKillSwitch}
          disabled={saving || !globalAi}
          style={{ padding: '0.5rem 1rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 8, opacity: saving || !globalAi ? 0.7 : 1 }}
        >
          ОСТАНОВИТЬ ВСЕ СООБЩЕНИЯ
        </button>
      </div>
    </div>
  );
}
