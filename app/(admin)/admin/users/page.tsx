'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createAdminUserAccount, deleteAdminUserAccount, resetAdminUserPassword } from '@/services/adminUsersService'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchAdminContent,
  fetchAdminUsers,
  fetchUserPointLog,
  removeMentorStatus,
  updateAdminUser,
  type AdminUser,
  type Role,
  type UserPointLogEntry,
} from '@/services/managementService'
import type { Database } from '@/types/database.types'

type Sector = Database['public']['Tables']['sectors']['Row']

type UserForm = {
  id?: string
  name: string
  email: string
  password: string
  new_password: string
  matricula: string
  pin: string
  role: Role
  sector_id: string
  points: string
  level: string
  is_mentor: boolean
  is_visible_in_ranking: boolean
}

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  password: '',
  new_password: '',
  matricula: '',
  pin: '',
  role: 'funcionario',
  sector_id: 'none',
  points: '0',
  level: '1',
  is_mentor: false,
  is_visible_in_ranking: true,
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type SortKey = 'name' | 'points' | 'level' | 'ideas_count'
type SortDir = 'asc' | 'desc'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function roleBadge(role: string) {
  if (role === 'admin') return 'badge-red'
  if (role === 'gestor') return 'badge-blue'
  return 'badge-gray'
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Admin'
  if (role === 'gestor') return 'Gestor'
  return 'Funcionário'
}

function avatarColor(role: string) {
  if (role === 'gestor') return 'var(--c-gestor)'
  if (role === 'admin') return '#374151'
  return 'var(--c-funcionario)'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 2px' }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  const active = sortKey === col
  if (!active) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 0, opacity: 0.45, lineHeight: 0 }}>
        <Icon name="chevron-up"   size={10} style={{ display: 'block' }} />
        <Icon name="chevron-down" size={10} style={{ display: 'block', marginTop: -3 }} />
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 14,
      height: 14,
      borderRadius: 3,
      background: 'var(--accent)',
      color: '#fff',
    }}>
      <Icon name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={10} style={{ display: 'block' }} />
    </span>
  )
}

const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9ab0' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`

const filterSel: React.CSSProperties = {
  flexShrink: 0,
  padding: '0 32px 0 12px',
  height: 36,
  border: '1.5px solid var(--line)',
  borderRadius: 'var(--r-sm)',
  backgroundColor: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 12.5,
  appearance: 'none',
  backgroundImage: CHEVRON_SVG,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '12px 12px',
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.1s, background-color 0.1s',
}

