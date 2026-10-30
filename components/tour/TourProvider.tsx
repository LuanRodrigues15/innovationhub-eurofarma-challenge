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

// Tour guiado opcional, contado pela Eura em um chat que pode ser minimizado ou maximizado. Os controles
// (Voltar e Próximo) ficam fixos no canto; o chat escolhe o canto que cobre menos a página. O site segue
// navegável: quando a pessoa explora por conta, o botão vibra e a Eura oferece o tour daquela aba ou perfil.

const STORAGE_KEY = 'ih-demo-tour'
const MAX_DISMISSALS = 3
const MAX_MESSAGES = 40

type TourState = {
  on: boolean
  i: number
  /** Chat aberto (false = minimizado: só a barra de controles). */
  open: boolean
  /** Chat maximizado. */
  big: boolean
  tip: boolean
  nudged: Record<string, true>
  dismissals: number
}
type Nudge = { kind: 'page' | 'profile'; step: number; path: string; label: string }
type Banner = { from: string; to: string }
type ChatMsg = { id: number; from: 'eura' | 'user' | 'sys'; text?: string; title?: string; typing?: boolean; fresh?: boolean }

const DEFAULT_STATE: TourState = { on: false, i: 0, open: true, big: false, tip: true, nudged: {}, dismissals: 0 }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const minLabel = (s: number) => (s >= 60 ? `~${Math.round(s / 60)} min` : `${s}s`)
const personaLabel = (p: PersonaId | null) => (p ? ROLE_LABEL[p] : 'Tela inicial')
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

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

/* ───────── onde o chat fica: o canto que cobre menos a página ───────── */

const OVERLAY_UI = '.tour-bar,.tour-nudge,.tour-tip,.tour-switch'
const INTERACTIVE = 'button,a,[role="button"],input,textarea,select,label'

/** O ponto da tela tem algo que o chat esconderia: texto, botão, campo, ícone ou imagem. */
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

/* ───────── conversa ───────── */

const FAQ: Array<{ test: RegExp; reply: string }> = [
  { test: /(dado|ficticio|real|verdade|banco)/, reply: 'Todos os dados são fictícios e ficam só na sua aba. Fechou a aba, a demonstração recomeça do zero.' },
  { test: /(senha|login|entrar|acesso|cadastro)/, reply: 'Não precisa de senha: cada botão de "Acessar como" entra direto em um perfil. Dá para sair pelo botão no menu e escolher outro.' },
  { test: /(totem)/, reply: 'O Totem é a versão para tablets no chão de fábrica: login por matrícula, botões grandes e ideia por voz.' },
  { test: /(gestor|triagem|score)/, reply: 'O gestor decide quanto pesa a nota da IA e quanto pesa a da comunidade, aprova ideias e acompanha as métricas do setor.' },
  { test: /(admin|administrador|regra|configur)/, reply: 'O administrador gerencia usuários, cursos, moderação e as regras da plataforma, como quantos apoios uma ideia precisa.' },
  { test: /(pont[ou]|nivel|ranking|premio|marketplace|recompensa)/, reply: 'Participar gera pontos (ideia publicada, validação, curso, mentoria). Os pontos sobem o nível e podem virar benefícios no Marketplace.' },
  { test: /(eura|ia\b|inteligencia)/, reply: 'Eu sou a Eura, a IA do HUB. Na plataforma eu ajudo a estruturar a ideia, calculo o AI Score e filtro conteúdo inadequado. Nesta demonstração, respondo por regras simples.' },
  { test: /(quem fez|projeto|fiap|eurofarma|autor)/, reply: 'É um projeto da FIAP Global Solution para o desafio da Eurofarma. Esta é a versão de portfolio, que roda inteira no navegador.' },
]

const SUGGESTIONS = ['Os dados são reais?', 'Como funciona a pontuação?']

