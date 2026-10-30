'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useIdeas } from '@/hooks/useIdeas'
import { useUser } from '@/hooks/useUser'
import { getIdeaStatusMeta } from '@/components/shared/IdeaCard'
import Icon from '@/components/shared/Icon'

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives?: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionEventLike = {
  resultIndex?: number
  results: {
    length: number
    [key: number]: {
      isFinal?: boolean
      length: number
      [key: number]: { transcript: string }
    }
  }
}


export default function TotemHubPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const hook = useIdeas(user?.id)
  const [searchText, setSearchText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const recordingBaseRef = useRef('')
  const recordingAccumulatedRef = useRef('')

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    setHasSpeechAPI(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  function normalizeTranscript(raw: string): string {
    const words = raw.trim().split(/\s+/)
    const out: string[] = []
    for (let i = 0; i < words.length; i++) {
      const w = words[i] ?? ''
      if (i > 0 && w.toLowerCase() === (words[i - 1] ?? '').toLowerCase()) continue
      out.push(w)
    }
    return out.join(' ')
  }

  function startRecording() {
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition || isRecording) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1

    recordingBaseRef.current = searchText.trim()
    recordingAccumulatedRef.current = ''
    let lastInterim = ''

    recognition.onresult = (event) => {
      const start = event.resultIndex ?? 0
      let interimText = ''
      for (let i = start; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue
        const t = result[0]?.transcript ?? ''
        if (result.isFinal) {
          const sep = recordingAccumulatedRef.current ? ' ' : ''
          recordingAccumulatedRef.current += sep + t.trim()
        } else {
          interimText += t
        }
      }
      lastInterim = interimText
    }
    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
      const full = normalizeTranscript(recordingAccumulatedRef.current || lastInterim)
      if (full) {
        const base = recordingBaseRef.current
        setSearchText(base ? `${base} ${full}` : full)
        setSpeechError(null)
      } else {
        setSpeechError('Nenhuma fala detectada. Tente falar mais perto do microfone.')
      }
    }
    recognition.onerror = (event) => {
      setIsRecording(false)
      recognitionRef.current = null
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Permissão de microfone negada.',
        'no-speech': 'Nenhuma fala detectada.',
        'audio-capture': 'Microfone não encontrado.',
        'network': 'Erro de rede.',
        'aborted': '',
      }
      const msg = errorMessages[event.error] ?? `Erro: ${event.error}`
      if (msg) setSpeechError(msg)
    }
    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setIsRecording(false)
    setSpeechError(null)
  }


  const filteredIdeas = searchText.trim()
    ? hook.ideas.filter((idea) =>
        idea.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (idea.sector_name ?? '').toLowerCase().includes(searchText.toLowerCase())
      )
    : hook.ideas

  const isLoading = userLoading || hook.loading

  return (
    <main className="totem-ranking-page">
      <header className="totem-ranking-header">
        <button
          className="totem-ranking-nav"
          type="button"
          onClick={() => router.push('/totem/dashboard')}
        >
          <Icon name="chevron-left" size={22} />
          Voltar
        </button>

        <div className="totem-ranking-heading">
          <span>Modo Totem</span>
          <h1>Hub de Ideias</h1>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            className="totem-ranking-nav"
            type="button"
            onClick={() => router.push('/totem/ia-innovation')}
            style={{ background: 'var(--c-totem)', borderColor: 'var(--c-totem)', color: '#fff' }}
          >
            <Icon name="plus" size={20} />
            Nova Ideia
          </button>
        </div>
      </header>

      <section className="totem-ranking-scroll">
        <div className="totem-ranking-shell">

          <section className="card">
            <div className="ih-section-head">
              <div className="ih-section-title">Buscar ideias</div>
              <span className="badge badge-gray">
                {isLoading ? '…' : `${filteredIdeas.length} ${filteredIdeas.length === 1 ? 'ideia' : 'ideias'}`}
              </span>
            </div>

            <div style={{ padding: '16px 20px 16px', display: 'grid', gap: 10 }}>
              <TotemDropdown
                value={hook.filters.sectorId ?? 'all'}
                onChange={(val) => hook.setFilters({ sectorId: val })}
                options={[
                  { value: 'all', label: 'Todos os setores' },
                  ...hook.sectors.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />

              <div
                className="totem-ranking-search-box"
                style={{ gridTemplateColumns: hasSpeechAPI ? 'minmax(0,1fr) auto' : '1fr' }}
              >
                <input
                  className="ih-input leaderboard-search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por título ou setor..."
                  autoComplete="off"
                />
                {hasSpeechAPI && (
                  <button
                    className={`totem-ranking-keyboard-toggle${isRecording ? ' is-active' : ''}`}
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    aria-label={isRecording ? 'Parar gravação' : 'Buscar por voz'}
                    style={isRecording ? { borderColor: 'rgba(2,132,199,.6)', background: 'rgba(2,132,199,.2)', color: '#7dd3fc', animation: 'pulseSoft 1.5s ease-in-out infinite' } : undefined}
                  >
                    <Icon name={isRecording ? 'mic-off' : 'mic'} size={18} />
                  </button>
                )}
              </div>

              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px 0', color: '#7dd3fc', fontSize: 14, fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7dd3fc', display: 'inline-block', animation: 'pulseSoft 1.5s ease-in-out infinite' }} />
                  Gravando... fale agora
                </div>
              )}

              {speechError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px 0', color: '#fca5a5', fontSize: 14, fontWeight: 700 }}>
                  <Icon name="x" size={14} />
                  {speechError}
                </div>
              )}
            </div>
          </section>

          {isLoading ? (
            <div className="totem-ranking-loading">Carregando ideias...</div>
          ) : filteredIdeas.length === 0 ? (
            <div className="totem-ranking-empty">
              {searchText
                ? `Nenhuma ideia encontrada para "${searchText}".`
                : 'Nenhuma ideia cadastrada.'}
            </div>
          ) : (
            <section className="card">
              <div className="ih-section-head">
                <div className="ih-section-title">
                  {searchText ? `Resultado: "${searchText}"` : 'Todas as ideias'}
                </div>
                <span className="badge badge-blue">{filteredIdeas.length}</span>
              </div>

              <div className="ih-list">
                {filteredIdeas.map((idea) => {
                  const meta = getIdeaStatusMeta(idea.status)
                  return (
                    <div className="ih-list-row leaderboard-list-row" key={idea.id}>
                      <div
                        className="ih-list-dot"
                        style={{ background: `${meta.color}22`, color: meta.color, flexShrink: 0, alignSelf: 'center' }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: 999, background: meta.color }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="totem-ranking-list-name">{idea.title}</div>
                        {idea.summary && (
                          <div style={{
                            marginTop: 4,
                            color: 'rgba(213,226,245,.72)',
                            fontSize: 14,
                            lineHeight: 1.45,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {idea.summary}
                          </div>
                        )}
                        <div className="totem-ranking-person-sector" style={{ marginTop: 6 }}>
                          {idea.sector_name ?? 'Setor não informado'} · {meta.label}
                        </div>
                      </div>

                      <div className="leaderboard-list-score">
                        <button
                          type="button"
                          onClick={() => router.push(`/totem/hub/${idea.id}`)}
                          style={{
                            padding: '10px 18px',
                            borderRadius: 10,
                            background: 'var(--c-totem)',
                            color: '#fff',
                            border: 'none',
                            fontSize: 15,
                            fontWeight: 900,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </section>

    </main>
  )
}


function TotemDropdown({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ bottom: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  function toggle() {
    if (open) { setOpen(false); return }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setRect({ bottom: r.bottom, left: r.left, width: r.width })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      const inTrigger = triggerRef.current?.contains(target)
      const inPanel = panelRef.current?.contains(target)
      if (!inTrigger && !inPanel) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const optionStyle = (isActive: boolean): CSSProperties => ({
    width: '100%',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: 'none',
    borderBottom: '1px solid rgba(125,211,252,.08)',
    background: isActive ? 'rgba(2,132,199,.18)' : 'transparent',
    color: isActive ? '#7dd3fc' : 'rgba(255,255,255,.82)',
    fontSize: 17,
    fontWeight: isActive ? 900 : 600,
    cursor: 'pointer',
    textAlign: 'left',
  })

  const panel = rect && open && createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        border: '1px solid rgba(125,211,252,.2)',
        borderRadius: 14,
        background: 'rgba(5,14,32,.98)',
        overflow: 'hidden',
        boxShadow: '0 20px 48px rgba(0,0,0,.6)',
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          style={optionStyle(opt.value === value)}
          onClick={() => { onChange(opt.value); setOpen(false) }}
        >
          {opt.value === value && <Icon name="check" size={15} style={{ flexShrink: 0 }} />}
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          minHeight: 54,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          border: '1px solid var(--line)',
          borderRadius: 12,
          background: 'rgba(7,19,39,.9)',
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? 'Selecionar setor'}
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} style={{ flexShrink: 0, color: 'rgba(255,255,255,.5)' }} />
      </button>
      {panel}
    </>
  )
}
