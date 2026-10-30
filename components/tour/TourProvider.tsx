'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Icon from '@/components/shared/Icon'
import { clearUserCache } from '@/hooks/useUser'
import { signOut } from '@/services/auth.service'
import { approveIdea } from '@/services/managementService'
import { createClient } from '@/lib/supabase/client'
import { currentPersona, loginAs, personaUserId, resetDemo, type PersonaId } from '@/lib/mock/session'
import {
  PAGE_LABEL,
  PAGE_STEP,
  PROFILE_STEP,
  ROLE_LABEL,
  STEPS,
  TOTAL_SEC,
  normalizePath,
  pageKey,
  type TourRun,
} from './steps'

// Tour guiado opcional. Os controles (Voltar e Próximo) ficam fixos no canto da tela; o balão de
// texto se move até a parte do site que está sendo mostrada. O site segue navegável: quando a pessoa
// explora por conta, o botão vibra e oferece o tour daquela aba ou perfil. Estado em sessionStorage.

const STORAGE_KEY = 'ih-demo-tour'
const MAX_DISMISSALS = 3

type TourState = {
  on: boolean
  i: number
  min: boolean
  tip: boolean
  nudged: Record<string, true>
  dismissals: number
}
type Nudge = { kind: 'page' | 'profile'; step: number; path: string; label: string }
type Banner = { from: string; to: string }

const DEFAULT_STATE: TourState = { on: false, i: 0, min: false, tip: true, nudged: {}, dismissals: 0 }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const minLabel = (s: number) => (s >= 60 ? `~${Math.round(s / 60)} min` : `${s}s`)
const personaLabel = (p: PersonaId | null) => (p ? ROLE_LABEL[p] : 'Tela inicial')

function loadState(): TourState {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<TourState>) } : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

function findTarget(sel: string): Element | null {
  if (sel === '@publish') {
    return Array.from(document.querySelectorAll('button')).find((b) => /Simular publicação|Publicar no Hub/.test(b.textContent ?? '')) ?? null
  }
  return document.querySelector(sel)
}

function post(message: Record<string, unknown>) {
  window.postMessage({ type: 'PITCH_CMD', ...message }, '*')
}

/** Espera a página da Eura avisar que terminou a fala (as demos já existentes avisam por mensagem). */
function waitDone(ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage)
      resolve(false)
    }, ms)
    function onMessage(e: MessageEvent) {
      if (e.data?.type !== 'PITCH_RESPONSE_DONE') return
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve(true)
    }
    window.addEventListener('message', onMessage)
  })
}

