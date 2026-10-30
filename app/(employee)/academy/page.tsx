/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchCompletedCourseIds,
  fetchCourses,
  type Course,
} from '@/services/academyService'
import { fetchSectors, type SectorOption } from '@/services/ideasService'

type AcademyTab = 'courses' | 'mentorships'

const LEARNING_STEPS: Array<{ icon: IconName; title: string; desc: string }> = [
  {
    icon: 'sparkles',
    title: 'Aprenda o método',
    desc: 'Cursos curtos ajudam a transformar observações do dia a dia em propostas melhores.',
  },
  {
    icon: 'award',
    title: 'Valide no quiz',
    desc: 'Ao concluir o quiz, a pontuação entra no seu histórico da plataforma.',
  },
  {
    icon: 'lightbulb',
    title: 'Aplique no Hub',
    desc: 'Use o aprendizado para publicar ideias mais claras na IA Innovation.',
  },
]

const MENTORSHIP_ACTIONS: Array<{
  icon: IconName
  title: string
  desc: string
  href: string
  cta: string
}> = [
  {
    icon: 'users',
    title: 'Encontrar especialistas',
    desc: 'Explore mentores ativos por área de conhecimento e solicite apoio para destravar uma ideia.',
    href: '/mentorships?view=discover',
    cta: 'Explorar mentores',
  },
  {
    icon: 'check-circle',
    title: 'Acompanhar sua jornada',
    desc: 'Veja solicitações pendentes, mentorias ativas e o status da sua candidatura como mentor.',
    href: '/mentorships?view=mentee',
    cta: 'Minhas mentorias',
  },
]

