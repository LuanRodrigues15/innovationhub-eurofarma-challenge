// Banco em memória do site de demonstração. Os dados nascem das fixtures e ficam salvos no
// navegador (sessionStorage), então ações como curtir, validar e aprovar sobrevivem a recarregamentos
// e a demonstração recomeça limpa a cada nova visita.
import { FIXTURES } from './fixtures'
import { EXTRA_FIXTURES } from './fixtures-extra'
import { FOREIGN_KEYS, NULLABLE, TABLES, timestampColumns, type Row } from './schema'

const STORAGE_KEY = 'ih-demo-db-v1'

export type DbError = { code: string; message: string; details?: string | null; hint?: string | null }
export type ChangeEvent = {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Row | null
  old: Row | null
}

type Db = Record<string, Row[]>

let db: Db | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<(e: ChangeEvent) => void>()

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Ids de ideias e cursos criados em runtime saem de um pool fixo, que as rotas estáticas pré-geram. */
export function poolIds(table: string): string[] {
  const pool = TABLES[table]?.idPool
  if (!pool) return []
  return Array.from({ length: pool.size }, (_, k) => `${pool.prefix}${String(k + 1).padStart(12, '0')}`)
}

function newId(table: string, rows: Row[]): string {
  for (const id of poolIds(table)) if (!rows.some((r) => r.id === id)) return id
  return uuid()
}

function normalize(table: string, row: Row, stamp: string): Row {
  const out: Row = { ...(TABLES[table]?.defaults ?? {}), ...row }
  for (const col of NULLABLE[table] ?? []) if (out[col] === undefined) out[col] = null
  for (const col of timestampColumns(table)) if (out[col] === undefined) out[col] = stamp
  return out
}

function seed(): Db {
  const now = Date.now()
  const out: Db = {}
  for (const table of Object.keys(TABLES)) out[table] = []
  for (const [table, base] of Object.entries(FIXTURES)) {
    const rows = [...base, ...(EXTRA_FIXTURES[table] ?? [])]
    const step = TABLES[table]?.stepMs ?? 3_600_000
    out[table] = rows.map((r, i) => {
      const stamp = new Date(now - (rows.length - i) * step).toISOString()
      const row = normalize(table, clone(r), stamp)
      if (row.id === undefined) row.id = newId(table, out[table])
      return row
    })
  }
  return out
}

function load(): Db {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Db
        if (Object.keys(TABLES).every((t) => Array.isArray(parsed[t]))) return parsed
      }
    } catch {
      // armazenamento indisponível ou corrompido: recomeça das fixtures
    }
  }
  return seed()
}

export function getDb(): Db {
  if (!db) db = load()
  return db
}

function scheduleSave() {
  if (typeof window === 'undefined') return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      // sem espaço ou bloqueado: os dados seguem só em memória
    }
  }, 150)
}

export function resetDb() {
  db = null
  if (saveTimer) clearTimeout(saveTimer)
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignorar
    }
  }
}

export function subscribe(listener: (e: ChangeEvent) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(event: ChangeEvent) {
  listeners.forEach((l) => {
    try {
      l(event)
    } catch {
      // um assinante com erro não derruba a operação
    }
  })
}

export function tableRows(table: string): Row[] | null {
  return getDb()[table] ?? null
}

export const missingTable = (table: string): DbError => ({
  code: '42P01',
  message: `relation "public.${table}" does not exist`,
})

export function insertRow(table: string, input: Row): { row: Row | null; error: DbError | null } {
  const rows = tableRows(table)
  if (!rows) return { row: null, error: missingTable(table) }
  const row = normalize(table, clone(input), new Date().toISOString())
  if (row.id === undefined) row.id = newId(table, rows)
  for (const cols of TABLES[table]?.unique ?? []) {
    if (cols.some((c) => row[c] === null || row[c] === undefined)) continue
    if (rows.some((r) => cols.every((c) => r[c] === row[c]))) {
      return {
        row: null,
        error: {
          code: '23505',
          message: `duplicate key value violates unique constraint "${table}_${cols.join('_')}_unique"`,
        },
      }
    }
  }
  rows.push(row)
  scheduleSave()
  emit({ table, eventType: 'INSERT', new: clone(row), old: null })
  return { row: clone(row), error: null }
}

export function updateRow(table: string, target: Row, patch: Row): Row {
  const old = clone(target)
  Object.assign(target, clone(patch))
  scheduleSave()
  emit({ table, eventType: 'UPDATE', new: clone(target), old })
  return clone(target)
}

/** Remove linhas respeitando ON DELETE (cascade, set null e restrict) do schema original. */
export function deleteRows(table: string, targets: Row[]): { count: number; error: DbError | null } {
  const plan: Array<{ table: string; ids: Set<unknown> }> = []
  const nulls: Array<{ table: string; column: string; ids: Set<unknown> }> = []

  const collect = (t: string, ids: Set<unknown>): DbError | null => {
    if (ids.size === 0) return null
    plan.push({ table: t, ids })
    for (const fk of FOREIGN_KEYS.filter((f) => f.ref === t)) {
      const child = (tableRows(fk.table) ?? []).filter((r) => ids.has(r[fk.column]))
      if (child.length === 0) continue
      if (fk.onDelete === 'restrict') {
        return {
          code: '23503',
          message: `update or delete on table "${t}" violates foreign key constraint "${fk.table}_${fk.column}_fkey" on table "${fk.table}"`,
        }
      }
      if (fk.onDelete === 'set null') nulls.push({ table: fk.table, column: fk.column, ids })
      else {
        const err = collect(fk.table, new Set(child.map((r) => r.id)))
        if (err) return err
      }
    }
    return null
  }

  const error = collect(table, new Set(targets.map((r) => r.id)))
  if (error) return { count: 0, error }

  for (const n of nulls) {
    for (const r of tableRows(n.table) ?? []) if (n.ids.has(r[n.column])) r[n.column] = null
  }
  for (const step of plan) {
    const rows = getDb()[step.table]
    const removed = rows.filter((r) => step.ids.has(r.id))
    getDb()[step.table] = rows.filter((r) => !step.ids.has(r.id))
    removed.forEach((old) => emit({ table: step.table, eventType: 'DELETE', new: null, old: clone(old) }))
  }
  scheduleSave()
  return { count: targets.length, error: null }
}
