'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useIAInnovation, type ChatMessage } from '@/hooks/useIAInnovation'
import Icon, { type IconName } from '@/components/shared/Icon'
import type { IdeaDoc } from '@/services/ideasService'

const IMPROVEMENT_LABELS: Record<string, string> = {
  processo: 'Processo',
  custo: 'Custo',
  seguranca: 'Segurança',
  qualidade: 'Qualidade',
}

const JOURNEY_STEPS = [
  { label: 'Problema', text: 'Onde acontece e o que atrapalha', icon: 'lightbulb' as const },
  { label: 'Solução', text: 'Como poderia funcionar melhor', icon: 'settings' as const },
  { label: 'Impacto', text: 'Tempo, custo, qualidade ou segurança', icon: 'trending-up' as const },
  { label: 'Viabilidade', text: 'Áreas, recursos e cuidados necessários', icon: 'check-circle' as const },
]

const THINKING_MESSAGES = [
  'Lendo sua mensagem',
  'Organizando os pontos principais',
  'Conferindo se falta algum detalhe',
  'Preparando a resposta da Eura',
]

const TOTEM_QUICK_ACTIONS = [
  { label: 'Tenho um problema', prompt: 'Tenho um problema no meu trabalho e quero transformar isso em uma ideia.' },
  { label: 'Não sei a solução', prompt: 'Eu sei o problema, mas ainda não sei qual seria a melhor solução.' },
  { label: 'Reduzir desperdício', prompt: 'Quero registrar uma ideia para reduzir desperdício ou retrabalho.' },
  { label: 'Mais segurança', prompt: 'Quero registrar uma ideia para melhorar a segurança no trabalho.' },
]


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
    [key: number]: { isFinal?: boolean; length: number; [key: number]: { transcript: string } }
  }
}

type ComposerSuggestion = {
  label: string
  icon: IconName
  prompt: string
}

