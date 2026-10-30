// Ideias extras para o Hub e para a triagem do gestor parecerem vivos na demonstração.
// Pessoas, ideias e números são fictícios. As validações seguem o social_score de cada ideia.
import type { Row } from './schema'

const USER = {
  lucas: '9184e8f6-79c2-4d16-a162-b13f8a9b019b',
  beatriz: '97d7b42a-d592-4bc2-9816-b4abbc6d7d34',
  rafael: '50d09099-4f3e-4a25-95fa-692412f2f19b',
  ana: '6b7bf93f-43a0-4719-976d-6ea361f784a3',
  thiago: 'fa0394b9-e7a2-457b-9198-94680d74bda0',
  juliana: 'c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71',
  fernando: '5fef169c-3a62-4b9e-b99d-c10ff26d0ea2',
  camila: '1c37a0d6-58ef-4eb6-b718-c8210302797e',
  diego: '47fc2915-abb5-444f-b88a-4ea694acbbd4',
  priscila: '14436180-f2dc-4200-b222-354af79bbdb8',
  rodrigo: '0584e0c8-8282-4544-974d-893edae96dea',
  vanessa: '88688191-e754-40a0-bbfd-c7b7308fafb5',
  bruno: 'f7186880-9511-423b-885f-6f0d35734c3c',
  leticia: 'aa4471a7-c190-422d-848e-bc36c47dfb3c',
  eduardo: '5067b328-3acb-4184-832f-b992b01f116a',
  carlos: '81074852-2b28-48c8-b254-cb95929736fe',
  marina: '9cd5ffcc-24a1-4ecc-af7d-d7a9599e730e',
} as const

const SECTOR = {
  ti: 'a0000000-0000-0000-0000-000000000001',
  operacoes: 'a0000000-0000-0000-0000-000000000002',
  logistica: 'a0000000-0000-0000-0000-000000000003',
  rh: 'a0000000-0000-0000-0000-000000000004',
  qualidade: 'a0000000-0000-0000-0000-000000000005',
} as const

type Status = 'sugestao' | 'em_analise' | 'em_implantacao' | 'conhecimento_org'
type Area = 'processo' | 'custo' | 'seguranca' | 'qualidade'

type IdeaSeed = {
  n: number
  title: string
  summary: string
  benefits: string
  complexity: 'Baixa' | 'Média' | 'Alta'
  ai: number
  status: Status
  author: keyof typeof USER
  sector: keyof typeof SECTOR
  area: Area
  /** Quantidade de validações (vira o social_score). */
  soc: number
  /** Quem valida primeiro, para variar os grupos de apoiadores. */
  offset?: number
  /** A Ana também validou: deixa algumas ideias já marcadas para ela. */
  anaValidated?: boolean
}

