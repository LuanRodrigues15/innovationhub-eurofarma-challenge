'use client'

import { useState } from 'react'
import type { IdeaDoc } from '@/services/ideasService'
import { publishIdea, creditPublishPoints } from '@/services/ideasService'
import { askEura } from '@/lib/mock/eura'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type IAChannel = 'desktop' | 'totem'

type GeminiResponse =
  | { type: 'message'; text: string }
  | { type: 'moderation'; occurrence: number; message: string }
  | { type: 'idea_ready'; data: IdeaDoc }
  | { error?: string }

interface UseIAInnovationReturn {
  messages: ChatMessage[]
  isLoading: boolean
  structuredIdea: IdeaDoc | null
  occurrenceCount: number
  sendMessage: (text: string) => Promise<void>
  reviewStructuredIdea: (idea: IdeaDoc) => Promise<void>
  publishIdea: (sectorId: string, ideaOverride?: IdeaDoc) => Promise<void>
  updateStructuredIdea: (idea: IdeaDoc | null) => void
  resetChat: () => void
}

export function useIAInnovation(userId: string | null, channel: IAChannel = 'desktop'): UseIAInnovationReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [structuredIdea, setStructuredIdea] = useState<IdeaDoc | null>(null)
  const [occurrenceCount, setOccurrenceCount] = useState(0)

  async function submitToGemini(
    nextMessages: ChatMessage[],
    ideaReadyMessage = 'Sua proposta foi estruturada. Revise a prévia, refine comigo se quiser, ou publique no Hub de Ideias.'
  ): Promise<void> {
    const apiMessages = nextMessages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))

    // Na demonstração a Eura é simulada no navegador (lib/mock/eura.ts), sem API externa.
    const data = (await askEura({ messages: apiMessages, userId })) as GeminiResponse

    if ('type' in data && data.type === 'moderation') {
      setOccurrenceCount((prev) => Math.max(prev + 1, data.occurrence))
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
        },
      ])
      return
    }

    if ('type' in data && data.type === 'idea_ready') {
      setStructuredIdea(data.data)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: ideaReadyMessage,
        },
      ])
      return
    }

    const responseText = 'type' in data && data.type === 'message' ? data.text.trim() : ''
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: responseText || 'Não entendi. Pode reformular?' },
    ])
  }

  async function sendMessage(text: string): Promise<void> {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setIsLoading(true)

    try {
      await submitToGemini(nextMessages)
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Desculpe, ocorreu um erro. Tente novamente.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message },
      ])
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function reviewStructuredIdea(idea: IdeaDoc): Promise<void> {
    if (isLoading) return

    const visibleMsg: ChatMessage = {
      role: 'user',
      content: 'Editei alguns campos da proposta. Eura, revise a versão antes de publicar.',
    }

    const reviewPrompt: ChatMessage = {
      role: 'user',
      content: `Revise a proposta editada abaixo antes da publicação. Verifique coerência, clareza, benefícios, complexidade, área de melhoria e ai_score. Se estiver adequada, retorne o JSON final completo da proposta no formato obrigatório. Se faltar alguma informação essencial, faça uma pergunta objetiva.

Título: ${idea.title}
Resumo: ${idea.summary}
Benefícios: ${idea.benefits}
Complexidade sugerida pelo usuário: ${idea.complexity}
Área sugerida pelo usuário: ${idea.improvement_area}
AI score atual: ${idea.ai_score}`,
    }

    const nextVisibleMessages = [...messages, visibleMsg]
    const nextApiMessages = [...messages, reviewPrompt]
    setMessages(nextVisibleMessages)
    setIsLoading(true)

    try {
      await submitToGemini(
        nextApiMessages,
        'Revisei sua edição e atualizei a proposta. Confira a versão final antes de publicar.'
      )
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Não consegui revisar a edição agora. Tente novamente em instantes.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message },
      ])
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePublishIdea(sectorId: string, ideaOverride?: IdeaDoc): Promise<void> {
    const ideaToPublish = ideaOverride ?? structuredIdea
    if (!ideaToPublish || !userId) throw new Error('Dados insuficientes para publicar')

    const idea = await publishIdea({ ...ideaToPublish, userId, sectorId })
    await creditPublishPoints(userId, idea.id)
  }

  function resetChat(): void {
    setMessages([])
    setIsLoading(false)
    setStructuredIdea(null)
    setOccurrenceCount(0)
  }

  return {
    messages,
    isLoading,
    structuredIdea,
    occurrenceCount,
    sendMessage,
    reviewStructuredIdea,
    publishIdea: handlePublishIdea,
    updateStructuredIdea: setStructuredIdea,
    resetChat,
  }
}
