# Changelog de agentes

## Ajustes do tour, mais ideias e README com prints

- Tour: controles (Voltar, Próximo e interruptor) fixos no canto; o balão de texto se move até o elemento
  mostrado, com setinha, preferindo o lado do elemento para não cobrir o conteúdo.
- Tour: balão com o perfil explícito ("Perfil: Gestor") e aviso de troca de perfil a cada mudança de usuário.
- Botão flutuante "Nova ideia" do Hub sobe (bottom 76) em vez de o botão do tour subir.
- Mais dados: 20 ideias novas (`lib/mock/fixtures-extra.ts`) com validações e comentários; triagem do gestor
  passou de 2 para 8 ideias; Hub com ideias em todos os status e setores.
- README no formato do repositório de referência, com 14 prints em `docs/screenshots` (Playwright com Chrome local).

## Versão de portfolio

- Projeto criado a partir do Innovation HUB original, sem banco, sem servidor e hospedável no GitHub Pages.
- Banco simulado em memória (`lib/mock`): fixtures geradas do seed, motor de consultas com a API do
  `supabase-js` (filtros, ordenação, selects relacionais, contagem, upsert, cascata de exclusão e canais
  em tempo real), persistido em `sessionStorage`.
- Auth simulada: cada perfil entra com um clique (`loginAs`). `RoleGuard` substitui os layouts de servidor.
- Eura simulada (`lib/mock/eura.ts`) no lugar do Gemini; as demos roteirizadas da página são reaproveitadas pelo tour.
- Removidos: middleware, rotas `/api`, modo banca, modo apresentação, listeners de postMessage entre janelas.
- Exportação estática: páginas dinâmicas com `generateStaticParams` (ids do seed mais um pool de ids para
  ideias e cursos criados na demonstração), `searchParams` de servidor trocado por `useSearchParams`.
- Login: modal "Acessar como" com Funcionário, Gestor, Administrador e Totem.
- Tour guiado (`components/tour`): 14 passos que seguem o pitch, botão com interruptor, balão discreto por cima
  da página, tempo restante e convite inteligente por aba e perfil (vibra e pergunta; para após 3 recusas).
- Testes: `tsc`, `next build` (237 páginas), todas as rotas dos quatro perfis carregam sem erro, tour de ponta
  a ponta no navegador, build com `NEXT_PUBLIC_BASE_PATH` servido em subpasta como no Pages.
