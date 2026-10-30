# Innovation HUB | Eurofarma

**Projeto vencedor do desafio da Eurofarma na FIAP Global Solution 2026.**

Plataforma de inovação colaborativa que transforma cada colaborador, do escritório ao chão de fábrica, em um agente de melhoria contínua. Esta é a **versão de portfolio**: roda inteira no navegador, sem banco de dados nem servidor, e tem um tour guiado que conta a história do produto.

**Acesse:** https://luanrodrigues15.github.io/innovationhub-eurofarma-challenge/

> Todos os dados desta versão são simulados e as ações ficam só na sua aba: fechar a aba reinicia a demonstração. A versão original usava Supabase e Gemini.

---

## O problema

Boas ideias ficam presas em quem as tem, principalmente no chão de fábrica. Quatro perguntas guiaram o projeto:

1. Como ajudar quem tem a ideia mas não sabe estruturar uma proposta?
2. Como garantir que ela chegue ao gestor com contexto suficiente para ser avaliada?
3. Como manter o engajamento quando a pessoa não sabe se a ideia foi lida?
4. Como incluir quem está no chão de fábrica?

## Como explorar

Clique em **Acessar a plataforma** e escolha um perfil em **Acessar como**. Não há senha.

| Perfil | O que mostra |
|---|---|
| Funcionário | Painel, Innovation IA, Hub de Ideias, Ranking, Marketplace, Academy e Mentorias |
| Gestor | Triagem de ideias com peso do score, métricas do setor e aprovação de mentorias |
| Administrador | Usuários, conteúdo da Academy, moderação e regras da plataforma |
| Totem | Versão para tablets no chão de fábrica, com ideia por voz |

### Tour guiado

O botão **Fazer o tour** (canto inferior direito) conta a jornada de uma ideia em 14 passos, em cerca de 3 minutos, trocando de perfil sozinho. Ele é opcional e pode ser ligado e desligado a qualquer momento.

O tour é inteligente: se você começar a explorar por conta, o botão vibra e oferece o tour da aba ou do perfil em que você está.

## Principais funcionalidades

- **Innovation IA (Eura):** conduz a ideia com uma pergunta por vez, calcula o AI Score e filtra conteúdo inadequado.
- **Hub de Ideias:** mural com filtros, comentários e validação anônima entre colegas.
- **Score híbrido:** o gestor define o peso da nota da IA e da comunidade na triagem.
- **Gamificação:** pontos, níveis, ranking por setor ou global e Marketplace de recompensas.
- **Academy e Mentorias:** cursos com quiz e rede de mentoria interna.
- **Modo Totem:** login por matrícula, botões grandes e ideia por voz.
- **Administração:** usuários, conteúdo, moderação e regras de pontuação.

## O que é simulado

| Na versão original | Nesta versão |
|---|---|
| Supabase (PostgreSQL e Auth) | Banco em memória com a mesma API do `supabase-js` (`lib/mock`) |
| Google Gemini | Eura simulada por regras (`lib/mock/eura.ts`) e demos roteirizadas |
| Login com e-mail e senha | Perfis de demonstração com um clique |
| Middleware e layouts de servidor | Proteção de rota por perfil no navegador (`RoleGuard`) |

O app continua chamando os mesmos serviços (`services/`). Só a fonte dos dados mudou, então as telas são as originais.

## Stack

Next.js 14 (App Router, exportação estática), React 18, TypeScript, Tailwind CSS e GSAP.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Para gerar o site estático:

```bash
npm run build
```

O resultado fica em `out/`. Para simular o GitHub Pages, defina `NEXT_PUBLIC_BASE_PATH=/innovationhub-eurofarma-challenge` antes do build.

## Estrutura

```
app/            Rotas por perfil: (auth), (employee), (manager), (admin) e totem
components/     Componentes compartilhados e o tour (components/tour)
lib/mock/       Banco em memória, consultas, sessão e Eura simulada
services/       Acesso a dados usado pelas telas
```

## Deploy

O workflow `.github/workflows/deploy.yml` compila o site e publica no GitHub Pages a cada push na `main`.

## Créditos

Projeto acadêmico desenvolvido para o desafio da Eurofarma na FIAP Global Solution. Nome e identidade visual pertencem à Eurofarma e são usados aqui apenas para demonstração.