/** Aprova a ideia da funcionária que está na fila do gestor, como no pitch. */
async function approveDemoIdea() {
  try {
    const supabase = createClient()
    const anaId = personaUserId('funcionario')
    const gestorId = personaUserId('gestor')
    if (!anaId || !gestorId) return
    const { data } = await supabase
      .from('ideas')
      .select('id')
      .eq('author_id', anaId)
      .eq('status', 'em_analise')
      .limit(1)
    const ideaId = data?.[0]?.id
    if (ideaId) await approveIdea(ideaId, gestorId)
  } catch {
    // a demonstração segue mesmo que a aprovação automática falhe
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/** Posiciona o balão ao lado do elemento mostrado, sem cobri-lo nem a barra de controles. */
function placeBubble(bubble: HTMLElement, bar: HTMLElement, target: Element | null) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = bubble.offsetWidth
  const h = bubble.offsetHeight
  const M = 12
  const G = 14
  const barRect = bar.getBoundingClientRect()

  let left = vw - w - 16
  let top = barRect.top - h - 10
  let side = 'none'
  let arrow = 0

  const r = target?.getBoundingClientRect()
  if (target && r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) {
    // Prefere o lado do elemento (não cobre o conteúdo abaixo dele); acima e abaixo ficam de reserva
    const bySpace = (a: { space: number }, b: { space: number }) => b.space - a.space
    const sides = [
      ...[
        { s: 'right', space: vw - r.right },
        { s: 'left', space: r.left },
      ].sort(bySpace),
      ...[
        { s: 'bottom', space: vh - r.bottom },
        { s: 'top', space: r.top },
      ].sort(bySpace),
    ]

    for (const { s } of sides) {
      let x: number
      let y: number
      if (s === 'right') { x = r.right + G; y = clamp(r.top + r.height / 2 - h / 2, M, vh - h - M) }
      else if (s === 'left') { x = r.left - G - w; y = clamp(r.top + r.height / 2 - h / 2, M, vh - h - M) }
      else if (s === 'bottom') { x = clamp(r.left + r.width / 2 - w / 2, M, vw - w - M); y = r.bottom + G }
      else { x = clamp(r.left + r.width / 2 - w / 2, M, vw - w - M); y = r.top - G - h }

      if (x < M || x + w > vw - M || y < M || y + h > vh - M) continue
      const hitsBar = x < barRect.right && x + w > barRect.left && y < barRect.bottom && y + h > barRect.top
      if (hitsBar) continue

      left = x
      top = y
      side = s
      arrow = s === 'right' || s === 'left'
        ? clamp(r.top + r.height / 2 - y, 20, h - 20)
        : clamp(r.left + r.width / 2 - x, 20, w - 20)
      break
    }
  }

  // A primeira colocação é instantânea; só os movimentos seguintes (de um passo ao outro) animam
  const first = !bubble.classList.contains('placed')
  if (first) bubble.style.transition = 'none'
  bubble.style.left = `${Math.round(left)}px`
  bubble.style.top = `${Math.round(top)}px`
  bubble.dataset.side = side
  bubble.style.setProperty('--arrow', `${Math.round(arrow)}px`)
  if (first) {
    void bubble.offsetWidth
    bubble.classList.add('placed')
    requestAnimationFrame(() => {
      bubble.style.transition = ''
    })
  }
}

export default function TourProvider() {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [tour, setTour] = useState<TourState>(DEFAULT_STATE)
  const [nudge, setNudge] = useState<Nudge | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)

  const tourRef = useRef(tour)
  const pathRef = useRef(pathname)
  const runRef = useRef(0)
  const skipUntil = useRef(0)
  const pendingLogin = useRef<string | null>(null)
  const prev = useRef<{ persona: PersonaId | null; path: string } | null>(null)
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const save = useCallback((next: TourState) => {
    tourRef.current = next
    setTour(next)
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // sem armazenamento: o tour segue só em memória
    }
  }, [])

  const clearNudge = useCallback(() => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current)
    setNudge(null)
  }, [])

  useEffect(() => {
    const loaded = loadState()
    tourRef.current = loaded
    setTour(loaded)
    setReady(true)
  }, [])

  const runDemo = useCallback(async (kind: TourRun, run: number) => {
    const alive = () => runRef.current === run
    if (kind === 'helpdesk' || kind === 'badword') {
      post({ action: 'DEMO_AI', demo: kind })
    } else if (kind === 'voice') {
      post({ action: 'TOUR_VOICE' })
    } else {
      post({ action: 'DEMO_AI', demo: 'idea' })
      if (!(await waitDone(9000)) && alive()) {
        post({ action: 'DEMO_AI', demo: 'idea' })
        await waitDone(9000)
      }
      for (let k = 0; k < 4; k++) {
        if (!alive()) return
        await sleep(700)
        post({ action: 'DEMO_ADVANCE' })
        await waitDone(15000)
      }
    }
  }, [])

  const enterStep = useCallback(
    async (i: number, opts: { keepPath?: boolean } = {}) => {
      clearNudge()
      const run = ++runRef.current
      skipUntil.current = Date.now() + 3500
      const st = STEPS[i]
      save({ ...tourRef.current, on: true, i, tip: false })

      const persona = currentPersona()
      // Deixa explícito em qual perfil o tour está quando ele troca de usuário
      if (persona !== st.persona) {
        setBanner({ from: personaLabel(persona), to: personaLabel(st.persona) })
        if (bannerTimer.current) clearTimeout(bannerTimer.current)
        bannerTimer.current = setTimeout(() => setBanner(null), 3200)
      }

      if (st.persona === null) {
        if (persona) {
          await signOut()
          clearUserCache()
        }
      } else if (persona !== st.persona) {
        loginAs(st.persona)
        clearUserCache()
      }

      if (!opts.keepPath && normalizePath(pathRef.current) !== st.path) router.push(st.path)

      if (st.modal) {
        setTimeout(() => {
          if (runRef.current === run) window.dispatchEvent(new Event('ih:open-login'))
        }, 700)
      } else {
        window.dispatchEvent(new Event('ih:close-login'))
      }

      if (st.run) {
        await sleep(1400)
        if (runRef.current === run) void runDemo(st.run, run)
      }
    },
    [clearNudge, router, runDemo, save]
  )

  const maybeNudge = useCallback(
    (kind: 'page' | 'profile', persona: PersonaId, key: string, path: string) => {
      const t = tourRef.current
      if (t.dismissals >= MAX_DISMISSALS) return
      const step = kind === 'profile' ? PROFILE_STEP[persona] : PAGE_STEP[persona]?.[key]
      if (step === null || step === undefined) return

      if (t.on) {
        const cur = STEPS[t.i]
        if (cur.persona === persona) {
          if (kind === 'profile') return
          if (cur.page === key || cur.also?.some((a) => a.page === key)) return
          if (step === t.i) return
          // clicou no que o passo sugeria: segue para o próximo sem perguntar
          if (step === t.i + 1) {
            void enterStep(step, { keepPath: true })
            return
          }
        }
      }

      const id = `${kind}:${persona}:${kind === 'page' ? key : ''}`
      if (t.nudged[id]) return
      save({ ...t, nudged: { ...t.nudged, [id]: true } })
      setNudge({ kind, step, path, label: kind === 'page' ? PAGE_LABEL[key] ?? key : ROLE_LABEL[persona] })

      requestAnimationFrame(() => {
        const pill = document.querySelector('.tour-pill, .tour-bar')
        pill?.classList.add('shake')
        setTimeout(() => pill?.classList.remove('shake'), 1500)
      })
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current)
      nudgeTimer.current = setTimeout(() => setNudge(null), 15000)
    },
    [enterStep, save]
  )

  // Detecta navegação da própria pessoa (a do tour fica protegida por skipUntil)
  useEffect(() => {
    pathRef.current = pathname
    if (!ready) return
    const persona = currentPersona()
    const before = prev.current
    prev.current = { persona, path: pathname }

    if (pendingLogin.current && normalizePath(pathname) === pendingLogin.current) {
      pendingLogin.current = null
      void enterStep(2)
      return
    }
    if (!before || Date.now() < skipUntil.current) return
    const key = pageKey(pathname)
    if (!persona || !key) return
    if (persona !== before.persona) maybeNudge('profile', persona, key, pathname)
    else if (normalizePath(pathname) !== normalizePath(before.path)) maybeNudge('page', persona, key, pathname)
  }, [pathname, ready, enterStep, maybeNudge])

  // Destaque e posição do balão; reaplicados porque o React recria os elementos da página
  useEffect(() => {
    const clearHighlight = () => document.querySelectorAll('.tour-hl').forEach((e) => e.classList.remove('tour-hl'))
    if (!tour.on || nudge) {
      clearHighlight()
      return
    }
    let scrolledFor = -1
    const tick = () => {
      clearHighlight()
      let target: Element | null = null
      const sel = STEPS[tour.i].hl
      if (sel) {
        try {
          target = findTarget(sel)
        } catch {
          target = null
        }
      }
      target?.classList.add('tour-hl')
      if (target && scrolledFor !== tour.i) {
        scrolledFor = tour.i
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      if (bubbleRef.current && barRef.current) placeBubble(bubbleRef.current, barRef.current, target)
    }
    tick()
    const timer = setInterval(tick, 250)
    window.addEventListener('resize', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', tick)
      clearHighlight()
    }
  }, [tour.on, tour.i, tour.min, nudge])

  function toggle() {
    clearNudge()
    const t = tourRef.current
    if (t.on) {
      runRef.current++
      save({ ...t, on: false, tip: false })
      return
    }
    save({ ...t, tip: false })
    // Quem já estava explorando começa pelo trecho em que está; senão, retoma de onde parou
    const persona = currentPersona()
    const key = pageKey(pathRef.current)
    const here = t.i === 0 && persona && key ? PAGE_STEP[persona]?.[key] : null
    void enterStep(here ?? t.i, { keepPath: here !== null && here !== undefined })
  }

  async function next() {
    const i = tourRef.current.i
    if (i === 1) {
      const button = document.querySelector<HTMLElement>('[data-role="funcionario"]')
      if (button) {
        pendingLogin.current = '/dashboard'
        skipUntil.current = Date.now() + 5000
        setBanner({ from: personaLabel(null), to: personaLabel('funcionario') })
        if (bannerTimer.current) clearTimeout(bannerTimer.current)
        bannerTimer.current = setTimeout(() => setBanner(null), 3200)
        button.click()
        return
      }
    }
    if (i === 8) await approveDemoIdea()
    if (i >= STEPS.length - 1) {
      runRef.current++
      save({ ...tourRef.current, on: false, i: 0 })
      return
    }
    void enterStep(i + 1)
  }

  function previous() {
    const i = tourRef.current.i
    if (i > 0) void enterStep(i - 1)
  }

  function restart() {
    resetDemo()
    clearUserCache()
    save({ ...DEFAULT_STATE, on: true, tip: false })
    void enterStep(0)
  }

  function acceptNudge() {
    if (!nudge) return
    const n = nudge
    clearNudge()
    const st = STEPS[n.step]
    const keepPath = n.kind === 'page' && st.persona === currentPersona() && !st.run
    void enterStep(n.step, { keepPath })
  }

  function declineNudge() {
    clearNudge()
    save({ ...tourRef.current, dismissals: tourRef.current.dismissals + 1 })
  }

  function go(path: string) {
    skipUntil.current = Date.now() + 2500
    router.push(path)
  }

  if (!ready) return null

  const st = STEPS[tour.i]
  const remaining = STEPS.slice(tour.i).reduce((a, s) => a + s.sec, 0)
  const last = tour.i === STEPS.length - 1
  const stepPersona = st.persona ?? 'none'

  return (
    <>
      {banner && (
        <div className="tour-switch" role="status">
          <Icon name="refresh-cw" size={14} />
          <span>Trocando de perfil</span>
          <b>{banner.from}</b>
          <Icon name="chevron-right" size={13} />
          <b>{banner.to}</b>
        </div>
      )}

      {nudge ? (
        <div className="tour-nudge" role="alertdialog" aria-label="Convite para o tour">
          <p>
            {nudge.kind === 'page' ? (
              <>Você está em <b>{nudge.label}</b>. Quer o tour desta aba?</>
            ) : (
              <>Você entrou como <b>{nudge.label}</b>. Quer o tour deste perfil?</>
            )}
          </p>
          <div className="tour-nudge-btns">
            <button type="button" className="primary" onClick={acceptNudge}>Sim, mostrar</button>
            <button type="button" onClick={declineNudge}>Agora não</button>
          </div>
        </div>
      ) : tour.on ? (
        <div ref={bubbleRef} className={`tour-bubble${tour.min ? ' min' : ''}`} role="dialog" aria-label="Tour guiado" data-side="none">
          <div className="tour-top">
            <span className="tour-persona" data-p={stepPersona}>
              <i /> Perfil: {personaLabel(st.persona)}
            </span>
            <button type="button" aria-label={tour.min ? 'Expandir o balão' : 'Recolher o balão'} onClick={() => save({ ...tour, min: !tour.min })}>
              <Icon name={tour.min ? 'plus' : 'minus'} size={12} />
            </button>
          </div>
          <h3>{st.title}</h3>
          <p>{st.text}</p>
          {st.also && (
            <div className="tour-also">
              <span>Ver também:</span>
              {st.also.map((a) => (
                <button key={a.path} type="button" onClick={() => go(a.path)}>{a.label}</button>
              ))}
            </div>
          )}
          {st.restart && (
            <div className="tour-also">
              <button type="button" onClick={restart}>Recomeçar o tour</button>
            </div>
          )}
        </div>
      ) : tour.tip ? (
        <div className="tour-tip" role="status">
          Conheça a história do projeto em {minLabel(TOTAL_SEC)}
          <button type="button" aria-label="Dispensar" onClick={() => save({ ...tour, tip: false })}>
            <Icon name="x" size={12} />
          </button>
        </div>
      ) : null}

      {tour.on ? (
        <div ref={barRef} className="tour-bar" role="group" aria-label="Controles do tour" style={{ ['--p' as string]: (tour.i + 1) / STEPS.length }}>
          <span className="tour-bar-info">
            <Icon name="sparkles" size={14} />
            <span>
              {tour.i + 1}/{STEPS.length} <small>{minLabel(remaining)}</small>
            </span>
          </span>
          <button type="button" className="tour-nav" onClick={previous} disabled={tour.i === 0}>
            Voltar
          </button>
          <button type="button" className="tour-nav primary" onClick={next}>
            {last ? 'Concluir' : 'Próximo'} <Icon name="chevron-right" size={14} />
          </button>
          <button type="button" role="switch" aria-checked="true" aria-label="Desligar o tour" className="tour-switch-btn" onClick={toggle}>
            <span className="tour-sw" />
          </button>
        </div>
      ) : (
        <button
          ref={barRef as unknown as React.RefObject<HTMLButtonElement>}
          type="button"
          role="switch"
          aria-checked={false}
          className={`tour-pill${tour.tip && !nudge ? ' pulse' : ''}`}
          title="Ativar o tour guiado"
          onClick={toggle}
        >
          <Icon name="sparkles" size={15} />
          <span>
            Fazer o tour <small>{minLabel(TOTAL_SEC)}</small>
          </span>
          <span className="tour-sw" />
        </button>
      )}
    </>
  )
}
