import type { PersonaId } from '@/lib/mock/session'

export type TourRun = 'helpdesk' | 'badword' | 'idea' | 'voice'

export type TourStep = {
  title: string
  text: string
  /** Segundos estimados de leitura, para o tempo restante. */
  sec: number
  /** Perfil do passo; null = sem login (tela inicial). */
  persona: PersonaId | null
  path: string
  page: string
  /** Abre o modal de acesso (só na tela inicial). */
  modal?: boolean
  run?: TourRun
  /** Elemento a destacar: seletor CSS, ou "@publish" para o botão de publicar da Eura. */
  hl?: string
  also?: { label: string; path: string; page: string }[]
  restart?: boolean
}

// Roteiro contado como no pitch: da ideia no chão de fábrica até a recompensa.
// Cada passo se explica sozinho, porque o convite do tour pode levar direto a qualquer um deles.
export const STEPS: TourStep[] = [
  { title: 'O problema', sec: 10, persona: null, path: '/login', page: 'landing',
    text: 'Oi, eu sou a Eura! Vou te mostrar o Innovation HUB. Tudo começa com um problema: boas ideias ficam presas em quem as tem, principalmente no chão de fábrica. O HUB é o caminho para elas chegarem a quem decide.' },
  { title: 'Entre em qualquer perfil', sec: 6, persona: null, path: '/login', page: 'landing', modal: true, hl: '[data-role="funcionario"]',
    text: 'Primeiro, vamos entrar. Cada botão abre a plataforma como um tipo de usuário, sem senha. Começo pelo funcionário.' },
  { title: 'Painel do funcionário', sec: 10, persona: 'funcionario', path: '/dashboard', page: 'dash', hl: '.ih-nav-item[data-label="Innovation IA"]',
    text: 'Este é o painel do funcionário: pontos, nível e posição no ranking. Os pontos vêm de participar e podem virar prêmios. Agora vamos registrar uma ideia comigo, na Innovation IA.' },
  { title: 'Eura, a IA do HUB', sec: 12, persona: 'funcionario', path: '/ia-innovation', page: 'ia', run: 'helpdesk',
    text: 'Aqui é a Innovation IA, onde eu converso com os colaboradores. Pedidos que não são ideias, como suporte de TI, eu redireciono ao canal certo.' },
  { title: 'Eura filtra conteúdo', sec: 12, persona: 'funcionario', path: '/ia-innovation', page: 'ia', run: 'badword',
    text: 'Eu também filtro conteúdo. Se alguém escreve algo ofensivo, aviso na hora e notifico o administrador. Ninguém precisa moderar em tempo real.' },
  { title: 'Da fala à proposta', sec: 20, persona: 'funcionario', path: '/ia-innovation', page: 'ia', run: 'idea', hl: '@publish',
    text: 'Com uma ideia de verdade, eu faço uma pergunta por vez e monto a proposta, com uma nota de 0 a 100 (AI Score). Ao publicar, a ideia vai para o Hub sem o nome do autor.' },
  { title: 'Modo Totem', sec: 16, persona: 'totem', path: '/totem/ia-innovation', page: 'tia', run: 'voice',
    text: 'E quem está no chão de fábrica? Este é o Modo Totem, para tablets, feito para quem não tem e-mail nem computador. A pessoa fala a ideia e ela vira texto na hora.' },
  { title: 'Hub de Ideias', sec: 14, persona: 'funcionario', path: '/hub', page: 'hub', hl: 'button[title*="alid"]',
    text: 'Este é o Hub de Ideias, o mural com as ideias de todos. Dá para filtrar por status, comentar e validar (apoiar) as ideias de colegas.' },
  { title: 'Triagem do gestor', sec: 24, persona: 'gestor', path: '/manager/dashboard/hub', page: 'triage', hl: 'input.manager-hub-range',
    text: 'Agora o gestor. Ideias com apoio suficiente chegam até ele. Ele define quanto pesa a nota da IA e quanto pesa a da comunidade, e aprova. Só ao aprovar o nome do autor aparece.',
    also: [{ label: 'Métricas', path: '/manager/metrics', page: 'metrics' }] },
  { title: 'Recompensa', sec: 14, persona: 'funcionario', path: '/dashboard', page: 'dash', hl: '.ih-nav-item[data-label="Marketplace"]',
    text: 'A ideia da funcionária foi aprovada e rendeu 100 pontos! No Marketplace os pontos viram benefícios, e o ranking mostra quem mais participa.',
    also: [{ label: 'Marketplace', path: '/marketplace', page: 'market' }, { label: 'Ranking', path: '/leaderboard', page: 'rank' }] },
  { title: 'Academy e Mentorias', sec: 8, persona: 'funcionario', path: '/academy', page: 'academy', hl: '.ih-nav-item[data-label="Mentorias"]',
    text: 'Tem mais: a Academy tem cursos com quiz que geram pontos, e as Mentorias conectam quem sabe a quem quer aprender.',
    also: [{ label: 'Mentorias', path: '/mentorships', page: 'mentors' }] },
  { title: 'Totem completo', sec: 6, persona: 'totem', path: '/totem/hub', page: 'thub',
    text: 'O Totem também tem Hub, recompensas e ranking, no mesmo formato grande e simples.',
    also: [{ label: 'Recompensas', path: '/totem/marketplace', page: 'tmarket' }, { label: 'Ranking', path: '/totem/ranking', page: 'trank' }] },
  { title: 'Painel do administrador', sec: 12, persona: 'admin', path: '/admin/dashboard', page: 'adash', hl: '.ih-nav-item[data-label="Configurações"]',
    text: 'Por trás de tudo está o administrador: ele gerencia usuários, cursos, alertas e as regras, como quantos apoios uma ideia precisa e quantos pontos cada ação vale.',
    also: [
      { label: 'Usuários', path: '/admin/users', page: 'users' },
      { label: 'Conteúdo', path: '/admin/content', page: 'content' },
      { label: 'Moderação', path: '/admin/moderation', page: 'moderation' },
      { label: 'Configurações', path: '/admin/settings', page: 'settings' },
    ] },
  { title: 'Fim do tour', sec: 8, persona: null, path: '/login', page: 'landing', restart: true,
    text: 'É isso! Toda boa ideia tem chance de brilhar. Agora você pode explorar o site à vontade, em qualquer perfil. Este é um projeto da FIAP Global Solution para a Eurofarma, com dados simulados.' },
]

