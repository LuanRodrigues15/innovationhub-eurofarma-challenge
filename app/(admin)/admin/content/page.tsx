'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useUser } from '@/hooks/useUser'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  createCourse,
  createQuiz,
  createSector,
  deleteCourse,
  deleteQuiz,
  deleteSector,
  fetchAdminContent,
  updateCourse,
  updateQuiz,
  updateSector,
  type AdminContentData,
  type AdminCourse,
  type QuizQuestion,
} from '@/services/managementService'

type CourseForm = {
  id?: string
  title: string
  description: string
  content: string
  thumbnail_url: string
  sector_id: string
}

type SectorForm = {
  id?: string
  name: string
  slug: string
}

type QuizForm = {
  id?: string
  course_id: string
  question: string
  options: string[]
  correct_answer: string
}

type ContentView = 'courses' | 'sectors'

const EMPTY_COURSE: CourseForm = {
  title: '',
  description: '',
  content: '',
  thumbnail_url: '',
  sector_id: 'none',
}

const EMPTY_SECTOR: SectorForm = {
  name: '',
  slug: '',
}

const EMPTY_QUIZ: QuizForm = {
  course_id: '',
  question: '',
  options: ['', '', '', ''],
  correct_answer: '0',
}

const VIEW_TABS: Array<{ key: ContentView; label: string; icon: IconName }> = [
  { key: 'courses', label: 'Cursos', icon: 'layers' },
  { key: 'sectors', label: 'Setores', icon: 'building' },
]

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminContentPage() {
  const { user, loading: userLoading } = useUser()
  const [data, setData] = useState<AdminContentData | null>(null)
  const [activeView, setActiveView] = useState<ContentView>('courses')
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)
  const [courseForm, setCourseForm] = useState<CourseForm | null>(null)
  const [sectorForm, setSectorForm] = useState<SectorForm | null>(null)
  const [quizForm, setQuizForm] = useState<QuizForm | null>(null)
  const [searchText, setSearchText] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const courses = useMemo(() => data?.courses ?? [], [data?.courses])
  const sectors = useMemo(() => data?.sectors ?? [], [data?.sectors])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const result = await fetchAdminContent()
      setData(result)
    } catch {
      setFeedback('Erro ao carregar conteúdo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalQuizzes = useMemo(
    () => courses.reduce((total, course) => total + course.quizzes.length, 0),
    [courses]
  )

  const filteredCourses = useMemo(() => {
    const term = searchText.trim().toLowerCase()

    return courses.filter((course) => {
      const searchable = `${course.title} ${course.description} ${course.sector_name ?? 'geral'}`.toLowerCase()
      const matchesSearch = !term || searchable.includes(term)
      const matchesSector =
        sectorFilter === 'all' ||
        (sectorFilter === 'none' ? !course.sector_id : course.sector_id === sectorFilter)

      return matchesSearch && matchesSector
    })
  }, [courses, searchText, sectorFilter])

  const sectorsWithStats = useMemo(
    () =>
      sectors.map((sector) => {
        const sectorCourses = courses.filter((course) => course.sector_id === sector.id)
        const quizCount = sectorCourses.reduce((total, course) => total + course.quizzes.length, 0)

        return {
          sector,
          courseCount: sectorCourses.length,
          quizCount,
        }
      }),
    [courses, sectors]
  )

  const coursesWithoutQuizzes = useMemo(
    () => courses.filter((course) => course.quizzes.length === 0),
    [courses]
  )

  const quizCoverage = courses.length > 0
    ? `${Math.round(((courses.length - coursesWithoutQuizzes.length) / courses.length) * 100)}%`
    : '—'

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  function openNewCourse(sectorId = 'none') {
    setCourseForm({ ...EMPTY_COURSE, sector_id: sectorId })
  }

  function editCourse(course: AdminCourse) {
    setCourseForm({
      id: course.id,
      title: course.title,
      description: course.description,
      content: course.content,
      thumbnail_url: course.thumbnail_url ?? '',
      sector_id: course.sector_id ?? 'none',
    })
  }

  function openQuizForm(courseId?: string) {
    setQuizForm({
      ...EMPTY_QUIZ,
      course_id: courseId ?? courses[0]?.id ?? '',
    })
  }

  function openEditQuizForm(quiz: QuizQuestion) {
    setQuizForm({
      id: quiz.id,
      course_id: quiz.course_id,
      question: quiz.question,
      options: quiz.options.length === 4 ? quiz.options : [...quiz.options, '', '', '', ''].slice(0, 4),
      correct_answer: String(quiz.correct_answer),
    })
  }

  async function handleCourseSubmit() {
    if (!courseForm) return
    setSubmitting(true)
    setFeedback(null)

    try {
      const values = {
        title: courseForm.title.trim(),
        description: courseForm.description.trim(),
        content: courseForm.content.trim(),
        thumbnail_url: courseForm.thumbnail_url.trim() || null,
        sector_id: courseForm.sector_id === 'none' ? null : courseForm.sector_id,
      }

      if (courseForm.id) {
        await updateCourse(courseForm.id, values)
      } else {
        await createCourse(values)
      }

      setCourseForm(null)
      await loadData()
      setFeedback(courseForm.id ? 'Curso atualizado.' : 'Curso criado.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao salvar curso.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteCourse(courseId: string) {
    if (!window.confirm('Deletar este curso e seus quizzes?')) return
    setSubmitting(true)
    setFeedback(null)

    try {
      await deleteCourse(courseId)
      await loadData()
      setFeedback('Curso deletado.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao deletar curso.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQuizSubmit() {
    if (!quizForm) return
    setSubmitting(true)
    setFeedback(null)

    try {
      const values = {
        question: quizForm.question.trim(),
        options: quizForm.options.map((option) => option.trim()),
        correct_answer: Number(quizForm.correct_answer),
      }
      if (quizForm.id) {
        await updateQuiz(quizForm.id, values)
        setFeedback('Pergunta atualizada.')
      } else {
        await createQuiz({ course_id: quizForm.course_id, ...values })
        setFeedback('Pergunta adicionada.')
      }
      setQuizForm(null)
      await loadData()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao salvar pergunta.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteQuiz(quizId: string) {
    setSubmitting(true)
    setFeedback(null)

    try {
      await deleteQuiz(quizId)
      await loadData()
      setFeedback('Pergunta removida.')
    } catch {
      setFeedback('Erro ao remover pergunta.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSectorSubmit() {
    if (!sectorForm) return
    setSubmitting(true)
    setFeedback(null)

    try {
      const values = { name: sectorForm.name.trim(), slug: sectorForm.slug.trim() }
      if (sectorForm.id) {
        await updateSector(sectorForm.id, values)
      } else {
        await createSector(values)
      }
      setSectorForm(null)
      await loadData()
      setFeedback(sectorForm.id ? 'Setor atualizado.' : 'Setor criado.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao salvar setor.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteSector(sectorId: string) {
    if (!window.confirm('Deletar este setor? Cursos e usuários vinculados podem bloquear a ação.')) return
    setSubmitting(true)
    setFeedback(null)

    try {
      await deleteSector(sectorId)
      await loadData()
      setFeedback('Setor deletado.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao deletar setor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProfileShell profile="admin" title="Conteúdo" subtitle="Cursos, quizzes e setores da plataforma" user={user}>
      <div className="admin-content-page">
        {feedback && (
          <div className={`admin-content-feedback${feedback.includes('Erro') ? ' is-error' : ''}`}>
            <Icon name={feedback.includes('Erro') ? 'x' : 'check-circle'} size={15} />
            <span>{feedback}</span>
          </div>
        )}

        <section className="admin-content-metrics" aria-label="Resumo de conteúdo">
          <ContentMetric icon="layers" label="Cursos" value={courses.length} />
          <ContentMetric icon="cpu" label="Perguntas" value={totalQuizzes} />
          <ContentMetric icon="check-circle" label="Cobertura de quiz" value={quizCoverage} />
          <ContentMetric icon="building" label="Setores" value={sectors.length} />
        </section>

        <section className="admin-content-workspace">
          <div className="admin-content-main">
            <nav className="admin-content-view-tabs" aria-label="Visualização">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeView === tab.key ? 'is-active' : ''}
                  onClick={() => setActiveView(tab.key)}
                >
                  <Icon name={tab.icon} size={14} />
                  {tab.label}
                </button>
              ))}
            </nav>
            {activeView === 'courses' ? (
              <CoursesPanel
                courses={filteredCourses}
                allCoursesCount={courses.length}
                sectors={sectors}
                loading={loading}
                submitting={submitting}
                searchText={searchText}
                sectorFilter={sectorFilter}
                expandedCourseId={expandedCourseId}
                onSearchChange={setSearchText}
                onSectorFilterChange={setSectorFilter}
                onNewCourse={() => openNewCourse()}
                onEditCourse={editCourse}
                onDeleteCourse={handleDeleteCourse}
                onAddQuiz={openQuizForm}
                onEditQuiz={openEditQuizForm}
                onDeleteQuiz={handleDeleteQuiz}
                onToggleExpanded={(courseId) => setExpandedCourseId(expandedCourseId === courseId ? null : courseId)}
              />
            ) : (
              <SectorsPanel
                sectors={sectorsWithStats}
                loading={loading}
                submitting={submitting}
                onNewSector={() => setSectorForm(EMPTY_SECTOR)}
                onNewCourse={openNewCourse}
                onEditSector={(sector) => setSectorForm({ id: sector.id, name: sector.name, slug: sector.slug })}
                onDeleteSector={handleDeleteSector}
              />
            )}
          </div>
        </section>
      </div>

      {courseForm && (
        <Modal title={courseForm.id ? 'Editar Curso' : 'Novo Curso'} variant="course" onClose={() => setCourseForm(null)}>
          <div className="admin-content-course-form">
            <div className="admin-content-form-grid">
              <Field label="Título" className="is-wide">
                <input className="ih-input" value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} />
              </Field>
              <Field label="Descrição" className="is-wide">
                <textarea className="ih-textarea admin-content-description-input" value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} />
              </Field>
              <Field label="Setor">
                <select className="ih-input" value={courseForm.sector_id} onChange={(event) => setCourseForm({ ...courseForm, sector_id: event.target.value })}>
                  <option value="none">Geral</option>
                  {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                </select>
              </Field>
              <Field label="Thumbnail URL">
                <input className="ih-input" value={courseForm.thumbnail_url} onChange={(event) => setCourseForm({ ...courseForm, thumbnail_url: event.target.value })} />
              </Field>
            </div>

            <div className="admin-content-editor-block">
              <Field label="Conteúdo">
                <textarea className="ih-textarea admin-content-content-input" value={courseForm.content} onChange={(event) => setCourseForm({ ...courseForm, content: event.target.value })} />
              </Field>
            </div>
          </div>

          <ModalActions disabled={submitting || !courseForm.title.trim() || !courseForm.description.trim() || !courseForm.content.trim()} onCancel={() => setCourseForm(null)} onConfirm={handleCourseSubmit} />
        </Modal>
      )}

      {quizForm && (
        <Modal title={quizForm.id ? 'Editar Pergunta' : 'Adicionar Pergunta'} onClose={() => setQuizForm(null)}>
          {!quizForm.id && (
            <Field label="Curso">
              <select className="ih-input" value={quizForm.course_id} onChange={(event) => setQuizForm({ ...quizForm, course_id: event.target.value })}>
                <option value="">Selecione</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </Field>
          )}
          <Field label="Pergunta">
            <textarea className="ih-textarea" value={quizForm.question} onChange={(event) => setQuizForm({ ...quizForm, question: event.target.value })} />
          </Field>
          {quizForm.options.map((option, index) => (
            <Field key={index} label={`Opção ${index + 1}`}>
              <input
                className="ih-input"
                value={option}
                onChange={(event) => {
                  const options = [...quizForm.options]
                  options[index] = event.target.value
                  setQuizForm({ ...quizForm, options })
                }}
              />
            </Field>
          ))}
          <Field label="Resposta correta">
            <select className="ih-input" value={quizForm.correct_answer} onChange={(event) => setQuizForm({ ...quizForm, correct_answer: event.target.value })}>
              <option value="0">Opção 1</option>
              <option value="1">Opção 2</option>
              <option value="2">Opção 3</option>
              <option value="3">Opção 4</option>
            </select>
          </Field>
          <ModalActions disabled={submitting || !quizForm.course_id || !quizForm.question.trim() || quizForm.options.some((option) => !option.trim())} onCancel={() => setQuizForm(null)} onConfirm={handleQuizSubmit} />
        </Modal>
      )}

      {sectorForm && (
        <Modal title={sectorForm.id ? 'Renomear Setor' : 'Novo Setor'} onClose={() => setSectorForm(null)}>
          <Field label="Nome">
            <input
              className="ih-input"
              value={sectorForm.name}
              onChange={(event) => {
                const name = event.target.value
                setSectorForm({
                  ...sectorForm,
                  name,
                  slug: sectorForm.slug || sectorForm.id ? sectorForm.slug : slugify(name),
                })
              }}
            />
          </Field>
          <Field label="Slug">
            <input className="ih-input" value={sectorForm.slug} onChange={(event) => setSectorForm({ ...sectorForm, slug: event.target.value })} />
          </Field>
          <ModalActions disabled={submitting || !sectorForm.name.trim() || !sectorForm.slug.trim()} onCancel={() => setSectorForm(null)} onConfirm={handleSectorSubmit} />
        </Modal>
      )}
    </ProfileShell>
  )
}

function ContentMetric({ icon, label, value }: { icon: IconName; label: string; value: string | number }) {
  return (
    <div className="admin-content-metric">
      <span>
        <Icon name={icon} size={16} />
      </span>
      <div>
        <strong className="tabnum">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</strong>
        <em>{label}</em>
      </div>
    </div>
  )
}

function CoursesPanel({
  courses,
  allCoursesCount,
  sectors,
  loading,
  submitting,
  searchText,
  sectorFilter,
  expandedCourseId,
  onSearchChange,
  onSectorFilterChange,
  onNewCourse,
  onEditCourse,
  onDeleteCourse,
  onAddQuiz,
  onEditQuiz,
  onDeleteQuiz,
  onToggleExpanded,
}: {
  courses: AdminCourse[]
  allCoursesCount: number
  sectors: AdminContentData['sectors']
  loading: boolean
  submitting: boolean
  searchText: string
  sectorFilter: string
  expandedCourseId: string | null
  onSearchChange: (value: string) => void
  onSectorFilterChange: (value: string) => void
  onNewCourse: () => void
  onEditCourse: (course: AdminCourse) => void
  onDeleteCourse: (courseId: string) => void
  onAddQuiz: (courseId?: string) => void
  onEditQuiz: (quiz: QuizQuestion) => void
  onDeleteQuiz: (quizId: string) => void
  onToggleExpanded: (courseId: string) => void
}) {
  return (
    <section className="admin-content-panel">
      <div className="admin-content-panel-head">
        <div>
          <h3>Cursos</h3>
          <span>{courses.length} de {allCoursesCount}</span>
        </div>
        <button className="btn btn-accent btn-sm" type="button" onClick={onNewCourse}>
          <Icon name="plus" size={13} />
          Novo Curso
        </button>
      </div>

      <div className="admin-content-filters">
        <input className="ih-input" value={searchText} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar por curso ou setor" />
        <select className="ih-input" value={sectorFilter} onChange={(event) => onSectorFilterChange(event.target.value)}>
          <option value="all">Todos os setores</option>
          <option value="none">Geral</option>
          {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="admin-content-state">Carregando conteúdo...</div>
      ) : courses.length === 0 ? (
        <div className="admin-content-state">Nenhum curso encontrado.</div>
      ) : (
        <div className="admin-content-course-list">
          {courses.map((course) => {
            const expanded = expandedCourseId === course.id

            return (
              <article className="admin-content-course" key={course.id}>
                <div className="admin-content-course-body" onClick={() => onToggleExpanded(course.id)} style={{ cursor: 'pointer' }}>
                  <div className="admin-content-course-icon">
                    <Icon name="layers" size={16} />
                  </div>
                  <div className="admin-content-course-copy">
                    <div className="admin-content-course-title-row">
                      <h4>{course.title}</h4>
                      <span className="tag">{course.sector_name ?? 'Geral'}</span>
                    </div>
                    <p>{course.description}</p>
                    <div className="admin-content-meta">
                      <span>{formatDate(course.created_at)}</span>
                      <span>{course.quizzes.length} perguntas</span>
                      <span>{course.thumbnail_url ? 'Com thumbnail' : 'Sem thumbnail'}</span>
                    </div>
                  </div>
                  <div className="admin-content-course-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => onToggleExpanded(course.id)}>
                      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={12} />
                      {expanded ? 'Fechar' : 'Ver quizzes'}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => onEditCourse(course)}>
                      <Icon name="pencil" size={12} />
                      Editar
                    </button>
                    <button className="btn btn-accent btn-sm" type="button" onClick={() => onAddQuiz(course.id)}>
                      <Icon name="cpu" size={12} />
                      Pergunta
                    </button>
                    <button className="btn btn-danger btn-sm" type="button" disabled={submitting} onClick={() => onDeleteCourse(course.id)}>
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="admin-content-quiz-list">
                    {course.quizzes.map((quiz, index) => (
                      <div className="admin-content-quiz-row" key={quiz.id}>
                        <span className="tabnum">{index + 1}</span>
                        <div>
                          <strong>{quiz.question}</strong>
                          <em>Correta: {quiz.options[quiz.correct_answer] ?? quiz.correct_answer}</em>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => onEditQuiz(quiz)}>
                            <Icon name="pencil" size={12} />
                            Editar
                          </button>
                          <button className="btn btn-danger btn-sm" type="button" disabled={submitting} onClick={() => onDeleteQuiz(quiz.id)}>
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {course.quizzes.length === 0 && (
                      <div className="admin-content-quiz-empty">Nenhuma pergunta vinculada.</div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SectorsPanel({
  sectors,
  loading,
  submitting,
  onNewSector,
  onNewCourse,
  onEditSector,
  onDeleteSector,
}: {
  sectors: Array<{ sector: AdminContentData['sectors'][number]; courseCount: number; quizCount: number }>
  loading: boolean
  submitting: boolean
  onNewSector: () => void
  onNewCourse: (sectorId?: string) => void
  onEditSector: (sector: AdminContentData['sectors'][number]) => void
  onDeleteSector: (sectorId: string) => void
}) {
  return (
    <section className="admin-content-panel">
      <div className="admin-content-panel-head">
        <div>
          <h3>Setores</h3>
          <span>{sectors.length} cadastrados</span>
        </div>
        <button className="btn btn-accent btn-sm" type="button" onClick={onNewSector}>
          <Icon name="plus" size={13} />
          Novo Setor
        </button>
      </div>

      {loading ? (
        <div className="admin-content-state">Carregando setores...</div>
      ) : sectors.length === 0 ? (
        <div className="admin-content-state">Nenhum setor cadastrado.</div>
      ) : (
        <div className="admin-content-sector-grid">
          {sectors.map(({ sector, courseCount, quizCount }) => (
            <article className="admin-content-sector-card" key={sector.id}>
              <div className="admin-content-sector-top">
                <span>
                  <Icon name="building" size={16} />
                </span>
                <div>
                  <h4>{sector.name}</h4>
                  <em>{sector.slug}</em>
                </div>
              </div>
              <div className="admin-content-sector-stats">
                <div>
                  <strong className="tabnum">{courseCount}</strong>
                  <span>Cursos</span>
                </div>
                <div>
                  <strong className="tabnum">{quizCount}</strong>
                  <span>Perguntas</span>
                </div>
              </div>
              <div className="admin-content-sector-actions">
                <button className="btn btn-muted btn-sm" type="button" onClick={() => onNewCourse(sector.id)}>Curso</button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => onEditSector(sector)}>Renomear</button>
                <button className="btn btn-danger btn-sm" type="button" disabled={submitting} onClick={() => onDeleteSector(sector.id)}>Deletar</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`admin-content-field${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Modal({
  title,
  variant,
  children,
  onClose,
}: {
  title: string
  variant?: 'course'
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="ih-modal-backdrop" onClick={onClose}>
      <div className={`ih-modal admin-content-modal${variant ? ` is-${variant}` : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="admin-content-modal-head">
          <div className="admin-content-modal-title">
            <span>
              <Icon name={variant === 'course' ? 'layers' : 'plus'} size={16} />
            </span>
            <h2>{title}</h2>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="admin-content-modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

function ModalActions({ disabled, onCancel, onConfirm }: { disabled: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="admin-content-modal-actions">
      <button className="btn btn-muted btn-md" type="button" onClick={onCancel}>Cancelar</button>
      <button className="btn btn-success btn-md" type="button" disabled={disabled} onClick={onConfirm}>Salvar</button>
    </div>
  )
}
