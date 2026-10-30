// Ids das rotas dinâmicas pré-geradas na exportação estática: os do seed mais o pool de ids
// que ideias e cursos criados durante a demonstração recebem (veja poolIds em db.ts).
import { FIXTURES } from './fixtures'
import { poolIds } from './db'
import { EXTRA_IDEA_IDS } from './fixtures-extra'

export const ideaIds = () => [...FIXTURES.ideas.map((i) => String(i.id)), ...EXTRA_IDEA_IDS, ...poolIds('ideas')]
export const courseIds = () => [...FIXTURES.courses.map((c) => String(c.id)), ...poolIds('courses')]