export const TOTAL_SEC = STEPS.reduce((a, s) => a + s.sec, 0)

// Onde cada aba aparece no roteiro (null = sem passo próprio, não oferece tour)
export const PAGE_STEP: Record<PersonaId, Record<string, number | null>> = {
  funcionario: { dash: 2, ia: 3, hub: 7, rank: 9, market: 9, academy: 10, mentors: 10, profile: null },
  gestor: { mdash: 8, triage: 8, metrics: 8, mmentors: 8, hub: null, profile: null },
  admin: { adash: 12, users: 12, content: 12, moderation: 12, settings: 12 },
  totem: { tdash: 6, tia: 6, thub: 11, tmarket: 11, trank: 11 },
}

export const PROFILE_STEP: Record<PersonaId, number> = { funcionario: 2, gestor: 8, admin: 12, totem: 6 }

export const ROLE_LABEL: Record<PersonaId, string> = {
  funcionario: 'Funcionário',
  gestor: 'Gestor',
  admin: 'Administrador',
  totem: 'Totem',
}

export const PAGE_LABEL: Record<string, string> = {
  dash: 'Início', ia: 'Innovation IA', hub: 'Hub de Ideias', rank: 'Ranking', market: 'Marketplace',
  academy: 'Academy', mentors: 'Mentorias', profile: 'Meu Perfil',
  mdash: 'Visão Geral', triage: 'Triagem de Ideias', metrics: 'Métricas', mmentors: 'Mentorias',
  adash: 'Painel Geral', users: 'Usuários', content: 'Conteúdo', moderation: 'Moderação', settings: 'Configurações',
  tdash: 'Início do Totem', tia: 'Nova ideia', thub: 'Hub de Ideias', tmarket: 'Recompensas', trank: 'Ranking',
}

const ROUTES: Array<[RegExp, string]> = [
  [/^\/(login|totem-login)?$/, 'landing'],
  [/^\/dashboard$/, 'dash'],
  [/^\/ia-innovation$/, 'ia'],
  [/^\/hub(\/.*)?$/, 'hub'],
  [/^\/leaderboard$/, 'rank'],
  [/^\/marketplace$/, 'market'],
  [/^\/academy(\/.*)?$/, 'academy'],
  [/^\/(mentorships|mentors|my-mentorships)$/, 'mentors'],
  [/^\/profile$/, 'profile'],
  [/^\/manager\/dashboard\/hub(\/.*)?$/, 'triage'],
  [/^\/manager\/dashboard$/, 'mdash'],
  [/^\/manager\/metrics$/, 'metrics'],
  [/^\/manager\/mentorships$/, 'mmentors'],
  [/^\/manager\/profile$/, 'profile'],
  [/^\/admin\/dashboard$/, 'adash'],
  [/^\/admin\/users$/, 'users'],
  [/^\/admin\/content$/, 'content'],
  [/^\/admin\/moderation$/, 'moderation'],
  [/^\/admin\/settings$/, 'settings'],
  [/^\/totem\/dashboard$/, 'tdash'],
  [/^\/totem\/ia-innovation$/, 'tia'],
  [/^\/totem\/hub(\/.*)?$/, 'thub'],
  [/^\/totem\/marketplace$/, 'tmarket'],
  [/^\/totem\/ranking$/, 'trank'],
]

export function pageKey(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  return ROUTES.find(([re]) => re.test(path))?.[1] ?? null
}

export const normalizePath = (pathname: string) => pathname.replace(/\/+$/, '') || '/'