function normalizeForStage(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function inferStageIndex(messages: ChatMessage[], idea: IdeaDoc | null): number {
  if (idea) return 4
  const lastAssistant = normalizeForStage(
    [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''
  )
  if (!lastAssistant) return 0
  if (/(recurso|area|cuidad|necessari|implementa|colocar.*pratica|envolvid|realidade|testar|piloto|viabilidade|para fechar|para finalizar)/.test(lastAssistant)) return 3
  if (/(impacto|resultado|beneficio|economiz|reduzir|reducao|menos|tempo|qualidade|seguranca|espera.*aconteca|espera.*mudanca)/.test(lastAssistant)) return 2
  if (/(solucao|alternativa|funcionar|resolver|fazer diferente|como voce imagina|qual seria.*ideia|ideia para|proposta para)/.test(lastAssistant)) return 1
  return 0
}

function getContextualReplies(messages: ChatMessage[], idea: IdeaDoc | null, stageIndex: number): ComposerSuggestion[] {
  const hasAssistantMessage = messages.some((m) => m.role === 'assistant')
  const hasUserMessage = messages.some((m) => m.role === 'user')
  const lastAssistant = normalizeForStage(
    [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''
  )
  if (idea) {
    return [
      { label: 'Revisar impacto', icon: 'trending-up', prompt: 'Quero revisar se o impacto e os benefícios ficaram fortes o suficiente.' },
      { label: 'Texto mais simples', icon: 'sparkles', prompt: 'Pode deixar a proposta mais simples e direta?' },
      { label: 'Detalhar viabilidade', icon: 'settings', prompt: 'Quero detalhar melhor as áreas, recursos e cuidados necessários para testar essa ideia.' },
    ]
  }
  if (!hasAssistantMessage || !hasUserMessage) return []
  if (/(suporte tecnico|area responsavel|conteudo inadequado|plataforma para propostas construtivas)/.test(lastAssistant)) return []
  if (stageIndex === 1) {
    return [
      { label: 'Ainda não sei', icon: 'lightbulb', prompt: 'Ainda não sei qual solução propor. Pode me ajudar a pensar em alternativas?' },
      { label: 'Tenho uma ideia', icon: 'check-circle', prompt: 'Tenho uma ideia de solução: ' },
      { label: 'Me dê exemplos', icon: 'sparkles', prompt: 'Me dê alguns exemplos de solução para esse tipo de problema.' },
    ]
  }
  if (stageIndex === 2) {
    return [
      { label: 'Menos retrabalho', icon: 'refresh-cw', prompt: 'O principal impacto seria reduzir retrabalho e evitar correções depois.' },
      { label: 'Economia de tempo', icon: 'trending-up', prompt: 'O impacto esperado é economizar tempo na rotina da equipe.' },
      { label: 'Mais qualidade', icon: 'shield', prompt: 'O impacto seria melhorar a qualidade e a confiabilidade das informações.' },
    ]
  }
  if (stageIndex === 3) {
    return [
      { label: 'Piloto pequeno', icon: 'zap', prompt: 'Daria para começar com um piloto pequeno em uma área antes de expandir.' },
      { label: 'Envolver áreas', icon: 'users', prompt: 'Seria importante envolver as áreas responsáveis para validar e testar a mudança.' },
      { label: 'Treinamento rápido', icon: 'check-circle', prompt: 'Também seria necessário um treinamento rápido para a equipe seguir o novo padrão.' },
    ]
  }
  if (stageIndex === 0) {
    return [
      { label: 'Vou pelo problema', icon: 'lightbulb', prompt: 'Vou explicar pelo problema que eu percebo no dia a dia: ' },
      { label: 'Como é hoje', icon: 'layers', prompt: 'Hoje funciona assim: ' },
      { label: 'Me dê exemplos', icon: 'sparkles', prompt: 'Me dê exemplos para eu conseguir explicar melhor.' },
    ]
  }
  return []
}

export default function TotemIAInnovationPage() {
  const router = useRouter()
  const { user } = useUser()
  const hook = useIAInnovation(user?.id ?? null, 'totem')
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [pitchMode, setPitchMode] = useState(false)
  const [pitchMessages, setPitchMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [pitchLoading, setPitchLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const recordingBaseRef = useRef('')
  const recordingAccumulatedRef = useRef('')
  const textRef = useRef('')

  useEffect(() => { textRef.current = text }, [text])

  useEffect(() => {
    async function handlePitchMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== 'PITCH_CMD') return
      const { action } = event.data as { type: string; action: string }
      const pitchWindow = event.source as Window | null
      if (action === 'TOUR_VOICE') {
        // O tour simula a fala para funcionar em qualquer navegador; o microfone real segue no botão
        const phrase = 'A esteira da linha dois trava toda vez que muda o turno. Já aconteceu três vezes essa semana.'
        setIsRecording(true)
        for (let i = 2; i <= phrase.length + 1; i += 2) {
          setText(phrase.slice(0, i))
          await new Promise<void>((resolve) => setTimeout(resolve, 45))
        }
        textRef.current = phrase
        setText(phrase)
        setIsRecording(false)
        await new Promise<void>((resolve) => setTimeout(resolve, 700))
      } else if (action !== 'DEMO_ADVANCE') {
        return
      }
      const userText = textRef.current.trim()
      if (!userText) return
      setPitchMode(true)
      setText('')
      setPitchMessages([{ role: 'user', content: userText }])
      setPitchLoading(true)
      await new Promise<void>((resolve) => setTimeout(resolve, 1500))
      setPitchLoading(false)
      setPitchMessages([
        { role: 'user', content: userText },
        { role: 'assistant', content: 'Boa observação! Isso parece um problema recorrente que impacta o processo. Qual seria, na sua visão, uma solução que poderia evitar essa parada na troca de turno?' },
      ])
      pitchWindow?.postMessage({ type: 'PITCH_RESPONSE_DONE' }, '*')
    }
    window.addEventListener('message', handlePitchMessage)
    return () => window.removeEventListener('message', handlePitchMessage)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const displayMessages = pitchMode ? pitchMessages : hook.messages
  const displayLoading = pitchMode ? pitchLoading : hook.isLoading

  const stageIndex = inferStageIndex(hook.messages, hook.structuredIdea)
  const composerSuggestions = getContextualReplies(hook.messages, hook.structuredIdea, stageIndex)
  const ideaReady = hook.structuredIdea !== null
  const userName = user?.name ?? 'colaborador'
  const userInitials = user?.name
    ? user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
    : 'EU'

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    setHasSpeechAPI(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, displayLoading, hook.structuredIdea, isRecording])

  useEffect(() => {
    if (hook.structuredIdea) setProposalOpen(true)
  }, [hook.structuredIdea])

  useEffect(() => {
    if (!speechError) return
    const dismiss = () => setSpeechError(null)
    document.addEventListener('touchstart', dismiss)
    document.addEventListener('mousedown', dismiss)
    return () => {
      document.removeEventListener('touchstart', dismiss)
      document.removeEventListener('mousedown', dismiss)
    }
  }, [speechError])

  function normalizeTranscript(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim()
    const words = normalized.split(' ')
    if (words.length > 4 && words.length % 2 === 0) {
      const middle = words.length / 2
      const first = words.slice(0, middle).join(' ').toLowerCase()
      const second = words.slice(middle).join(' ').toLowerCase()
      if (first === second) return words.slice(0, middle).join(' ')
    }
    return normalized
  }

  function startRecording() {
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition || isRecording) return

    const recognition = new SpeechRecognition()
    recordingBaseRef.current = text.trim()
    recordingAccumulatedRef.current = ''
    setSpeechError(null)

    let lastInterim = ''

    recognition.lang = 'pt-BR'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1
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
        setText(base ? `${base} ${full}` : full)
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
  }

  async function handleSend(textOverride?: string) {
    const msg = (textOverride ?? text).trim()
    if (!msg || hook.isLoading || published) return
    setText('')
    setPublishError(null)
    try {
      await hook.sendMessage(msg)
    } catch {
      // O hook já reflete o erro na conversa.
    }
  }

  function handleComposerSuggestion(s: ComposerSuggestion) {
    if (s.prompt.endsWith(': ')) {
      setText(s.prompt)
      return
    }
    handleSend(s.prompt)
  }

  async function handlePublish() {
    if (!hook.structuredIdea || !user?.sector_id) {
      setPublishError('Setor não configurado. Contate o administrador.')
      return
    }
    setIsPublishing(true)
    setPublishError(null)
    try {
      await hook.publishIdea(user.sector_id)
      setPublished(true)
      window.setTimeout(() => router.push('/totem/dashboard'), 2000)
    } catch {
      setPublishError('Erro ao publicar. Tente novamente.')
      setIsPublishing(false)
    }
  }


  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--sidebar-bg)',
        position: 'relative',
      }}
    >
      {/* Dot overlay */}
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

      {/* Top header */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => router.push('/totem/dashboard')}
          style={{
            minHeight: 58,
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
        <div style={{ color: 'rgba(255,255,255,.92)', fontWeight: 850, fontSize: 19 }}>
          Eura — IA Innovation
        </div>
        <div />
      </div>

      {/* Message stream */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          overflowY: 'auto',
          padding: '18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Intro bubble */}
        <TotemEuraBubble>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              Olá, <strong>{userName}</strong>! Sou a <strong>Eura</strong>. Pode começar com uma frase simples, uma dúvida ou uma situação que parece dar trabalho. Eu cuido da estrutura com você.
            </div>
            <div
              style={{
                display: 'grid',
                gap: 7,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
              }}
            >
              <div style={{ color: 'rgba(255,255,255,.9)', fontSize: 13, fontWeight: 900 }}>Para uma boa proposta</div>
              {[
                'Diga onde o problema acontece',
                'Conte como isso atrapalha o trabalho',
                'Explique o que mudaria na prática',
                'Indique o impacto esperado',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="check-circle" size={15} style={{ color: 'var(--c-totem)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.45 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </TotemEuraBubble>

        {/* Initial quick actions */}
        {displayMessages.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {TOTEM_QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleSend(action.prompt)}
                disabled={hook.isLoading || published}
                style={{
                  minHeight: 62,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.13)',
                  background: 'rgba(255,255,255,.08)',
                  color: 'rgba(255,255,255,.9)',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: hook.isLoading || published ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {displayMessages.map((msg, i) =>
          msg.role === 'assistant' ? (
            <TotemEuraBubble key={i}>
              <TotemMarkdownText text={msg.content} />
            </TotemEuraBubble>
          ) : (
            <TotemUserBubble key={i} content={msg.content} initials={userInitials} />
          )
        )}

        {/* Thinking indicator */}
        {displayLoading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', alignSelf: 'flex-start' }}>
            <TotemEuraAvatar />
            <TotemThinkingStatus />
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div
            style={{
              alignSelf: 'flex-end',
              background: 'var(--c-totem)',
              color: '#fff',
              borderRadius: '18px 6px 18px 18px',
              padding: '14px 18px',
              fontSize: 17,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#fff',
                flexShrink: 0,
                animation: 'pulseSoft 1s ease-in-out infinite',
              }}
            />
            Gravando...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Speech error */}
      {speechError && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            margin: '0 28px',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(2,132,199,.15)',
            color: '#7dd3fc',
            fontSize: 15,
            fontWeight: 700,
            border: '1px solid rgba(2,132,199,.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="mic-off" size={16} />
          {speechError}
        </div>
      )}

      {/* Proposal panel */}
      {hook.structuredIdea && (
        <div style={{ position: 'relative', zIndex: 1, padding: '0 28px 12px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setProposalOpen((prev) => !prev)}
            style={{
              width: '100%',
              minHeight: 58,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              border: '1px solid rgba(255,255,255,.15)',
              borderRadius: proposalOpen ? '12px 12px 0 0' : 12,
              background: 'rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.92)',
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkles" size={18} />
              Proposta pronta — AI Score {hook.structuredIdea.ai_score}
            </span>
            <Icon name={proposalOpen ? 'chevron-up' : 'chevron-down'} size={18} />
          </button>
          {proposalOpen && (
            <div
              style={{
                padding: '16px 18px',
                border: '1px solid rgba(255,255,255,.15)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                background: 'rgba(255,255,255,.06)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>
                {hook.structuredIdea.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,.68)', fontSize: 15, lineHeight: 1.55 }}>
                {hook.structuredIdea.summary}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <TotemBadge color="#86efac" bg="rgba(0,166,81,.22)">
                  AI Score {hook.structuredIdea.ai_score}
                </TotemBadge>
                <TotemBadge color="#7dd3fc" bg="rgba(2,132,199,.25)">
                  {IMPROVEMENT_LABELS[hook.structuredIdea.improvement_area] ?? hook.structuredIdea.improvement_area}
                </TotemBadge>
                <TotemBadge color="rgba(255,255,255,.74)" bg="rgba(255,255,255,.1)">
                  {hook.structuredIdea.complexity}
                </TotemBadge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Composer zone */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '8px 28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,.07)',
          background: 'rgba(7,17,32,.86)',
        }}
      >
        {/* Contextual quick replies */}
        {composerSuggestions.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${composerSuggestions.length}, 1fr)`, gap: 6 }}>
            {composerSuggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => handleComposerSuggestion(s)}
                disabled={hook.isLoading || published}
                style={{
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '0 8px',
                  border: '1px solid rgba(255,255,255,.13)',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,.06)',
                  color: 'rgba(255,255,255,.65)',
                  cursor: hook.isLoading || published ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <Icon name={s.icon} size={12} style={{ flexShrink: 0 }} />
                {s.label}
              </button>
            ))}
          </div>
        )}

        {publishError && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(229,62,62,.15)', color: '#fc8181', fontSize: 15, fontWeight: 650 }}>
            {publishError}
          </div>
        )}

        {published && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,166,81,.15)', color: '#68d391', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check-circle" size={18} />
            Ideia publicada com sucesso! Redirecionando...
          </div>
        )}

        {hasSpeechAPI && (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={hook.isLoading || published}
            style={{
              width: '100%',
              height: 60,
              fontSize: 18,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              border: isRecording ? '2px solid rgba(2,132,199,.8)' : '1px solid rgba(255,255,255,.18)',
              borderRadius: 14,
              background: isRecording ? 'rgba(2,132,199,.22)' : 'rgba(255,255,255,.07)',
              color: isRecording ? '#7dd3fc' : 'rgba(255,255,255,.86)',
              cursor: hook.isLoading || published ? 'not-allowed' : 'pointer',
              animation: isRecording ? 'pulseSoft 1.5s ease-in-out infinite' : 'none',
            }}
          >
            <Icon name={isRecording ? 'mic-off' : 'mic'} size={22} />
            {isRecording ? 'Toque para parar' : 'Falar ideia'}
          </button>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Digite ou fale sua ideia aqui..."
          className="ih-textarea-dark"
          disabled={hook.isLoading || published}
          style={{ height: 108, fontSize: 18, resize: 'none' }}
        />

        <button
          type="button"
          disabled={!text.trim() || hook.isLoading || published}
          onClick={() => handleSend()}
          style={{
            width: '100%',
            height: 58,
            fontSize: 18,
            fontWeight: 850,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            border: 'none',
            borderRadius: 14,
            background: text.trim() && !hook.isLoading && !published ? 'var(--c-totem)' : 'rgba(255,255,255,.12)',
            color: '#fff',
            cursor: text.trim() && !hook.isLoading && !published ? 'pointer' : 'not-allowed',
            opacity: !text.trim() || hook.isLoading || published ? 0.6 : 1,
            transition: 'background 0.15s, opacity 0.15s',
          }}
        >
          {hook.isLoading ? (
            <><span className="spin" />Processando...</>
          ) : (
            <><Icon name="send" size={20} />Enviar para Eura</>
          )}
        </button>

        {hook.structuredIdea && !published && (
          <button
            type="button"
            disabled={isPublishing}
            onClick={handlePublish}
            style={{
              width: '100%',
              height: 62,
              fontSize: 18,
              fontWeight: 850,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              border: 'none',
              borderRadius: 14,
              background: 'var(--grad-main)',
              color: '#fff',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              opacity: isPublishing ? 0.7 : 1,
              boxShadow: '0 8px 28px rgba(79,195,247,.28)',
            }}
          >
            {isPublishing ? (
              <><span className="spin" />Publicando...</>
            ) : (
              <><Icon name="send" size={22} />Publicar no Hub de Melhorias</>
            )}
          </button>
        )}

        <TotemStageHeader stageIndex={stageIndex} ideaReady={ideaReady} />
      </div>
    </main>
  )
}

function TotemEuraAvatar() {
  const size = 38
  const radius = Math.max(7, Math.round(size * 0.23))
  const innerSize = Math.round(size * 0.68)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'rgba(255,255,255,.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.15)',
      }}
    >
      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,.15), transparent 46%)' }} />
      <span
        style={{
          position: 'absolute',
          width: innerSize,
          height: innerSize,
          borderRadius: Math.max(6, Math.round(size * 0.18)),
          display: 'grid',
          placeItems: 'center',
          color: 'var(--c-totem)',
        }}
      >
        <Icon name="bot" size={Math.max(16, Math.round(size * 0.54))} />
      </span>
    </div>
  )
}

function TotemEuraBubble({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', alignSelf: 'flex-start', maxWidth: '82%' }}>
      <TotemEuraAvatar />
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '4px 16px 16px 16px',
          background: 'rgba(255,255,255,.1)',
          color: 'rgba(255,255,255,.92)',
          fontSize: 17,
          lineHeight: 1.55,
          border: '1px solid rgba(255,255,255,.08)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function TotemUserBubble({ content, initials }: { content: string; initials: string }) {
  return (
    <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: '78%' }}>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '14px 4px 14px 14px',
          background: 'var(--c-totem)',
          color: 'rgba(255,255,255,.96)',
          fontSize: 17,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
      </div>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          background: 'rgba(255,255,255,.15)',
          border: '1.5px solid rgba(255,255,255,.3)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
          letterSpacing: '0.02em',
        }}
      >
        {initials}
      </div>
    </div>
  )
}

function TotemThinkingStatus() {
  const [messageIndex, setMessageIndex] = useState(0)
  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((c) => (c + 1) % THINKING_MESSAGES.length)
    }, 1600)
    return () => window.clearInterval(interval)
  }, [])
  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: '4px 16px 16px 16px',
        background: 'rgba(255,255,255,.08)',
        border: '1px solid rgba(255,255,255,.08)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        color: 'rgba(255,255,255,.7)',
        fontSize: 16,
        fontWeight: 700,
      }}
    >
      <span>{THINKING_MESSAGES[messageIndex]}</span>
      <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.45)',
              display: 'block',
              animation: `pulseSoft 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </span>
    </div>
  )
}

function TotemStageHeader({ stageIndex, ideaReady }: { stageIndex: number; ideaReady: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 12,
        border: ideaReady ? '1px solid rgba(79,195,247,.35)' : '1px solid rgba(255,255,255,.1)',
        background: ideaReady ? 'rgba(79,195,247,.08)' : 'rgba(255,255,255,.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progresso</span>
        <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10 }}>·</span>
        <span style={{ color: ideaReady ? 'var(--c-totem)' : 'rgba(255,255,255,.65)', fontSize: 11, fontWeight: 900 }}>
          {ideaReady ? '✓ Pronta para publicar' : `Etapa ${Math.min(stageIndex + 1, 4)} de 4`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {JOURNEY_STEPS.map((step, index) => {
          const done = ideaReady || index < stageIndex
          const active = !ideaReady && index === stageIndex
          const lineDone = ideaReady || index < stageIndex
          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div title={`${step.label}: ${step.text}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: done ? 'var(--c-totem)' : active ? 'rgba(79,195,247,.22)' : 'rgba(255,255,255,.08)',
                    color: done ? '#071120' : active ? 'var(--c-totem)' : 'rgba(255,255,255,.35)',
                    border: active ? '1.5px solid var(--c-totem)' : done ? '1px solid transparent' : '1px solid rgba(255,255,255,.15)',
                    boxShadow: active ? '0 0 0 3px rgba(79,195,247,.18)' : 'none',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={done ? 'check' : active ? 'clock' : 'circle'} size={12} />
                </span>
                <span
                  style={{
                    color: done ? 'var(--c-totem)' : active ? '#fff' : 'rgba(255,255,255,.3)',
                    fontSize: 11,
                    fontWeight: active ? 900 : 750,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.label}
                </span>
              </div>
              {index < JOURNEY_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    flexShrink: 0,
                    height: 2,
                    margin: '0 6px',
                    borderRadius: 999,
                    background: lineDone ? 'var(--c-totem)' : 'rgba(255,255,255,.1)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TotemMarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const result: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      if (result.length > 0) result.push(<div key={`gap-${i}`} style={{ height: 5 }} />)
      i++
      continue
    }
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const sizes = [17, 16, 15]
      result.push(
        <div key={`h-${i}`} style={{ fontWeight: 900, fontSize: sizes[level - 1], lineHeight: 1.35, marginTop: result.length > 0 ? 8 : 0, marginBottom: 2 }}>
          {renderInlineMarkdown(headingMatch[2])}
        </div>
      )
      i++
      continue
    }
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      result.push(
        <ul key={`ul-${i}`} style={{ margin: '3px 0', paddingLeft: 18, display: 'grid', gap: 3 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ lineHeight: 1.55 }}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      )
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      result.push(
        <ol key={`ol-${i}`} style={{ margin: '3px 0', paddingLeft: 18, display: 'grid', gap: 3 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ lineHeight: 1.55 }}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      )
      continue
    }
    result.push(
      <span key={`line-${i}`} style={{ display: 'block', lineHeight: 1.65 }}>
        {renderInlineMarkdown(line)}
      </span>
    )
    i++
  }

  return <>{result}</>
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const token = match[0]
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={`${match.index}-c`} style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,.15)', padding: '1px 5px', borderRadius: 4, fontSize: '0.875em' }}>
          {token.slice(1, -1)}
        </code>
      )
    } else {
      nodes.push(<em key={`${match.index}-e`}>{token.slice(1, -1)}</em>)
    }
    cursor = match.index + token.length
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function TotemBadge({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <span style={{ padding: '4px 12px', borderRadius: 99, background: bg, color, fontSize: 13, fontWeight: 800 }}>
      {children}
    </span>
  )
}

