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
  /** Posição escolhida arrastando o balão; null = automática. */
  pos: { x: number; y: number } | null
}
type Nudge = { kind: 'page' | 'profile'; step: number; path: string; label: string }
type Banner = { from: string; to: string }

const DEFAULT_STATE: TourState = { on: false, i: 0, min: false, tip: true, nudged: {}, dismissals: 0, pos: null }

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

type Cand = { x: number; y: number; near: boolean; pref: number }
type PlaceCtx = { sig: string; t: number }

const OVERLAY_UI = '.tour-bar,.tour-nudge,.tour-tip,.tour-switch'
const INTERACTIVE = 'button,a,[role="button"],input,textarea,select,label'

/** O ponto da tela tem algo que o balão esconderia: texto, botão, campo, ícone ou imagem. */
function isContent(el: Element | null): boolean {
  if (!el || el.closest(OVERLAY_UI)) return false
  if (el.closest(INTERACTIVE) || el instanceof SVGElement || el instanceof HTMLImageElement) return true
  return Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
}

/** Quantos pontos de uma grade 7x5 sobre o retângulo caem em conteúdo da página. */
function coverage(x: number, y: number, w: number, h: number): number {
  let hits = 0
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 5; j++) {
      if (isContent(document.elementFromPoint(x + ((i + 0.5) * w) / 7, y + ((j + 0.5) * h) / 5))) hits++
    }
  }
  return hits
}

type Box = { left: number; top: number; right: number; bottom: number }
const hits = (a: Box, b: Box, pad = 0) =>
  a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad

/** Lado do elemento em que o balão está encostado (para a setinha), ou none. */
function sideOf(x: number, y: number, w: number, h: number, r: DOMRect | null) {
  const G = 14
  const tol = 8
  if (!r) return { side: 'none', arrow: 0 }
  const overlapY = y < r.bottom && y + h > r.top
  const overlapX = x < r.right && x + w > r.left
  if (overlapY && Math.abs(x - (r.right + G)) <= tol) return { side: 'right', arrow: clamp(r.top + r.height / 2 - y, 20, h - 20) }
  if (overlapY && Math.abs(x + w - (r.left - G)) <= tol) return { side: 'left', arrow: clamp(r.top + r.height / 2 - y, 20, h - 20) }
  if (overlapX && Math.abs(y - (r.bottom + G)) <= tol) return { side: 'bottom', arrow: clamp(r.left + r.width / 2 - x, 20, w - 20) }
  if (overlapX && Math.abs(y + h - (r.top - G)) <= tol) return { side: 'top', arrow: clamp(r.left + r.width / 2 - x, 20, w - 20) }
  return { side: 'none', arrow: 0 }
}

function candidatesFor(vw: number, vh: number, w: number, h: number, r: DOMRect | null, barRect: DOMRect): Cand[] {
  const M = 12
  const G = 14
  const out: Cand[] = []
  const fit = (x: number, y: number) => x >= M && x + w <= vw - M && y >= M && y + h <= vh - M

  if (r) {
    // Colado no elemento (com setinha) e também a algumas distâncias, para achar um espaço vazio perto
    for (const gap of [G, 120, 240]) {
      const adjacent = gap === G
      for (const dy of [-h / 2 + r.height / 2, -16, r.height - h + 16]) {
        const y = clamp(r.top + dy, M, vh - h - M)
        if (fit(r.right + gap, y)) out.push({ x: r.right + gap, y, near: adjacent, pref: adjacent ? 0 : 1 })
        if (fit(r.left - gap - w, y)) out.push({ x: r.left - gap - w, y, near: adjacent, pref: adjacent ? 0 : 1 })
      }
      for (const dx of [-w / 2 + r.width / 2, -16, r.width - w + 16]) {
        const x = clamp(r.left + dx, M, vw - w - M)
        if (fit(x, r.bottom + gap)) out.push({ x, y: r.bottom + gap, near: adjacent, pref: adjacent ? 0.5 : 1.5 })
        if (fit(x, r.top - gap - h)) out.push({ x, y: r.top - gap - h, near: adjacent, pref: adjacent ? 0.5 : 1.5 })
      }
    }
  }

  // Grade geral pela tela: a ponta de baixo à direita (acima da barra) é o lugar de repouso
  const room = Math.max(0, barRect.top - h - 10 - M)
  for (const fx of [0, 0.5, 1]) {
    for (const fy of [0, 0.5, 1]) {
      const dock = fx === 1 && fy === 1
      out.push({ x: M + fx * (vw - w - 2 * M), y: dock ? barRect.top - h - 10 : M + fy * room, near: false, pref: r ? 3 : dock ? 0 : 2 })
    }
  }
  return out
}

