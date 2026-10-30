// Eura simulada: no lugar do Gemini. Responde com regras simples, no mesmo formato da API original,
// então o chat do Innovation IA funciona sem chave de API nem servidor.
import { createClient } from '@/lib/supabase/client'
import type { IdeaDoc } from '@/services/ideasService'

type EuraMessage = { role: string; parts: Array<{ text: string }> }

export type EuraResponse =
  | { type: 'message'; text: string }
  | { type: 'moderation'; occurrence: number; message: string }
  | { type: 'idea_ready'; data: IdeaDoc }

const PROFANITY = [
  'idiota', 'imbecil', 'burro', 'estupido', 'otario', 'babaca', 'vagabundo', 'merda', 'bosta',
  'porra', 'caralho', 'puta', 'fdp', 'lixo de empresa',
]
const SUPPORT = [
  'computador', 'notebook', 'senha', 'login', 'impressora', 'internet', 'wifi', 'vpn', 'mouse',
  'teclado', 'nao liga', 'sistema fora', 'suporte', 'chamado', 'email nao',
]

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const hasAny = (text: string, words: string[]) => words.some((w) => text.includes(w))

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 3).trimEnd() + '...' : t
}

async function registerModeration(userId: string | null, content: string): Promise<number> {
  if (!userId) return 1
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('moderation_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const next = (existing.occurrence_count ?? 0) + 1
    await supabase
      .from('moderation_alerts')
      .update({ content, occurrence_count: next, status: next >= 2 ? 'warned' : 'pending' })
      .eq('id', existing.id)
    return next
  }
  await supabase.from('moderation_alerts').insert({ user_id: userId, content, occurrence_count: 1, status: 'pending' })
  return 1
}

function buildIdea(userTexts: string[]): IdeaDoc {
  const all = userTexts.join(' ')
  const flat = plain(all)
  const firstSentence = userTexts[0].split(/[.!?]/)[0] || userTexts[0]
  const title = clip(firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1), 80)
  const area = hasAny(flat, ['custo', 'economia', 'gasto', 'desperdic', 'caro'])
    ? 'custo'
    : hasAny(flat, ['seguranca', 'risco', 'acidente', 'epi'])
      ? 'seguranca'
      : hasAny(flat, ['qualidade', 'erro', 'retrabalho', 'falha', 'desvio'])
        ? 'qualidade'
        : 'processo'
  const complexity = all.length < 220 ? 'Baixa' : all.length < 420 ? 'Média' : 'Alta'
  const solution = userTexts[userTexts.length - 1]
  return {
    title,
    summary: clip(`${userTexts[0]} ${solution}`, 300),
    benefits: clip(`${userTexts[1] ?? 'Ganho de eficiência na rotina.'} Solução proposta: ${solution}`, 300),
    complexity,
    ai_score: 68 + (hash(all) % 24),
    improvement_area: area,
  }
}

function parseReview(text: string): IdeaDoc | null {
  const field = (label: string) => new RegExp(`${label}: (.*)`).exec(text)?.[1]?.trim()
  const title = field('Título')
  const summary = field('Resumo')
  const benefits = field('Benefícios')
  if (!title || !summary || !benefits) return null
  const score = Number(field('AI score atual')) || 75
  return {
    title,
    summary,
    benefits,
    complexity: field('Complexidade sugerida pelo usuário') ?? 'Média',
    ai_score: Math.min(100, Math.round(score) + 2),
    improvement_area: field('Área sugerida pelo usuário') ?? 'processo',
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function askEura(input: { messages: EuraMessage[]; userId: string | null }): Promise<EuraResponse> {
  await delay(900)
  const userTexts = input.messages.filter((m) => m.role === 'user').map((m) => m.parts.map((p) => p.text).join(' ').trim())
  const last = userTexts[userTexts.length - 1] ?? ''
  const flat = plain(last)

  if (last.startsWith('Revise a proposta editada')) {
    const idea = parseReview(last)
    if (idea) return { type: 'idea_ready', data: idea }
  }

  if (hasAny(flat, PROFANITY) || last.includes('●●●')) {
    const occurrence = await registerModeration(input.userId, last)
    return {
      type: 'moderation',
      occurrence,
      message:
        occurrence > 1
          ? 'Esse tipo de conteúdo não é permitido na plataforma. Esta é a segunda ocorrência e a administração foi notificada novamente.'
          : 'Percebi um conteúdo inadequado e não posso seguir com essa mensagem. Vamos manter a conversa respeitosa. A administração foi notificada.',
    }
  }

  if (userTexts.length === 1 && hasAny(flat, SUPPORT)) {
    return {
      type: 'message',
      text: 'Isso parece um pedido de suporte técnico, e eu cuido só de ideias de melhoria. Abra um chamado no canal de TI (ramal 2000) para resolver mais rápido. Quando tiver uma ideia para melhorar um processo, é só me contar.',
    }
  }

  const count = userTexts.length
  if (count === 1) {
    return {
      type: 'message',
      text: last.length < 25
        ? 'Oi! Me conta uma situação do seu trabalho que poderia ser melhor. Pode ser algo pequeno.'
        : 'Boa observação! Qual é o impacto disso na sua rotina ou na produção?',
    }
  }
  if (count === 2) return { type: 'message', text: 'Entendi. E o que você acha que causa esse problema?' }
  if (count === 3) return { type: 'message', text: 'Faz sentido. Que solução você imagina para resolver isso?' }
  return { type: 'idea_ready', data: buildIdea(userTexts) }
}
