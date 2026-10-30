// Ids das rotas dinâmicas pré-geradas na exportação estática: os do seed mais o pool de ids
// que ideias e cursos criados durante a demonstração recebem (veja poolIds em db.ts).
import { FIXTURES } from './fixtures'
import { poolIds } from './db'

export const ideaIds = () => [...FIXTURES.ideas.map((i) => String(i.id)), ...poolIds('ideas')]
export const courseIds = () => [...FIXTURES.courses.map((c) => String(c.id)), ...poolIds('courses')]
