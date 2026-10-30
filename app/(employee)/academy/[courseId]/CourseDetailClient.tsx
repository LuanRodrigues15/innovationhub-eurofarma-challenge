/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import Icon from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchCourseById,
  fetchCourseCompletion,
  type CourseDetail,
} from '@/services/academyService'

type CourseDetailPageProps = {
  params: {
    courseId: string
  }
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { user, loading } = useUser()
  const [detail, setDetail] = useState<CourseDetail | null>(null)
  const [completed, setCompleted] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadCourse() {
      setDataLoading(true)
      setError(null)

      try {
        const data = await fetchCourseById(params.courseId)
        const isCompleted = user?.id
          ? await fetchCourseCompletion(user.id, params.courseId)
          : false

        if (!active) return
        setDetail(data)
        setCompleted(isCompleted)
      } catch {
        if (active) setError('Erro ao carregar curso.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    loadCourse()

    return () => {
      active = false
    }
  }, [params.courseId, user?.id])

  const modules = useMemo(() => {
    const content = detail?.course.content ?? ''
    return content
      .split('.')
      .map((item) => item.trim())
      .filter(Boolean)
  }, [detail?.course.content])

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  return (
    <ProfileShell
      profile="funcionario"
      title="Detalhe do Curso"
      subtitle="Conteudo da Innovation Academy"
      user={user}
      points={user?.points ?? 0}
      notifCount={2}
    >
      <div className="ih-dashboard-stack">
        <div>
          <Link className="btn btn-muted btn-sm" href="/academy" prefetch>
            <Icon name="chevron-left" size={15} />
            Voltar
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
            Carregando curso...
          </p>
        ) : !detail ? (
          <section className="card card-p" style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            Curso nao encontrado.
          </section>
        ) : (
          <>
            <section
              className="card"
              style={{
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              }}
            >
              <div className="card-p" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="ih-filter-row" style={{ marginBottom: 14 }}>
                  <span className="tag">{detail.course.sector_name ?? 'Geral'}</span>
                  {completed && <span className="badge badge-green">Quiz concluido</span>}
                </div>
                <h1 style={{ margin: '0 0 10px', color: 'var(--ink)', fontSize: 28, lineHeight: 1.15, fontWeight: 800 }}>
                  {detail.course.title}
                </h1>
                <p style={{ margin: 0, maxWidth: 760, color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7 }}>
                  {detail.course.description}
                </p>
              </div>
              {detail.course.thumbnail_url ? (
                <img
                  src={detail.course.thumbnail_url}
                  alt=""
                  style={{ width: '100%', height: '100%', minHeight: 220, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    minHeight: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--surface-2)',
                    color: 'var(--accent)',
                  }}
                >
                  <Icon name="layers" size={42} />
                </div>
              )}
            </section>

            <section className="ih-two-col">
              <div className="card">
                <div className="ih-section-head">
                  <div className="ih-section-title">Conteudo do curso</div>
                  <span className="badge badge-gray">{modules.length || 1} blocos</span>
                </div>
                <div className="ih-list">
                  {(modules.length ? modules : [detail.course.content]).map((module, index) => (
                    <div className="ih-list-row" key={`${module}-${index}`}>
                      <div className="ih-list-dot" style={{ color: 'var(--accent)', background: 'var(--surface-2)' }}>
                        {index + 1}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 800, lineHeight: 1.5 }}>
                          {module}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="card">
                <div className="ih-section-head">
                  <div className="ih-section-title">Progresso</div>
                </div>
                <div className="card-p" style={{ display: 'grid', gap: 14 }}>
                  <div className="ih-kv-grid">
                    <div className="ih-kv">
                      <div className="ih-kv-label">Quiz</div>
                      <div className="ih-kv-value">{detail.quizzes.length} perguntas</div>
                    </div>
                    <div className="ih-kv">
                      <div className="ih-kv-label">Status</div>
                      <div className="ih-kv-value" style={{ color: completed ? 'var(--green)' : 'var(--accent)' }}>
                        {completed ? 'Concluido' : 'Pendente'}
                      </div>
                    </div>
                  </div>

                  <Link
                    className={`btn btn-lg ${detail.quizzes.length ? 'btn-accent' : 'btn-muted'}`}
                    href={`/academy/${detail.course.id}/quiz`}
                    prefetch
                    aria-disabled={!detail.quizzes.length}
                    style={{ pointerEvents: detail.quizzes.length ? 'auto' : 'none' }}
                  >
                    <Icon name={completed ? 'check-circle' : 'award'} size={18} />
                    {completed ? 'Ver status do Quiz' : 'Fazer Quiz'}
                  </Link>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </ProfileShell>
  )
}
