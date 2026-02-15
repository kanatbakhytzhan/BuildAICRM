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

  const load = useCallback(() => {
    setLoading(true);
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
  };

  const save = () => {
    setSaving(true);
    shifts
      .setToday(Array.from(selectedIds))
      .then((a) => {
        setAttendance(a);
        setSelectedIds(new Set(a.userIds));
      })
      .catch(console.error)
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
        <IconClock style={{ opacity: 0.9 }} /> Смена на сегодня
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1.5rem' }}>
        Отметьте менеджеров, которые сегодня на работе. Лиды будут распределяться между ними в рабочее время (9:00–19:00). Владелец всегда видит все лиды.
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
    </div>
  );
}