function Typewriter({ text, onGrow, onDone }: { text: string; onGrow: () => void; onDone: () => void }) {
  const [n, setN] = useState(0)
  const grow = useRef(onGrow)
  const done = useRef(onDone)
  grow.current = onGrow
  done.current = onDone
  useEffect(() => {
    if (n >= text.length) {
      done.current()
      return
    }
    const t = setTimeout(() => {
      setN((v) => Math.min(text.length, v + 2))
      grow.current()
    }, 12)
    return () => clearTimeout(t)
  }, [n, text])
  return <>{text.slice(0, n)}</>
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
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [typedId, setTypedId] = useState(0)
  const [unread, setUnread] = useState(0)
  const [dock, setDock] = useState<'right' | 'left'>('right')
  const [draft, setDraft] = useState('')

  const tourRef = useRef(tour)
  const pathRef = useRef(pathname)
  const runRef = useRef(0)
  const skipUntil = useRef(0)
  const pendingLogin = useRef<string | null>(null)
  const prev = useRef<{ persona: PersonaId | null; path: string } | null>(null)
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<'right' | 'left'>('right')

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

  const scrollChat = useCallback(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  /* ── mensagens ── */

  const addMsg = useCallback((msg: Omit<ChatMsg, 'id'>) => {
    const id = ++idRef.current
    setChat((c) => [...c, { ...msg, id }].slice(-MAX_MESSAGES))
    return id
  }, [])

  /** A Eura "digita" e então fala o passo. */
  const say = useCallback(
    (step: number, instant = false) => {
      const st = STEPS[step]
      const id = ++idRef.current
      const content = { from: 'eura' as const, title: st.title, text: st.text }
      if (instant) {
        setChat((c) => [...c, { id, ...content }].slice(-MAX_MESSAGES))
        setTypedId(id)
        return
      }
      setChat((c) => [...c.filter((m) => !m.typing), { id, from: 'eura' as const, typing: true }].slice(-MAX_MESSAGES))
      setTimeout(() => {
        setChat((c) => c.map((m) => (m.id === id ? { id, ...content, fresh: true } : m)))
        if (!tourRef.current.open) setUnread((n) => n + 1)
      }, 650)
    },
    []
  )

  useEffect(() => {
    const loaded = loadState()
    tourRef.current = loaded
    setTour(loaded)
    setReady(true)
    if (loaded.on) say(loaded.i, true)
  }, [say])

  useEffect(() => {
    scrollChat()
  }, [chat, typedId, tour.open, tour.big, scrollChat])

  useEffect(() => {
    if (tour.open) setUnread(0)
  }, [tour.open])

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
      save({ ...tourRef.current, on: true, i, tip: false })

      const persona = currentPersona()
      // Deixa explícito em qual perfil o tour está quando ele troca de usuário
      if (persona !== st.persona) {
        setBanner({ from: personaLabel(persona), to: personaLabel(st.persona) })
        if (bannerTimer.current) clearTimeout(bannerTimer.current)
        bannerTimer.current = setTimeout(() => setBanner(null), 3200)
        addMsg({ from: 'sys', text: `Perfil: ${personaLabel(st.persona)}` })
      }
      say(i)

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
    [addMsg, clearNudge, router, runDemo, save, say]
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

  // Destaque do elemento do passo; reaplicado porque o React recria os elementos da página
  useEffect(() => {
    const clearHighlight = () => document.querySelectorAll('.tour-hl').forEach((e) => e.classList.remove('tour-hl'))
    if (!tour.on || nudge) {
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
  }, [tour.on, tour.i, nudge])

  // O chat fica no canto (direito ou esquerdo) que cobre menos texto e botões e nunca o elemento mostrado
  useEffect(() => {
    if (!tour.on || !tour.open || nudge) return
    const choose = () => {
      const panel = panelRef.current
      if (!panel || window.innerWidth <= 640) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = panel.offsetWidth
      const h = panel.offsetHeight
      const y = vh - h - 76
      let tr: DOMRect | null = null
      const sel = STEPS[tourRef.current.i].hl
      if (sel) {
        try {
          tr = findTarget(sel)?.getBoundingClientRect() ?? null
        } catch {
          tr = null
        }
      }
      const spots = { right: vw - w - 18, left: 18 }
      panel.style.pointerEvents = 'none' // o chat não pode "esconder" o que está sob ele na medição
      const cost = (side: 'right' | 'left') => {
        const x = spots[side]
        let c = coverage(x, y, w, h) * 8 + (side === 'left' ? 1 : 0)
        if (tr && x < tr.right + 8 && x + w > tr.left - 8 && y < tr.bottom + 8 && y + h > tr.top - 8) c += 500
        return c
      }
      const right = cost('right')
      const left = cost('left')
      panel.style.pointerEvents = ''
      const next = dockRef.current === 'right' ? (left < right - 6 ? 'left' : 'right') : right < left - 6 ? 'right' : 'left'
      if (next !== dockRef.current) {
        dockRef.current = next
        setDock(next)
      }
    }
    choose()
    const timer = setInterval(choose, 900)
    window.addEventListener('resize', choose)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', choose)
    }
  }, [tour.on, tour.open, tour.big, tour.i, nudge])

  /* ── ações ── */

  function toggle() {
    clearNudge()
    const t = tourRef.current
    if (t.on) {
      runRef.current++
      save({ ...t, on: false, tip: false })
      return
    }
    save({ ...t, tip: false, open: true })
    // Quem já estava explorando começa pelo trecho em que está; senão, retoma de onde parou
    const persona = currentPersona()
    const key = pageKey(pathRef.current)
    const here = t.i === 0 && persona && key ? PAGE_STEP[persona]?.[key] : null
    void enterStep(here ?? t.i, { keepPath: here !== null && here !== undefined })
  }

  async function next(label = 'Próximo') {
    const i = tourRef.current.i
    if (i >= STEPS.length - 1) {
      runRef.current++
      save({ ...tourRef.current, on: false, i: 0 })
      setChat([])
      return
    }
    addMsg({ from: 'user', text: label })
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
    void enterStep(i + 1)
  }

  function previous(label = 'Voltar') {
    const i = tourRef.current.i
    if (i <= 0) return
    addMsg({ from: 'user', text: label })
    void enterStep(i - 1)
  }

  function restart() {
    resetDemo()
    clearUserCache()
    setChat([])
    save({ ...DEFAULT_STATE, on: true, tip: false })
    void enterStep(0)
  }

  function acceptNudge() {
    if (!nudge) return
    const n = nudge
    clearNudge()
    const st = STEPS[n.step]
    const keepPath = n.kind === 'page' && st.persona === currentPersona() && !st.run
    addMsg({ from: 'user', text: 'Sim, mostrar' })
    void enterStep(n.step, { keepPath })
  }

  function declineNudge() {
    clearNudge()
    save({ ...tourRef.current, dismissals: tourRef.current.dismissals + 1 })
  }

  function go(path: string, label: string) {
    skipUntil.current = Date.now() + 2500
    addMsg({ from: 'user', text: label })
    router.push(path)
  }

  function ask(raw: string) {
    const text = raw.trim()
    if (!text) return
    const t = plain(text)
    if (/(proxim|continu|avanc|seguir|vamos)/.test(t)) return void next(text)
    if (/(^|\s)(volt|anterior|repet)/.test(t)) return void previous(text)
    addMsg({ from: 'user', text })
    if (/(sair|parar|encerr|desligar|fechar)/.test(t)) {
      addMsg({ from: 'eura', text: 'Tudo bem! Desliguei o tour. Para voltar, use o botão no canto da tela.' })
      runRef.current++
      save({ ...tourRef.current, on: false, tip: false })
      return
    }
    const hit = FAQ.find((f) => f.test.test(t))
    const reply = hit?.reply ?? 'Não entendi bem. Posso falar sobre os dados, os perfis, a pontuação ou o Totem, ou seguir o tour com o botão Próximo.'
    const id = ++idRef.current
    setChat((c) => [...c, { id, from: 'eura' as const, typing: true }].slice(-MAX_MESSAGES))
    setTimeout(() => {
      setChat((c) => c.map((m) => (m.id === id ? { id, from: 'eura' as const, text: reply, fresh: true } : m)))
      if (!tourRef.current.open) setUnread((n) => n + 1)
    }, 600)
  }

  if (!ready) return null

  const st = STEPS[tour.i]
  const remaining = STEPS.slice(tour.i).reduce((a, s) => a + s.sec, 0)
  const last = tour.i === STEPS.length - 1
  // Os atalhos do passo (Ver também, Recomeçar) ficam só na mensagem do passo atual, não nas respostas de dúvida
  const lastStep = [...chat].reverse().find((m) => m.from === 'eura' && m.title && !m.typing)
  const showChoices = !!lastStep && (lastStep.fresh ? typedId === lastStep.id : true)

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
        <div className="tour-nudge" role="alertdialog" aria-label="Convite da Eura para o tour">
          <div className="tour-nudge-head">
            <EuraAvatar size={24} />
            <b>Eura</b>
          </div>
          <p>
            {nudge.kind === 'page' ? (
              <>Você está em <b>{nudge.label}</b>. Quer que eu te mostre esta aba?</>
            ) : (
              <>Você entrou como <b>{nudge.label}</b>. Quer que eu te mostre este perfil?</>
            )}
          </p>
          <div className="tour-nudge-btns">
            <button type="button" className="primary" onClick={acceptNudge}>Sim, mostrar</button>
            <button type="button" onClick={declineNudge}>Agora não</button>
          </div>
        </div>
      ) : tour.on && tour.open ? (
        <div
          ref={panelRef}
          className={`tour-chat${tour.big ? ' big' : ''}${dock === 'left' ? ' left' : ''}`}
          role="dialog"
          aria-label="Chat da Eura, guia do tour"
        >
          <div className="tour-chat-head">
            <EuraAvatar size={34} />
            <div className="who">
              <b>Eura</b>
              <small>
                <span className="tour-persona" data-p={st.persona ?? 'none'}>
                  <i /> Perfil: {personaLabel(st.persona)}
                </span>
              </small>
            </div>
            <button type="button" aria-label={tour.big ? 'Reduzir o chat' : 'Maximizar o chat'} title={tour.big ? 'Reduzir' : 'Maximizar'} onClick={() => save({ ...tour, big: !tour.big })}>
              <Icon name={tour.big ? 'minimize' : 'maximize'} size={14} />
            </button>
            <button type="button" aria-label="Minimizar o chat" title="Minimizar" onClick={() => save({ ...tour, open: false })}>
              <Icon name="minus" size={14} />
            </button>
          </div>

          <div ref={bodyRef} className="tour-chat-body">
            {chat.map((m) => {
              if (m.from === 'sys') return <div key={m.id} className="tour-sys">{m.text}</div>
              if (m.from === 'user') {
                return (
                  <div key={m.id} className="tour-msg user">
                    <div className="tour-bub">{m.text}</div>
                  </div>
                )
              }
              return (
                <div key={m.id} className="tour-msg">
                  <EuraAvatar size={26} />
                  <div className="tour-bub">
                    {m.typing ? (
                      <span className="tour-typing"><span /><span /><span /></span>
                    ) : (
                      <>
                        {m.title && <h4>{m.title}</h4>}
                        {m.fresh && typedId !== m.id ? (
                          <Typewriter text={m.text ?? ''} onGrow={scrollChat} onDone={() => setTypedId(m.id)} />
                        ) : (
                          m.text
                        )}
                      </>
                    )}
                    {showChoices && lastStep?.id === m.id && (st.also || st.restart) && (
                      <div className="tour-chips">
                        {st.also?.map((a) => (
                          <button key={a.path} type="button" onClick={() => go(a.path, `Ver ${a.label}`)}>{a.label}</button>
                        ))}
                        {st.restart && <button type="button" onClick={restart}>Recomeçar o tour</button>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="tour-suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
          <form
            className="tour-chat-foot"
            onSubmit={(e) => {
              e.preventDefault()
              ask(draft)
              setDraft('')
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Pergunte algo à Eura..." aria-label="Mensagem para a Eura" />
            <button type="submit" aria-label="Enviar">
              <Icon name="send" size={14} />
            </button>
          </form>
        </div>
      ) : tour.tip ? (
        <div className="tour-tip" role="status">
          A Eura te mostra a história do projeto em {minLabel(TOTAL_SEC)}
          <button type="button" aria-label="Dispensar" onClick={() => save({ ...tour, tip: false })}>
            <Icon name="x" size={12} />
          </button>
        </div>
      ) : null}

      {tour.on ? (
        <div ref={barRef} className="tour-bar" role="group" aria-label="Controles do tour" style={{ ['--p' as string]: (tour.i + 1) / STEPS.length }}>
          <button
            type="button"
            className="tour-bar-eura"
            aria-label={tour.open ? 'Minimizar o chat da Eura' : 'Abrir o chat da Eura'}
            title={tour.open ? 'Minimizar o chat' : 'Abrir o chat da Eura'}
            onClick={() => save({ ...tour, open: !tour.open })}
          >
            <EuraAvatar size={28} />
            {unread > 0 && !tour.open && <i className="tour-dot" />}
          </button>
          <span className="tour-bar-info">
            {tour.i + 1}/{STEPS.length} <small>{minLabel(remaining)}</small>
          </span>
          <button type="button" className="tour-nav" onClick={() => previous()} disabled={tour.i === 0}>
            Voltar
          </button>
          <button type="button" className="tour-nav primary" onClick={() => void next(last ? 'Concluir' : 'Próximo')}>
            {last ? 'Concluir' : 'Próximo'} <Icon name="chevron-right" size={14} />
          </button>
          <button type="button" role="switch" aria-checked="true" aria-label="Desligar o tour" className="tour-switch-btn" onClick={toggle}>
            <span className="tour-sw" />
          </button>
        </div>
      ) : (
        <button
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
