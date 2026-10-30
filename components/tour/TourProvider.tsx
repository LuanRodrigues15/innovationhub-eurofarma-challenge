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

// Tour guiado opcional, contado pela Eura em um cartão compacto. Ele mora em um espaço que já está vazio:
// na barra lateral do app (entre o menu e o usuário) e, nas telas sem barra lateral, no canto que cobre
// menos. Voltar e Próximo ficam dentro do cartão, sempre no mesmo lugar. Quando a pessoa mexe em outra
// parte do site, o tour pausa e oferece continuar de onde parou. Estado em sessionStorage.

const STORAGE_KEY = 'ih-demo-tour'
const MAX_DISMISSALS = 3

type TourState = {
  on: boolean
  i: number
  /** Cartão recolhido: fica só a barra com os controles. */
  min: boolean
  tip: boolean
  nudged: Record<string, true>
  dismissals: number
}
type Nudge = { kind: 'page' | 'profile'; step: number; path: string; label: string }
type Banner = { from: string; to: string }
type Anchor = { align: 'left' | 'right' | 'center'; x: number; bottom: number }

const DEFAULT_STATE: TourState = { on: false, i: 0, min: false, tip: true, nudged: {}, dismissals: 0 }
const DEFAULT_ANCHOR: Anchor = { align: 'left', x: 18, bottom: 18 }

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

/* ───────── onde o tour fica: um espaço que já está vazio ───────── */

const OVERLAY_UI = '.tour-dock,.tour-switch'
const INTERACTIVE = 'button,a,[role="button"],input,textarea,select,label'

/** O ponto da tela tem algo que o tour esconderia: texto, botão, campo, ícone ou imagem. */
function isContent(el: Element | null): boolean {
  if (!el || el.closest(OVERLAY_UI)) return false
  if (el.closest(INTERACTIVE) || el instanceof SVGElement || el instanceof HTMLImageElement) return true
  return Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
}

/** Quantos pontos de uma grade 7x5 sobre o retângulo caem em conteúdo da página. */
function coverage(x: number, y: number, w: number, h: number): number {
  let count = 0
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 5; j++) {
      if (isContent(document.elementFromPoint(x + ((i + 0.5) * w) / 7, y + ((j + 0.5) * h) / 5))) count++
    }
  }
  return count
}

/**
 * Escolhe onde ancorar o tour. Nas telas com barra lateral, a zona vazia entre o menu e o usuário (o menor
 * espaço medido é 207 px de altura, em 1280x720 com o perfil de funcionário). Nas demais, o canto de baixo
 * que cobre menos conteúdo. A escolha usa a medição real da página, não uma posição fixa.
 */
function chooseAnchor(dock: HTMLElement, current: Anchor): Anchor {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = dock.offsetWidth
  const h = dock.offsetHeight
  const sidebar = document.querySelector('.ih-sidebar')?.getBoundingClientRect()
  const footer = document.querySelector('.ih-sidebar-footer')?.getBoundingClientRect()
  const landingFoot = document.querySelector('.ih-landing-foot')?.getBoundingClientRect()
  const base = landingFoot ? Math.min(Math.max(vh - landingFoot.top + 8, 18), 120) : 18

  type Cand = { a: Anchor; x: number; y: number; pref: number }
  const cands: Cand[] = []
  const add = (align: Anchor['align'], x: number, y: number, pref: number) => {
    const cy = Math.min(Math.max(y, 12), Math.max(12, vh - h - 12))
    cands.push({ a: { align, x, bottom: vh - cy - h }, x, y: cy, pref })
  }
  if (sidebar && footer && sidebar.width >= 200) {
    add('left', sidebar.left + 12, footer.top - 10 - h, 0)
  }
  // Cantos e laterais da tela: o de baixo é o preferido; o meio e o topo servem de reserva
  const bottomY = vh - base - h
  const middleY = (vh - h) / 2
  add('left', 18, bottomY, 1)
  add('left', 18, middleY, 2)
  add('left', 18, 72, 2.5)
  add('right', vw - w - 18, bottomY, 2)
  add('right', vw - w - 18, middleY, 3)
  add('right', vw - w - 18, 72, 3.5)
  add('center', (vw - w) / 2, bottomY, 3)

  dock.style.pointerEvents = 'none' // o tour não pode "esconder" o que está sob ele na medição
  const scored = cands.map((c) => ({ c, cost: coverage(c.x, c.y, w, h) * 8 + c.pref }))
  dock.style.pointerEvents = ''

  const best = scored.reduce((m, s) => (s.cost < m.cost ? s : m))
  // Histerese: só muda de lugar se o novo for bem melhor, para o tour não ficar pulando
  const stay = scored.find(
    (s) => s.c.a.align === current.align && Math.abs(s.c.a.bottom - current.bottom) < 3 && (s.c.a.align !== 'left' || Math.abs(s.c.a.x - current.x) < 3)
  )
  if (stay && best.cost > stay.cost - 6) return stay.c.a
  return best.c.a
}

