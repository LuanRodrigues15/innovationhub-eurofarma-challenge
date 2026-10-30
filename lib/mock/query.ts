// Construtor de consultas com a mesma API do supabase-js (from().select().eq()...), executado
// sobre o banco em memória. Cobre o que o app usa: filtros, ordenação, selects relacionais
// (alias:tabela!fk(colunas), tabela(count)), single/maybeSingle, upsert e contagem.
import { deleteRows, insertRow, missingTable, tableRows, updateRow, type DbError } from './db'
import { FOREIGN_KEYS, fkName, type Row } from './schema'

export type QueryResult = {
  data: unknown
  error: DbError | null
  count: number | null
  status: number
  statusText: string
}

type Predicate = (row: Row) => boolean

/* ───────── select relacional ───────── */

type SelectNode =
  | { kind: 'star' }
  | { kind: 'col'; name: string; alias: string }
  | { kind: 'rel'; alias: string; table: string; hint: string | null; inner: boolean; count: boolean; children: SelectNode[] }

function splitTop(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const c of s) {
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === ',' && depth === 0) { parts.push(cur); cur = '' } else cur += c
  }
  if (cur.trim()) parts.push(cur)
  return parts.map((p) => p.trim()).filter(Boolean)
}

function parseSelect(sel: string): SelectNode[] {
  return splitTop(sel).map((item): SelectNode => {
    if (item === '*') return { kind: 'star' }
    const open = item.indexOf('(')
    if (open === -1) {
      const m = /^(?:(\w+):)?(\w+)(?:::\w+)?$/.exec(item)
      const name = m?.[2] ?? item
      return { kind: 'col', name, alias: m?.[1] ?? name }
    }
    const head = item.slice(0, open).trim()
    const inside = item.slice(open + 1, item.lastIndexOf(')')).trim()
    const colon = head.indexOf(':')
    const alias = colon >= 0 ? head.slice(0, colon) : null
    const bits = (colon >= 0 ? head.slice(colon + 1) : head).split('!')
    const table = bits[0]
    return {
      kind: 'rel',
      alias: alias ?? table,
      table,
      hint: bits.slice(1).find((b) => b !== 'inner' && b !== 'left') ?? null,
      inner: bits.includes('inner'),
      count: inside === 'count',
      children: inside === 'count' ? [] : parseSelect(inside || '*'),
    }
  })
}

type Resolved = { kind: 'one' | 'many'; column: string; target: string }

function resolveRel(parent: string, node: Extract<SelectNode, { kind: 'rel' }>): Resolved | null {
  if (node.hint) {
    const fk = FOREIGN_KEYS.find((f) => fkName(f) === node.hint)
    if (fk && fk.table === parent && fk.ref === node.table) return { kind: 'one', column: fk.column, target: fk.ref }
    if (fk && fk.ref === parent && fk.table === node.table) return { kind: 'many', column: fk.column, target: fk.table }
  }
  const one = FOREIGN_KEYS.find((f) => f.table === parent && f.ref === node.table)
  if (one) return { kind: 'one', column: one.column, target: one.ref }
  const many = FOREIGN_KEYS.find((f) => f.table === node.table && f.ref === parent)
  if (many) return { kind: 'many', column: many.column, target: many.table }
  return null
}

const copy = <T,>(v: T): T => (v === undefined ? (null as T) : (JSON.parse(JSON.stringify(v)) as T))

function relatedOne(rel: Resolved, row: Row): Row | undefined {
  return (tableRows(rel.target) ?? []).find((r) => r.id === row[rel.column])
}
function relatedMany(rel: Resolved, row: Row): Row[] {
  return (tableRows(rel.target) ?? []).filter((r) => r[rel.column] === row.id)
}

function project(parent: string, row: Row, nodes: SelectNode[]): Row {
  const out: Row = {}
  for (const n of nodes) {
    if (n.kind === 'star') Object.assign(out, JSON.parse(JSON.stringify(row)))
    else if (n.kind === 'col') out[n.alias] = copy(row[n.name])
    else {
      const rel = resolveRel(parent, n)
      if (!rel) { out[n.alias] = n.count ? [{ count: 0 }] : null; continue }
      if (rel.kind === 'one') {
        const t = relatedOne(rel, row)
        out[n.alias] = t ? project(rel.target, t, n.children) : null
      } else {
        const kids = relatedMany(rel, row)
        out[n.alias] = n.count ? [{ count: kids.length }] : kids.map((k) => project(rel.target, k, n.children))
      }
    }
  }
  return out
}