function normalize(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getCourseModules(content: string) {
  return content
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getEstimatedMinutes(course: Course) {
  const moduleCount = getCourseModules(course.content).length || 1
  return Math.min(45, Math.max(8, moduleCount * 6))
}

export default function AcademyPage() {
  const { user, loading } = useUser()
  const [activeTab, setActiveTab] = useState<AcademyTab>('courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>([])
  const [sectors, setSectors] = useState<SectorOption[]>([])
  const [sectorId, setSectorId] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [completionLoading, setCompletionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.sector_id) setSectorId(user.sector_id)
  }, [user?.sector_id])

  useEffect(() => {
    let active = true

    async function loadSectors() {
      try {
        const data = await fetchSectors()
        if (active) setSectors(data)
      } catch {
        if (active) setError('Erro ao carregar setores.')
      }
    }

    loadSectors()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadCompletions() {
      if (!user?.id) {
        setCompletedCourseIds([])
        return
      }

      setCompletionLoading(true)

      try {
        const ids = await fetchCompletedCourseIds(user.id)
        if (active) setCompletedCourseIds(ids)
      } catch {
        if (active) setError('Erro ao carregar seu progresso na Academy.')
      } finally {
        if (active) setCompletionLoading(false)
      }
    }

    loadCompletions()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    let active = true

    async function loadCourses() {
      setDataLoading(true)
      setError(null)

      try {
        const data = await fetchCourses(sectorId)
        if (active) setCourses(data)
      } catch {
        if (active) setError('Erro ao carregar cursos.')
      } finally {
        if (active) setDataLoading(false)
      }
    }

    loadCourses()

    return () => {
      active = false
    }
  }, [sectorId])

  const completedSet = useMemo(() => new Set(completedCourseIds), [completedCourseIds])

  const visibleCourses = useMemo(() => {
    const query = normalize(searchTerm)
    if (!query) return courses

    return courses.filter((course) => {
      const searchable = normalize(
        `${course.title} ${course.description} ${course.sector_name ?? 'Geral'}`
      )
      return searchable.includes(query)
    })
  }, [courses, searchTerm])

  const completedCount = useMemo(
    () => courses.filter((course) => completedSet.has(course.id)).length,
    [completedSet, courses]
  )

  const openCount = Math.max(courses.length - completedCount, 0)
  const progress = courses.length ? Math.round((completedCount / courses.length) * 100) : 0
  const selectedSectorName = sectorId === 'all'
    ? 'Todos os setores'
    : sectors.find((sector) => sector.id === sectorId)?.name ?? 'Seu setor'
  const recommendedCourse = courses.find((course) => !completedSet.has(course.id)) ?? courses[0]
  const totalMinutes = courses.reduce((sum, course) => sum + getEstimatedMinutes(course), 0)

  if (loading) return <p className="ih-loading-page">Carregando...</p>

  return (
    <ProfileShell
      profile="funcionario"
      title="Innovation Academy"
      subtitle="Cursos curtos e mentorias para acelerar sua jornada"
      user={user}
      points={user?.points ?? 0}
      notifCount={2}
    >
      <div className="ih-dashboard-stack academy-page">
        <section className="academy-hero">
          <div className="academy-hero-copy">
            <div className="academy-kicker">
              <Icon name="sparkles" size={15} />
              Aprendizado aplicado
            </div>
            <h1>Aprenda, pratique e leve ideias melhores para o Hub</h1>
            <p>
              Combine cursos rápidos, quizzes e mentorias internas para evoluir sua jornada de
              inovação com clareza e reconhecimento.
            </p>
            <div className="academy-hero-actions">
              <button
                className="btn btn-accent btn-md"
                type="button"
                onClick={() => setActiveTab('courses')}
              >
                <Icon name="layers" size={16} />
                Ver cursos
              </button>
              <button
                className="btn btn-muted btn-md"
                type="button"
                onClick={() => setActiveTab('mentorships')}
              >
                <Icon name="users" size={16} />
                Mentorias
              </button>
            </div>
          </div>

          <div className="academy-hero-panel" aria-label="Progresso na Academy">
            <div className="academy-progress-ring" style={{ '--progress': `${progress}%` } as CSSProperties}>
              <span>{completionLoading ? '...' : `${progress}%`}</span>
            </div>
            <div>
              <div className="academy-panel-title">Jornada Academy</div>
              <div className="academy-panel-text">
                {completedCount} de {courses.length} cursos concluídos em {selectedSectorName.toLowerCase()}.
              </div>
            </div>
            <div className="track" aria-hidden="true">
              <div className="fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        <section className="academy-stats-grid" aria-label="Resumo da Academy">
          <div className="stat-block" style={{ '--accent-color': 'var(--accent)' } as CSSProperties}>
            <div className="stat-lbl">Cursos disponíveis</div>
            <div className="stat-num" style={{ color: 'var(--accent)' }}>
              {dataLoading ? '...' : courses.length}
            </div>
            <div className="stat-sub">{selectedSectorName}</div>
          </div>
          <div className="stat-block" style={{ '--accent-color': 'var(--green)' } as CSSProperties}>
            <div className="stat-lbl">Concluídos</div>
            <div className="stat-num" style={{ color: 'var(--green)' }}>
              {completionLoading ? '...' : completedCount}
            </div>
            <div className="stat-sub">Com quiz aprovado</div>
          </div>
          <div className="stat-block" style={{ '--accent-color': '#d97706' } as CSSProperties}>
            <div className="stat-lbl">Em aberto</div>
            <div className="stat-num" style={{ color: '#d97706' }}>
              {dataLoading ? '...' : openCount}
            </div>
            <div className="stat-sub">Próximas oportunidades</div>
          </div>
          <div className="stat-block" style={{ '--accent-color': '#0057a8' } as CSSProperties}>
            <div className="stat-lbl">Tempo estimado</div>
            <div className="stat-num" style={{ color: '#0057a8', fontSize: 24 }}>
              {dataLoading ? '...' : `${totalMinutes} min`}
            </div>
            <div className="stat-sub">Catálogo selecionado</div>
          </div>
        </section>

        <div className="academy-tabs" role="tablist" aria-label="Seções da Academy">
          {([
            { id: 'courses', label: 'Cursos', icon: 'layers' },
            { id: 'mentorships', label: 'Mentorias', icon: 'users' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              className={`academy-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="academy-feedback academy-feedback-error">
            <Icon name="x" size={15} />
            {error}
          </div>
        )}

        {activeTab === 'courses' ? (
          <>
            <section className="academy-controls">
              <div className="academy-search">
                <label htmlFor="academy-search">Buscar curso</label>
                <input
                  id="academy-search"
                  className="ih-input academy-search-input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tema, setor ou palavra-chave"
                />
              </div>

              <div className="academy-filter">
                <label htmlFor="academy-sector">Setor</label>
                <select
                  id="academy-sector"
                  className="ih-input"
                  value={sectorId}
                  onChange={(event) => setSectorId(event.target.value)}
                  aria-label="Filtrar cursos por setor"
                >
                  <option value="all">Todos os setores</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="academy-count-chip">
                <Icon name="award" size={14} />
                {visibleCourses.length} curso{visibleCourses.length !== 1 ? 's' : ''}
              </div>
            </section>

            {recommendedCourse && !dataLoading && (
              <Link className="academy-next" href={`/academy/${recommendedCourse.id}`} prefetch>
                <div className="academy-next-icon">
                  <Icon name={completedSet.has(recommendedCourse.id) ? 'check-circle' : 'trending-up'} size={18} />
                </div>
                <div className="academy-next-copy">
                  <span>{completedSet.has(recommendedCourse.id) ? 'Para revisar' : 'Próximo recomendado'}</span>
                  <strong>{recommendedCourse.title}</strong>
                  <small>
                    {recommendedCourse.sector_name ?? 'Geral'} · {getEstimatedMinutes(recommendedCourse)} min estimados
                  </small>
                </div>
                <Icon name="chevron-right" size={17} />
              </Link>
            )}

            <section className="academy-course-grid" aria-label="Cursos da Academy">
              {dataLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div className="academy-course-card academy-skeleton" key={index}>
                    <div className="academy-skeleton-media" />
                    <div className="academy-skeleton-line is-wide" />
                    <div className="academy-skeleton-line" />
                    <div className="academy-skeleton-line is-short" />
                  </div>
                ))
              ) : (
                visibleCourses.map((course, index) => {
                  const completed = completedSet.has(course.id)
                  const moduleCount = getCourseModules(course.content).length || 1

                  return (
                    <article
                      className={`academy-course-card ${completed ? 'is-completed' : ''}`}
                      key={course.id}
                      style={{ animation: `fadeUp ${index * 0.05}s ease both` }}
                    >
                      <div className="academy-course-media">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt="" />
                        ) : (
                          <div className="academy-course-placeholder">
                            <Icon name="layers" size={34} />
                          </div>
                        )}
                        <span className={`badge ${completed ? 'badge-green' : 'badge-blue'}`}>
                          {completed ? 'Concluído' : 'Disponível'}
                        </span>
                      </div>

                      <div className="academy-course-body">
                        <div className="academy-course-meta">
                          <span className="tag">{course.sector_name ?? 'Geral'}</span>
                          <span>{moduleCount} bloco{moduleCount !== 1 ? 's' : ''}</span>
                          <span>{getEstimatedMinutes(course)} min</span>
                        </div>
                        <h2>{course.title}</h2>
                        <p>{course.description}</p>
                        <div className="academy-course-footer">
                          <div className="academy-course-status">
                            <Icon name={completed ? 'check-circle' : 'award'} size={15} />
                            {completed ? 'Quiz concluído' : 'Quiz com pontos'}
                          </div>
                          <Link className="btn btn-accent btn-sm" href={`/academy/${course.id}`} prefetch>
                            {completed ? 'Revisar' : 'Começar'}
                            <Icon name="chevron-right" size={14} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}

              {!dataLoading && visibleCourses.length === 0 && (
                <div className="academy-empty">
                  <div className="academy-empty-icon">
                    <Icon name="layers" size={24} />
                  </div>
                  <strong>Nenhum curso encontrado</strong>
                  <span>Ajuste a busca ou escolha outro setor para explorar mais conteúdos.</span>
                  {(searchTerm || sectorId !== 'all') && (
                    <button
                      className="btn btn-muted btn-sm"
                      type="button"
                      onClick={() => {
                        setSearchTerm('')
                        setSectorId('all')
                      }}
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="academy-mentorship">
            <div className="academy-mentorship-copy">
              <div className="academy-kicker">
                <Icon name="users" size={15} />
                Mentoria interna
              </div>
              <h2>Aprenda com quem já resolveu problemas parecidos</h2>
              <p>
                A mentoria conecta colaboradores a especialistas internos para amadurecer ideias,
                entender processos e acelerar aplicações práticas do conhecimento.
              </p>

              <div className="academy-journey">
                {LEARNING_STEPS.map((step, index) => (
                  <div className="academy-journey-step" key={step.title}>
                    <div className="academy-journey-index">{index + 1}</div>
                    <div>
                      <strong>{step.title}</strong>
                      <span>{step.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="academy-mentorship-actions">
              <div className="academy-mentor-status">
                <span>Seu perfil de mentor</span>
                <strong>{user?.is_mentor ? 'Ativo' : 'Não ativo'}</strong>
                <small>
                  {user?.is_mentor
                    ? 'Você pode receber solicitações de colaboradores.'
                    : 'Candidate-se quando quiser compartilhar conhecimento.'}
                </small>
              </div>

              {MENTORSHIP_ACTIONS.map((action) => (
                <Link className="academy-mentor-action" href={action.href} key={action.href} prefetch={false}>
                  <div className="academy-mentor-action-icon">
                    <Icon name={action.icon} size={17} />
                  </div>
                  <div>
                    <strong>{action.title}</strong>
                    <span>{action.desc}</span>
                    <small>{action.cta}</small>
                  </div>
                  <Icon name="chevron-right" size={16} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </ProfileShell>
  )
}