/* ───────── peças visuais ───────── */

/** Texto que a Eura "digita". O texto inteiro fica invisível por baixo para o cartão nunca mudar de altura. */
function StepText({ text, animate }: { text: string; animate: boolean }) {
  const [phase, setPhase] = useState<'typing' | 'text'>(animate ? 'typing' : 'text')
  const [n, setN] = useState(animate ? 0 : text.length)

  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setPhase('text'), 450)
    return () => clearTimeout(t)
  }, [animate])

  useEffect(() => {
    if (phase !== 'text' || n >= text.length) return
    const t = setTimeout(() => setN((v) => Math.min(text.length, v + 2)), 12)
    return () => clearTimeout(t)
  }, [phase, n, text])

  return (
    <span className="tw">
      <span className="tw-ghost">{text}</span>
      <span className="tw-live">
        {phase === 'typing' ? <span className="tour-typing"><span /><span /><span /></span> : text.slice(0, n)}
      </span>
    </span>
  )
}

function EuraAvatar({ size = 30 }: { size?: number }) {
  return (
    <span className="tour-eura" style={{ width: size, height: size }}>
      <Icon name="bot" size={Math.round(size * 0.58)} />
    </span>
  )
}

export default function TourProvider() {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [tour, setTour] = useState<TourState>(DEFAULT_STATE)
  const [nudge, setNudge] = useState<Nudge | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [anchor, setAnchor] = useState<Anchor>(DEFAULT_ANCHOR)
  const [off, setOff] = useState(false)
  const [animate, setAnimate] = useState(false)

  const tourRef = useRef(tour)
  const pathRef = useRef(pathname)
  const runRef = useRef(0)
  const skipUntil = useRef(0)
  const pendingLogin = useRef<string | null>(null)
  const prev = useRef<{ persona: PersonaId | null; path: string } | null>(null)
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef(DEFAULT_ANCHOR)

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

  /* ── passos ── */

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
      setAnimate(true)
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
        // Com o tour ligado, mexer em outra parte pausa o tour (cartão de pausa). Só segue sozinho se a pessoa
        // clicou no que o passo sugeria.
        const cur = STEPS[t.i]
        if (cur.persona === persona && kind === 'page' && step === t.i + 1) void enterStep(step, { keepPath: true })
        return
      }

      const id = `${kind}:${persona}:${kind === 'page' ? key : ''}`
      if (t.nudged[id]) return
      save({ ...t, nudged: { ...t.nudged, [id]: true } })
      setNudge({ kind, step, path, label: kind === 'page' ? PAGE_LABEL[key] ?? key : ROLE_LABEL[persona] })

      requestAnimationFrame(() => {
        const dock = document.querySelector('.tour-dock')
        dock?.classList.add('shake')
        setTimeout(() => dock?.classList.remove('shake'), 1500)
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

  // Tour ligado, mas a pessoa foi para outra parte do site: pausa e oferece continuar de onde parou
  useEffect(() => {
    if (!ready || !tour.on) {
      setOff(false)
      return
    }
    const compute = () => {
      const persona = currentPersona()
      const key = pageKey(pathname)
      const st = STEPS[tour.i]
      const here = st.persona === persona && !!key && (key === st.page || !!st.also?.some((a) => a.page === key))
      setOff(!here)
    }
    const timer = setTimeout(compute, Math.max(0, skipUntil.current - Date.now()) + 700)
    return () => clearTimeout(timer)
  }, [pathname, tour.on, tour.i, ready])

  // Destaque do elemento do passo; reaplicado porque o React recria os elementos da página
  useEffect(() => {
    const clearHighlight = () => document.querySelectorAll('.tour-hl').forEach((e) => e.classList.remove('tour-hl'))
    if (!tour.on || nudge || off) {
      clearHighlight()
      return
    }
    let scrolledFor = -1
    const tick = () => {
      clearHighlight()
      const sel = STEPS[tour.i].hl
      if (!sel) return
      let target: Element | null = null
      try {
        target = findTarget(sel)
      } catch {
        target = null
      }
      target?.classList.add('tour-hl')
      if (target && scrolledFor !== tour.i) {
        scrolledFor = tour.i
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    tick()
    const timer = setInterval(tick, 400)
    return () => {
      clearInterval(timer)
      clearHighlight()
    }
  }, [tour.on, tour.i, nudge, off])

  // Ancoragem: reavaliada de tempos em tempos e quando a tela muda de tamanho
  useEffect(() => {
    if (!ready) return
    const choose = () => {
      const dock = dockRef.current
      if (!dock || window.innerWidth <= 640) return
      const next = chooseAnchor(dock, anchorRef.current)
      const cur = anchorRef.current
      if (next.align !== cur.align || Math.abs(next.x - cur.x) > 2 || Math.abs(next.bottom - cur.bottom) > 2) {
        anchorRef.current = next
        setAnchor(next)
      }
    }
    choose()
    const timer = setInterval(choose, 800)
    window.addEventListener('resize', choose)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', choose)
    }
  }, [ready, tour.on, tour.min, tour.i, nudge, off, pathname])

  /* ── ações ── */

  function toggle() {
    clearNudge()
    const t = tourRef.current
    if (t.on) {
      runRef.current++
      save({ ...t, on: false, tip: false })
      return
    }
    save({ ...t, tip: false, min: false })
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
  const persona = currentPersona()
  const key = pageKey(pathname)

  // Na pausa, o que a Eura oferece para a parte do site em que a pessoa está
  const here = persona ? (persona !== st.persona ? PROFILE_STEP[persona] : key ? PAGE_STEP[persona]?.[key] : null) : null
  const pausedOffer = here !== null && here !== undefined && here !== tour.i ? here : null

  const style: React.CSSProperties = {
    bottom: anchor.bottom,
    ...(anchor.align === 'left' ? { left: anchor.x } : anchor.align === 'right' ? { right: 18 } : { left: '50%', transform: 'translateX(-50%)' }),
  }

  const head = (title: string, withPersona: boolean) => (
    <div className="tour-card-head">
      <EuraAvatar size={28} />
      <div className="who">
        <b>Eura</b>
        <small>
          {withPersona ? (
            <span className="tour-persona" data-p={st.persona ?? 'none'}>
              <i /> {personaLabel(st.persona)}
            </span>
          ) : (
            title
          )}
        </small>
      </div>
    </div>
  )

  let body: React.ReactNode
  let mode: string
  if (nudge) {
    mode = 'invite'
    body = (
      <div className="tour-card">
        {head('Convite', false)}
        <p className="tour-text">
          {nudge.kind === 'page' ? (
            <>Você está em <b>{nudge.label}</b>. Quer que eu te mostre esta aba?</>
          ) : (
            <>Você entrou como <b>{nudge.label}</b>. Quer que eu te mostre este perfil?</>
          )}
        </p>
        <div className="tour-actions">
          <button type="button" className="primary" onClick={acceptNudge}>Sim, mostrar</button>
          <button type="button" onClick={declineNudge}>Agora não</button>
        </div>
      </div>
    )
  } else if (tour.on && off) {
    mode = 'paused'
    body = (
      <div className="tour-card">
        {head('Tour em pausa', false)}
        <p className="tour-text">
          Pausei no passo <b>{tour.i + 1} de {STEPS.length}</b>, &quot;{st.title}&quot;, porque você foi para outra parte do site.
        </p>
        <div className="tour-actions stack">
          <button type="button" className="primary" onClick={() => void enterStep(tour.i)}>Continuar de onde parei</button>
          {pausedOffer !== null && (
            <button
              type="button"
              onClick={() => {
                const target = STEPS[pausedOffer]
                void enterStep(pausedOffer, { keepPath: target.persona === persona && !target.run })
              }}
            >
              {persona !== st.persona ? 'Mostrar este perfil' : 'Mostrar esta aba'}
            </button>
          )}
          <button type="button" className="ghost" onClick={toggle}>Sair do tour</button>
        </div>
      </div>
    )
  } else if (tour.on && tour.min) {
    mode = 'min'
    body = (
      <div className="tour-bar">
        <button type="button" className="tour-bar-eura" aria-label="Abrir o texto da Eura" title="Abrir o texto da Eura" onClick={() => save({ ...tour, min: false })}>
          <EuraAvatar size={26} />
        </button>
        <span className="tour-bar-info">{tour.i + 1}/{STEPS.length}</span>
        <button type="button" className="tour-nav" onClick={previous} disabled={tour.i === 0}>Voltar</button>
        <button type="button" className="tour-nav primary" onClick={() => void next()}>
          {last ? 'Concluir' : 'Próximo'} <Icon name="chevron-right" size={14} />
        </button>
      </div>
    )
  } else if (tour.on) {
    mode = 'step'
    body = (
      <div className="tour-card" style={{ ['--p' as string]: (tour.i + 1) / STEPS.length }}>
        <div className="tour-progress"><i /></div>
        <div className="tour-card-top">
          {head(st.title, true)}
          <span className="tour-ctl">
            <button type="button" aria-label="Recolher o texto" title="Recolher o texto" onClick={() => save({ ...tour, min: true })}>
              <Icon name="minus" size={13} />
            </button>
            <button type="button" aria-label="Desligar o tour" title="Desligar o tour" onClick={toggle}>
              <Icon name="x" size={13} />
            </button>
          </span>
        </div>
        <p className="tour-text">
          <StepText key={tour.i} text={st.text} animate={animate} />
        </p>
        {(st.also || st.restart) && (
          <div className="tour-chips">
            {st.also?.map((a) => (
              <button key={a.path} type="button" onClick={() => go(a.path)}>{a.label}</button>
            ))}
            {st.restart && <button type="button" onClick={restart}>Recomeçar o tour</button>}
          </div>
        )}
        <div className="tour-card-foot">
          <span className="tour-count">{tour.i + 1}/{STEPS.length} <small>{minLabel(remaining)}</small></span>
          <button type="button" className="tour-nav" onClick={previous} disabled={tour.i === 0}>Voltar</button>
          <button type="button" className="tour-nav primary" onClick={() => void next()}>
            {last ? 'Concluir' : 'Próximo'} <Icon name="chevron-right" size={14} />
          </button>
        </div>
      </div>
    )
  } else {
    mode = 'off'
    body = (
      <>
        {tour.tip && (
          <div className="tour-tip" role="status">
            A Eura te mostra a história do projeto em {minLabel(TOTAL_SEC)}
            <button type="button" aria-label="Dispensar" onClick={() => save({ ...tour, tip: false })}>
              <Icon name="x" size={12} />
            </button>
          </div>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={false}
          className={`tour-pill${tour.tip ? ' pulse' : ''}`}
          title={tour.i > 0 ? 'Continuar o tour de onde parou' : 'Ativar o tour guiado'}
          onClick={toggle}
        >
          <Icon name="sparkles" size={15} />
          <span>
            {tour.i > 0 ? 'Continuar o tour' : 'Fazer o tour'}{' '}
            <small>{tour.i > 0 ? `${tour.i + 1}/${STEPS.length}` : minLabel(TOTAL_SEC)}</small>
          </span>
          <span className="tour-sw" />
        </button>
      </>
    )
  }

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
      <div ref={dockRef} className="tour-dock" data-mode={mode} style={style} role="region" aria-label="Guia do tour">
        {body}
      </div>
    </>
  )
}
