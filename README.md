<div align="center">

# Innovation HUB | Eurofarma

**Versão de portfolio** do projeto vencedor do desafio proposto pela Eurofarma durante o evento NEXT 2026, da FIAP.


![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?logo=githubpages&logoColor=white)

**[Ver demo ao vivo](https://luanrodrigues15.github.io/innovationhub-eurofarma-challenge/)** · entre com um clique em "Acessar como" e ative o tour guiado no canto inferior esquerdo

</div>

---

> **Esta é a versão de portfolio.** Roda inteira no navegador, sem banco de dados nem servidor, e todas as pessoas, ideias e números são fictícios. A versão original usava Supabase e Google Gemini.

## Screenshots

| | |
|---|---|
| Acessar como: um clique por perfil | Innovation IA: proposta estruturada com AI Score |
| <img width="800" alt="Acessar como" src="docs/screenshots/02-acessar-como.png" /> | <img width="800" alt="Innovation IA" src="docs/screenshots/04-innovation-ia.png" /> |
| Hub de Ideias | Triagem do gestor com peso do score híbrido |
| <img width="800" alt="Hub de Ideias" src="docs/screenshots/05-hub-de-ideias.png" /> | <img width="800" alt="Triagem do gestor" src="docs/screenshots/08-triagem-gestor.png" /> |
| Modo Totem para o chão de fábrica | Tour guiado pela Eura, em um cartão fixo no canto inferior esquerdo |
| <img width="800" alt="Modo Totem" src="docs/screenshots/12-modo-totem.png" /> | <img width="800" alt="Tour guiado" src="docs/screenshots/14-tour-guiado.png" /> |

## Sobre o projeto

Boas ideias ficam presas em quem as tem, principalmente no chão de fábrica. O desafio era levar a inovação a todos os colaboradores da Eurofarma, inclusive a quem não tem e-mail nem computador. A plataforma responde com:

- **Innovation IA (Eura):** conduz a ideia com uma pergunta por vez, calcula o AI Score e filtra conteúdo inadequado.
- **Hub de Ideias:** mural com filtros, comentários e validação anônima entre colegas.
- **Triagem do gestor:** score híbrido com peso ajustável entre a nota da IA e a da comunidade; o autor só aparece na aprovação.
- **Gamificação:** pontos, níveis, ranking e Marketplace de recompensas, além de Academy e Mentorias.
- **Modo Totem:** versão para tablets no chão de fábrica, com login por matrícula e ideia por voz.
- **Administração:** usuários, conteúdo, moderação e regras de pontuação.

## Como explorar

Clique em **Acessar a plataforma** e escolha **Funcionário**, **Gestor**, **Administrador** ou **Totem**. Não há senha.

O botão **Fazer o tour** (canto inferior esquerdo) chama a **Eura**, que conta a jornada de uma ideia em 14 passos, em cerca de 3 minutos, trocando de perfil sozinha. É opcional e foi pensado para não atrapalhar a leitura do site:

- **Posição fixa:** o cartão fica sempre no mesmo lugar, acompanha o tema claro ou escuro do site e diz em qual perfil estamos ("Estamos no perfil: Gestor").
- **Veja também:** passos com outras abas trazem botões como "Métricas" ou "Ranking". Ao clicar, a Eura abre a aba e explica o que ela faz.
- **Dá para recolher:** o botão "Ocultar texto" esconde a explicação e vira "Mostrar texto", no mesmo lugar.
- **Retoma de onde parou:** se você começar a mexer em outra parte do site, o tour pausa e oferece continuar do passo em que estava, ou mostrar a aba ou o perfil em que você está.

## O que é simulado

| Versão original | Esta versão |
|---|---|
| Supabase (PostgreSQL e Auth) | Banco em memória com a mesma API do `supabase-js` (`lib/mock`) |
| Google Gemini | Eura simulada por regras |
| Login com e-mail e senha | Perfis de demonstração com um clique |
| Middleware e layouts de servidor | Proteção de rota por perfil no navegador |

As telas e os serviços são os do projeto original: só o cliente de dados foi trocado. As ações ficam na sua aba, e fechar a aba reinicia a demonstração.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. `npm run build` gera o site estático em `out/`; o workflow `.github/workflows/deploy.yml` o publica no GitHub Pages a cada push na `main`.

## Créditos

Projeto acadêmico desenvolvido para o desafio da Eurofarma na FIAP no evento NEXT 2026. Nome e identidade visual pertencem à Eurofarma e são usados aqui apenas para demonstração.
