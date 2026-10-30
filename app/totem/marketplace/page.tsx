/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import {
  fetchItems,
  redeemItem,
  type MarketplaceItem,
} from '@/services/marketplaceService'

export default function TotemMarketplacePage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [points, setPoints] = useState<number | null>(null)
  const [selected, setSelected] = useState<MarketplaceItem | null>(null)
  const [success, setSuccess] = useState<MarketplaceItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)

  const balance = points ?? user?.points ?? 0
  const availableCount = useMemo(
    () => items.filter((item) => balance >= item.cost_points).length,
    [balance, items]
  )

  useEffect(() => {
    let active = true

    async function loadItems() {
      setDataLoading(true)
      setError(null)

      try {
        const data = await fetchItems()
        if (!active) return
        setItems(data)
        setPoints(user?.points ?? 0)
      } catch {
        if (active) setError('Erro ao carregar Marketplace.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    if (user?.id) loadItems()

    return () => {
      active = false
    }
  }, [user?.id, user?.points])

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  async function confirmRedeem() {
    if (!selected || !user?.id) return

    setRedeeming(true)
    setError(null)

    try {
      const result = await redeemItem(user.id, selected.id)
      setPoints(result.newPoints)
      setSuccess(selected)
      setSelected(null)
      window.setTimeout(() => setSuccess(null), 2300)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao resgatar beneficio.'
      setError(message)
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <main
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--sidebar-bg)',
        position: 'relative',
        color: '#fff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.9) 1px, transparent 1.5px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }}
      />

      <header
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '20px 28px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => router.push('/totem/dashboard')}
          style={{
            minHeight: 60,
            padding: '0 22px',
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.14)',
            color: 'rgba(255,255,255,.72)',
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          <Icon name="chevron-left" size={20} />
          Voltar
        </button>
        <div style={{ color: 'rgba(255,255,255,.9)', fontWeight: 800, fontSize: 22 }}>
          Marketplace
        </div>
        <div
          className="tabnum"
          style={{
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,.08)',
            color: '#fff',
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          <Icon name="award" size={20} />
          {balance.toLocaleString('pt-BR')} pts
        </div>
      </header>

      <section
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '22px 28px 8px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            padding: 18,
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 16,
            background: 'rgba(255,255,255,.07)',
          }}
        >
          <div>
            <div style={{ marginTop: 4, color: '#fff', fontSize: 30, fontWeight: 800 }}>
              Escolha um beneficio
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,.38)', fontSize: 13, fontWeight: 800 }}>
              Disponiveis para seu saldo
            </div>
            <div className="tabnum" style={{ marginTop: 4, color: 'var(--c-totem)', fontSize: 32, fontWeight: 800 }}>
              {availableCount}/{items.length}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            margin: '8px 28px 0',
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(229,62,62,.16)',
            color: '#fecaca',
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 28px 28px',
          display: 'grid',
          gap: 14,
          alignContent: 'start',
        }}
      >
        {dataLoading ? (
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 18, textAlign: 'center', padding: 32 }}>
            Carregando beneficios...
          </div>
        ) : (
          items.map((item) => {
            const canRedeem = balance >= item.cost_points

            return (
              <article
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '112px minmax(0, 1fr) auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: 14,
                  border: '1px solid rgba(255,255,255,.11)',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,.07)',
                  opacity: canRedeem ? 1 : 0.56,
                }}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    style={{ width: 112, height: 78, objectFit: 'cover', borderRadius: 12, display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 112,
                      height: 78,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,.08)',
                      color: 'rgba(255,255,255,.58)',
                    }}
                  >
                    <Icon name="gift" size={28} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
                    {item.name}
                  </div>
                  <div style={{ marginTop: 6, color: 'rgba(255,255,255,.52)', fontSize: 15, lineHeight: 1.45 }}>
                    {item.description}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
                  <div className="tabnum" style={{ color: canRedeem ? 'var(--c-totem)' : 'rgba(255,255,255,.42)', fontSize: 22, fontWeight: 800 }}>
                    {item.cost_points.toLocaleString('pt-BR')} pts
                  </div>
                  <button
                    type="button"
                    disabled={!canRedeem}
                    onClick={() => setSelected(item)}
                    style={{
                      height: 60,
                      minWidth: 156,
                      border: 'none',
                      borderRadius: 14,
                      background: canRedeem ? 'var(--c-totem)' : 'rgba(255,255,255,.1)',
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 800,
                      cursor: canRedeem ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {canRedeem ? 'Resgatar' : 'Sem saldo'}
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>

      {selected && (
        <div className="ih-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="ih-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-p" style={{ textAlign: 'center' }}>
              <div className="ih-action-icon" style={{ margin: '0 auto 16px' }}>
                <Icon name="gift" size={22} />
              </div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--ink)', fontSize: 20, fontWeight: 800 }}>
                Confirmar resgate
              </h2>
              <p style={{ margin: '0 0 18px', color: 'var(--ink-2)', fontSize: 14 }}>
                Resgatar <strong>{selected.name}</strong> por {selected.cost_points.toLocaleString('pt-BR')} pontos?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-muted btn-lg"
                  type="button"
                  style={{ flex: 1, minHeight: 60, fontSize: 18 }}
                  onClick={() => setSelected(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-success btn-lg"
                  type="button"
                  style={{ flex: 1, minHeight: 60, fontSize: 18 }}
                  disabled={redeeming}
                  onClick={confirmRedeem}
                >
                  {redeeming ? 'Resgatando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="ih-modal-backdrop">
          <div className="ih-modal">
            <div className="card-p" style={{ textAlign: 'center' }}>
              <div className="ih-action-icon" style={{ margin: '0 auto 16px', color: 'var(--green)', background: 'rgba(0,166,81,.1)' }}>
                <Icon name="check-circle" size={22} />
              </div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--ink)', fontSize: 20, fontWeight: 800 }}>
                Resgate realizado
              </h2>
              <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>
                As instrucoes de <strong>{success.name}</strong> serao enviadas por e-mail.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