/** `!inner` exclui a linha pai quando não há registro relacionado. */
function passesInner(parent: string, row: Row, nodes: SelectNode[]): boolean {
  for (const n of nodes) {
    if (n.kind !== 'rel' || !n.inner) continue
    const rel = resolveRel(parent, n)
    if (!rel) return false
    if (rel.kind === 'one' ? !relatedOne(rel, row) : relatedMany(rel, row).length === 0) return false
  }
  return true
}

/* ───────── filtros ───────── */

const isNil = (v: unknown) => v === null || v === undefined
const looseEq = (a: unknown, b: unknown) => (isNil(a) || isNil(b) ? isNil(a) && isNil(b) : a === b || String(a) === String(b))

function order(a: unknown, b: unknown): number {
  const na = typeof a === 'number' ? a : Number.NaN
  const nb = typeof b === 'number' ? b : Number.NaN
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  const sa = String(a)
  const sb = String(b)
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

function likeRegex(pattern: string, insensitive: boolean) {
  const body = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${body}$`, insensitive ? 'i' : '')
}

function coerceLiteral(op: string, raw: string): unknown {
  if (op === 'is') return raw === 'null' ? null : raw === 'true' ? true : raw === 'false' ? false : raw
  if (op === 'in') return raw.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
  return raw
}

function test(value: unknown, op: string, arg: unknown): boolean {
  switch (op) {
    case 'eq': return looseEq(value, arg)
    case 'neq': return !looseEq(value, arg)
    case 'gt': return !isNil(value) && order(value, arg) > 0
    case 'gte': return !isNil(value) && order(value, arg) >= 0
    case 'lt': return !isNil(value) && order(value, arg) < 0
    case 'lte': return !isNil(value) && order(value, arg) <= 0
    case 'like': return typeof value === 'string' && likeRegex(String(arg), false).test(value)
    case 'ilike': return typeof value === 'string' && likeRegex(String(arg), true).test(value)
    case 'is': return arg === null ? isNil(value) : value === arg
    case 'in': return Array.isArray(arg) && arg.some((a) => looseEq(value, a))
    case 'cs':
    case 'contains':
      return Array.isArray(value) && Array.isArray(arg) && arg.every((a) => value.includes(a))
    default: return false
  }
}

function parseOr(expr: string): Predicate {
  const conds = splitTop(expr).map((part): Predicate => {
    const negated = /^[^.]+\.not\./.test(part)
    const clean = negated ? part.replace('.not.', '.') : part
    const first = clean.indexOf('.')
    const second = clean.indexOf('.', first + 1)
    const col = clean.slice(0, first)
    const op = clean.slice(first + 1, second)
    const arg = coerceLiteral(op, clean.slice(second + 1))
    return (row) => test(row[col], op, arg) !== negated
  })
  return (row) => conds.some((c) => c(row))
}

/* ───────── construtor ───────── */

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

export class QueryBuilder implements PromiseLike<QueryResult> {
  private op: Op = 'select'
  private selectStr = '*'
  private returning = false
  private predicates: Predicate[] = []
  private orders: Array<{ col: string; asc: boolean; nullsFirst?: boolean }> = []
  private limitN: number | null = null
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private payload: Row | Row[] | null = null
  private conflict: string[] = ['id']
  private wantCount = false
  private headOnly = false
  private mode: 'many' | 'single' | 'maybe' = 'many'

  constructor(private table: string) {}

  select(columns = '*', opts?: { count?: string; head?: boolean }) {
    this.selectStr = columns
    if (this.op !== 'select') this.returning = true
    if (opts?.count) this.wantCount = true
    if (opts?.head) this.headOnly = true
    return this
  }
  insert(values: Row | Row[]) { this.op = 'insert'; this.payload = values; return this }
  update(values: Row) { this.op = 'update'; this.payload = values; return this }
  delete() { this.op = 'delete'; return this }
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = values
    if (opts?.onConflict) this.conflict = opts.onConflict.split(',').map((c) => c.trim())
    return this
  }

  private where(p: Predicate) { this.predicates.push(p); return this }
  eq(col: string, val: unknown) { return this.where((r) => test(r[col], 'eq', val)) }
  neq(col: string, val: unknown) { return this.where((r) => test(r[col], 'neq', val)) }
  gt(col: string, val: unknown) { return this.where((r) => test(r[col], 'gt', val)) }
  gte(col: string, val: unknown) { return this.where((r) => test(r[col], 'gte', val)) }
  lt(col: string, val: unknown) { return this.where((r) => test(r[col], 'lt', val)) }
  lte(col: string, val: unknown) { return this.where((r) => test(r[col], 'lte', val)) }
  like(col: string, val: string) { return this.where((r) => test(r[col], 'like', val)) }
  ilike(col: string, val: string) { return this.where((r) => test(r[col], 'ilike', val)) }
  is(col: string, val: unknown) { return this.where((r) => test(r[col], 'is', val)) }
  in(col: string, vals: unknown[]) { return this.where((r) => test(r[col], 'in', vals)) }
  contains(col: string, val: unknown) { return this.where((r) => test(r[col], 'contains', val)) }
  not(col: string, op: string, val: unknown) { return this.where((r) => !test(r[col], op, op === 'is' || op === 'in' ? val : val)) }
  match(obj: Row) { return this.where((r) => Object.entries(obj).every(([k, v]) => test(r[k], 'eq', v))) }
  filter(col: string, op: string, val: unknown) { return this.where((r) => test(r[col], op, coerceLiteral(op, String(val)))) }
  or(expr: string) { return this.where(parseOr(expr)) }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false, nullsFirst: opts?.nullsFirst })
    return this
  }
  limit(n: number) { this.limitN = n; return this }
  range(from: number, to: number) { this.rangeFrom = from; this.rangeTo = to; return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }
  returns() { return this }
  abortSignal() { return this }

  then<R1 = QueryResult, R2 = never>(
    onfulfilled?: ((value: QueryResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return new Promise<QueryResult>((resolve) => setTimeout(() => resolve(this.run()), 20)).then(onfulfilled, onrejected)
  }

  private done(data: unknown, count: number | null = null, error: DbError | null = null, status = 200): QueryResult {
    return { data, error, count, status, statusText: error ? 'Error' : 'OK' }
  }

  private finish(rows: Row[], count: number | null): QueryResult {
    if (this.mode === 'many') return this.done(rows, count)
    if (rows.length === 1) return this.done(rows[0], count)
    if (rows.length === 0 && this.mode === 'maybe') return this.done(null, count)
    return this.done(null, count, {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: `The result contains ${rows.length} rows`,
    }, 406)
  }

  private matching(rows: Row[], nodes: SelectNode[]): Row[] {
    return rows.filter((r) => this.predicates.every((p) => p(r)) && passesInner(this.table, r, nodes))
  }

  private run(): QueryResult {
    const rows = tableRows(this.table)
    if (!rows) return this.done(null, null, missingTable(this.table), 404)
    const nodes = parseSelect(this.selectStr)

    if (this.op === 'select') {
      const matched = this.matching(rows, nodes)
      for (const o of [...this.orders].reverse()) {
        matched.sort((a, b) => {
          const va = a[o.col], vb = b[o.col]
          if (isNil(va) || isNil(vb)) {
            if (isNil(va) && isNil(vb)) return 0
            const nilFirst = o.nullsFirst ?? !o.asc
            return isNil(va) ? (nilFirst ? -1 : 1) : nilFirst ? 1 : -1
          }
          return o.asc ? order(va, vb) : order(vb, va)
        })
      }
      const total = matched.length
      let page = matched
      if (this.rangeFrom !== null && this.rangeTo !== null) page = page.slice(this.rangeFrom, this.rangeTo + 1)
      if (this.limitN !== null) page = page.slice(0, this.limitN)
      const count = this.wantCount ? total : null
      if (this.headOnly) return this.done(null, count)
      return this.finish(page.map((r) => project(this.table, r, nodes)), count)
    }

    const payloads = this.payload === null ? [] : Array.isArray(this.payload) ? this.payload : [this.payload]

    if (this.op === 'insert' || this.op === 'upsert') {
      const written: Row[] = []
      for (const p of payloads) {
        let existing: Row | undefined
        if (this.op === 'upsert') {
          existing = rows.find((r) => this.conflict.every((c) => p[c] !== undefined && looseEq(r[c], p[c])))
        }
        if (existing) {
          written.push(updateRow(this.table, existing, p))
        } else {
          const res = insertRow(this.table, p)
          if (res.error) return this.done(null, null, res.error, 409)
          written.push(res.row as Row)
        }
      }
      if (!this.returning) return this.done(null, null, null, 201)
      const fresh = written.map((w) => (tableRows(this.table) ?? []).find((r) => r.id === w.id) ?? w)
      return this.finish(fresh.map((r) => project(this.table, r, nodes)), null)
    }

    const matched = this.matching(rows, nodes)

    if (this.op === 'update') {
      const patch = (this.payload ?? {}) as Row
      const updated = matched.map((r) => {
        updateRow(this.table, r, patch)
        return r
      })
      if (!this.returning) return this.done(null, null, null, 204)
      return this.finish(updated.map((r) => project(this.table, r, nodes)), null)
    }

    // delete
    const snapshot = matched.map((r) => project(this.table, r, nodes))
    const res = deleteRows(this.table, matched)
    if (res.error) return this.done(null, null, res.error, 409)
    return this.returning ? this.finish(snapshot, null) : this.done(null, null, null, 204)
  }
}
