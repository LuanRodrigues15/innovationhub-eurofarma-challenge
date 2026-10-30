'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchCourseById,
  fetchCourseCompletion,
  submitQuiz,
  type CourseDetail,
} from '@/services/academyService'

type QuizPageProps = {
  params: {
    courseId: string
  }
}

type QuizResult = {
  alreadyCompleted?: boolean
  passed?: boolean
  pointsEarned?: number
  correctAnswers?: Record<string, number>
}

export default function CourseQuizPage({ params }: QuizPageProps) {
  const { user, loading } = useUser()
  const [detail, setDetail] = useState<CourseDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadQuiz() {
      setDataLoading(true)
      setError(null)

      try {
        const data = await fetchCourseById(params.courseId)
        const alreadyCompleted = user?.id
          ? await fetchCourseCompletion(user.id, params.courseId)
          : false

        if (!active) return
        setDetail(data)
        setResult(alreadyCompleted ? { alreadyCompleted: true } : null)
      } catch {
        if (active) setError('Erro ao carregar quiz.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    if (user?.id) loadQuiz()

    return () => {
      active = false
    }
  }, [params.courseId, user?.id])

  const allAnswered = useMemo(() => {
    if (!detail?.quizzes.length) return false
    return detail.quizzes.every((quiz) => answers[quiz.id] !== undefined)
  }, [answers, detail?.quizzes])

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  async function handleSubmit() {
    if (!user?.id || !detail || !allAnswered) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await submitQuiz(user.id, detail.course.id, answers)
      setResult(response)
    } catch {
      setError('Erro ao enviar respostas.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAttempt() {
    setAnswers({})
    setResult(null)
    setError(null)
  }

  const alreadyCompleted = result?.alreadyCompleted
  const hasFeedback = Boolean(result?.correctAnswers)

  return (
    <ProfileShell
      profile="funcionario"
      title="Quiz Academy"
      subtitle="Responda todas as perguntas para concluir o curso"
      user={user}
      points={user?.points ?? 0}
      notifCount={2}
    >
      <div className="ih-dashboard-stack">
        <div>
          <Link className="btn btn-muted btn-sm" href={`/academy/${params.courseId}`} prefetch>
            <Icon name="chevron-left" size={15} />
            Voltar ao curso
          </Link>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(229,62,62,.08)',
              color: 'var(--danger)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {dataLoading ? (
          <p className="ih-loading-page" style={{ minHeight: 320 }}>
            Carregando quiz...
          </p>
        ) : !detail ? (
          <section className="card card-p" style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            Curso nao encontrado.
          </section>
        ) : alreadyCompleted ? (
          <section className="card">
            <div className="card-p" style={{ textAlign: 'center' }}>
              <div className="ih-action-icon" style={{ margin: '0 auto 16px', color: 'var(--green)', background: 'rgba(0,166,81,.1)' }}>
                <Icon name="check-circle" size={24} />
              </div>
              <h1 style={{ margin: '0 0 8px', color: 'var(--ink)', fontSize: 22, fontWeight: 800 }}>
                Voce ja completou este quiz
              </h1>
              <p style={{ margin: '0 auto 18px', maxWidth: 520, color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.7 }}>
                A pontuacao deste curso ja foi registrada no seu historico.
              </p>
              <Link className="btn btn-accent btn-md" href="/academy" prefetch>
                Voltar para Academy
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="card">
              <div className="ih-section-head">
                <div>
                  <div className="ih-section-title">{detail.course.title}</div>
                  <div className="ih-topbar-sub">{detail.quizzes.length} perguntas</div>
                </div>
                {result?.passed && <span className="badge badge-green">Aprovado</span>}
                {result?.passed === false && <span className="badge badge-red">Tente novamente</span>}
              </div>

              <div className="card-p" style={{ display: 'grid', gap: 14 }}>
                {detail.quizzes.map((quiz, quizIndex) => {
                  const correctIndex = result?.correctAnswers?.[quiz.id]

                  return (
                    <fieldset
                      key={quiz.id}
                      style={{
                        margin: 0,
                        padding: 16,
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--surface-2)',
                      }}
                    >
                      <legend
                        style={{
                          padding: '0 6px',
                          color: 'var(--ink)',
                          fontSize: 13,
                          fontWeight: 800,
                          lineHeight: 1.5,
                        }}
                      >
                        {quizIndex + 1}. {quiz.question}
                      </legend>

                      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                        {quiz.options.map((option, optionIndex) => {
                          const checked = answers[quiz.id] === optionIndex
                          const isCorrect = correctIndex === optionIndex
                          const isWrongChoice = hasFeedback && checked && !isCorrect
                          const showCorrect = hasFeedback && isCorrect

                          return (
                            <label
                              key={`${quiz.id}-${option}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 12px',
                                border: showCorrect
                                  ? '1px solid #a5d6a7'
                                  : isWrongChoice
                                    ? '1px solid #ef9a9a'
                                    : '1px solid var(--line)',
                                borderRadius: 9,
                                background: showCorrect
                                  ? 'rgba(165,214,167,0.15)'
                                  : isWrongChoice
                                    ? 'rgba(239,154,154,0.15)'
                                    : 'var(--surface)',
                                color: 'var(--ink-2)',
                                fontSize: 13,
                                fontWeight: checked ? 800 : 600,
                                cursor: hasFeedback ? 'default' : 'pointer',
                              }}
                            >
                              <input
                                type="radio"
                                name={quiz.id}
                                checked={checked}
                                disabled={hasFeedback}
                                onChange={() => setAnswers((current) => ({ ...current, [quiz.id]: optionIndex }))}
                              />
                              <span style={{ flex: 1 }}>{option}</span>
                              {showCorrect && <Icon name="check-circle" size={15} style={{ color: 'var(--green)' }} />}
                              {isWrongChoice && <Icon name="x" size={15} style={{ color: 'var(--danger)' }} />}
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  )
                })}
              </div>
            </section>

            {result?.passed && (
              <section className="card card-p" style={{ borderColor: 'rgba(0,166,81,.28)', background: 'rgba(0,166,81,.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: 'var(--green)', fontSize: 14, fontWeight: 800 }}>
                      Quiz concluido
                    </div>
                    <div style={{ marginTop: 4, color: 'var(--ink-2)', fontSize: 13 }}>
                      +{(result.pointsEarned ?? 0).toLocaleString('pt-BR')} pontos creditados.
                    </div>
                  </div>
                  <Link className="btn btn-success btn-md" href="/academy" prefetch>
                    Voltar para Academy
                  </Link>
                </div>
              </section>
            )}

            {result?.passed === false && (
              <section className="card card-p" style={{ borderColor: 'rgba(229,62,62,.22)', background: 'rgba(229,62,62,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 800 }}>
                      Ainda nao foi desta vez
                    </div>
                    <div style={{ marginTop: 4, color: 'var(--ink-2)', fontSize: 13 }}>
                      Revise as respostas destacadas e tente novamente.
                    </div>
                  </div>
                  <button className="btn btn-danger btn-md" type="button" onClick={resetAttempt}>
                    Tentar Novamente
                  </button>
                </div>
              </section>
            )}

            {!hasFeedback && (
              <section style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-accent btn-lg"
                  type="button"
                  disabled={!allAnswered || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <span className="spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Icon name="send" size={17} />
                      Enviar Respostas
                    </>
                  )}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </ProfileShell>
  )
}
