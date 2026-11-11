# Changelog de agentes

## Tour com posição fixa, perfil explícito e "Veja também"

- Cartão da Eura em posição fixa (esquerda, acima do usuário da barra lateral), igual em todos os passos; saiu a
  lógica de âncora por tela.
- Primeira linha do cartão: "Estamos no perfil: Gestor" (ou "tela inicial"), no lugar da pílula de tela.
- "Veja também" em todos os passos com atalhos (Métricas; Marketplace e Ranking; Mentorias; Recompensas e Ranking
  do Totem; Usuários, Conteúdo, Moderação e Configurações). O botão abre a aba e a Eura explica cada uma
  (`also[].text` em `steps.ts`); Voltar retorna ao passo, Próximo segue o roteiro.
- Recolher virou "Ocultar texto" e o estado recolhido mostra "Mostrar texto da Eura".
- Final do tour e rodapé da tela inicial: "projeto vencedor do desafio proposto pela Eurofarma durante o evento
  NEXT 2026, da FIAP", sem citar Global Solution.
- Testes: `next build` (297 páginas), atalho, Voltar, Próximo, ocultar e mostrar no navegador; print 14 refeito.
- Limite conhecido: em janelas baixas (1280x720) o cartão pode cobrir o fim do menu lateral; "Ocultar texto" resolve.

## Tour em cartão compacto na barra lateral

- Estudo de encaixe: a barra lateral do app tem sempre 260 px e uma zona vazia entre o menu e o usuário, de 207 a
  646 px de altura em 800x600 a 1920x1080 nos três perfis (menor valor: funcionário a 1280x720). O cartão da Eura
  (236 px) mora ali e cobre 0 de 35 pontos de conteúdo nas telas com barra lateral.
- Telas sem barra lateral (inicial e Totem): escolhe entre cantos e laterais pelo que cobre menos (0 a 7 de 35).
- Voltar e Próximo ficam dentro do cartão; texto com "digitando" e altura fixa, então os botões não se mexem.
- Tour pausa quando a pessoa mexe em outra parte: cartão com "Continuar de onde parei", "Mostrar esta aba ou
  perfil" e "Sair". O botão do tour desligado vira "Continuar o tour 3/14".
- Removidos o chat com histórico, o campo de perguntas e o maximizar; o botão "Nova ideia" do Hub voltou ao lugar.

## Tour contado pela Eura em um chat

- O tour virou uma conversa: a Eura fala em primeira pessoa, cada passo é uma mensagem (com "digitando" e efeito de
  máquina de escrever) e as ações da pessoa viram mensagens suas ("Próximo", "Voltar", "Ver Métricas").
- Chat com minimizar (fica só a barra de controles, com o avatar e um ponto de aviso) e maximizar; escolhe o canto
  (direito ou esquerdo) que cobre menos a página e nunca o elemento destacado.
- Campo de pergunta com respostas simples por regras (dados, senha, pontos, Totem, gestor, admin, Eura) e atalhos
  de próximo, voltar e sair por texto. Convite do tour passou a ser da Eura.
- Substituídos o balão ancorado, a linha de ligação e o arraste.

## Balão do tour fora do caminho

- O balão escolhe o lugar que cobre menos conteúdo: avalia candidatos colados no elemento, a algumas distâncias e
  na grade da tela, conta quantos pontos de texto, botão ou ícone cada um cobriria (elementFromPoint) e fica com o
  de menor custo, com histerese para não pular. Medido: 0 a 2 de 35 pontos cobertos na maioria dos passos.
- Linha pontilhada liga o balão ao elemento quando os dois não se tocam.
- Balão arrastável pelo topo, com a posição guardada; duplo clique ou botão volta ao automático.
- README conciso, com aviso de versão de portfolio no topo e só 6 prints.

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