const IDEAS: IdeaSeed[] = [
  // Fila de triagem do gestor (Operações, em análise)
  { n: 21, title: 'Troca rápida de formato na linha de envase', status: 'em_analise', author: 'fernando', sector: 'operacoes', area: 'processo', complexity: 'Média', ai: 84.2, soc: 6, offset: 0,
    summary: 'Padronizar a troca de formato com kits pré-ajustados e um passo a passo visual, reduzindo o tempo de linha parada entre lotes.',
    benefits: 'Redução de até 35% no tempo de setup. Menos erros de ajuste. Mais lotes por turno.' },
  { n: 22, title: 'Quadro digital de passagem de turno', status: 'em_analise', author: 'beatriz', sector: 'operacoes', area: 'processo', complexity: 'Baixa', ai: 76.8, soc: 5, offset: 3,
    summary: 'Trocar o caderno de passagem de turno por um quadro digital com pendências, paradas e avisos de segurança do turno anterior.',
    benefits: 'Informação completa e legível a cada troca. Menos retrabalho por falha de comunicação. Histórico consultável.' },
  { n: 23, title: 'Pesagem automática para reduzir perdas de insumo', status: 'em_analise', author: 'vanessa', sector: 'operacoes', area: 'custo', complexity: 'Alta', ai: 90.1, soc: 8, offset: 5,
    summary: 'Instalar balanças integradas ao sistema de produção para registrar o consumo real de insumos e alertar desvios na hora.',
    benefits: 'Redução estimada de 6% nas perdas de insumo. Rastreabilidade por lote. Dados confiáveis para o custeio.' },
  { n: 24, title: 'Treinamento de operadores em realidade aumentada', status: 'em_analise', author: 'beatriz', sector: 'operacoes', area: 'seguranca', complexity: 'Alta', ai: 79.5, soc: 5, offset: 8,
    summary: 'Usar óculos de realidade aumentada para treinar operadores em procedimentos críticos, sem parar a linha nem expor ninguém a risco.',
    benefits: 'Onboarding mais rápido. Menos incidentes em tarefas de risco. Treinamento padronizado entre turnos.' },
  { n: 25, title: 'Aviso automático de parada de linha para o supervisor', status: 'em_analise', author: 'fernando', sector: 'operacoes', area: 'processo', complexity: 'Baixa', ai: 81.3, soc: 7, offset: 2,
    summary: 'Enviar uma notificação no celular do supervisor assim que a linha parar, com o motivo informado pelo operador.',
    benefits: 'Resposta mais rápida a paradas. Dados de causa para análise semanal. Menos tempo ocioso.' },
  { n: 26, title: 'Ronda digital para inspeção de utilidades', status: 'em_analise', author: 'vanessa', sector: 'operacoes', area: 'qualidade', complexity: 'Média', ai: 77.9, soc: 6, offset: 10,
    summary: 'Registrar a ronda de ar comprimido, vapor e água purificada em um aplicativo com rota e alertas de leitura fora da faixa.',
    benefits: 'Conformidade com os registros exigidos. Detecção antecipada de desvios. Fim do papel nas rondas.' },

  // Sugestões (Hub)
  { n: 27, title: 'Ponto de coleta seletiva em cada linha de produção', status: 'sugestao', author: 'beatriz', sector: 'operacoes', area: 'custo', complexity: 'Baixa', ai: 72.4, soc: 2, offset: 1,
    summary: 'Instalar coletores identificados por tipo de resíduo ao lado de cada linha para aumentar a reciclagem e reduzir o descarte comum.',
    benefits: 'Menor custo com descarte. Mais material reciclado. Cultura de sustentabilidade no chão de fábrica.' },
  { n: 28, title: 'Etiquetas com QR Code para rastrear paletes', status: 'sugestao', author: 'fernando', sector: 'operacoes', area: 'processo', complexity: 'Média', ai: 80.6, soc: 3, offset: 6,
    summary: 'Etiquetar cada palete com QR Code para consultar origem, lote e destino em segundos, sem procurar em planilhas.',
    benefits: 'Rastreabilidade imediata. Menos extravios. Conferência de expedição mais rápida.' },
  { n: 29, title: 'Bancadas reguláveis na área de embalagem', status: 'sugestao', author: 'vanessa', sector: 'operacoes', area: 'seguranca', complexity: 'Média', ai: 78.1, soc: 1, offset: 9,
    summary: 'Trocar as bancadas fixas por modelos com regulagem de altura para adequar a postura de cada operador.',
    benefits: 'Menos afastamentos por dores lombares. Mais conforto e produtividade. Melhor aderência às normas de ergonomia.' },
  { n: 30, title: 'Painel de metas de produtividade por turno', status: 'sugestao', author: 'beatriz', sector: 'operacoes', area: 'processo', complexity: 'Baixa', ai: 74.7, soc: 4, offset: 12,
    summary: 'Mostrar em uma tela na linha a meta do turno e o realizado em tempo real, com cores simples de acompanhar.',
    benefits: 'Equipe acompanha o próprio resultado. Ajustes feitos durante o turno, não depois. Mais engajamento.' },

  // Em implantação (Operações)
  { n: 31, title: 'Manutenção autônoma com checklist por máquina', status: 'em_implantacao', author: 'vanessa', sector: 'operacoes', area: 'qualidade', complexity: 'Média', ai: 88.3, soc: 10, offset: 4,
    summary: 'O próprio operador faz inspeções simples de limpeza e lubrificação guiadas por um checklist no tablet da máquina.',
    benefits: 'Menos quebras inesperadas. Operadores mais conscientes do equipamento. Manutenção focada no que importa.' },
  { n: 32, title: 'Sinalização luminosa do status de cada linha', status: 'em_implantacao', author: 'fernando', sector: 'operacoes', area: 'seguranca', complexity: 'Baixa', ai: 85.7, soc: 8, offset: 7, anaValidated: true,
    summary: 'Torres de luz verde, amarela e vermelha em cada linha para sinalizar operação, atenção e parada à distância.',
    benefits: 'Parada percebida em segundos. Menos deslocamentos desnecessários. Mais segurança nas áreas de risco.' },
  // Conhecimento organizacional
  { n: 33, title: 'Gestão visual de metas no chão de fábrica', status: 'conhecimento_org', author: 'beatriz', sector: 'operacoes', area: 'processo', complexity: 'Baixa', ai: 90.2, soc: 14, offset: 2, anaValidated: true,
    summary: 'Quadros visuais simples com indicadores de segurança, qualidade e produção atualizados por turno pela própria equipe.',
    benefits: 'Rotina de reunião de 5 minutos por turno. Problemas à vista de todos. Prática já replicada em outras linhas.' },

  // Outros setores
  { n: 34, title: 'Portal único de solicitações internas', status: 'sugestao', author: 'lucas', sector: 'ti', area: 'processo', complexity: 'Média', ai: 79.8, soc: 3, offset: 11,
    summary: 'Reunir pedidos de acesso, equipamentos e suporte em um só portal com acompanhamento do andamento.',
    benefits: 'Menos pedidos perdidos por e-mail. Prazo visível para quem solicita. Indicadores de atendimento.' },
  { n: 35, title: 'Autenticação por biometria nos totens', status: 'em_analise', author: 'rodrigo', sector: 'ti', area: 'seguranca', complexity: 'Média', ai: 83.9, soc: 6, offset: 1,
    summary: 'Permitir que operadores entrem nos totens com a digital, sem decorar PIN, mantendo o registro de quem acessou.',
    benefits: 'Acesso mais rápido no chão de fábrica. Fim do compartilhamento de PIN. Auditoria confiável.' },
  { n: 36, title: 'Agendamento de janelas de doca', status: 'sugestao', author: 'bruno', sector: 'logistica', area: 'processo', complexity: 'Média', ai: 81.9, soc: 4, offset: 5,
    summary: 'Agendar a chegada dos caminhões por janela de doca para distribuir a carga ao longo do dia.',
    benefits: 'Menos fila no pátio. Melhor uso das docas. Redução do tempo de espera dos transportadores.' },
  { n: 37, title: 'Rastreamento de paletes por RFID', status: 'em_implantacao', author: 'camila', sector: 'logistica', area: 'processo', complexity: 'Alta', ai: 89, soc: 9, offset: 3,
    summary: 'Etiquetas RFID nos paletes para registrar entrada, movimentação e saída automaticamente nos corredores.',
    benefits: 'Inventário quase em tempo real. Menos erros de conferência. Ganho de horas de contagem manual.' },
  { n: 38, title: 'Revisão digital de procedimentos operacionais', status: 'sugestao', author: 'thiago', sector: 'qualidade', area: 'qualidade', complexity: 'Média', ai: 79.2, soc: 2, offset: 8,
    summary: 'Centralizar a revisão e a aprovação de POPs em fluxo digital, com aviso de vencimento e controle de versões.',
    benefits: 'Procedimentos sempre atualizados. Menos risco em auditorias. Menos papel circulando.' },
  { n: 39, title: 'Amostragem inteligente de lotes', status: 'em_analise', author: 'eduardo', sector: 'qualidade', area: 'qualidade', complexity: 'Alta', ai: 86.4, soc: 6, offset: 9,
    summary: 'Definir o tamanho e o ponto de coleta das amostras com base no histórico de desvios de cada produto.',
    benefits: 'Análises focadas onde o risco é maior. Menos amostras redundantes. Liberação de lotes mais ágil.' },
  { n: 40, title: 'Trilha de desenvolvimento para líderes de linha', status: 'sugestao', author: 'leticia', sector: 'rh', area: 'processo', complexity: 'Média', ai: 77, soc: 2, offset: 4,
    summary: 'Criar uma trilha curta com liderança, comunicação e segurança para operadores que assumem a coordenação de linha.',
    benefits: 'Promoções internas mais preparadas. Menos conflitos nas equipes. Retenção de talentos.' },
]

