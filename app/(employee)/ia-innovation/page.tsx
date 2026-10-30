'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useIAInnovation, type ChatMessage } from '@/hooks/useIAInnovation'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
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

const REFINEMENT_PROMPTS = [
  {
    label: 'Melhorar impacto',
    description: 'Fortalecer benefício e métricas',
    icon: 'trending-up' as const,
    text: 'Quero refinar a proposta para deixar o impacto esperado mais claro e mensurável.',
  },
  {
    label: 'Simplificar texto',
    description: 'Reescrever em linguagem direta',
    icon: 'sparkles' as const,
    text: 'Reescreva a proposta de forma mais simples, direta e fácil de apresentar.',
  },
  {
    label: 'Detalhar viabilidade',
    description: 'Explicar áreas, recursos e cuidados',
    icon: 'settings' as const,
    text: 'Quero detalhar melhor quais áreas, recursos e cuidados seriam necessários para implementar.',
  },
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

const THINKING_MESSAGES = [
  'Lendo sua mensagem',
  'Organizando os pontos principais',
  'Conferindo se falta algum detalhe',
  'Preparando a resposta da Eura',
]

type ComposerSuggestion = {
  label: string
  icon: IconName
  prompt: string
}

const DEMO_IDEA: IdeaDoc = {
  title: 'Checklist digital para conferência de produção',
  summary:
    'A conferência manual de informações na produção gera retrabalho e perda de tempo. A proposta é usar um checklist digital simples para padronizar as etapas e reduzir falhas de preenchimento.',
  benefits:
    'A ideia pode reduzir retrabalho, economizar tempo por turno e melhorar a rastreabilidade das informações usadas pela equipe.',
  complexity: 'Média',
  ai_score: 84,
  improvement_area: 'qualidade',
}

const DEMO_TURNS_HELPDESK: Array<{ user: string; assistant: string; delay?: number }> = [
  {
    user: 'Meu notebook está muito lento e travando toda hora, preciso de suporte.',
    assistant:
      'Entendo! Mas o Innovation HUB é um canal voltado a propostas de melhoria de processos, qualidade, segurança e custo — não a suporte técnico. Para resolver o problema do seu notebook, o caminho certo é abrir um chamado com o time de TI. Posso te ajudar com alguma ideia de melhoria?',
  },
]

const DEMO_TURNS_BADWORD: Array<{ user: string; assistant: string; delay?: number }> = [
  {
    user: 'Tô de saco cheio, ridículo, não funciona nunca.',
    assistant:
      'Entendo a frustração, mas precisamos manter o Innovation HUB como um espaço respeitoso. Pedimos que evite esse tipo de linguagem — se a conduta se repetir, o administrador da plataforma será notificado automaticamente. Para reclamações, o canal certo é o RH ou a Ouvidoria Interna. Se o processo te incomoda, posso te ajudar a transformar isso em uma proposta de melhoria!',
  },
]

function getActiveDemoTurns(type: 'idea' | 'helpdesk' | 'badword'): Array<{ user: string; assistant: string; idea?: IdeaDoc; delay?: number }> {
  if (type === 'helpdesk') return DEMO_TURNS_HELPDESK
  if (type === 'badword') return DEMO_TURNS_BADWORD
  return DEMO_TURNS
}

const DEMO_TURNS: Array<{ user: string; assistant: string; idea?: IdeaDoc; delay?: number }> = [
  {
    user: 'Acho que a conferência de produção demora muito e às vezes dá retrabalho.',
    assistant:
      'Boa observação. Vamos deixar o problema mais claro antes de pensar na solução. Em qual parte da conferência isso acontece com mais frequência? Por exemplo: no preenchimento, na revisão das informações ou na correção depois?',
    delay: 1200,
  },
  {
    user: 'Acontece mais no preenchimento e na revisão. A equipe confere tudo manualmente, perde tempo e às vezes precisa corrigir informação depois.',
    assistant:
      'Agora o problema ficou bem mais claro: conferência manual, perda de tempo e retrabalho. Qual solução poderia ajudar a equipe a fazer essa conferência de um jeito mais simples?',
    delay: 1200,
  },
  {
    user: 'Acho que um checklist digital simples ajudaria a equipe a seguir as etapas certas e evitar campos esquecidos.',
    assistant:
      'Boa direção. Um checklist digital pode deixar o processo mais padronizado. Qual impacto você espera com essa mudança? Pode ser tempo economizado, menos retrabalho ou mais segurança na informação.',
    delay: 1200,
  },
  {
    user: 'A equipe perderia menos tempo corrigindo informação depois e os dados ficariam mais confiáveis para acompanhar a produção.',
    assistant:
      'Perfeito, agora temos impacto em tempo e qualidade da informação. Para fechar: quais áreas, recursos ou cuidados seriam necessários para testar essa ideia?',
    delay: 1200,
  },
  {
    user: 'Daria para fazer um piloto com Produção, Qualidade e TI em uma linha primeiro, com um treinamento rápido para a equipe.',
    assistant:
      'Sua proposta foi estruturada. Revise a prévia, refine comigo se quiser, ou publique no Hub de Ideias.',
    idea: DEMO_IDEA,
    delay: 2000,
  },
]

function getScoreDescription(score: number): string {
  if (score >= 90) return 'Proposta excelente, com alto impacto e clareza excepcionais.'
  if (score >= 71) return 'Boa clareza, impacto mensurável e caminho de teste identificado.'
  if (score >= 41) return 'Ideia razoável com impacto estimado. Pode ser aprimorada.'
  return 'Ideia em estágio inicial. Adicione mais detalhes para melhorar o score.'
}

function getScoreColor(score: number): string {
  if (score >= 71) return 'var(--accent)'
  if (score >= 41) return '#d97706'
  return 'var(--danger)'
}

function getIdeaKey(idea: IdeaDoc | null): string | null {
  if (!idea) return null
  return JSON.stringify({
    title: idea.title,
    summary: idea.summary,
    benefits: idea.benefits,
    complexity: idea.complexity,
    ai_score: idea.ai_score,
    improvement_area: idea.improvement_area,
  })
}

function normalizeForStage(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function inferStageIndex(messages: ChatMessage[], idea: IdeaDoc | null): number {
  if (idea) return 4

  const lastAssistant = normalizeForStage(
    [...messages].reverse().find((message) => message.role === 'assistant')?.content ?? ''
  )

  if (!lastAssistant) return 0

  if (/(recurso|area|cuidad|necessari|implementa|colocar.*pratica|envolvid|realidade|testar|piloto|viabilidade|para fechar|para finalizar)/.test(lastAssistant)) {
    return 3
  }

  if (/(impacto|resultado|beneficio|economiz|reduzir|reducao|menos|tempo|qualidade|seguranca|espera.*aconteca|espera.*mudanca)/.test(lastAssistant)) {
    return 2
  }

  if (/(solucao|alternativa|funcionar|resolver|fazer diferente|como voce imagina|qual seria.*ideia|ideia para|proposta para)/.test(lastAssistant)) {
    return 1
  }

  return 0
}

function buildLiveIdeaDraft(messages: ChatMessage[]): IdeaDoc | null {
  if (!messages.some((m) => m.role === 'user')) return null

  return {
    title: 'Proposta em construção',
    summary: 'Aguardando a Eura finalizar a estrutura da proposta.',
    benefits: 'Aguardando a Eura identificar os benefícios a partir da conversa completa.',
    complexity: 'Média',
    ai_score: 0,
    improvement_area: 'processo',
  }
}

function getContextualReplies(messages: ChatMessage[], idea: IdeaDoc | null, stageIndex: number): ComposerSuggestion[] {
  const hasAssistantMessage = messages.some((message) => message.role === 'assistant')
  const hasUserMessage = messages.some((message) => message.role === 'user')
  const lastAssistant = normalizeForStage(
    [...messages].reverse().find((message) => message.role === 'assistant')?.content ?? ''
  )

  if (idea) {
    return [
      {
        label: 'Revisar impacto',
        icon: 'trending-up',
        prompt: 'Quero revisar se o impacto e os benefícios ficaram fortes o suficiente.',
      },
      {
        label: 'Texto mais simples',
        icon: 'sparkles',
        prompt: 'Pode deixar a proposta mais simples e direta?',
      },
      {
        label: 'Detalhar viabilidade',
        icon: 'settings',
        prompt: 'Quero detalhar melhor as áreas, recursos e cuidados necessários para testar essa ideia.',
      },
    ]
  }

  if (!hasAssistantMessage || !hasUserMessage) return []
  if (/(suporte tecnico|area responsavel|conteudo inadequado|plataforma para propostas construtivas)/.test(lastAssistant)) return []

  if (stageIndex === 1) {
    return [
      {
        label: 'Ainda não sei',
        icon: 'lightbulb',
        prompt: 'Ainda não sei qual solução propor. Pode me ajudar a pensar em alternativas?',
      },
      {
        label: 'Tenho uma ideia',
        icon: 'check-circle',
        prompt: 'Tenho uma ideia de solução: ',
      },
      {
        label: 'Me dê exemplos',
        icon: 'sparkles',
        prompt: 'Me dê alguns exemplos de solução para esse tipo de problema.',
      },
    ]
  }

  if (stageIndex === 2) {
    return [
      {
        label: 'Menos retrabalho',
        icon: 'refresh-cw',
        prompt: 'O principal impacto seria reduzir retrabalho e evitar correções depois.',
      },
      {
        label: 'Economia de tempo',
        icon: 'trending-up',
        prompt: 'O impacto esperado é economizar tempo na rotina da equipe.',
      },
      {
        label: 'Mais qualidade',
        icon: 'shield',
        prompt: 'O impacto seria melhorar a qualidade e a confiabilidade das informações.',
      },
    ]
  }

  if (stageIndex === 3) {
    return [
      {
        label: 'Piloto pequeno',
        icon: 'zap',
        prompt: 'Daria para começar com um piloto pequeno em uma área antes de expandir.',
      },
      {
        label: 'Envolver áreas',
        icon: 'users',
        prompt: 'Seria importante envolver as áreas responsáveis para validar e testar a mudança.',
      },
      {
        label: 'Treinamento rápido',
        icon: 'check-circle',
        prompt: 'Também seria necessário um treinamento rápido para a equipe seguir o novo padrão.',
      },
    ]
  }

  if (stageIndex === 0) {
    return [
      {
        label: 'Vou pelo problema',
        icon: 'lightbulb',
        prompt: 'Vou explicar pelo problema que eu percebo no dia a dia: ',
      },
      {
        label: 'Como é hoje',
        icon: 'layers',
        prompt: 'Hoje funciona assim: ',
      },
      {
        label: 'Me dê exemplos',
        icon: 'sparkles',
        prompt: 'Me dê exemplos para eu conseguir explicar melhor.',
      },
    ]
  }

  return []
}

export default function InnovationIAPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const hook = useIAInnovation(user?.id ?? null, 'desktop')
  const [input, setInput] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [uxDemoMode, setUxDemoMode] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoType, setDemoType] = useState<'idea' | 'helpdesk' | 'badword'>('idea')
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([])
  const [demoIdea, setDemoIdea] = useState<IdeaDoc | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewIdea, setReviewIdea] = useState<IdeaDoc | null>(null)
  const [manualReviewPending, setManualReviewPending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastOpenedIdeaKeyRef = useRef<string | null>(null)
  const manualIdeaSyncRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const advanceDemoStepRef = useRef<() => Promise<void>>(async () => {})
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const recordingBaseRef = useRef('')
  const recordingResultAppliedRef = useRef(false)
  const recordingAccumulatedRef = useRef('')

  const displayMessages = uxDemoMode ? demoMessages : hook.messages
  const displayIdea = uxDemoMode ? demoIdea : hook.structuredIdea
  const displayIdeaKey = getIdeaKey(displayIdea)
  const displayLoading = uxDemoMode ? demoLoading : hook.isLoading
  const liveIdeaDraft = useMemo(
    () => (displayIdea ? null : buildLiveIdeaDraft(displayMessages)),
    [displayIdea, displayMessages]
  )
  const ideaReady = displayIdea !== null
  const stageIndex = (uxDemoMode && demoType !== 'idea') ? 0 : inferStageIndex(displayMessages, displayIdea)
  const composerSuggestions = getContextualReplies(displayMessages, displayIdea, stageIndex)

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    setHasSpeechAPI(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, displayLoading, displayIdea, isRecording])

  useEffect(() => {
    if (!speechError) return
    const dismiss = () => setSpeechError(null)
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [speechError])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return

    const maxHeight = 132
    textarea.style.height = '0px'
    const nextHeight = Math.max(28, Math.min(textarea.scrollHeight, maxHeight))
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [input])

  useEffect(() => {
    if (!displayIdea || !displayIdeaKey) {
      setReviewIdea(null)
      setReviewModalOpen(false)
      setManualReviewPending(false)
      lastOpenedIdeaKeyRef.current = null
      manualIdeaSyncRef.current = false
      return
    }

    const isManualSync = manualIdeaSyncRef.current
    manualIdeaSyncRef.current = false
    setReviewIdea(displayIdea)

    if (!isManualSync) {
      setManualReviewPending(false)
    }

    if (lastOpenedIdeaKeyRef.current !== displayIdeaKey) {
      lastOpenedIdeaKeyRef.current = displayIdeaKey
      if (!isManualSync) {
        setReviewModalOpen(true)
      }
    }
  }, [displayIdea, displayIdeaKey])

  // keep ref pointing to the latest advanceDemoStep (avoids stale closure in message listener)
  useEffect(() => {
    advanceDemoStepRef.current = advanceDemoStep
  })

  // pitch mode postMessage listener — receives commands from the popup on the second monitor
  useEffect(() => {
    async function handlePitchMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== 'PITCH_CMD') return
      const { action } = event.data as { type: string; action: string; demo?: string }
      const pitchWindow = event.source as Window | null

      if (action === 'DEMO_ADVANCE') {
        await advanceDemoStepRef.current()
        pitchWindow?.postMessage({ type: 'PITCH_RESPONSE_DONE' }, '*')
        return
      }

      if (action === 'DEMO_AI') {
        const demo = (event.data.demo ?? 'idea') as 'idea' | 'helpdesk' | 'badword'
        const turns = getActiveDemoTurns(demo)
        const firstTurn = turns[0]
        if (!firstTurn) return

        // reset all demo state
        setDemoType(demo)
        setUxDemoMode(true)
        setDemoStep(0)
        setDemoMessages([])
        setDemoIdea(null)
        setInput('')
        setPublished(false)
        setPublishError(null)
        setIsPublishing(false)
        setReviewModalOpen(false)
        setReviewIdea(null)
        setManualReviewPending(false)
        lastOpenedIdeaKeyRef.current = null
        manualIdeaSyncRef.current = false

        if (demo === 'helpdesk' || demo === 'badword') {
          // simulate typing in the input field
          for (let i = 1; i <= firstTurn.user.length; i++) {
            setInput(firstTurn.user.slice(0, i))
            await new Promise<void>((resolve) => setTimeout(resolve, 35))
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 400))
          setInput('')
          setDemoMessages([{ role: 'user', content: firstTurn.user }])
          setDemoLoading(true)
          await new Promise<void>((resolve) => setTimeout(resolve, 1800))
          setDemoLoading(false)
          setDemoMessages([
            { role: 'user', content: firstTurn.user },
            { role: 'assistant', content: firstTurn.assistant },
          ])
          setDemoStep(1)
        } else {
          // idea demo: typing animation (faster: 20ms per char)
          for (let i = 1; i <= firstTurn.user.length; i++) {
            setInput(firstTurn.user.slice(0, i))
            await new Promise<void>((resolve) => setTimeout(resolve, 20))
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 300))
          setInput('')
          setDemoMessages([{ role: 'user', content: firstTurn.user }])
          setDemoLoading(true)
          await new Promise<void>((resolve) => setTimeout(resolve, 2000))
          setDemoLoading(false)
          setDemoMessages([
            { role: 'user', content: firstTurn.user },
            { role: 'assistant', content: firstTurn.assistant },
          ])
          setDemoStep(1)
          if (firstTurn.idea) setDemoIdea(firstTurn.idea)
          pitchWindow?.postMessage({ type: 'PITCH_RESPONSE_DONE' }, '*')
        }
      }
    }

    window.addEventListener('message', handlePitchMessage)
    return () => window.removeEventListener('message', handlePitchMessage)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (!text || displayLoading) return
    setInput('')
    setPublishError(null)
    setPublished(false)

    if (uxDemoMode) {
      await handleDemoMessage(text)
      return
    }

    try {
      await hook.sendMessage(text)
    } catch {
      // O hook já mostra a mensagem de erro na conversa.
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function prepareRefinement(text: string) {
    setInput(text)
    inputRef.current?.focus()
  }

  function handleComposerSuggestion(suggestion: ComposerSuggestion) {
    if (!suggestion.prompt) {
      if (displayIdea) {
        setReviewIdea(displayIdea)
        setReviewModalOpen(true)
      }
      return
    }

    if (suggestion.prompt.endsWith(': ')) {
      setInput(suggestion.prompt)
      inputRef.current?.focus()
      return
    }

    handleSend(suggestion.prompt)
  }

  function syncIdea(idea: IdeaDoc, manual: boolean) {
    manualIdeaSyncRef.current = manual
    if (uxDemoMode) {
      setDemoIdea(idea)
    } else {
      hook.updateStructuredIdea(idea)
    }
    setReviewIdea(idea)
  }

  async function handleDemoMessage(text: string) {
    setDemoMessages((prev) => [...prev, { role: 'user', content: text }])
    setDemoLoading(true)
    await new Promise<void>((resolve) => setTimeout(resolve, 2500))
    setDemoLoading(false)

    if (demoIdea) {
      setDemoMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Ajuste simulado aplicado na prévia. No modo real, a Eura usaria o contexto da conversa para reescrever a proposta.',
        },
      ])
      return
    }

    const activeTurns = getActiveDemoTurns(demoType)
    const nextTurn = activeTurns[Math.min(demoStep, activeTurns.length - 1)]
    const assistant = nextTurn?.assistant ?? 'Prévia atualizada no modo teste UX.'
    const idea = nextTurn?.idea ?? null

    setDemoMessages((prev) => [...prev, { role: 'assistant', content: assistant }])
    setDemoStep((prev) => Math.min(prev + 1, activeTurns.length))
    if (idea) setDemoIdea(idea)
  }

  async function advanceDemoStep() {
    const activeTurns = getActiveDemoTurns(demoType)
    const nextTurn = activeTurns[Math.min(demoStep, activeTurns.length - 1)]
    if (!nextTurn || demoStep >= activeTurns.length) return

    if (!uxDemoMode) {
      setDemoStep((prev) => Math.min(prev + 1, activeTurns.length))
      await handleSend(nextTurn.user)
      return
    }

    for (let i = 1; i <= nextTurn.user.length; i++) {
      setInput(nextTurn.user.slice(0, i))
      await new Promise<void>((resolve) => setTimeout(resolve, 20))
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 300))
    setInput('')
    setDemoMessages((prev) => [...prev, { role: 'user', content: nextTurn.user }])
    setDemoLoading(true)
    await new Promise<void>((resolve) => setTimeout(resolve, nextTurn.delay ?? 2500))
    setDemoLoading(false)
    setDemoMessages((prev) => [...prev, { role: 'assistant', content: nextTurn.assistant }])
    setDemoStep((prev) => Math.min(prev + 1, activeTurns.length))
    if (nextTurn.idea) setDemoIdea(nextTurn.idea)
    setPublished(false)
    setPublishError(null)
  }

  function toggleUxDemoMode() {
    const nextValue = !uxDemoMode
    setUxDemoMode(nextValue)
    setInput('')
    setPublished(false)
    setPublishError(null)
    setIsPublishing(false)
    setReviewModalOpen(false)
    setReviewIdea(null)
    setManualReviewPending(false)
    setDemoLoading(false)
    lastOpenedIdeaKeyRef.current = null
    manualIdeaSyncRef.current = false
    if (!nextValue) return
    setDemoStep(0)
    setDemoMessages([])
    setDemoIdea(null)
  }

  function startRealAiTest() {
    setUxDemoMode(false)
    hook.resetChat()
    setInput('')
    setPublished(false)
    setPublishError(null)
    setIsPublishing(false)
    setReviewModalOpen(false)
    setReviewIdea(null)
    setManualReviewPending(false)
    setDemoLoading(false)
    setDemoStep(0)
    setDemoMessages([])
    setDemoIdea(null)
    lastOpenedIdeaKeyRef.current = null
    manualIdeaSyncRef.current = false
    inputRef.current?.focus()
  }

  function handleSaveEditedIdea(idea: IdeaDoc) {
    syncIdea(idea, true)
    setManualReviewPending(true)
    setPublished(false)
    setPublishError(null)
  }

  async function handleReviewEditedIdea(idea: IdeaDoc) {
    syncIdea(idea, true)
    setManualReviewPending(true)
    setPublished(false)
    setPublishError(null)
    setReviewModalOpen(false)

    if (uxDemoMode) {
      setDemoMessages((prev) => [
        ...prev,
        { role: 'user', content: 'Editei alguns campos da proposta. Eura, revise a versão antes de publicar.' },
        {
          role: 'assistant',
          content: 'Revisão simulada concluída. Confira a proposta completa no modal antes de publicar.',
        },
      ])
      setManualReviewPending(false)
      setReviewModalOpen(true)
      return
    }

    try {
      await hook.reviewStructuredIdea(idea)
    } catch {
      setPublishError('Não consegui revisar a edição agora. Tente novamente.')
    }
  }

  async function handlePublish() {
    if (!displayIdea) return

    if (manualReviewPending) {
      setPublishError('Revise as alterações com a Eura antes de publicar.')
      return
    }

    if (uxDemoMode) {
      setPublished(true)
      setPublishError(null)
      setReviewModalOpen(false)
      return
    }

    if (!user?.id) return
    if (!user.sector_id) {
      setPublishError('Seu perfil não possui setor definido. Contate o administrador.')
      return
    }
    setIsPublishing(true)
    setPublishError(null)
    try {
      await hook.publishIdea(user.sector_id, displayIdea)
      setPublished(true)
      setReviewModalOpen(false)
      setIsPublishing(false)
    } catch {
      setPublishError('Erro ao publicar ideia. Tente novamente.')
      setIsPublishing(false)
    }
  }

  function handleReset() {
    hook.resetChat()
    setDemoStep(0)
    setDemoMessages([])
    setDemoIdea(null)
    setDemoLoading(false)
    setInput('')
    setPublished(false)
    setPublishError(null)
    setIsPublishing(false)
    setReviewModalOpen(false)
    setReviewIdea(null)
    setManualReviewPending(false)
    lastOpenedIdeaKeyRef.current = null
    manualIdeaSyncRef.current = false
  }

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
    recordingBaseRef.current = input.trim()
    recordingResultAppliedRef.current = false
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
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          const sep = recordingAccumulatedRef.current ? ' ' : ''
          recordingAccumulatedRef.current += sep + text.trim()
        } else {
          interimText += text
        }
      }
      lastInterim = interimText
    }
    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
      const full = normalizeTranscript(
        recordingAccumulatedRef.current || lastInterim
      )
      if (full) {
        const base = recordingBaseRef.current
        setInput(base ? `${base} ${full}` : full)
        setSpeechError(null)
      } else {
        setSpeechError('Nenhuma fala detectada. Tente falar mais perto do microfone.')
      }
      inputRef.current?.focus()
    }
    recognition.onerror = (event) => {
      setIsRecording(false)
      recognitionRef.current = null
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Permissão de microfone negada. Habilite nas configurações do navegador.',
        'no-speech': 'Nenhuma fala detectada. Tente falar mais alto ou mais perto do microfone.',
        'audio-capture': 'Microfone não encontrado ou indisponível.',
        'network': 'Erro de rede ao processar o áudio.',
        'aborted': '',
      }
      const msg = errorMessages[event.error] ?? `Erro no reconhecimento de voz: ${event.error}`
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

  return (
    <ProfileShell
      profile="funcionario"
      title="Innovation IA"
      subtitle="Converse com Eura para estruturar sua proposta"
      user={user}
      points={user?.points ?? 0}
      notifCount={2}
      pageBodyClass="light-page"
      sidebarExtra={
        user?.email === 'luan@eurofarma.com' ? (
          <SidebarUxTest
            uxDemoMode={uxDemoMode}
            demoStep={demoStep}
            demoType={demoType}
            isLoading={displayLoading}
            onToggle={toggleUxDemoMode}
            onAdvance={advanceDemoStep}
            onUseRealAi={startRealAiTest}
          />
        ) : undefined
      }
    >
      <div
        className="ia-desktop-layout"
        style={{
          height: '100%',
          display: 'grid',
          gridTemplateColumns: ideaReady
            ? 'minmax(460px, 1fr) minmax(320px, 380px)'
            : liveIdeaDraft
              ? 'minmax(0, 1fr) minmax(280px, 330px)'
              : '1fr',
          gap: 18,
          overflow: 'hidden',
        }}
      >
        <div
          className="ia-main-grid"
          style={{
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'hidden',
          }}
        >
          <div
            className={`ia-chat-border-wrap${displayLoading ? ' thinking' : ''}`}
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              boxShadow: '0 1px 3px rgba(13,24,41,.04)',
            }}
          >
          <section
            className="ia-chat-panel"
            style={{
              position: 'absolute',
              inset: 2,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg)',
              border: 'none',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 18px 10px',
                borderBottom: '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
                background: 'transparent',
              }}
            >
              <EuraAvatar size={42} />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'grid',
                  gap: 3,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 950, color: 'var(--ink)', lineHeight: 1.15 }}>
                  Eura
                </div>
                <div
                  style={{
                    color: 'var(--ink-2)',
                    fontSize: 11.5,
                    lineHeight: 1.35,
                    fontWeight: 700,
                  }}
                >
                  Descreva uma melhoria, dificuldade ou ideia do dia a dia. Eu organizo com você até virar uma proposta pronta para revisão.
                </div>
              </div>
              <button
                className="ih-icon-btn ia-new-chat-btn"
                type="button"
                onClick={handleReset}
                style={{ flexShrink: 0 }}
                aria-label="Nova conversa"
                title="Nova conversa"
              >
                <Icon name="refresh-cw" size={16} />
              </button>
            </div>

            {published && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                <PostPublishBanner
                  isDemoMode={uxDemoMode}
                  onNewIdea={handleReset}
                  onGoToHub={() => router.push('/hub')}
                />
              </div>
            )}

          <div
            className="ia-message-stream"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: '22px 22px 16px',
              background: 'transparent',
            }}
          >
            <EuraBubble>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  Olá! Sou a <strong>Eura</strong>. Pode começar com uma frase simples, uma dúvida ou uma situação que parece dar trabalho. Eu cuido da estrutura com você.
                </div>
                <div
                  className="ia-tips-card"
                  style={{
                    display: 'grid',
                    gap: 7,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.07)',
                  }}
                >
                  <div className="ia-tips-title" style={{ color: '#12324f', fontSize: 12.5, fontWeight: 900 }}>Para uma boa proposta</div>
                  {[
                    'Diga onde o problema acontece',
                    'Conte como isso atrapalha o trabalho',
                    'Explique o que mudaria na prática',
                    'Indique o impacto esperado',
                  ].map((item) => (
                    <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Icon name="check-circle" size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
                      <span style={{ color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.45 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </EuraBubble>

            {displayMessages.map((msg, i) =>
              msg.role === 'user' ? (
                <UserBubble key={i} content={msg.content} initials={user?.name ? user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') : 'EU'} />
              ) : (
                <EuraBubble key={i}>
                  <MarkdownText text={msg.content} />
                </EuraBubble>
              )
            )}

            {displayLoading && (
              <div
                className="ia-loading-row"
                style={{
                  width: 'min(840px, 100%)',
                  margin: '0 auto',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-end',
                }}
              >
                <EuraAvatar size={28} />
                <ThinkingStatus />
              </div>
            )}

            {isRecording && (
              <div
                style={{
                  width: 'min(840px, 100%)',
                  margin: '0 auto',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    background: '#0057a8',
                    color: '#fff',
                    borderRadius: '18px 6px 18px 18px',
                    padding: '11px 15px',
                    fontSize: 13.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 8px rgba(0,87,168,.2)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#fff',
                      flexShrink: 0,
                      animation: 'pulseSoft 1s ease-in-out infinite',
                    }}
                  />
                  Gravando...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div
            className="ia-composer-zone"
            style={{
              padding: '12px 22px 20px',
              flexShrink: 0,
              background: 'transparent',
            }}
          >
            {composerSuggestions.length > 0 && (
              <div
                className="ia-quick-replies-floating"
                style={{
                  width: 'min(840px, 100%)',
                  margin: '0 auto 10px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                {composerSuggestions.map((suggestion) => (
                  <button
                    className="ia-quick-reply"
                    key={suggestion.label}
                    type="button"
                    onClick={() => handleComposerSuggestion(suggestion)}
                    disabled={displayLoading || published}
                    style={{
                      minHeight: 32,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 11px',
                      border: '1px solid rgba(0,87,168,.14)',
                      borderRadius: 999,
                      background: '#fff',
                      color: 'var(--ink-2)',
                      cursor: displayLoading || published ? 'not-allowed' : 'pointer',
                      fontSize: 11.5,
                      fontWeight: 800,
                      boxShadow: '0 8px 18px rgba(15,23,42,.08)',
                    }}
                  >
                    <Icon name={suggestion.icon} size={13} />
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}

            <div
              className="ia-composer-shell"
              style={{
                width: 'min(840px, 100%)',
                margin: '0 auto',
                padding: '10px 10px 10px 14px',
                border: '1px solid rgba(0,0,0,0.09)',
                borderRadius: 20,
                background: '#F9F8F7',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  className="ih-textarea ia-composer-textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={ideaReady ? 'Peça um ajuste ou detalhe para a Eura...' : 'Mensagem para a Eura'}
                  rows={1}
                  style={{
                    flex: 1,
                    height: 28,
                    minHeight: 28,
                    maxHeight: 132,
                    resize: 'none',
                    border: 'none',
                    boxShadow: 'none',
                    background: 'transparent',
                    padding: '4px 2px 3px',
                    lineHeight: 1.45,
                  }}
                  disabled={displayLoading || published}
                />
                {hasSpeechAPI && (
                  <button
                    type="button"
                    className="ia-mic-btn"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={displayLoading || published}
                    aria-label={isRecording ? 'Parar gravação' : 'Falar mensagem'}
                    title={isRecording ? 'Parar gravação' : 'Falar mensagem'}
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      padding: 0,
                      borderRadius: 999,
                      border: isRecording ? '2px solid var(--accent)' : 'none',
                      background: isRecording ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : undefined,
                      color: isRecording ? 'var(--accent)' : undefined,
                      cursor: displayLoading || published ? 'not-allowed' : 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    }}
                  >
                    {isRecording && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 999,
                          background: 'var(--accent)',
                          animation: 'micRipple 1.2s ease-out infinite',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    <Icon name="mic" size={16} />
                  </button>
                )}
                <button
                  className="btn ia-send-button"
                  type="button"
                  disabled={!input.trim() || displayLoading || published}
                  onClick={() => handleSend()}
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    padding: 0,
                    borderRadius: 999,
                    marginBottom: 0,
                    background: '#FFC600',
                    boxShadow: '0 2px 8px rgba(255,198,0,0.4)',
                    color: '#1B2235',
                    border: 'none',
                  }}
                  aria-label="Enviar mensagem"
                >
                  <Icon name="send" size={14} />
                </button>
              </div>
            </div>
            {speechError && (
              <div
                style={{
                  width: 'min(840px, 100%)',
                  margin: '6px auto 0',
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: 'var(--primary-light)',
                  border: '1px solid rgba(0,87,168,.25)',
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Icon name="mic-off" size={13} />
                {speechError}
              </div>
            )}
            <div
              style={{
                width: 'min(840px, 100%)',
                margin: '10px auto 0',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <StageHeader stageIndex={stageIndex} ideaReady={ideaReady} />
            </div>
          </div>
          </section>
          </div>
        </div>

        {ideaReady && displayIdea ? (
          <ProposalPanel
            idea={displayIdea}
            isPublishing={isPublishing}
            published={published}
            publishError={publishError}
            onPublish={handlePublish}
            onRefine={prepareRefinement}
            onOpenReview={() => {
              setReviewIdea(displayIdea)
              setReviewModalOpen(true)
            }}
            isDemoMode={uxDemoMode}
            reviewPending={manualReviewPending}
          />
        ) : liveIdeaDraft ? (
          <LiveIdeaPreview idea={liveIdeaDraft} />
        ) : null}
      </div>

      {reviewModalOpen && reviewIdea && (
        <IdeaReviewModal
          idea={reviewIdea}
          isPublishing={isPublishing}
          published={published}
          publishError={publishError}
          reviewPending={manualReviewPending}
          onClose={() => setReviewModalOpen(false)}
          onSave={handleSaveEditedIdea}
          onReview={handleReviewEditedIdea}
          onRefine={(text) => {
            setReviewModalOpen(false)
            prepareRefinement(text)
          }}
          onPublish={handlePublish}
          isDemoMode={uxDemoMode}
        />
      )}
    </ProfileShell>
  )
}

function SidebarUxTest({
  uxDemoMode,
  demoStep,
  demoType,
  isLoading,
  onToggle,
  onAdvance,
  onUseRealAi,
}: {
  uxDemoMode: boolean
  demoStep: number
  demoType: 'idea' | 'helpdesk' | 'badword'
  isLoading: boolean
  onToggle: () => void
  onAdvance: () => void
  onUseRealAi: () => void
}) {
  const activeTurns = getActiveDemoTurns(demoType)
  return (
    <section
      className={`ia-stepper ia-ux-test-panel${uxDemoMode ? ' active' : ''}`}
      style={{
        padding: 12,
        borderRadius: 10,
        display: 'grid',
        gap: 8,
      }}
    >
      <div className="ia-ux-test-label" style={{ fontSize: 10, fontWeight: 850, textTransform: 'uppercase' }}>
        Teste UX
      </div>
      <button
        className={`btn btn-sm ${uxDemoMode ? 'btn-success' : 'btn-muted'}`}
        type="button"
        onClick={onToggle}
        style={{ width: '100%', minHeight: 34 }}
      >
        <Icon name={uxDemoMode ? 'check-circle' : 'cpu'} size={14} />
        {uxDemoMode ? 'Simulação ativa' : 'Simular chat'}
      </button>
      <button
        className="btn btn-muted btn-sm"
        type="button"
        onClick={onAdvance}
        disabled={isLoading || demoStep >= activeTurns.length}
        style={{ width: '100%', minHeight: 34 }}
      >
        <Icon name="chevron-right" size={14} />
        {uxDemoMode ? 'Avançar etapa' : 'Enviar etapa ao Gemini'}
      </button>
      <button
        className={`btn btn-sm ${uxDemoMode ? 'btn-accent' : 'btn-muted'}`}
        type="button"
        onClick={onUseRealAi}
        style={{ width: '100%', minHeight: 34 }}
      >
        <Icon name="sparkles" size={14} />
        {uxDemoMode ? 'Testar Gemini real' : 'Novo teste Gemini'}
      </button>
    </section>
  )
}

function StageHeader({ stageIndex, ideaReady }: { stageIndex: number; ideaReady: boolean }) {
  return (
    <section
      className="ia-stage-header"
      style={{
        flexShrink: 0,
        minWidth: 'max-content',
        padding: '7px 2px 0',
        border: '1px solid transparent',
        borderRadius: 'var(--r-md)',
        background: 'transparent',
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
      aria-label="Etapas da proposta"
    >
      <div style={{ flexShrink: 0, minWidth: 74 }}>
        <div className="stat-lbl" style={{ lineHeight: 1 }}>Etapas</div>
        <div style={{ marginTop: 3, color: ideaReady ? 'var(--accent)' : 'var(--ink-3)', fontSize: 10.5, fontWeight: 800, lineHeight: 1 }}>
          {ideaReady ? 'Pronta para revisão' : `${Math.min(stageIndex + 1, 4)} de 4`}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
        {JOURNEY_STEPS.map((step, index) => {
          const done = ideaReady || index < stageIndex
          const active = !ideaReady && index === stageIndex
          const statusLabel = done ? 'Feito' : active ? 'Em andamento' : 'Para fazer'
          const statusIcon: IconName = done ? 'check' : active ? 'clock' : 'circle'
          const lineDone = ideaReady || index < stageIndex

          return (
            <div key={step.label} style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <div
                title={`${step.label}: ${statusLabel}. ${step.text}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: done || active ? 'var(--accent)' : 'var(--surface)',
                    color: done || active ? 'var(--ia-step-icon-color, #fff)' : 'var(--ink-3)',
                    border: done || active ? '1px solid transparent' : '1px solid var(--line-strong)',
                    boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)' : 'none',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={statusIcon} size={11} />
                </span>
                <span
                  style={{
                    color: done || active ? 'var(--accent)' : 'var(--ink-3)',
                    fontSize: 10.5,
                    fontWeight: 850,
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
                    width: 28,
                    flexShrink: 0,
                    height: 2,
                    margin: '0 7px',
                    borderRadius: 999,
                    background: lineDone ? 'var(--accent)' : 'var(--line)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EuraAvatar({ size = 32 }: { size?: number }) {
  const radius = Math.max(7, Math.round(size * 0.23))
  const innerSize = Math.round(size * 0.68)

  return (
    <div
      className="ia-eura-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'color-mix(in srgb, var(--bg) 72%, var(--surface))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(13,24,41,.05)',
        overflow: 'hidden',
        border: '1px solid var(--line-strong)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(145deg, rgba(255,255,255,.5), transparent 46%)',
        }}
      />
      <span
        className="ia-eura-avatar-core"
        style={{
          position: 'absolute',
          width: innerSize,
          height: innerSize,
          borderRadius: Math.max(6, Math.round(size * 0.18)),
          display: 'grid',
          placeItems: 'center',
          color: 'var(--accent)',
        }}
      >
        <Icon name="bot" size={Math.max(16, Math.round(size * 0.54))} />
      </span>
      <span
        style={{
          position: 'absolute',
          left: Math.round(size * 0.17),
          top: Math.round(size * 0.16),
          width: Math.max(4, Math.round(size * 0.12)),
          height: Math.max(4, Math.round(size * 0.12)),
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--accent) 20%, var(--bg))',
        }}
      />
    </div>
  )
}

function MarkdownText({ text }: { text: string }) {
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
      const sizes = [15, 14, 13]
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
        <code key={`${match.index}-c`} style={{ fontFamily: 'monospace', background: 'rgba(0,87,168,.1)', padding: '1px 5px', borderRadius: 4, fontSize: '0.875em' }}>
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

function UserBubble({ content, initials }: { content: string; initials: string }) {
  return (
    <div
      className="ia-message-row-user"
      style={{
        width: 'min(840px, 100%)',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ maxWidth: 'min(680px, 78%)' }}>
        <div
          className="ia-bubble-user"
          style={{
            background: '#EEF2F8',
            color: '#1B2E4A',
            borderRadius: '18px 6px 18px 18px',
            padding: '11px 15px',
            fontSize: 13.5,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            userSelect: 'text',
            cursor: 'text',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {content}
        </div>
      </div>
      <div
        className="ia-user-avatar"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: 'var(--primary-light)',
          border: '1.5px solid var(--primary)',
          color: 'var(--primary)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 10,
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

function ThinkingStatus() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % THINKING_MESSAGES.length)
    }, 1600)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div
      className="ia-loading-card ia-bubble-assistant"
      style={{
        background: '#F9F8F7',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: '6px 18px 18px 18px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        color: '#12324f',
        fontSize: 12.5,
        fontWeight: 700,
        lineHeight: 1.4,
      }}
    >
      <span style={{ order: 0 }}>{THINKING_MESSAGES[messageIndex]}</span>
      <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexShrink: 0, order: 1 }}>
        <span className="ih-typing-dot" style={{ animationDelay: '0s' }} />
        <span className="ih-typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="ih-typing-dot" style={{ animationDelay: '0.4s' }} />
      </span>
    </div>
  )
}

function EuraBubble({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 'min(840px, 100%)',
        margin: '0 auto',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <EuraAvatar size={28} />
      <div
        className="ia-bubble-assistant"
        style={{
          background: '#F9F8F7',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: '6px 18px 18px 18px',
          padding: '12px 16px',
          maxWidth: 'min(690px, calc(100% - 42px))',
          fontSize: 13.5,
          lineHeight: 1.65,
          color: '#1B2E4A',
          whiteSpace: 'pre-wrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function PostPublishBanner({
  isDemoMode,
  onNewIdea,
  onGoToHub,
}: {
  isDemoMode: boolean
  onNewIdea: () => void
  onGoToHub: () => void
}) {
  return (
    <div
      className="ia-post-publish"
      style={{
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
        background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
        color: 'var(--ink)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--ia-step-icon-color, #fff)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="check" size={15} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 900, lineHeight: 1.25 }}>
            {isDemoMode ? 'Publicação simulada concluída' : 'Ideia enviada para o Hub'}
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 11.5, fontWeight: 650, lineHeight: 1.35 }}>
            Você pode começar outra proposta agora.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className="btn btn-accent btn-sm" type="button" onClick={onNewIdea}>
          <Icon name="plus" size={13} />
          Dar nova ideia
        </button>
        {!isDemoMode && (
          <button className="btn btn-muted btn-sm" type="button" onClick={onGoToHub}>
            Ver Hub
          </button>
        )}
      </div>
    </div>
  )
}

function LiveIdeaPreview({ idea }: { idea: IdeaDoc }) {
  return (
    <aside
      className="ia-proposal-panel"
      aria-live="polite"
      style={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        animation: 'slideInRight 0.28s ease both',
      }}
    >
      <div style={{ padding: 18, borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>Prévia em construção</div>
            <div className="ih-topbar-sub">A Eura organiza enquanto você escreve</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          className="ia-score-pending-card"
          style={{
            padding: 14,
            borderRadius: 'var(--r-md)',
            border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
            background: 'color-mix(in srgb, var(--accent) 7%, transparent)',
            color: 'var(--ink)',
            display: 'grid',
            gridTemplateColumns: '72px minmax(0, 1fr)',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
              color: 'var(--accent)',
            }}
            aria-label="Score em cálculo"
          >
            <span className="spin" />
          </div>
          <span>
            <span style={{ display: 'block', color: 'var(--ink)', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
              {idea.title}
            </span>
            <span style={{ display: 'block', marginTop: 6, color: 'var(--ink-3)', fontSize: 11, fontWeight: 600 }}>
              Score sendo calculado
            </span>
          </span>
        </div>

        <div className="ih-kv-grid">
          <div className="ih-kv">
            <div className="ih-kv-label" style={{ fontWeight: 750 }}>Complexidade</div>
            <div className="ih-kv-value" style={{ fontWeight: 500 }}>Aguardando finalização</div>
          </div>
          <div className="ih-kv">
            <div className="ih-kv-label" style={{ fontWeight: 750 }}>Área</div>
            <div className="ih-kv-value" style={{ fontWeight: 500 }}>Aguardando finalização</div>
          </div>
        </div>

        <DocBlock label="Resumo" value={idea.summary} weight={450} />
        <DocBlock label="Benefícios" value={idea.benefits} weight={450} />

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(0,87,168,.06)',
            color: 'var(--ink-2)',
            border: '1px solid rgba(0,87,168,.12)',
            fontSize: 12,
            fontWeight: 450,
            lineHeight: 1.5,
          }}
        >
          Esta prévia é só um rascunho vivo. A versão final será ajustada quando a Eura estruturar a proposta completa.
        </div>
      </div>
    </aside>
  )
}

function ProposalPanel({
  idea,
  isPublishing,
  published,
  publishError,
  onPublish,
  onRefine,
  onOpenReview,
  isDemoMode,
  reviewPending,
}: {
  idea: IdeaDoc
  isPublishing: boolean
  published: boolean
  publishError: string | null
  onPublish: () => void
  onRefine: (text: string) => void
  onOpenReview: () => void
  isDemoMode: boolean
  reviewPending: boolean
}) {
  const scoreColor = getScoreColor(idea.ai_score)

  return (
    <aside
      className="ia-proposal-panel"
      style={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        animation: 'slideInRight 0.28s ease both',
      }}
    >
      <div style={{ padding: 18, borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--ink)' }}>Ações da proposta</div>
            <div className="ih-topbar-sub">Refine, revise ou publique</div>
          </div>
          <Icon name="check-circle" size={20} style={{ color: 'var(--accent)' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            display: 'grid',
            gap: 10,
            padding: 12,
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--line)',
            background: 'var(--surface-2)',
          }}
        >
          <div className="stat-lbl">Refinar com a Eura</div>
          {REFINEMENT_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              style={{
                minHeight: 48,
                display: 'grid',
                gridTemplateColumns: '30px minmax(0, 1fr) 16px',
                gap: 10,
                alignItems: 'center',
                padding: '9px 10px',
                border: '1px solid var(--line-strong)',
                borderRadius: 9,
                background: 'var(--surface)',
                color: 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => onRefine(prompt.text)}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--accent)',
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                }}
              >
                <Icon name={prompt.icon} size={15} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 900 }}>{prompt.label}</span>
                <span style={{ display: 'block', marginTop: 2, color: 'var(--ink-3)', fontSize: 10.5, fontWeight: 650 }}>
                  {prompt.description}
                </span>
              </span>
              <Icon name="chevron-right" size={14} style={{ color: 'var(--ink-3)' }} />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenReview}
          style={{
            padding: 14,
            borderRadius: 'var(--r-md)',
            border: '1px solid rgba(0,87,168,.16)',
            background: 'color-mix(in srgb, var(--accent) 7%, transparent)',
            color: 'var(--ink)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'grid',
            gridTemplateColumns: '72px minmax(0, 1fr)',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div
            className="ih-score-ring"
            style={
              {
                '--score-size': '64px',
                '--score-color': scoreColor,
                '--score-track': 'rgba(255,255,255,.68)',
              } as CSSProperties
            }
          >
            {idea.ai_score}
          </div>
          <span>
            <span style={{ display: 'block', color: 'var(--ink)', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
              {idea.title}
            </span>
            <span style={{ display: 'block', marginTop: 6, color: 'var(--ink-3)', fontSize: 11, fontWeight: 600 }}>
              Abrir revisão completa
            </span>
          </span>
        </button>

        <div className="ih-kv-grid">
          <div className="ih-kv">
            <div className="ih-kv-label">Complexidade</div>
            <div className="ih-kv-value" style={{ fontWeight: 500 }}>{idea.complexity}</div>
          </div>
          <div className="ih-kv">
            <div className="ih-kv-label">Área</div>
            <div className="ih-kv-value" style={{ fontWeight: 500 }}>{IMPROVEMENT_LABELS[idea.improvement_area] ?? idea.improvement_area}</div>
          </div>
        </div>

        <DocBlock label="Resumo" value={idea.summary} weight={450} />
        <DocBlock label="Benefícios" value={idea.benefits} weight={450} />

        {reviewPending && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(217,119,6,.08)',
              color: '#92400e',
              border: '1px solid rgba(217,119,6,.18)',
              fontSize: 12,
              fontWeight: 750,
              lineHeight: 1.5,
            }}
          >
            Há edições manuais pendentes. Revise com a Eura antes de publicar.
          </div>
        )}

        {publishError && (
          <Alert tone="danger">{publishError}</Alert>
        )}

        {published && (
          <Alert tone="success">
            {isDemoMode ? 'Publicação simulada no modo teste UX.' : 'Ideia publicada. Redirecionando...'}
          </Alert>
        )}
      </div>

      <div style={{ padding: 16, borderTop: '1px solid var(--line)', flexShrink: 0, display: 'grid', gap: 9 }}>
        <button className="btn btn-primary btn-md" type="button" onClick={onOpenReview} style={{ width: '100%' }}>
          <Icon name="eye" size={15} />
          Editar ou Revisar
        </button>
        <button
          className="btn btn-success ia-publish-btn btn-lg"
          type="button"
          disabled={isPublishing || published || reviewPending}
          onClick={onPublish}
          style={{ width: '100%' }}
        >
          {isPublishing ? (
            <>
              <span className="spin" />
              Publicando...
            </>
          ) : (
            <>
              <Icon name="send" size={15} />
              {isDemoMode ? 'Simular publicação' : 'Publicar no Hub'}
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

function IdeaReviewModal({
  idea,
  isPublishing,
  published,
  publishError,
  reviewPending,
  onClose,
  onSave,
  onReview,
  onRefine,
  onPublish,
  isDemoMode,
}: {
  idea: IdeaDoc
  isPublishing: boolean
  published: boolean
  publishError: string | null
  reviewPending: boolean
  onClose: () => void
  onSave: (idea: IdeaDoc) => void
  onReview: (idea: IdeaDoc) => void
  onRefine: (text: string) => void
  onPublish: () => void
  isDemoMode: boolean
}) {
  const [draft, setDraft] = useState<IdeaDoc>(idea)
  const dirty = getIdeaKey(draft) !== getIdeaKey(idea)
  const scoreColor = getScoreColor(draft.ai_score)

  useEffect(() => {
    setDraft(idea)
  }, [idea])

  function updateDraft(field: keyof IdeaDoc, value: string | number) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    onSave({
      ...draft,
      title: draft.title.trim().slice(0, 80),
      summary: draft.summary.trim(),
      benefits: draft.benefits.trim(),
      complexity: draft.complexity,
      improvement_area: draft.improvement_area,
      ai_score: Number.isFinite(Number(draft.ai_score)) ? Math.max(0, Math.min(100, Number(draft.ai_score))) : 0,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revisão completa da proposta"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 22,
        background: 'rgba(15,23,42,.42)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="ia-review-modal"
        style={{
          width: 'min(940px, 96vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid rgba(255,255,255,.72)',
          boxShadow: '0 24px 70px rgba(15,23,42,.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            background: 'rgba(0,87,168,.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <EuraAvatar size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--ink)', fontSize: 17, fontWeight: 950 }}>Revisão da proposta</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontWeight: 700 }}>
                Veja a ideia completa, edite se precisar e peça a revisão final da Eura.
              </div>
            </div>
          </div>
          <button className="ih-icon-btn" type="button" onClick={onClose} aria-label="Fechar revisão">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: 22,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 220px',
            gap: 18,
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Título">
              <input
                className="ih-input"
                value={draft.title}
                maxLength={80}
                onChange={(e) => updateDraft('title', e.target.value)}
              />
            </Field>

            <Field label="Resumo">
              <textarea
                className="ih-textarea"
                value={draft.summary}
                onChange={(e) => updateDraft('summary', e.target.value)}
                style={{ minHeight: 110, resize: 'vertical' }}
              />
            </Field>

            <Field label="Benefícios esperados">
              <textarea
                className="ih-textarea"
                value={draft.benefits}
                onChange={(e) => updateDraft('benefits', e.target.value)}
                style={{ minHeight: 110, resize: 'vertical' }}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <Field label="Complexidade">
                <select
                  className="ih-input"
                  value={draft.complexity}
                  onChange={(e) => updateDraft('complexity', e.target.value)}
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </Field>

              <Field label="Área de melhoria">
                <select
                  className="ih-input"
                  value={draft.improvement_area}
                  onChange={(e) => updateDraft('improvement_area', e.target.value)}
                >
                  <option value="processo">Processo</option>
                  <option value="custo">Custo</option>
                  <option value="seguranca">Segurança</option>
                  <option value="qualidade">Qualidade</option>
                </select>
              </Field>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div
              style={{
                padding: 16,
                borderRadius: 'var(--r-md)',
                background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
                display: 'grid',
                placeItems: 'center',
                gap: 10,
                textAlign: 'center',
              }}
            >
              <div
                className="ih-score-ring"
                style={
                  {
                    '--score-size': '92px',
                    '--score-color': scoreColor,
                    '--score-track': 'rgba(255,255,255,.7)',
                  } as CSSProperties
                }
              >
                {draft.ai_score}
              </div>
              <div>
                <div className="stat-lbl">AI Score</div>
                <p style={{ margin: '6px 0 0', color: 'var(--ink-2)', fontSize: 12, lineHeight: 1.5 }}>
                  {getScoreDescription(draft.ai_score)}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 9,
                padding: 12,
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--line)',
                background: 'var(--surface-2)',
              }}
            >
              <div className="stat-lbl">Refinar com a Eura</div>
              {REFINEMENT_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => onRefine(prompt.text)}
                  style={{
                    minHeight: 42,
                    display: 'grid',
                    gridTemplateColumns: '28px minmax(0, 1fr)',
                    gap: 9,
                    alignItems: 'center',
                    padding: '8px 9px',
                    border: '1px solid var(--line-strong)',
                    borderRadius: 9,
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--accent)',
                      background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    }}
                  >
                    <Icon name={prompt.icon} size={14} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11.5, fontWeight: 900 }}>{prompt.label}</span>
                    <span style={{ display: 'block', marginTop: 2, color: 'var(--ink-3)', fontSize: 10, fontWeight: 650 }}>
                      {prompt.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {(dirty || reviewPending) && (
              <div
                style={{
                  padding: '11px 12px',
                  borderRadius: 10,
                  background: 'rgba(217,119,6,.08)',
                  color: '#92400e',
                  border: '1px solid rgba(217,119,6,.18)',
                  fontSize: 12,
                  fontWeight: 750,
                  lineHeight: 1.5,
                }}
              >
                Alterações manuais precisam ser revisadas pela Eura antes da publicação.
              </div>
            )}

            {publishError && <Alert tone="danger">{publishError}</Alert>}
            {published && <Alert tone="success">{isDemoMode ? 'Publicação simulada.' : 'Ideia publicada.'}</Alert>}
          </aside>
        </div>

        <div
          style={{
            padding: 18,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button className="btn btn-muted btn-md" type="button" onClick={onClose}>
            Voltar ao chat
          </button>
          <button className="btn btn-muted btn-md" type="button" disabled={!dirty} onClick={handleSave}>
            <Icon name="check" size={14} />
            Salvar edição local
          </button>
          <button className="btn btn-primary btn-md" type="button" onClick={() => onReview(draft)} disabled={isPublishing}>
            <Icon name="sparkles" size={14} />
            Revisar com a Eura
          </button>
          <button
            className="btn btn-success ia-publish-btn btn-md"
            type="button"
            onClick={onPublish}
            disabled={isPublishing || published || dirty || reviewPending}
          >
            {isPublishing ? (
              <>
                <span className="spin" />
                Publicando...
              </>
            ) : (
              <>
                <Icon name="send" size={14} />
                {isDemoMode ? 'Simular publicação' : 'Publicar no Hub'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={{ color: 'var(--ink-3)', fontSize: 11, fontWeight: 850, textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function Alert({ tone, children }: { tone: 'danger' | 'success'; children: ReactNode }) {
  const success = tone === 'success'
  return (
    <div
      className={success ? 'ia-alert-success' : undefined}
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: success ? 'rgba(0,166,81,.08)' : 'rgba(229,62,62,.08)',
        color: success ? 'var(--green)' : 'var(--danger)',
        fontSize: 13,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        border: success ? '1px solid rgba(0,166,81,.15)' : '1px solid rgba(229,62,62,.15)',
      }}
    >
      <Icon name={success ? 'check-circle' : 'shield'} size={16} />
      {children}
    </div>
  )
}

function DocBlock({
  label,
  value,
  strong,
  weight,
}: {
  label: string
  value: string
  strong?: boolean
  weight?: number
}) {
  return (
    <div className="ih-kv">
      <div className="ih-kv-label">{label}</div>
      <div
        className="ih-kv-value"
        style={{ fontSize: strong ? 14 : 12.5, lineHeight: 1.65, fontWeight: weight ?? (strong ? 850 : 650) }}
      >
        {value}
      </div>
    </div>
  )
}