/**
 * Posiciona o balão no lugar que cobre menos conteúdo da página, de preferência ao lado do elemento
 * mostrado. Não cobre o elemento nem a barra de controles. Uma posição arrastada pela pessoa vale
 * mais que a automática.
 */
function placeBubble(
  bubble: HTMLElement,
  bar: HTMLElement,
  target: Element | null,
  manual: { x: number; y: number } | null,
  ctx: PlaceCtx,
  step: number,
  minimized: boolean
) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = bubble.offsetWidth
  const h = bubble.offsetHeight
  const barRect = bar.getBoundingClientRect()

  let tr: DOMRect | null = target?.getBoundingClientRect() ?? null
  if (tr && !(tr.width > 0 && tr.height > 0 && tr.bottom > 0 && tr.top < vh && tr.right > 0 && tr.left < vw)) tr = null

  let x: number
  let y: number
  if (manual) {
    x = clamp(manual.x, 8, Math.max(8, vw - w - 8))
    y = clamp(manual.y, 8, Math.max(8, vh - h - 8))
  } else {
    const sig = `${step}|${minimized}|${vw}x${vh}|${tr ? [tr.left, tr.top, tr.width, tr.height].map(Math.round).join(',') : 'none'}`
    const now = performance.now()
    // Reavalia só quando algo mudou ou de tempos em tempos (a página muda com as demos)
    if (ctx.sig === sig && now - ctx.t < 1500 && bubble.classList.contains('placed')) return
    ctx.sig = sig
    ctx.t = now

    const tBox: Box | null = tr ? { left: tr.left, top: tr.top, right: tr.right, bottom: tr.bottom } : null
    const barBox: Box = { left: barRect.left, top: barRect.top, right: barRect.right, bottom: barRect.bottom }
    const ok = (cx: number, cy: number) => {
      const box = { left: cx, top: cy, right: cx + w, bottom: cy + h }
      return !(tBox && hits(box, tBox, 8)) && !hits(box, barBox, 6)
    }
    const cost = (c: Cand) => {
      const cover = coverage(c.x, c.y, w, h)
      const dist = tr ? Math.hypot(c.x + w / 2 - (tr.left + tr.width / 2), c.y + h / 2 - (tr.top + tr.height / 2)) : 0
      // Cobrir conteúdo pesa mais; ficar longe do elemento também, para a linha de ligação não ficar enorme
      return cover * 8 + c.pref + dist / (c.near ? 90 : 60) + Math.max(0, dist - 350) / 25
    }

    bubble.style.pointerEvents = 'none' // o balão não pode "esconder" o que está sob ele na medição
    let best: { c: Cand; cost: number } | null = null
    for (const c of candidatesFor(vw, vh, w, h, tr, barRect)) {
      if (!ok(c.x, c.y)) continue
      const value = cost(c)
      if (!best || value < best.cost) best = { c, cost: value }
    }

    // Histerese: só sai do lugar atual se o novo for bem melhor, para o balão não ficar pulando
    const curX = parseFloat(bubble.style.left)
    const curY = parseFloat(bubble.style.top)
    if (best && bubble.classList.contains('placed') && Number.isFinite(curX) && Number.isFinite(curY) && ok(curX, curY)) {
      const adjacent = sideOf(curX, curY, w, h, tr).side !== 'none'
      const current = cost({ x: curX, y: curY, near: adjacent, pref: adjacent ? 0 : tr ? 3 : 0 })
      if (best.cost > current - 6) best = { c: { x: curX, y: curY, near: adjacent, pref: 0 }, cost: current }
    }
    bubble.style.pointerEvents = ''

    x = best ? best.c.x : vw - w - 16
    y = best ? best.c.y : barRect.top - h - 10
  }

  const { side, arrow } = manual ? { side: 'none', arrow: 0 } : sideOf(x, y, w, h, tr)

  // A primeira colocação é instantânea; só os movimentos seguintes (de um passo ao outro) animam
  const first = !bubble.classList.contains('placed')
  if (first) bubble.style.transition = 'none'
  bubble.style.left = `${Math.round(x)}px`
  bubble.style.top = `${Math.round(y)}px`
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
  const dragging = useRef(false)
  const targetEl = useRef<Element | null>(null)
  const linkRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
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
    const ctx: PlaceCtx = { sig: '', t: 0 }
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
      targetEl.current = target
      if (target && scrolledFor !== tour.i) {
        scrolledFor = tour.i
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      if (bubbleRef.current && barRef.current && !dragging.current) {
        placeBubble(bubbleRef.current, barRef.current, target, tourRef.current.pos, ctx, tour.i, tour.min)
      }
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

  // Quando o balão fica longe do elemento (para não cobrir a página), uma linha pontilhada liga os dois
  useEffect(() => {
    if (!tour.on || nudge) return
    let raf = 0
    const frame = () => {
      const line = linkRef.current
      const dot = dotRef.current
      const bubble = bubbleRef.current
      const target = targetEl.current
      if (line && dot) {
        const t = target?.getBoundingClientRect()
        const show = !!(bubble && t && t.width > 0 && t.height > 0 && bubble.dataset.side === 'none' && bubble.classList.contains('placed'))
        if (show && bubble && t) {
          const b = bubble.getBoundingClientRect()
          const p1 = { x: clamp(t.left + t.width / 2, b.left, b.right), y: clamp(t.top + t.height / 2, b.top, b.bottom) }
          const p2 = { x: clamp(p1.x, t.left, t.right), y: clamp(p1.y, t.top, t.bottom) }
          line.setAttribute('x1', String(p1.x))
          line.setAttribute('y1', String(p1.y))
          line.setAttribute('x2', String(p2.x))
          line.setAttribute('y2', String(p2.y))
          dot.setAttribute('cx', String(p2.x))
          dot.setAttribute('cy', String(p2.y))
        }
        line.style.opacity = show ? '1' : '0'
        dot.style.opacity = show ? '1' : '0'
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [tour.on, nudge])

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

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    const bubble = bubbleRef.current
    if (!bubble) return
    const rect = bubble.getBoundingClientRect()
    const dx = e.clientX - rect.left
    const dy = e.clientY - rect.top
    let last = { x: rect.left, y: rect.top }
    let moved = false
    dragging.current = true
    bubble.style.transition = 'none'
    const move = (ev: PointerEvent) => {
      moved = true
      last = {
        x: clamp(ev.clientX - dx, 8, window.innerWidth - rect.width - 8),
        y: clamp(ev.clientY - dy, 8, window.innerHeight - rect.height - 8),
      }
      bubble.style.left = `${Math.round(last.x)}px`
      bubble.style.top = `${Math.round(last.y)}px`
      bubble.dataset.side = 'none'
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      bubble.style.transition = ''
      dragging.current = false
      if (moved) save({ ...tourRef.current, pos: last })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    e.preventDefault()
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
        <>
        <svg className="tour-link" aria-hidden="true">
          <line ref={linkRef} />
          <circle ref={dotRef} r="4" />
        </svg>
        <div ref={bubbleRef} className={`tour-bubble${tour.min ? ' min' : ''}`} role="dialog" aria-label="Tour guiado" data-side="none">
          <div
            className="tour-top"
            title="Arraste para mover o balão"
            onPointerDown={startDrag}
            onDoubleClick={() => save({ ...tour, pos: null })}
          >
            <span className="tour-persona" data-p={stepPersona}>
              <i /> Perfil: {personaLabel(st.persona)}
            </span>
            <span className="tour-ctl">
              {tour.pos && (
                <button type="button" aria-label="Posicionar automaticamente" title="Posicionar automaticamente" onClick={() => save({ ...tour, pos: null })}>
                  <Icon name="refresh-cw" size={12} />
                </button>
              )}
              <button type="button" aria-label={tour.min ? 'Expandir o balão' : 'Recolher o balão'} onClick={() => save({ ...tour, min: !tour.min })}>
                <Icon name={tour.min ? 'plus' : 'minus'} size={12} />
              </button>
            </span>
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
        </>
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