const ideaId = (n: number) => `c0000000-0000-0000-0002-${String(n).padStart(12, '0')}`

// Quem pode validar: funcionários com e-mail (sem a Ana, que fica de fora para validar no tour)
const VALIDATORS: Array<keyof typeof USER> = [
  'lucas', 'beatriz', 'rafael', 'thiago', 'juliana', 'fernando', 'camila', 'diego', 'priscila',
  'rodrigo', 'vanessa', 'bruno', 'leticia', 'eduardo',
]

function validatorsFor(seed: IdeaSeed): string[] {
  const pool = VALIDATORS.filter((u) => u !== seed.author)
  const picked: string[] = []
  const wanted = seed.anaValidated ? seed.soc - 1 : seed.soc
  for (let k = 0; picked.length < wanted && k < pool.length * 2; k++) {
    const id = USER[pool[((seed.offset ?? 0) + k) % pool.length]]
    if (!picked.includes(id)) picked.push(id)
  }
  if (seed.anaValidated) picked.push(USER.ana)
  return picked
}

const ideas: Row[] = IDEAS.map((s) => ({
  id: ideaId(s.n),
  title: s.title,
  summary: s.summary,
  benefits: s.benefits,
  complexity: s.complexity,
  ai_score: s.ai,
  social_score: s.soc,
  status: s.status,
  author_id: USER[s.author],
  sector_id: SECTOR[s.sector],
  improvement_area: s.area,
  approved_by: s.status === 'em_implantacao' || s.status === 'conhecimento_org' ? (s.sector === 'ti' ? USER.marina : USER.carlos) : null,
}))

