'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  addComment,
  fetchIdeaById,
  validateIdea,
  type IdeaDetail,
} from '@/services/ideasService'
import { getIdeaStatusMeta, getVisibleAuthorName } from '@/components/shared/IdeaCard'
import Icon from '@/components/shared/Icon'

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives?: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
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


export default function TotemIdeaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [idea, setIdea] = useState<IdeaDetail | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    setHasSpeechAPI(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    let active = true
    async function loadIdea() {
      setLoading(true)
      setFeedback(null)
      try {
        const data = await fetchIdeaById(params.id)
        if (active) setIdea(data)
      } catch {
        if (active) setFeedback('Erro ao carregar ideia.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadIdea()
    return () => { active = false }
  }, [params.id])

  function startRecording() {
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition || isRecording) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false
    recognition.continuous = true
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const start = event.resultIndex ?? 0
      for (let i = start; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript?.trim()
        if (transcript) setComment((prev) => prev ? `${prev} ${transcript}` : transcript)
      }
    }
    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
    }
    recognition.onerror = () => {
      setIsRecording(false)
      recognitionRef.current = null
    }
    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }


  async function handleValidate() {
    if (!idea || !user?.id) return
    setSubmitting(true)
    setFeedback(null)
    try {
      await validateIdea(idea.id, user.id)
      const refreshed = await fetchIdeaById(idea.id)
      setIdea(refreshed)
      setFeedback('Validação registrada.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao validar ideia.'
      setFeedback(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComment() {
    if (!idea || !user?.id || !comment.trim()) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const newComment = await addComment(idea.id, user.id, comment)
      setIdea({ ...idea, comments: [...idea.comments, newComment] })
      setComment('')
      setFeedback('Comentário publicado.')
    } catch {
      setFeedback('Erro ao comentar.')
    } finally {
      setSubmitting(false)
    }
  }

  const isError = (msg: string) =>
    msg.includes('Erro') || msg.includes('não') || msg.includes('já')

  if (userLoading || loading) {
    return (
      <main className="totem-ranking-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="totem-ranking-loading" style={{ border: 'none' }}>Carregando...</div>
      </main>
    )
  }

  if (!idea) {
    return (
      <main className="totem-ranking-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="totem-ranking-empty" style={{ margin: 0 }}>Ideia não encontrada.</div>
        <button
          className="totem-ranking-nav"
          type="button"
          style={{ marginTop: 16 }}
          onClick={() => router.push('/totem/hub')}
        >
          <Icon name="chevron-left" size={20} />
          Voltar ao Hub
        </button>
      </main>
    )
  }

  const meta = getIdeaStatusMeta(idea.status)
  const isOwn = user?.id === idea.author_id
  const alreadyValidated = !!user?.id && idea.validated_user_ids.includes(user.id)
  const canValidate = !isOwn && !alreadyValidated && !submitting

  return (
    <main className="totem-ranking-page">
      <header className="totem-ranking-header">
        <button
          className="totem-ranking-nav"
          type="button"
          onClick={() => router.push('/totem/hub')}
        >
          <Icon name="chevron-left" size={22} />
          Voltar
        </button>

        <div className="totem-ranking-heading">
          <span>Hub de Ideias</span>
          <h1>Detalhes</h1>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span
            className="badge"
            style={{
              padding: '8px 18px',
              fontSize: 15,
              fontWeight: 900,
              background: `${meta.color}22`,
              color: meta.color,
              border: `1px solid ${meta.color}44`,
              borderRadius: 99,
            }}
          >
            {meta.label}
          </span>
        </div>
      </header>

      <section className="totem-ranking-scroll">
        <div className="totem-ranking-shell">

          {/* Idea main card */}
          <section className="card">
            <div className="ih-section-head" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ih-section-title" style={{ fontSize: 22, lineHeight: 1.2 }}>
                  {idea.title}
                </div>
                <div className="totem-ranking-person-sector" style={{ marginTop: 6 }}>
                  <Icon name="user" size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  {getVisibleAuthorName(idea)} · {idea.sector_name}
                </div>
              </div>
            </div>

            <div style={{ padding: '0 20px 20px', display: 'grid', gap: 16 }}>
              <p style={{ margin: 0, color: 'rgba(213,226,245,.82)', fontSize: 17, lineHeight: 1.65 }}>
                {idea.summary}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ScoreBox label="AI Score" value={idea.ai_score} color="#7dd3fc" />
                <ScoreBox label="Social Score" value={idea.social_score} color="#a78bfa" />
              </div>

              {feedback && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: isError(feedback) ? 'rgba(229,62,62,.15)' : 'rgba(0,166,81,.15)',
                    color: isError(feedback) ? '#fc8181' : '#68d391',
                    fontSize: 16,
                    fontWeight: 800,
                    border: `1px solid ${isError(feedback) ? 'rgba(229,62,62,.3)' : 'rgba(0,166,81,.3)'}`,
                  }}
                >
                  {feedback}
                </div>
              )}

              <button
                type="button"
                disabled={!canValidate}
                onClick={handleValidate}
                style={{
                  width: '100%',
                  height: 60,
                  border: 'none',
                  borderRadius: 14,
                  background: canValidate ? 'var(--c-totem)' : 'rgba(255,255,255,.1)',
                  color: canValidate ? '#fff' : 'rgba(255,255,255,.4)',
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: canValidate ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <Icon name={alreadyValidated ? 'check-circle' : 'zap'} size={20} />
                {alreadyValidated ? 'Ideia já validada' : isOwn ? 'Sua ideia' : 'Validar Ideia'}
              </button>
            </div>
          </section>

          {/* Comments card */}
          <section className="card">
            <div className="ih-section-head">
              <div className="ih-section-title">Comentários</div>
              <span className="badge badge-gray">{idea.comments.length}</span>
            </div>

            {idea.comments.length === 0 ? (
              <div className="totem-ranking-empty">Nenhum comentário ainda.</div>
            ) : (
              <div className="ih-list">
                {idea.comments.map((item) => (
                  <div className="ih-list-row" key={item.id} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <div style={{ color: 'rgba(125,211,252,.8)', fontSize: 13, fontWeight: 900 }}>
                      {item.user_id === idea.author_id ? getVisibleAuthorName(idea) : item.author_name}
                    </div>
                    <div style={{ color: 'rgba(213,226,245,.86)', fontSize: 16, lineHeight: 1.5 }}>
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '12px 20px 20px', display: 'grid', gap: 10 }}>
              {hasSpeechAPI && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className={`totem-ranking-keyboard-toggle${isRecording ? ' is-active' : ''}`}
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={submitting}
                    style={isRecording ? { borderColor: 'rgba(2,132,199,.6)', background: 'rgba(2,132,199,.2)', color: '#7dd3fc', animation: 'pulseSoft 1.5s ease-in-out infinite' } : undefined}
                  >
                    <Icon name={isRecording ? 'mic-off' : 'mic'} size={18} />
                    {isRecording ? 'Parar' : 'Falar'}
                  </button>
                </div>
              )}

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicionar comentário..."
                className="ih-input"
                style={{
                  minHeight: 100,
                  padding: '12px 14px',
                  fontSize: 17,
                  resize: 'none',
                  lineHeight: 1.5,
                  borderRadius: 12,
                }}
              />

              <button
                type="button"
                disabled={submitting || !comment.trim()}
                onClick={handleComment}
                style={{
                  width: '100%',
                  height: 58,
                  border: 'none',
                  borderRadius: 14,
                  background: comment.trim() ? 'var(--c-totem)' : 'rgba(255,255,255,.1)',
                  color: comment.trim() ? '#fff' : 'rgba(255,255,255,.4)',
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: comment.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <Icon name="send" size={18} />
                Publicar comentário
              </button>
            </div>
          </section>
        </div>
      </section>

    </main>
  )
}

function ScoreBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: '14px 18px',
        border: `1px solid ${color}22`,
        borderRadius: 14,
        background: `${color}0d`,
      }}
    >
      <div style={{ color: 'rgba(213,226,245,.55)', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ marginTop: 6, color, fontSize: 32, fontWeight: 900 }}>{value}</div>
    </div>
  )
}

