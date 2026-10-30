/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchItems,
  fetchSettings,
  fetchTransactionLog,
  redeemItem,
  type MarketplaceItem,
  type MarketplaceSettings,
  type TransactionLogItem,
} from '@/services/marketplaceService'

const POINT_KEYS = [
  ['points_publish_idea', 'Publicar ideia'],
  ['points_validate_idea', 'Validar ideia'],
  ['points_idea_to_analysis', 'Ideia entrar em análise'],
  ['points_complete_quiz', 'Concluir quiz'],
  ['points_give_mentorship', 'Conduzir mentoria'],
  ['points_receive_mentorship', 'Concluir mentoria como mentorado'],
] as const

function subscribeTheme(cb: () => void) {
  window.addEventListener('ih:theme', cb)
  return () => window.removeEventListener('ih:theme', cb)
}
function getThemeSnapshot() {
  return typeof window !== 'undefined' && localStorage.getItem('ih-dark-mode') === 'true'
}

// Banner sempre tem fundo escuro — interpola branco→ouro, sem verde no sRGB
function getPointsStyle(points: number, maxCost: number): { color: string; textShadow: string } {
  if (!maxCost || maxCost <= 0) return { color: '#fff', textShadow: 'none' }
  const t = Math.min(1, Math.max(0, points / maxCost))
  if (t < 0.05) return { color: '#fff', textShadow: 'none' }
  const r = Math.round(255 + (212 - 255) * t)
  const g = Math.round(255 + (160 - 255) * t)
  const b = Math.round(255 + (0   - 255) * t)
  const color = `rgb(${r},${g},${b})`
  return { color, textShadow: 'none' }
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MarketplacePage() {
  const { user, loading } = useUser()
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [log, setLog] = useState<TransactionLogItem[]>([])
  const [settings, setSettings] = useState<MarketplaceSettings>({})
  const [points, setPoints] = useState<number | null>(null)
  const [selected, setSelected] = useState<MarketplaceItem | null>(null)
  const [success, setSuccess] = useState<MarketplaceItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  const [logPage, setLogPage] = useState(0)
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false)
  const LOGS_PER_PAGE = 5
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const balance = points ?? user?.points ?? 0
  const showPointsTable = settings.show_points_table_marketplace !== 'false'
  const redeemedThisQuarter = useMemo(
    () =>
      log
        .filter((item) => item.action_type === 'redeem_item')
        .reduce((sum, item) => sum + Math.abs(item.points), 0),
    [log]
  )

  useEffect(() => {
    let active = true

    async function loadMarketplace() {
      if (!user?.id) return

      setDataLoading(true)
      setError(null)

      try {
        const [itemData, logData, settingsData] = await Promise.all([
          fetchItems(),
          fetchTransactionLog(user.id),
          fetchSettings(),
        ])

        if (!active) return
        setItems(itemData)
        setLog(logData)
        setSettings(settingsData)
        setPoints(user.points ?? 0)
      } catch {
        if (active) setError('Erro ao carregar Marketplace.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    loadMarketplace()

    return () => {
      active = false
    }
  }, [user?.id, user?.points])

  useEffect(() => {
    const el = carouselRef.current
    if (!el || items.length === 0) return
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 1)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [items])

  const sortedItems = [...items].sort((a, b) => a.cost_points - b.cost_points)
  const maxMarketplaceCost = sortedItems[sortedItems.length - 1]?.cost_points ?? 0
  const balanceStyle = getPointsStyle(balance, maxMarketplaceCost)
  // Tokens V4-D+ para entradas positivas: azul no light, amarelo no dark
  const positiveColor = isDark ? '#D4A000' : '#0057A8'
  const positiveBg    = isDark ? 'rgba(212,160,0,.12)' : 'rgba(0,87,168,.09)'

  const carouselMask = `linear-gradient(to right, ${canScrollLeft ? 'transparent 0%, ' : ''}black 12px, black calc(100% - 12px)${canScrollRight ? ', transparent 100%' : ''})`

  function scrollCarousel(direction: 'prev' | 'next') {
    const el = carouselRef.current
    if (!el) return
    const cardWidth = 240 + 16
    const currentIndex = Math.round(el.scrollLeft / cardWidth)
    const nextIndex =
      direction === 'next'
        ? Math.min(currentIndex + 3, sortedItems.length - 1)
        : Math.max(currentIndex - 3, 0)
    el.scrollTo({ left: nextIndex * cardWidth, behavior: 'smooth' })
  }

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  async function confirmRedeem() {
    if (!selected || !user?.id) return

    setRedeeming(true)
    setError(null)

    try {
      const result = await redeemItem(user.id, selected.id)
      const updatedLog = await fetchTransactionLog(user.id)
      setPoints(result.newPoints)
      setLog(updatedLog)
      setLogPage(0)
      setSuccess(selected)
      setSelected(null)
      window.setTimeout(() => setSuccess(null), 2200)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao resgatar benefício.'
      setError(message)
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <ProfileShell
      profile="funcionario"
      title="Marketplace"
      subtitle="Troque seus pontos por benefícios exclusivos"
      user={user}
      points={balance}
      notifCount={2}
    >
      <div className="ih-dashboard-stack">
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '22px 12px',
            borderRadius: 'var(--r-xl)',
            background: isDark
              ? 'linear-gradient(135deg, #071120 0%, #0d1f3c 100%)'
              : 'linear-gradient(135deg, #0046AD 0%, #003E7A 100%)',
            color: '#fff',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="award" size={20} style={{ color: 'rgba(255,255,255,0.9)' }} />
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                Saldo disponível
              </div>
              <div className="tabnum" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, ...balanceStyle }}>
                {balance.toLocaleString('pt-BR')}{' '}
                <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 15 }}>pts</span>
              </div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 10.5, fontWeight: 700, marginBottom: 2 }}>Resgatado no histórico</div>
            <div className="tabnum" style={{ color: 'rgba(255,255,255,.80)', fontSize: 16, fontWeight: 800 }}>
              {redeemedThisQuarter.toLocaleString('pt-BR')} pts
            </div>
          </div>
        </section>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(229,62,62,.08)',
              color: 'var(--danger)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <style>{`.ih-carousel::-webkit-scrollbar{display:none}`}</style>

          {/* Seta esquerda */}
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => scrollCarousel('prev')}
              style={{
                position: 'absolute',
                left: -16,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--ink-2)',
              }}
            >
              <Icon name="chevron-left" size={16} />
            </button>
          )}

          {/* Container de scroll */}
          <div
            ref={carouselRef}
            className="ih-carousel"
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingBottom: 4,
              maskImage: carouselMask,
              WebkitMaskImage: carouselMask,
            }}
          >
            {dataLoading ? (
              <div className="card card-p" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>Carregando benefícios...</div>
            ) : (
              sortedItems.map((item, index) => {
                const canRedeem = balance >= item.cost_points

                return (
                  <article
                    className="card"
                    key={item.id}
                    style={{
                      flexShrink: 0,
                      width: 240,
                      scrollSnapAlign: 'start',
                      opacity: canRedeem ? 1 : 0.58,
                      overflow: 'hidden',
                      animation: `fadeUp ${index * 0.06}s ease both`,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        style={{ width: '100%', height: 132, objectFit: 'cover', display: 'block', flexShrink: 0 }}
                      />
                    )}
                    <div className="card-p" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div className="ih-action-icon" style={{ margin: 0, color: isDark ? '#FFC600' : '#D4A000' }}>
                          <Icon name="gift" size={16} />
                        </div>
                        <span className="tag">Benefício</span>
                      </div>
                      <h2 style={{ margin: '0 0 5px', color: 'var(--ink)', fontSize: 14, fontWeight: 800 }}>
                        {item.name}
                      </h2>
                      <p style={{ flex: 1, margin: '0 0 16px', color: 'var(--ink-2)', fontSize: 12, lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto' }}>
                        <div className="tabnum" style={{ color: canRedeem ? (isDark ? '#FFC600' : '#D4A000') : 'var(--ink-3)', fontSize: 14, fontWeight: 800 }}>
                          {item.cost_points.toLocaleString('pt-BR')} pts
                        </div>
                        <button
                          className={`btn btn-sm ${canRedeem ? 'btn-accent' : 'btn-muted'}`}
                          type="button"
                          disabled={!canRedeem}
                          onClick={() => setSelected(item)}
                        >
                          {canRedeem ? 'Resgatar' : 'Insuficiente'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>

          {/* Seta direita */}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => scrollCarousel('next')}
              style={{
                position: 'absolute',
                right: -16,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--ink-2)',
              }}
            >
              <Icon name="chevron-right" size={16} />
            </button>
          )}
        </div>

        <section className="ih-two-col">
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ih-section-head">
              <div className="ih-section-title">Log de Transações</div>
              <span className="badge badge-gray">{log.length}</span>
            </div>
            <div className="ih-list" style={{ flex: 1 }}>
              {log.slice(logPage * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE + LOGS_PER_PAGE).map((item) => (
                <div className="ih-list-row" key={item.id}>
                  <div
                    className="ih-list-dot"
                    style={{
                      color: item.points >= 0 ? positiveColor : 'var(--danger)',
                      background: item.points >= 0 ? positiveBg : 'rgba(229,62,62,.08)',
                    }}
                  >
                    <Icon name={item.points >= 0 ? 'plus' : 'gift'} size={13} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>{item.label}</div>
                    <div style={{ color: 'var(--ink-2)', fontSize: 10.5 }}>{formatDate(item.created_at)}</div>
                  </div>
                  <div
                    className="tabnum"
                    style={{ color: item.points >= 0 ? positiveColor : 'var(--danger)', fontWeight: 800 }}
                  >
                    {item.points > 0 ? '+' : ''}
                    {item.points}
                  </div>
                </div>
              ))}
              {!dataLoading && log.length === 0 && (
                <div className="ih-list-row" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                  Nenhuma transação encontrada.
                </div>
              )}
            </div>
            {log.length > LOGS_PER_PAGE && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 14px', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-muted btn-sm"
                  disabled={logPage === 0}
                  onClick={() => setLogPage((p) => p - 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Icon name="chevron-left" size={13} /> Anterior
                </button>
                <span style={{ color: 'var(--ink-3)', fontSize: 11, fontWeight: 700 }}>
                  {logPage + 1} / {Math.ceil(log.length / LOGS_PER_PAGE)}
                </span>
                <button
                  type="button"
                  className="btn btn-muted btn-sm"
                  disabled={logPage >= Math.ceil(log.length / LOGS_PER_PAGE) - 1}
                  onClick={() => setLogPage((p) => p + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Próximo <Icon name="chevron-right" size={13} />
                </button>
              </div>
            )}
          </div>

          {showPointsTable && (
            <div className="card">
              <div className="ih-section-head">
                <div className="ih-section-title">Como ganhar pontos</div>
              </div>
              <div className="ih-list">
                {POINT_KEYS.map(([key, label]) => (
                  <div className="ih-list-row" key={key}>
                    <div style={{ minWidth: 0, flex: 1, color: 'var(--ink)', fontSize: 12, fontWeight: 800 }}>
                      {label}
                    </div>
                    <div className="ih-points-chip" style={{ borderRadius: 8 }}>
                      +{Number(settings[key] ?? 0).toLocaleString('pt-BR')} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="ih-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="ih-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-p" style={{ textAlign: 'center' }}>
              <div className="ih-action-icon" style={{ margin: '0 auto 16px' }}>
                <Icon name="gift" size={22} />
              </div>
              <h2 style={{ margin: '0 0 6px', color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
                Confirmar resgate
              </h2>
              <p style={{ margin: '0 0 18px', color: 'var(--ink-2)', fontSize: 13 }}>
                Você está resgatando <strong>{selected.name}</strong>.
              </p>

              <div className="ih-kv-grid" style={{ marginBottom: 18 }}>
                <div className="ih-kv">
                  <div className="ih-kv-label">Custo</div>
                  <div className="ih-kv-value" style={{ color: 'var(--danger)' }}>
                    - {selected.cost_points.toLocaleString('pt-BR')} pts
                  </div>
                </div>
                <div className="ih-kv">
                  <div className="ih-kv-label">Saldo após</div>
                  <div className="ih-kv-value" style={{ color: positiveColor }}>
                    {(balance - selected.cost_points).toLocaleString('pt-BR')} pts
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-muted btn-md" type="button" style={{ flex: 1 }} onClick={() => setSelected(null)}>
                  Cancelar
                </button>
                <button className="btn btn-accent btn-md" type="button" style={{ flex: 1 }} disabled={redeeming} onClick={confirmRedeem}>
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
              <div className="ih-action-icon" style={{ margin: '0 auto 16px', color: positiveColor, background: positiveBg }}>
                <Icon name="check-circle" size={22} />
              </div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
                Resgate realizado
              </h2>
              <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.6 }}>
                <strong>{success.name}</strong> foi processado. Você receberá as instruções por e-mail.
              </p>
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  )
}
