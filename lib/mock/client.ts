// Cliente simulado com a superfície do supabase-js que o app usa: from(), auth e canais em tempo real.
import { subscribe, type ChangeEvent } from './db'
import { QueryBuilder } from './query'
import { mockAuth } from './session'
import type { Row } from './schema'

type ChannelFilter = { event?: string; schema?: string; table?: string; filter?: string }
type ChannelHandler = { filter: ChannelFilter; callback: (payload: Record<string, unknown>) => void }

function matchesFilter(expr: string | undefined, row: Row | null): boolean {
  if (!expr) return true
  const m = /^(\w+)=(\w+)\.(.*)$/.exec(expr)
  if (!m || !row) return true
  const [, col, op, val] = m
  return op === 'eq' ? String(row[col]) === val : true
}

export class MockChannel {
  private handlers: ChannelHandler[] = []
  private off: (() => void) | null = null

  on(type: string, filter: ChannelFilter, callback: (payload: Record<string, unknown>) => void) {
    void type
    this.handlers.push({ filter, callback })
    return this
  }

  subscribe(callback?: (status: string) => void) {
    this.off = subscribe((e: ChangeEvent) => {
      for (const h of this.handlers) {
        const f = h.filter
        if (f.table && f.table !== e.table) continue
        if (f.event && f.event !== '*' && f.event !== e.eventType) continue
        if (!matchesFilter(f.filter, e.new ?? e.old)) continue
        h.callback({ eventType: e.eventType, schema: 'public', table: e.table, new: e.new ?? {}, old: e.old ?? {} })
      }
    })
    callback?.('SUBSCRIBED')
    return this
  }

  unsubscribe() {
    this.off?.()
    this.off = null
    return Promise.resolve('ok')
  }
}

export function createMockClient() {
  return {
    from: (table: string) => new QueryBuilder(table),
    auth: mockAuth,
    channel: (name: string) => {
      void name
      return new MockChannel()
    },
    removeChannel: (channel: MockChannel) => channel.unsubscribe(),
    rpc: async () => ({ data: null, error: { message: 'rpc não é suportado na demonstração' } }),
  }
}
