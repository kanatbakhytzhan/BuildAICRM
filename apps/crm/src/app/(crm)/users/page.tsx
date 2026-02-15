'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { users, leads, topics, type User } from '@/lib/api';

const PAGE_SIZE = 10;

function roleLabel(r: string) {
  if (r === 'owner') return 'Администратор';
  if (r === 'rop') return 'РОП';
  return 'Менеджер';
}

const ROLES = [
  { value: 'manager', label: 'Менеджер' },
  { value: 'rop', label: 'РОП' },
  { value: 'owner', label: 'Администратор' },
] as const;

function roleBadgeStyle(r: string): React.CSSProperties {
  if (r === 'owner') return { background: '#7c3aed', color: 'white' };
  if (r === 'rop') return { background: 'var(--accent)', color: 'white' };
  return { background: 'var(--accent-light)', color: 'var(--accent)' };
}

function initials(name: string | null, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function UsersPage() {
  const router = useRouter();
  const [list, setList] = useState<User[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState<string>('manager');
  const [createVisibleTopicIds, setCreateVisibleTopicIds] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [topicsList, setTopicsList] = useState<{ id: string; name: string }[]>([]);
  const [editTopicsUser, setEditTopicsUser] = useState<User | null>(null);
  const [editTopicsIds, setEditTopicsIds] = useState<string[]>([]);
  const [editTopicsLoading, setEditTopicsLoading] = useState(false);
  const [editTopicsError, setEditTopicsError] = useState('');
  const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [resetPwdError, setResetPwdError] = useState('');
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canInvite = currentUser?.role === 'owner' || currentUser?.role === 'rop';

  useEffect(() => {
    users.me().then((u) => {
      setCurrentUser(u);
      if (u.role !== 'owner' && u.role !== 'rop') router.replace('/profile');
    }).catch(() => setCurrentUser(null));
  }, [router]);

  useEffect(() => {
    users.list().then((data) => {
      setList(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (canInvite) topics.list().then(setTopicsList).catch(() => {});
  }, [canInvite]);

  useEffect(() => {
    if (list.length === 0) return;
    leads.list().then((leadList) => {
      const counts: Record<string, number> = {};
      leadList.forEach((l) => {
        const uid = l.assignedUser?.id;
        if (uid) counts[uid] = (counts[uid] || 0) + 1;
      });
      setLeadCounts(counts);
    }).catch(() => {});
  }, [list]);

  const filtered = list.filter((u) => {
    const matchSearch =
      !search.trim() ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="page-content" style={{ background: 'var(--bg)' }}>Загрузка...</div>
    );
  }

  return (
    <div className="page-content" style={{ background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Пользователи</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
            Управление командой и правами доступа в CRM
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => {
              setModalOpen(true);
              setCreateEmail('');
              setCreatePassword('');
              setCreateName('');
              setCreateRole('manager');
              setCreateVisibleTopicIds([]);
              setCreateError('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Создать / пригласить пользователя
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <input
          type="search"
          placeholder="Поиск по имени или email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 260px',
            maxWidth: 320,
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        >
          <option value="">Все роли</option>
          <option value="owner">Администратор</option>
          <option value="rop">РОП</option>
          <option value="manager">Менеджер</option>
        </select>
      </div>

      {slice.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
        >
          <div style={{ fontSize: 48, marginBottom: '1rem', opacity: 0.4 }}>👥</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Нет пользователей</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: '1rem' }}>
            Попробуйте изменить фильтры или добавьте нового сотрудника.
          </div>
          <button
            type="button"
            onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            Очистить фильтры
          </button>
        </div>
      ) : (
        <>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Имя</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Роль</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Лиды</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Темы</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Статус</th>
                  {canInvite && <th style={{ width: 120, padding: '0.75rem 1rem', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Действия</th>}
                </tr>
              </thead>
              <tbody>
                {slice.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'var(--accent-light)',
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                        >
                          {initials(u.name, u.email)}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name || u.email}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        ...roleBadgeStyle(u.role),
                      }}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: 14 }}>
                      {leadCounts[u.id] ?? 0} активных
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: 13 }}>
                      {u.role === 'manager' ? (
                        u.visibleTopicIds?.length ? (
                          <span style={{ color: 'var(--text-muted)' }}>{u.visibleTopicIds.length} тем</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>все</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                      {canInvite && u.role === 'manager' && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditTopicsUser(u);
                            setEditTopicsIds(u.visibleTopicIds ?? []);
                            setEditTopicsError('');
                          }}
                          style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Изменить
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                        Активен
                      </span>
                    </td>
                    {canInvite && (
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {u.role !== 'owner' && (
                            <button
                              type="button"
                              onClick={() => { setResetPwdUser(u); setResetPwdValue(''); setResetPwdError(''); }}
                              style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Сбросить пароль
                            </button>
                          )}
                          {u.role === 'manager' && (
                            <button
                              type="button"
                              onClick={() => setDeleteUser(u)}
                              style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Показано с {(currentPage - 1) * PAGE_SIZE + 1} по {Math.min(currentPage * PAGE_SIZE, filtered.length)} из {filtered.length} результатов
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  cursor: currentPage > 1 ? 'pointer' : 'not-allowed',
                  opacity: currentPage > 1 ? 1 : 0.6,
                }}
              >
                ←
              </button>
              {Array.from({ length: Math.min(8, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 8) p = i + 1;
                else if (currentPage <= 4) p = i + 1;
                else if (currentPage >= totalPages - 3) p = totalPages - 7 + i;
                else p = currentPage - 4 + i;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      background: p === currentPage ? 'var(--accent)' : 'var(--surface)',
                      color: p === currentPage ? 'white' : 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  cursor: currentPage < totalPages ? 'pointer' : 'not-allowed',
                  opacity: currentPage < totalPages ? 1 : 0.6,
                }}
              >
                →
              </button>
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !createLoading && setModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
              boxShadow: 'var(--shadow-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Создать пользователя</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCreateError('');
                if (!createEmail.trim() || createPassword.length < 6) {
                  setCreateError('Email и пароль (не менее 6 символов) обязательны.');
                  return;
                }
                setCreateLoading(true);
                try {
                  await users.create({
                    email: createEmail.trim(),
                    password: createPassword,
                    name: createName.trim() || undefined,
                    role: createRole,
                    visibleTopicIds: createRole === 'manager' && createVisibleTopicIds.length > 0 ? createVisibleTopicIds : undefined,
                  });
                  const data = await users.list();
                  setList(data);
                  setModalOpen(false);
                } catch (err) {
                  setCreateError(err instanceof Error ? err.message : 'Ошибка создания');
                } finally {
                  setCreateLoading(false);
                }
              }}
            >
              <label style={{ display: 'block', marginBottom: '0.75rem' }}>
                <span style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Email *</span>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: '0.75rem' }}>
                <span style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Пароль (не менее 6 символов) *</span>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  minLength={6}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: '0.75rem' }}>
                <span style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Имя</span>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Необязательно"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Роль</span>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
              {createRole === 'manager' && topicsList.length > 0 && (
                <label style={{ display: 'block', marginBottom: '1rem' }}>
                  <span style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' }}>Видит темы (оставьте пустым — видит все)</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                    {topicsList.map((t) => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={createVisibleTopicIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setCreateVisibleTopicIds((prev) => [...prev, t.id]);
                            else setCreateVisibleTopicIds((prev) => prev.filter((id) => id !== t.id));
                          }}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </label>
              )}
              {createError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: '0.75rem' }}>{createError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => !createLoading && setModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}
                >
                  {createLoading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTopicsUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !editTopicsLoading && setEditTopicsUser(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
              boxShadow: 'var(--shadow-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Видимые темы</h2>
            <p style={{ margin: '0 0 1rem', fontSize: 14, color: 'var(--text-muted)' }}>
              {editTopicsUser.name || editTopicsUser.email}. Пустой список — менеджер видит лиды по всем темам.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
              {topicsList.map((t) => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={editTopicsIds.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) setEditTopicsIds((prev) => [...prev, t.id]);
                      else setEditTopicsIds((prev) => prev.filter((id) => id !== t.id));
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
            {editTopicsError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: '0.75rem' }}>{editTopicsError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !editTopicsLoading && setEditTopicsUser(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={editTopicsLoading}
                onClick={async () => {
                  setEditTopicsError('');
                  setEditTopicsLoading(true);
                  try {
                    await users.updateVisibleTopics(editTopicsUser.id, editTopicsIds);
                    const data = await users.list();
                    setList(data);
                    setEditTopicsUser(null);
                  } catch (err) {
                    setEditTopicsError(err instanceof Error ? err.message : 'Ошибка');
                  } finally {
                    setEditTopicsLoading(false);
                  }
                }}
                style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}
              >
                {editTopicsLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPwdUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !resetPwdLoading && setResetPwdUser(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
              boxShadow: 'var(--shadow-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Сбросить пароль</h2>
            <p style={{ margin: '0 0 1rem', fontSize: 14, color: 'var(--text-muted)' }}>
              Новый пароль для {resetPwdUser.name || resetPwdUser.email}
            </p>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>Новый пароль (не менее 6 символов)</span>
              <input
                type="password"
                value={resetPwdValue}
                onChange={(e) => setResetPwdValue(e.target.value)}
                minLength={6}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
              />
            </label>
            {resetPwdError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: '0.75rem' }}>{resetPwdError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !resetPwdLoading && setResetPwdUser(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={resetPwdLoading || resetPwdValue.length < 6}
                onClick={async () => {
                  setResetPwdError('');
                  setResetPwdLoading(true);
                  try {
                    await users.resetPassword(resetPwdUser.id, resetPwdValue);
                    setResetPwdUser(null);
                    setResetPwdValue('');
                  } catch (err) {
                    setResetPwdError(err instanceof Error ? err.message : 'Ошибка');
                  } finally {
                    setResetPwdLoading(false);
                  }
                }}
                style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}
              >
                {resetPwdLoading ? 'Сохранение...' : 'Сбросить пароль'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !deleteLoading && setDeleteUser(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
              boxShadow: 'var(--shadow-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Удалить менеджера</h2>
            <p style={{ margin: '0 0 1rem', fontSize: 14, color: 'var(--text-muted)' }}>
              Вы уверены, что хотите удалить {deleteUser.name || deleteUser.email}? Лиды, назначенные этому менеджеру, останутся без владельца.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !deleteLoading && setDeleteUser(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await users.remove(deleteUser.id);
                    const data = await users.list();
                    setList(data);
                    setDeleteUser(null);
                  } catch (err) {
                    console.error(err);
                    setDeleteUser(null);
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                style={{ padding: '0.5rem 1rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600 }}
              >
                {deleteLoading ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