export default function AdminUsersPage() {
  const { user, loading: userLoading } = useUser()
  const searchParams = useSearchParams()
  const autoOpenedRef = useRef(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)
  const [modalTab, setModalTab] = useState<'data' | 'logs'>('data')
  const [userLogs, setUserLogs] = useState<UserPointLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // ── Filters ──
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterSector, setFilterSector] = useState<string>('all')
  const [filterMentor, setFilterMentor] = useState<string>('all')
  const [filterRanking, setFilterRanking] = useState<string>('all')

  const hasFilters = search !== '' || filterRole !== 'all' || filterSector !== 'all' || filterMentor !== 'all' || filterRanking !== 'all'

  function clearFilters() {
    setSearch('')
    setFilterRole('all')
    setFilterSector('all')
    setFilterMentor('all')
    setFilterRanking('all')
  }
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const loadData = useCallback(async () => {
    setLoading(true)
    setFeedback(null)
    try {
      const [userData, contentData] = await Promise.all([fetchAdminUsers(), fetchAdminContent()])
      setUsers(userData)
      setSectors(contentData.sectors)
    } catch {
      setFeedback({ msg: 'Erro ao carregar usuários.', ok: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-open modal when arriving from another page via ?openUser=<id>&tab=<tab>
  useEffect(() => {
    const openUserId = searchParams.get('openUser')
    if (!openUserId || autoOpenedRef.current || users.length === 0) return
    const target = users.find((u) => u.id === openUserId)
    if (target) {
      autoOpenedRef.current = true
      const tab = searchParams.get('tab') === 'logs' ? 'logs' : 'data'
      openEditModal(target, tab)
    }
  }, [users, searchParams])

  // Fetch point logs when the logs tab is active
  useEffect(() => {
    if (!modalOpen || modalTab !== 'logs' || !form.id) return
    let active = true
    setLogsLoading(true)
    fetchUserPointLog(form.id)
      .then((logs) => { if (active) { setUserLogs(logs); setLogsLoading(false) } })
      .catch(() => { if (active) setLogsLoading(false) })
    return () => { active = false }
  }, [modalTab, form.id, modalOpen])

  // ── Derived list ──
  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) &&
          !(u.email ?? '').toLowerCase().includes(search.toLowerCase()) &&
          !(u.matricula ?? '').toLowerCase().includes(search.toLowerCase())) return false
      if (filterRole !== 'all' && u.role !== filterRole) return false
      if (filterSector !== 'all') {
        if (filterSector === 'none' && u.sector_id !== null) return false
        if (filterSector !== 'none' && u.sector_id !== filterSector) return false
      }
      if (filterMentor === 'yes' && !u.is_mentor) return false
      if (filterMentor === 'no' && u.is_mentor) return false
      if (filterRanking === 'yes' && !u.is_visible_in_ranking) return false
      if (filterRanking === 'no' && u.is_visible_in_ranking) return false
      return true
    })

    list = [...list].sort((a, b) => {
      let va: number | string = a[sortKey] ?? 0
      let vb: number | string = b[sortKey] ?? 0
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [users, search, filterRole, filterSector, filterMentor, filterRanking, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // ── Modal ──
  function openCreateModal() {
    setForm(EMPTY_FORM)
    setModalTab('data')
    setUserLogs([])
    setModalOpen(true)
  }

  function openEditModal(item: AdminUser, tab: 'data' | 'logs' = 'data') {
    setForm({
      id: item.id,
      name: item.name,
      email: item.email ?? '',
      password: '',
      new_password: '',
      matricula: item.matricula ?? '',
      pin: item.pin ?? '',
      role: item.role as Role,
      sector_id: item.sector_id ?? 'none',
      points: String(item.points ?? 0),
      level: String(item.level ?? 1),
      is_mentor: item.is_mentor,
      is_visible_in_ranking: item.is_visible_in_ranking,
    })
    setModalTab(tab)
    setUserLogs([])
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setUserLogs([])
  }

  function setField<K extends keyof UserForm>(key: K, val: UserForm[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setFeedback(null)
    try {
      if (form.id) {
        await updateAdminUser(form.id, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          matricula: form.matricula.trim() || null,
          pin: form.pin.trim() || null,
          role: form.role,
          sector_id: form.sector_id === 'none' ? null : form.sector_id,
          points: Number(form.points) || 0,
          level: Number(form.level) || 1,
          is_mentor: form.is_mentor,
          is_visible_in_ranking: form.is_visible_in_ranking,
        })
        if (form.new_password.trim().length >= 6) {
          await resetAdminUserPassword(form.id, form.new_password.trim())
        }
        setFeedback({ msg: `Usuário "${form.name}" atualizado com sucesso.`, ok: true })
      } else {
        await createAdminUserAccount({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          sector_id: form.sector_id === 'none' ? null : form.sector_id,
        })
        setFeedback({ msg: `Usuário "${form.name}" criado com sucesso.`, ok: true })
      }
      closeModal()
      await loadData()
    } catch (error) {
      setFeedback({ msg: error instanceof Error ? error.message : 'Erro ao salvar usuário.', ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(item: AdminUser) {
    if (!window.confirm(`Deletar o usuário "${item.name}"? Esta ação não pode ser desfeita.`)) return
    setSubmitting(true)
    setFeedback(null)
    try {
      await deleteAdminUserAccount(item.id)
      setFeedback({ msg: `Usuário "${item.name}" deletado.`, ok: true })
      await loadData()
    } catch (error) {
      setFeedback({ msg: error instanceof Error ? error.message : 'Erro ao deletar usuário.', ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemoveMentor(item: AdminUser) {
    setSubmitting(true)
    setFeedback(null)
    try {
      await removeMentorStatus(item.id)
      setFeedback({ msg: `Status de mentor removido de "${item.name}".`, ok: true })
      await loadData()
    } catch {
      setFeedback({ msg: 'Erro ao remover status de mentor.', ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  const editingUser = form.id ? users.find((u) => u.id === form.id) : null

  const thHead: React.CSSProperties = {
    padding: '10px 14px',
    color: 'var(--ink-3)',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textAlign: 'left',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }

  function thSortStyle(col: SortKey): React.CSSProperties {
    const active = sortKey === col
    return {
      ...thHead,
      cursor: 'pointer',
      userSelect: 'none',
      color: active ? 'var(--ink)' : 'var(--ink-2)',
      transition: 'color .15s',
    }
  }

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  return (
    <ProfileShell
      profile="admin"
      title="Usuários"
      subtitle="Gestão de colaboradores, perfis de acesso e status"
      user={user}
    >
      <div className="ih-dashboard-stack admin-users-page">
        {feedback && (
          <div style={{
            padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: feedback.ok ? 'rgba(0,166,81,.08)' : 'rgba(229,62,62,.08)',
            color: feedback.ok ? 'var(--green)' : 'var(--danger)',
          }}>
            {feedback.msg}
          </div>
        )}

        <section className="card anim-up" style={{ overflow: 'hidden' }}>

          {/* ── Toolbar ── */}
          <div className="admin-users-toolbar" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Busca */}
            <div style={{ position: 'relative', flex: 1, minWidth: 0, maxWidth: 320 }}>
              <Icon name="search" size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
              <input
                className="ih-input"
                style={{ paddingLeft: 32, width: '100%', fontSize: 13, height: 36 }}
                placeholder="Buscar por nome, e-mail ou matrícula…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filtros — width: auto deixa cada select se dimensionar pelo conteúdo */}
            <select style={filterSel} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="all">Todos os perfis</option>
              <option value="funcionario">Funcionário</option>
              <option value="gestor">Gestor</option>
              <option value="admin">Admin</option>
            </select>

            <select style={filterSel} value={filterSector} onChange={(e) => setFilterSector(e.target.value)}>
              <option value="all">Todos os setores</option>
              <option value="none">Sem setor</option>
              {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select style={filterSel} value={filterMentor} onChange={(e) => setFilterMentor(e.target.value)}>
              <option value="all">Mentores: todos</option>
              <option value="yes">Apenas mentores</option>
              <option value="no">Não mentores</option>
            </select>

            <select style={filterSel} value={filterRanking} onChange={(e) => setFilterRanking(e.target.value)}>
              <option value="all">Ranking: todos</option>
              <option value="yes">Visível no ranking</option>
              <option value="no">Oculto no ranking</option>
            </select>

            {hasFilters && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={clearFilters} style={{ flexShrink: 0, color: 'var(--danger)' }}>
                <Icon name="x" size={12} />
                Limpar Filtros
              </button>
            )}

            <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
              <button className="btn btn-accent btn-sm" type="button" onClick={openCreateModal}>
                <Icon name="plus" size={13} />
                Novo Usuário
              </button>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="admin-users-table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="admin-users-thead-row">
                  <th className="th-sort" style={thSortStyle('name')} onClick={() => toggleSort('name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Nome <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} /></span>
                  </th>
                  <th style={thHead}>E-mail / Matrícula</th>
                  <th style={thHead}>Perfil</th>
                  <th style={thHead}>Setor</th>
                  <th className="th-sort" style={thSortStyle('ideas_count')} onClick={() => toggleSort('ideas_count')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Ideias <SortIcon col="ideas_count" sortKey={sortKey} sortDir={sortDir} /></span>
                  </th>
                  <th className="th-sort" style={thSortStyle('points')} onClick={() => toggleSort('points')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Pontos <SortIcon col="points" sortKey={sortKey} sortDir={sortDir} /></span>
                  </th>
                  <th className="th-sort" style={thSortStyle('level')} onClick={() => toggleSort('level')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Nível <SortIcon col="level" sortKey={sortKey} sortDir={sortDir} /></span>
                  </th>
                  <th style={thHead}>Mentor</th>
                  <th style={thHead}>Ranking</th>
                  <th style={{ ...thHead, textAlign: 'right' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {filtered.length} de {users.length}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 18, color: 'var(--ink-3)' }}>Carregando usuários...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 18, color: 'var(--ink-3)' }}>Nenhum usuário encontrado.</td>
                  </tr>
                ) : filtered.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                    onClick={() => openEditModal(item)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span className="ih-avatar" style={{ width: 28, height: 28, background: avatarColor(item.role), flexShrink: 0 }}>
                          {initials(item.name)}
                        </span>
                        <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 13 }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-2)', fontSize: 12 }}>
                      <div>{item.email ?? '-'}</div>
                      {item.matricula && <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>Mat. {item.matricula}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${roleBadge(item.role)}`}>{roleLabel(item.role)}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-2)', fontSize: 13 }}>{item.sector_name ?? <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                    <td className="tabnum" style={{ padding: '10px 14px', color: 'var(--accent)', fontWeight: 800, fontSize: 13 }}>{item.ideas_count}</td>
                    <td className="tabnum" style={{ padding: '10px 14px', color: 'var(--accent)', fontWeight: 800, fontSize: 13 }}>
                      {(item.points ?? 0).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge badge-gray">NV {item.level}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${item.is_mentor ? 'badge-green' : 'badge-gray'}`}>{item.is_mentor ? 'Sim' : 'Não'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge rank-badge ${item.is_visible_in_ranking ? 'badge-blue' : 'badge-gray'}`}>
                        {item.is_visible_in_ranking ? 'Visível' : 'Oculto'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        <button
                          className="btn btn-muted btn-sm"
                          type="button"
                          disabled={submitting || !item.is_mentor}
                          onClick={() => handleRemoveMentor(item)}
                          style={{ visibility: item.is_mentor ? 'visible' : 'hidden' }}
                        >
                          Remover Mentor
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => openEditModal(item)}>
                          <Icon name="pencil" size={12} /> Editar
                        </button>
                        <button className="btn btn-danger btn-sm" type="button" disabled={submitting} onClick={() => handleDelete(item)}>
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="ih-modal-backdrop" onClick={closeModal}>
          <div
            className="ih-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header fixo */}
            <div className="card-p" style={{ flexShrink: 0, paddingBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {editingUser ? (
                  <>
                    <span className="ih-avatar" style={{ width: 44, height: 44, fontSize: 16, background: avatarColor(editingUser.role), flexShrink: 0 }}>
                      {initials(editingUser.name)}
                    </span>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', lineHeight: 1.2 }}>{editingUser.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span className={`badge ${roleBadge(editingUser.role)}`}>{roleLabel(editingUser.role)}</span>
                        {editingUser.sector_name && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{editingUser.sector_name}</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)' }}>Novo Usuário</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Preencha os dados abaixo para criar a conta</div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div style={{ height: 1, background: 'var(--line)', marginTop: 18 }} />
              {editingUser && (
                <div style={{ display: 'flex', gap: 2, paddingTop: 12 }}>
                  {(['data', 'logs'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTab(t)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 'var(--r-sm)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        background: modalTab === t ? 'var(--accent)' : 'var(--surface-2)',
                        color: modalTab === t ? '#fff' : 'var(--ink-3)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t === 'data' ? 'Dados' : 'Log de pontos'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Body rolável */}
            <div className="card-p" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 0, paddingBottom: 0 }}>

              {modalTab === 'logs' ? (
                /* ── Aba: Log de pontos ── */
                logsLoading ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Carregando...</div>
                ) : userLogs.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Nenhum registro encontrado.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', margin: '0 -24px' }}>
                    {userLogs.map((log) => (
                      <div key={log.id} className="ih-list-row" style={{ padding: '10px 24px' }}>
                        <span style={{ color: 'var(--ink-3)', width: 96, fontSize: 11, flexShrink: 0 }}>
                          {formatDate(log.created_at)}
                        </span>
                        <span
                          style={{
                            width: 7, height: 7, marginTop: 7,
                            borderRadius: 99,
                            background: log.points >= 0 ? 'var(--green)' : 'var(--danger)',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: 'var(--ink)', fontSize: 13, flex: 1 }}>{log.label}</span>
                        <span className="tabnum" style={{ color: log.points >= 0 ? 'var(--green)' : 'var(--danger)', fontWeight: 800 }}>
                          {log.points > 0 ? '+' : ''}{log.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* ── Aba: Dados ── */
                <>
                  {/* ── Seção: Identidade ── */}
                  <SectionDivider label="Identidade" />
                  <div style={{ display: 'grid', gap: 12 }}>
                    <Field label="Nome completo">
                      <input className="ih-input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ex: Maria Souza" />
                    </Field>
                    <Field label="E-mail">
                      <input className="ih-input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="usuario@eurofarma.com" />
                    </Field>
                    {!form.id && (
                      <Field label="Senha inicial">
                        <input className="ih-input" type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
                      </Field>
                    )}
                    {form.id && (
                      <Field label="Matrícula (login Totem)">
                        <input className="ih-input" value={form.matricula} onChange={(e) => setField('matricula', e.target.value)} placeholder="Ex: 001234" />
                      </Field>
                    )}
                  </div>

                  {/* ── Seção: Acesso ── */}
                  <SectionDivider label="Acesso" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Perfil de acesso">
                      <select className="ih-input" value={form.role} onChange={(e) => setField('role', e.target.value as Role)}>
                        <option value="funcionario">Funcionário</option>
                        <option value="gestor">Gestor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </Field>
                    <Field label="Setor">
                      <select className="ih-input" value={form.sector_id} onChange={(e) => setField('sector_id', e.target.value)}>
                        <option value="none">Sem setor</option>
                        {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                  </div>

                  {/* ── Seção: Gamificação (somente edição) ── */}
                  {form.id && (
                    <>
                      <SectionDivider label="Gamificação" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Pontos">
                          <input className="ih-input" type="number" min={0} value={form.points} onChange={(e) => setField('points', e.target.value)} />
                        </Field>
                        <Field label="Nível (1–5)">
                          <input className="ih-input" type="number" min={1} max={5} value={form.level} onChange={(e) => setField('level', e.target.value)} />
                        </Field>
                      </div>
                    </>
                  )}

                  {/* ── Seção: Permissões ── */}
                  <SectionDivider label="Permissões" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.is_mentor} onChange={(e) => setField('is_mentor', e.target.checked)} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Mentor ativo</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Aparece como mentor disponível para os colaboradores</div>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.is_visible_in_ranking} onChange={(e) => setField('is_visible_in_ranking', e.target.checked)} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Visível no ranking</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Inclui este usuário no leaderboard público</div>
                      </div>
                    </label>
                  </div>

                  {/* ── Seção: Totem (somente edição) ── */}
                  {form.id && (
                    <>
                      <SectionDivider label="Totem" />
                      <Field label="PIN de acesso ao Totem">
                        <input
                          className="ih-input"
                          value={form.pin}
                          onChange={(e) => setField('pin', e.target.value)}
                          placeholder="Deixe vazio para não alterar"
                          maxLength={8}
                        />
                      </Field>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
                        O PIN é armazenado em texto plano (decisão acadêmica). A matrícula + PIN são usados no login do Totem.
                      </p>
                    </>
                  )}

                  {/* ── Seção: Senha (somente edição) ── */}
                  {form.id && (
                    <>
                      <SectionDivider label="Redefinir senha" />
                      <Field label="Nova senha">
                        <input
                          className="ih-input"
                          type="password"
                          value={form.new_password}
                          onChange={(e) => setField('new_password', e.target.value)}
                          placeholder="Deixe vazio para não alterar"
                        />
                      </Field>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
                        Mínimo 6 caracteres. Se preenchido, a senha do usuário será redefinida ao salvar.
                      </p>
                    </>
                  )}
                </>
              )}

            </div>

            {/* Footer fixo */}
            <div className="card-p" style={{ flexShrink: 0, paddingTop: 16 }}>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
              {modalTab === 'logs' ? (
                <button className="btn btn-muted btn-md" type="button" style={{ width: '100%' }} onClick={closeModal}>
                  Fechar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-muted btn-md" type="button" style={{ flex: 1 }} onClick={closeModal}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-success btn-md"
                    type="button"
                    style={{ flex: 1 }}
                    disabled={submitting || !form.name.trim() || !form.email.trim() || (!form.id && !form.password.trim())}
                    onClick={handleSubmit}
                  >
                    {submitting ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Criar usuário'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  )
}
