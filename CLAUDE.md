# Innovation HUB (versão de portfolio) - CLAUDE.md

Site estático (Next.js 14, `output: 'export'`) que roda sem servidor nem banco, publicado no GitHub Pages.
O banco é simulado em memória (`lib/mock`); as telas e os serviços são os do projeto original.

## Comandos

- `npm run dev`: desenvolvimento local
- `npm run build`: gera `out/` (use `NEXT_PUBLIC_BASE_PATH=/innovationhub-eurofarma-challenge` para simular o Pages)

## Convenções

- `createClient()` (`lib/supabase/client.ts`) devolve o cliente simulado, tipado como o supabase-js. Acesso a dados fica em `services/`.
- Rotas dinâmicas precisam de `generateStaticParams` (ids em `lib/mock/static-params.ts`).
- Sem rotas `/api`, middleware nem `redirect()` de servidor: não funcionam na exportação estática.
- O tour vive em `components/tour`; o roteiro e o mapa de abas ficam em `steps.ts`.
- Texto sem travessão e sem emojis. Commits no padrão Conventional Commits.

## Status

- Versão de portfolio publicada com tour guiado; detalhes em `docs/agents/changelog.md`.