const validations: Row[] = IDEAS.flatMap((s) =>
  validatorsFor(s).map((user) => ({ idea_id: ideaId(s.n), user_id: user }))
)

const comments: Row[] = [
  { idea_id: ideaId(21), user_id: USER.vanessa, content: 'Já testamos kits pré-ajustados na linha 3 e o setup caiu pela metade. Vale padronizar para todas.' },
  { idea_id: ideaId(23), user_id: USER.diego, content: 'Dá para integrar as balanças ao MES que já usamos. Posso ajudar com os requisitos de dados.' },
  { idea_id: ideaId(23), user_id: USER.fernando, content: 'Concordo. Hoje a divergência de insumo só aparece no fechamento do lote.' },
  { idea_id: ideaId(25), user_id: USER.beatriz, content: 'Seria ótimo incluir o motivo da parada já na notificação, assim o supervisor chega sabendo o que houve.' },
  { idea_id: ideaId(31), user_id: USER.carlos, content: 'Aprovada. Começamos pela linha de envase e expandimos conforme os resultados do primeiro mês.' },
  { idea_id: ideaId(32), user_id: USER.priscila, content: 'Os instaladores já definiram os pontos de energia. A previsão é concluir em duas semanas.' },
  { idea_id: ideaId(33), user_id: USER.vanessa, content: 'Replicamos na embalagem e a reunião de turno ficou muito mais objetiva.' },
  { idea_id: ideaId(37), user_id: USER.bruno, content: 'O piloto no corredor B leu 100% dos paletes sem intervenção manual.' },
]

export const EXTRA_FIXTURES: Record<string, Row[]> = { ideas, validations, comments }

export const EXTRA_IDEA_IDS = IDEAS.map((s) => ideaId(s.n))
