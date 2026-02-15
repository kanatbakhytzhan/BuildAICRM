'use client';

import { useEffect, useState, useCallback } from 'react';
import { shifts, users, type User } from '@/lib/api';
import { IconClock, IconCheck } from '@/components/Icons';

export default function ShiftsPage() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<{ date: string; userIds: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLastResult(null);
    Promise.all([users.list(), shifts.getToday()])
      .then(([u, a]) => {
        setUsersList(u);
        setAttendance(a);
        setSelectedIds(new Set(a.userIds));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastResult(null);
  };

  const save = () => {
    setSaving(true);
    setLastResult(null);
    shifts
      .setToday(Array.from(selectedIds))
      .then((a) => {
        setAttendance(a);
        setSelectedIds(new Set(a.userIds));
        const n = (a as { distributedCount?: number }).distributedCount ?? 0;
        const m = a.userIds.length;
        if (n > 0 && m > 0) {
          setLastResult(`Готово! Распределено ${n} лидов между ${m} менеджерами`);
        } else if (m > 0) {
          setLastResult(`Готово! Смена сохранена. Новые лиды будут распределяться между ${m} менеджерами`);
        } else {
          setLastResult('Смена сохранена');
        }
      })
      .catch((e) => setLastResult(`Ошибка: ${e instanceof Error ? e.message : 'Не удалось сохранить'}`))
      .finally(() => setSaving(false));
  };

  const managers = usersList.filter((u) => u.role === 'manager');

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 20, fontWeight: 700 }}>
        <IconClock style={{ opacity: 0.9 }} /> Кто сегодня на работе?
      </h1>

      <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '1rem 1.25rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', fontSize: 15, lineHeight: 1.5 }}>
        <strong>Как это работает:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
          <li>Отметьте галочками менеджеров, которые сегодня на работе</li>
          <li>Нажмите «Сохранить»</li>
          <li>Система сама распределит все накопившиеся лиды и новые заявки между ними</li>
        </ol>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.25rem' }}>
        Распределение идёт с 9:00 до 19:00. Вы (владелец) всегда видите все лиды.
      </p>

      {managers.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}>
          Нет менеджеров. Добавьте пользователей с ролью «Менеджер» в разделе Пользователи.
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          {managers.map((u) => (
            <label
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                borderRadius: 'var(--radius)',
                marginBottom: 8,
                cursor: 'pointer',
                border: '1px solid var(--border)',
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(u.id)}
                onChange={() => toggle(u.id)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontWeight: 500 }}>{u.name || u.email}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</span>
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.75rem 1.5rem',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontWeight: 600,
          fontSize: 15,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        <IconCheck width={18} height={18} /> {saving ? 'Сохранение...' : 'Сохранить'}
      </button>

      {lastResult && (
        <p style={{ marginTop: '1rem', padding: '0.75rem', background: lastResult.startsWith('Ошибка') ? 'var(--warning-bg)' : 'var(--success-bg)', color: lastResult.startsWith('Ошибка') ? 'var(--warning)' : 'var(--success)', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500 }}>
          {lastResult}
        </p>
      )}
    </div>
  );
}
