// Metadados do banco simulado: chaves estrangeiras, valores padrão e restrições de unicidade.
// Espelham o schema.sql do projeto original, para as consultas do app funcionarem sem alteração.

export type Row = Record<string, unknown>

export type ForeignKey = {
  table: string
  column: string
  ref: string
  onDelete: 'cascade' | 'set null' | 'restrict'
}

type TableMeta = {
  /** Prefixo dos ids gerados em runtime (as rotas dinâmicas são pré-geradas com esses ids). */
  idPool?: { prefix: string; size: number }
  defaults?: Record<string, unknown>
  unique?: string[][]
  /** Intervalo entre created_at das linhas semeadas sem data, da mais antiga à mais recente. */
  stepMs: number
}

const HOUR = 3_600_000

export const TABLES: Record<string, TableMeta> = {
  sectors: { unique: [['slug']], stepMs: HOUR },
  users: {
    defaults: { points: 0, level: 1, is_visible_in_ranking: true, is_mentor: false, can_visualize_as: false },
    unique: [['matricula']],
    stepMs: 24 * HOUR,
  },
  ideas: { idPool: { prefix: 'c0000000-0000-0000-0001-', size: 40 }, defaults: { social_score: 0 }, stepMs: 20 * HOUR },
  idea_rejections: { unique: [['idea_id', 'user_id']], stepMs: HOUR },
  validations: { unique: [['idea_id', 'user_id']], stepMs: 3 * HOUR },
  comments: { stepMs: 8 * HOUR },
  comment_likes: { unique: [['comment_id', 'user_id']], stepMs: HOUR },
  courses: { idPool: { prefix: 'd0000000-0000-0000-0001-', size: 20 }, stepMs: 48 * HOUR },
  quizzes: { stepMs: HOUR },
  quiz_completions: { unique: [['user_id', 'course_id']], stepMs: 6 * HOUR },
  mentor_profiles: { unique: [['user_id']], stepMs: 24 * HOUR },
  mentorship_requests: { defaults: { next_meeting_status: 'none' }, stepMs: 24 * HOUR },
  mentorship_evaluations: { stepMs: HOUR },
  notifications: { stepMs: HOUR },
  marketplace_items: { defaults: { is_available: true }, stepMs: 24 * HOUR },
  marketplace_transactions: { stepMs: 12 * HOUR },
  point_ledger: { stepMs: 5 * HOUR },
  moderation_alerts: { defaults: { occurrence_count: 1 }, stepMs: 18 * HOUR },
  platform_settings: { unique: [['key']], stepMs: HOUR },
}

export const FOREIGN_KEYS: ForeignKey[] = [
  { table: 'users', column: 'sector_id', ref: 'sectors', onDelete: 'set null' },
  { table: 'ideas', column: 'author_id', ref: 'users', onDelete: 'cascade' },
  { table: 'ideas', column: 'sector_id', ref: 'sectors', onDelete: 'restrict' },
  { table: 'ideas', column: 'approved_by', ref: 'users', onDelete: 'set null' },
  { table: 'idea_rejections', column: 'idea_id', ref: 'ideas', onDelete: 'cascade' },
  { table: 'idea_rejections', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'validations', column: 'idea_id', ref: 'ideas', onDelete: 'cascade' },
  { table: 'validations', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'comments', column: 'idea_id', ref: 'ideas', onDelete: 'cascade' },
  { table: 'comments', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'comments', column: 'parent_id', ref: 'comments', onDelete: 'cascade' },
  { table: 'comment_likes', column: 'comment_id', ref: 'comments', onDelete: 'cascade' },
  { table: 'comment_likes', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'courses', column: 'sector_id', ref: 'sectors', onDelete: 'set null' },
  { table: 'quizzes', column: 'course_id', ref: 'courses', onDelete: 'cascade' },
  { table: 'quiz_completions', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'quiz_completions', column: 'course_id', ref: 'courses', onDelete: 'cascade' },
  { table: 'mentor_profiles', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'mentor_profiles', column: 'sector_id', ref: 'sectors', onDelete: 'set null' },
  { table: 'mentor_profiles', column: 'validated_by', ref: 'users', onDelete: 'set null' },
  { table: 'mentorship_requests', column: 'mentee_id', ref: 'users', onDelete: 'cascade' },
  { table: 'mentorship_requests', column: 'mentor_id', ref: 'users', onDelete: 'cascade' },
  { table: 'mentorship_requests', column: 'confirmed_by', ref: 'users', onDelete: 'set null' },
  { table: 'mentorship_requests', column: 'next_meeting_proposed_by', ref: 'users', onDelete: 'set null' },
  { table: 'mentorship_requests', column: 'next_meeting_responded_by', ref: 'users', onDelete: 'set null' },
  { table: 'mentorship_evaluations', column: 'request_id', ref: 'mentorship_requests', onDelete: 'cascade' },
  { table: 'mentorship_evaluations', column: 'evaluator_id', ref: 'users', onDelete: 'cascade' },
  { table: 'notifications', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'marketplace_transactions', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'marketplace_transactions', column: 'item_id', ref: 'marketplace_items', onDelete: 'restrict' },
  { table: 'point_ledger', column: 'user_id', ref: 'users', onDelete: 'cascade' },
  { table: 'moderation_alerts', column: 'user_id', ref: 'users', onDelete: 'cascade' },
]

export const fkName = (fk: ForeignKey) => `${fk.table}_${fk.column}_fkey`

/** Colunas anuláveis: o banco real devolve null quando não informadas, e o app compara com null. */
export const NULLABLE: Record<string, string[]> = {
  users: ['email', 'matricula', 'pin', 'sector_id'],
  ideas: ['rejection_reason', 'approved_by'],
  comments: ['parent_id'],
  courses: ['thumbnail_url', 'sector_id'],
  mentor_profiles: ['sector_id', 'validated_by'],
  mentorship_requests: [
    'objective', 'confirmed_by', 'mentor_rating', 'mentor_feedback', 'mentor_evaluated_at',
    'mentee_rating', 'mentee_feedback', 'mentee_evaluated_at', 'next_meeting_date',
    'next_meeting_proposed_by', 'next_meeting_responded_by', 'next_meeting_responded_at',
  ],
  mentorship_evaluations: ['feedback'],
  notifications: ['href', 'reference_id', 'read_at'],
  marketplace_items: ['image_url'],
  point_ledger: ['reference_id'],
}

/** Colunas de data preenchidas com "agora" quando não informadas. */
export const TIMESTAMPS: Record<string, string[]> = {
  ideas: ['created_at', 'updated_at'],
  quiz_completions: ['completed_at'],
  platform_settings: ['updated_at'],
}
export const timestampColumns = (table: string) => TIMESTAMPS[table] ?? ['created_at']
