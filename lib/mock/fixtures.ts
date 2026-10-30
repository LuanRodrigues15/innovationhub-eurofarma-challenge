// Gerado a partir de dados de demonstração. Pessoas, ideias e números são fictícios.
// Linhas sem created_at recebem datas escalonadas ao semear o banco (veja lib/mock/db.ts).
import type { Row } from './schema'

export const FIXTURES: Record<string, Row[]> = {
 "sectors": [
  {
   "id": "a0000000-0000-0000-0000-000000000001",
   "name": "TI",
   "slug": "ti"
  },
  {
   "id": "a0000000-0000-0000-0000-000000000002",
   "name": "Operações",
   "slug": "operacoes"
  },
  {
   "id": "a0000000-0000-0000-0000-000000000003",
   "name": "Logística",
   "slug": "logistica"
  },
  {
   "id": "a0000000-0000-0000-0000-000000000004",
   "name": "RH",
   "slug": "rh"
  },
  {
   "id": "a0000000-0000-0000-0000-000000000005",
   "name": "Qualidade",
   "slug": "qualidade"
  }
 ],
 "users": [
  {
   "id": "f1953ee1-cc82-4ead-9cf1-b715b15b295b",
   "name": "Administrador Eurofarma",
   "email": "admin@eurofarma.com",
   "role": "admin",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "points": 0,
   "level": 1,
   "can_visualize_as": true
  },
  {
   "id": "9cd5ffcc-24a1-4ecc-af7d-d7a9599e730e",
   "name": "Marina de Souza",
   "email": "marina.souza@eurofarma.com",
   "role": "gestor",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "points": 0,
   "level": 1
  },
  {
   "id": "81074852-2b28-48c8-b254-cb95929736fe",
   "name": "Carlos Eduardo Ferreira",
   "email": "carlos.ferreira@eurofarma.com",
   "role": "gestor",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "points": 0,
   "level": 1
  },
  {
   "id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "name": "Lucas Gabriel Andrade",
   "email": "lucas.andrade@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "points": 55,
   "level": 1
  },
  {
   "id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "name": "Beatriz Helena Lima",
   "email": "beatriz.lima@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "points": 60,
   "level": 1
  },
  {
   "id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "name": "Rafael da Costa Silva",
   "email": "rafael.silva@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000003",
   "points": 80,
   "level": 1
  },
  {
   "id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "name": "Ana Paula Rocha",
   "email": "ana.rocha@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "points": 680,
   "level": 2
  },
  {
   "id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "name": "Thiago Augusto Mendes",
   "email": "thiago.mendes@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000005",
   "points": 950,
   "level": 2
  },
  {
   "id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "name": "Juliana Cristina Alves",
   "email": "juliana.alves@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "points": 1150,
   "level": 2
  },
  {
   "id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "name": "Fernando Luís Oliveira",
   "email": "fernando.oliveira@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "points": 1420,
   "level": 2
  },
  {
   "id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "name": "Camila Regina Ribeiro",
   "email": "camila.ribeiro@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000003",
   "points": 2100,
   "level": 3,
   "is_mentor": false
  },
  {
   "id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "name": "Diego Alexandre Martins",
   "email": "diego.martins@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000004",
   "points": 2800,
   "level": 3,
   "is_mentor": true
  },
  {
   "id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "name": "Priscila Fernanda Nunes",
   "email": "priscila.nunes@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000005",
   "points": 3500,
   "level": 3,
   "is_mentor": true
  },
  {
   "id": "0584e0c8-8282-4544-974d-893edae96dea",
   "name": "Rodrigo Henrique Farias",
   "email": "rodrigo.farias@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "points": 4500,
   "level": 3,
   "is_mentor": true
  },
  {
   "id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "name": "Vanessa Cristina Castro",
   "email": "vanessa.castro@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "points": 6200,
   "level": 4,
   "is_mentor": true
  },
  {
   "id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "name": "Bruno Roberto Teixeira",
   "email": "bruno.teixeira@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000003",
   "points": 8800,
   "level": 4,
   "is_mentor": false
  },
  {
   "id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "name": "Letícia Maria Gomes",
   "email": "leticia.gomes@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000004",
   "points": 12500,
   "level": 5
  },
  {
   "id": "5067b328-3acb-4184-832f-b992b01f116a",
   "name": "Eduardo José Pinto",
   "email": "eduardo.pinto@eurofarma.com",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000005",
   "points": 15800,
   "level": 5
  },
  {
   "id": "b0000000-0000-0000-0000-000000000019",
   "name": "Totem Operações",
   "matricula": "TOT001",
   "pin": "1234",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "points": 0,
   "level": 1
  },
  {
   "id": "b0000000-0000-0000-0000-000000000020",
   "name": "Totem Logística",
   "matricula": "TOT002",
   "pin": "5678",
   "role": "funcionario",
   "sector_id": "a0000000-0000-0000-0000-000000000003",
   "points": 0,
   "level": 1
  }
 ],
 "ideas": [
  {
   "id": "c0000000-0000-0000-0000-000000000001",
   "title": "Automatização de Relatórios de TI",
   "summary": "Proposta de script automático para geração de relatórios semanais de desempenho de sistemas, eliminando o trabalho manual.",
   "benefits": "Redução de 4 horas semanais por analista. Menos erros. Padronização do formato.",
   "complexity": "Baixa",
   "ai_score": 78.5,
   "social_score": 2,
   "status": "sugestao",
   "author_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "improvement_area": "processo"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000002",
   "title": "Programa de Mentoria Onboarding RH",
   "summary": "Criar um programa estruturado de mentoria para novos colaboradores, com trilha de 90 dias acompanhada por um funcionário sênior.",
   "benefits": "Redução de turnover no primeiro ano. Maior engajamento e produtividade no onboarding.",
   "complexity": "Média",
   "ai_score": 82.3,
   "social_score": 1,
   "status": "sugestao",
   "author_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "sector_id": "a0000000-0000-0000-0000-000000000004",
   "improvement_area": "qualidade"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000003",
   "title": "Controle Digital de EPIs na Logística",
   "summary": "Sistema de QR Code para rastreamento e controle de entrega e devolução de equipamentos de proteção individual nos galpões.",
   "benefits": "Conformidade com NR-6. Redução de 70% em perdas de EPI. Rastreabilidade completa.",
   "complexity": "Média",
   "ai_score": 88.75,
   "social_score": 7,
   "status": "em_analise",
   "author_id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "sector_id": "a0000000-0000-0000-0000-000000000003",
   "improvement_area": "seguranca"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000004",
   "title": "Checklist Digital de Inspeção de Linha de Produção",
   "summary": "Substituição das fichas em papel por um aplicativo mobile para registro de inspeções diárias na linha de produção, com histórico automatizado e alertas de desvio em tempo real.",
   "benefits": "Eliminação de 100% do registro em papel. Histórico consultável instantaneamente. Redução de 80% no tempo de auditoria interna.",
   "complexity": "Baixa",
   "ai_score": 74.2,
   "social_score": 6,
   "status": "em_analise",
   "author_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "improvement_area": "processo"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000010",
   "title": "Banco de Horas Flexível para Operações",
   "summary": "Implementar sistema de banco de horas com compensação flexível para os turnos de produção, reduzindo horas extras obrigatórias.",
   "benefits": "Melhora do clima organizacional. Redução de 30% no custo com horas extras.",
   "complexity": "Alta",
   "ai_score": 71.6,
   "social_score": 5,
   "status": "em_analise",
   "author_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "improvement_area": "processo"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000005",
   "title": "Dashboard de Qualidade em Tempo Real",
   "summary": "Painel web com indicadores de qualidade alimentados automaticamente pelo sistema MES, substituindo planilhas manuais.",
   "benefits": "Decisões mais ágeis. Redução de 50% no tempo de compilação de KPIs.",
   "complexity": "Média",
   "ai_score": 91.4,
   "social_score": 12,
   "status": "em_implantacao",
   "author_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "improvement_area": "qualidade",
   "approved_by": "9cd5ffcc-24a1-4ecc-af7d-d7a9599e730e"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000006",
   "title": "Roteirização Inteligente de Entregas",
   "summary": "Algoritmo de otimização de rotas para a frota de entrega, integrando dados de trânsito em tempo real via API.",
   "benefits": "Redução de 20% no consumo de combustível. Pontualidade de 95%.",
   "complexity": "Alta",
   "ai_score": 87.9,
   "social_score": 9,
   "status": "em_implantacao",
   "author_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "improvement_area": "processo",
   "approved_by": "81074852-2b28-48c8-b254-cb95929736fe"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000007",
   "title": "Plataforma de Knowledge Base Técnico",
   "summary": "Wiki interna para documentação técnica colaborativa, com versionamento e busca inteligente.",
   "benefits": "Onboarding 40% mais rápido. Retenção de conhecimento tácito. Redução de chamados repetitivos.",
   "complexity": "Média",
   "ai_score": 93.1,
   "social_score": 18,
   "status": "conhecimento_org",
   "author_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "improvement_area": "processo",
   "approved_by": "9cd5ffcc-24a1-4ecc-af7d-d7a9599e730e"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000008",
   "title": "Protocolo de Resposta a Incidentes de Segurança",
   "summary": "Criação e publicação do protocolo padronizado de resposta a incidentes operacionais, com playbook digital e treinamentos.",
   "benefits": "Tempo de resposta a incidentes reduzido em 60%. Conformidade com regulatórias.",
   "complexity": "Alta",
   "ai_score": 89.6,
   "social_score": 15,
   "status": "conhecimento_org",
   "author_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "improvement_area": "seguranca",
   "approved_by": "81074852-2b28-48c8-b254-cb95929736fe"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000009",
   "title": "Indicadores de Qualidade por Lote Farmacêutico",
   "summary": "Implantação de painéis de controle por lote produzido, com alertas automáticos para desvios de qualidade acima do limite.",
   "benefits": "Rastreabilidade total por lote. Atendimento a GMP. Redução de retrabalho.",
   "complexity": "Média",
   "ai_score": 85,
   "social_score": 3,
   "status": "sugestao",
   "author_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "sector_id": "a0000000-0000-0000-0000-000000000005",
   "improvement_area": "seguranca"
  },
  {
   "id": "c0000000-0000-0000-0000-000000000011",
   "title": "Manutenção Preditiva via Sensores IoT na Linha de Produção",
   "summary": "Instalação de sensores nas máquinas da linha de fabricação para monitoramento em tempo real de temperatura, vibração e consumo energético, com alertas automáticos antes de falhas críticas.",
   "benefits": "Redução de 40% em paradas não planejadas. Economia estimada de R$ 120.000/ano em manutenção corretiva. Aumento da vida útil dos equipamentos.",
   "complexity": "Alta",
   "ai_score": 83.4,
   "social_score": 1,
   "status": "sugestao",
   "author_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "improvement_area": "processo"
  }
 ],
 "validations": [
  {
   "idea_id": "c0000000-0000-0000-0000-000000000003",
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000003",
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000003",
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000003",
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000003",
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000003",
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000003",
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000004",
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000004",
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000004",
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000004",
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000004",
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000004",
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000010",
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000010",
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000010",
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000010",
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000010",
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000006",
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000006",
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000006",
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000006",
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000006",
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000001",
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000001",
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000002",
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000009",
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000009",
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2"
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000009",
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c"
  }
 ],
 "comments": [
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "9cd5ffcc-24a1-4ecc-af7d-d7a9599e730e",
   "content": "Excelente iniciativa. Já confirmei com a equipe de TI que a integração com o MES é viável. Prazo estimado: 30 dias."
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000005",
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "content": "Podemos usar Power BI Embedded no front-end para os painéis. Já tenho experiência com a ferramenta no setor anterior."
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000006",
   "user_id": "81074852-2b28-48c8-b254-cb95929736fe",
   "content": "Aprovei e já acionei a equipe de TI para avaliar a API do Google Maps como fonte de dados de tráfego."
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000006",
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "content": "Sugiro integrar também com o sistema de agendamento de motoristas para otimização completa do ciclo."
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "content": "Ideia transformadora. Nosso maior problema hoje é a perda de conhecimento quando colaboradores saem. Isso resolve."
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000007",
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "content": "Proponho usar Notion ou Confluence como base. Já mapeei as funcionalidades de busca semântica que precisaríamos."
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "9cd5ffcc-24a1-4ecc-af7d-d7a9599e730e",
   "content": "Fundamental para nossa conformidade com a ANVISA. Vou incluir este protocolo na próxima auditoria interna."
  },
  {
   "idea_id": "c0000000-0000-0000-0000-000000000008",
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "content": "Podemos usar a estrutura do NIST CSF como base para o playbook. Tenho material de referência disponível."
  }
 ],
 "courses": [
  {
   "id": "d0000000-0000-0000-0000-000000000001",
   "title": "Fundamentos de Inovação Corporativa",
   "description": "Introdução aos conceitos de inovação, Design Thinking e metodologias ágeis aplicadas ao ambiente corporativo.",
   "content": "Módulo 1: O que é inovação e por que ela importa. Módulo 2: Design Thinking na prática. Módulo 3: Metodologias ágeis (Scrum, Kanban). Módulo 4: Como propor e prototipar ideias internamente. Módulo 5: Medindo o impacto das inovações.",
   "thumbnail_url": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800",
   "sector_id": null
  },
  {
   "id": "d0000000-0000-0000-0000-000000000002",
   "title": "Gestão de Processos com Lean Manufacturing",
   "description": "Aprenda a identificar e eliminar desperdícios aplicando os princípios Lean na cadeia operacional da Eurofarma.",
   "content": "Módulo 1: Os 7 desperdícios do Lean. Módulo 2: Value Stream Mapping (VSM). Módulo 3: 5S na prática. Módulo 4: Kaizen e melhoria contínua. Módulo 5: Indicadores Lean e OEE.",
   "thumbnail_url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
   "sector_id": "a0000000-0000-0000-0000-000000000002"
  },
  {
   "id": "d0000000-0000-0000-0000-000000000003",
   "title": "Segurança da Informação para Colaboradores",
   "description": "Boas práticas de segurança digital no ambiente de trabalho: proteção de dados, phishing, senhas e LGPD.",
   "content": "Módulo 1: Principais ameaças digitais no ambiente corporativo. Módulo 2: Como identificar phishing e engenharia social. Módulo 3: Política de senhas e autenticação multifator. Módulo 4: LGPD — seus direitos e responsabilidades. Módulo 5: Incidentes de segurança — como agir.",
   "thumbnail_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
   "sector_id": "a0000000-0000-0000-0000-000000000001"
  },
  {
   "id": "d0000000-0000-0000-0000-000000000004",
   "title": "Qualidade Farmacêutica e Boas Práticas (GMP)",
   "description": "Conceitos fundamentais de GMP, controle de qualidade e gestão de não conformidades no setor farmacêutico.",
   "content": "Módulo 1: O que é GMP e por que é regulatório. Módulo 2: Documentação e rastreabilidade. Módulo 3: Controle de qualidade por lote. Módulo 4: Gestão de não conformidades e CAPA. Módulo 5: Auditorias internas e externas.",
   "thumbnail_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800",
   "sector_id": "a0000000-0000-0000-0000-000000000005"
  },
  {
   "id": "d0000000-0000-0000-0000-000000000005",
   "title": "Análise de Dados para Gestão de Pessoas",
   "description": "People Analytics: como usar dados para tomar melhores decisões em recrutamento, engajamento e retenção.",
   "content": "Módulo 1: Introdução ao People Analytics. Módulo 2: Coleta e limpeza de dados de RH. Módulo 3: Indicadores-chave: turnover, absenteísmo, NPS interno. Módulo 4: Ferramentas: Excel avançado e Power BI. Módulo 5: Comunicando resultados para lideranças.",
   "thumbnail_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
   "sector_id": "a0000000-0000-0000-0000-000000000004"
  },
  {
   "id": "d0000000-0000-0000-0000-000000000006",
   "title": "Logística Inteligente e Supply Chain 4.0",
   "description": "Transformação digital na cadeia de suprimentos: IoT, rastreamento em tempo real e otimização de rotas.",
   "content": "Módulo 1: Supply Chain 4.0 — visão geral. Módulo 2: IoT aplicado à logística. Módulo 3: Rastreamento RFID e QR Code. Módulo 4: Otimização de rotas com algoritmos. Módulo 5: KPIs de logística e dashboards operacionais.",
   "thumbnail_url": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800",
   "sector_id": "a0000000-0000-0000-0000-000000000003"
  }
 ],
 "quizzes": [
  {
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "question": "Qual dos itens a seguir NÃO é uma etapa do Design Thinking?",
   "options": [
    "Empatia",
    "Definição",
    "Auditoria Financeira",
    "Prototipação"
   ],
   "correct_answer": 2
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "question": "No contexto de inovação corporativa, o que significa MVP?",
   "options": [
    "Maximum Value Product",
    "Minimum Viable Product",
    "Most Valued Professional",
    "Managed Value Process"
   ],
   "correct_answer": 1
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000002",
   "question": "Qual ferramenta Lean é usada para mapear o fluxo de valor de um processo ponta a ponta?",
   "options": [
    "Kanban",
    "5S",
    "Value Stream Mapping (VSM)",
    "Poka-Yoke"
   ],
   "correct_answer": 2
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000002",
   "question": "Qual dos seguintes NÃO é um dos 7 desperdícios do Lean?",
   "options": [
    "Superprodução",
    "Espera",
    "Treinamento excessivo",
    "Transporte desnecessário"
   ],
   "correct_answer": 2
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000003",
   "question": "O que é phishing?",
   "options": [
    "Um vírus que criptografa arquivos",
    "Uma técnica de enganar usuários para roubar credenciais",
    "Um firewall de rede",
    "Um tipo de backup seguro"
   ],
   "correct_answer": 1
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000003",
   "question": "Qual lei brasileira regulamenta o tratamento de dados pessoais?",
   "options": [
    "Lei Anticorrupção (12.846)",
    "Lei Geral de Proteção de Dados (LGPD)",
    "Marco Civil da Internet",
    "Lei de Crimes Cibernéticos"
   ],
   "correct_answer": 1
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000004",
   "question": "GMP significa Good Manufacturing Practice. Qual órgão brasileiro fiscaliza o cumprimento de GMP na indústria farmacêutica?",
   "options": [
    "INMETRO",
    "ANVISA",
    "CRF",
    "ISO"
   ],
   "correct_answer": 1
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000004",
   "question": "O que é um CAPA no contexto de qualidade farmacêutica?",
   "options": [
    "Certificado de Aprovação de Produto Acabado",
    "Ação Corretiva e Preventiva",
    "Controle Analítico de Produto Ativo",
    "Código de Autorização de Pesquisa Aplicada"
   ],
   "correct_answer": 1
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000005",
   "question": "Qual indicador mede a porcentagem de colaboradores que saem da empresa em um período?",
   "options": [
    "Absenteísmo",
    "NPS interno",
    "Turnover",
    "Headcount"
   ],
   "correct_answer": 2
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000005",
   "question": "People Analytics é o uso de dados para auxiliar decisões em qual área?",
   "options": [
    "Logística",
    "Gestão de Pessoas",
    "Controle de Qualidade",
    "Finanças"
   ],
   "correct_answer": 1
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000006",
   "question": "Qual tecnologia é mais utilizada para rastreamento de ativos em tempo real em armazéns modernos?",
   "options": [
    "Bluetooth 3.0",
    "RFID (Radio Frequency Identification)",
    "NFC apenas",
    "Código de barras unidimensional"
   ],
   "correct_answer": 1
  },
  {
   "course_id": "d0000000-0000-0000-0000-000000000006",
   "question": "O que é o indicador OTD (On-Time Delivery)?",
   "options": [
    "Taxa de produtos devolvidos no prazo",
    "Percentual de entregas realizadas no prazo acordado",
    "Custo médio por entrega",
    "Volume de entregas por dia"
   ],
   "correct_answer": 1
  }
 ],
 "quiz_completions": [
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "course_id": "d0000000-0000-0000-0000-000000000006",
   "passed": true
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "course_id": "d0000000-0000-0000-0000-000000000005",
   "passed": true
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "course_id": "d0000000-0000-0000-0000-000000000004",
   "passed": true
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "course_id": "d0000000-0000-0000-0000-000000000003",
   "passed": true
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "course_id": "d0000000-0000-0000-0000-000000000002",
   "passed": true
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "course_id": "d0000000-0000-0000-0000-000000000005",
   "passed": true
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "course_id": "d0000000-0000-0000-0000-000000000003",
   "passed": true
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "course_id": "d0000000-0000-0000-0000-000000000006",
   "passed": true
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "course_id": "d0000000-0000-0000-0000-000000000004",
   "passed": true
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "course_id": "d0000000-0000-0000-0000-000000000005",
   "passed": true
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "course_id": "d0000000-0000-0000-0000-000000000006",
   "passed": true
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "course_id": "d0000000-0000-0000-0000-000000000001",
   "passed": true
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "course_id": "d0000000-0000-0000-0000-000000000002",
   "passed": true
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "course_id": "d0000000-0000-0000-0000-000000000003",
   "passed": true
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "course_id": "d0000000-0000-0000-0000-000000000004",
   "passed": true
  }
 ],
 "mentor_profiles": [
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "knowledge_area": "Inovação em Gestão de Pessoas e Analytics",
   "sector_id": "a0000000-0000-0000-0000-000000000004",
   "status": "active",
   "validated_by": "9cd5ffcc-24a1-4ecc-af7d-d7a9599e730e"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "knowledge_area": "Excelência Operacional e Qualidade Farmacêutica",
   "sector_id": "a0000000-0000-0000-0000-000000000005",
   "status": "active",
   "validated_by": "81074852-2b28-48c8-b254-cb95929736fe"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "knowledge_area": "Lean Manufacturing e Gestão de Processos",
   "sector_id": "a0000000-0000-0000-0000-000000000002",
   "status": "active",
   "validated_by": "81074852-2b28-48c8-b254-cb95929736fe"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "knowledge_area": "Segurança da Informação e Arquitetura de Sistemas",
   "sector_id": "a0000000-0000-0000-0000-000000000001",
   "status": "pending",
   "validated_by": null
  }
 ],
 "mentorship_requests": [
  {
   "mentee_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "mentor_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "status": "pending",
   "confirmed_by": null
  },
  {
   "mentee_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "mentor_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "status": "active",
   "confirmed_by": "81074852-2b28-48c8-b254-cb95929736fe"
  }
 ],
 "marketplace_items": [
  {
   "id": "f0000000-0000-0000-0000-000000000001",
   "name": "Friday Flex",
   "description": "Trabalhe de onde quiser toda sexta-feira por um mês.",
   "image_url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800",
   "cost_points": 50,
   "is_available": true
  },
  {
   "id": "f0000000-0000-0000-0000-000000000002",
   "name": "Day Off",
   "description": "Um dia de folga extra para usar quando quiser (válido por 6 meses).",
   "image_url": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
   "cost_points": 200,
   "is_available": true
  },
  {
   "id": "f0000000-0000-0000-0000-000000000003",
   "name": "Brinde Exclusivo Eurofarma",
   "description": "Kit exclusivo com produtos Eurofarma: mochila, garrafa e caderno personalizados.",
   "image_url": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800",
   "cost_points": 80,
   "is_available": true
  },
  {
   "id": "f0000000-0000-0000-0000-000000000004",
   "name": "Voucher de Curso Online",
   "description": "Crédito de R$ 200 em plataformas de cursos parceiras (Coursera, Udemy ou Alura).",
   "image_url": "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800",
   "cost_points": 120,
   "is_available": true
  },
  {
   "id": "f0000000-0000-0000-0000-000000000005",
   "name": "Almoço com a Diretoria",
   "description": "Participe de um almoço exclusivo com membros da diretoria executiva da Eurofarma.",
   "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
   "cost_points": 500,
   "is_available": true
  },
  {
   "id": "f0000000-0000-0000-0000-000000000006",
   "name": "Curso Externo Patrocinado",
   "description": "Eurofarma patrocina 100% de um curso presencial ou online de até R$ 800.",
   "image_url": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
   "cost_points": 300,
   "is_available": true
  }
 ],
 "marketplace_transactions": [
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "item_id": "f0000000-0000-0000-0000-000000000001",
   "points_spent": 50
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "item_id": "f0000000-0000-0000-0000-000000000003",
   "points_spent": 80
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "item_id": "f0000000-0000-0000-0000-000000000004",
   "points_spent": 120
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "item_id": "f0000000-0000-0000-0000-000000000002",
   "points_spent": 200
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "item_id": "f0000000-0000-0000-0000-000000000004",
   "points_spent": 120
  }
 ],
 "point_ledger": [
  {
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000010"
  },
  {
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000010"
  },
  {
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "97d7b42a-d592-4bc2-9816-b4abbc6d7d34",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "points": 25,
   "action_type": "idea_to_analysis",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000009"
  },
  {
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "50d09099-4f3e-4a25-95fa-692412f2f19b",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 25,
   "action_type": "idea_to_analysis",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000010"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 25,
   "action_type": "idea_to_analysis",
   "reference_id": "c0000000-0000-0000-0000-000000000010"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 15,
   "action_type": "receive_mentorship",
   "reference_id": null
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000009"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "6b7bf93f-43a0-4719-976d-6ea361f784a3",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "points": 25,
   "action_type": "idea_to_analysis",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "points": 100,
   "action_type": "idea_approved",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "fa0394b9-e7a2-457b-9198-94680d74bda0",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000010"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 25,
   "action_type": "idea_to_analysis",
   "reference_id": "c0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 100,
   "action_type": "idea_approved",
   "reference_id": "c0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "1c37a0d6-58ef-4eb6-b718-c8210302797e",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 25,
   "action_type": "idea_to_analysis",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 100,
   "action_type": "idea_approved",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 250,
   "action_type": "idea_knowledge",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 30,
   "action_type": "give_mentorship",
   "reference_id": null
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "47fc2915-abb5-444f-b88a-4ea694acbbd4",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 25,
   "action_type": "idea_to_analysis",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 100,
   "action_type": "idea_approved",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 250,
   "action_type": "idea_knowledge",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 30,
   "action_type": "give_mentorship",
   "reference_id": null
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "14436180-f2dc-4200-b222-354af79bbdb8",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 10,
   "action_type": "publish_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000009"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "0584e0c8-8282-4544-974d-893edae96dea",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 30,
   "action_type": "give_mentorship",
   "reference_id": null
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "88688191-e754-40a0-bbfd-c7b7308fafb5",
   "points": -120,
   "action_type": "redeem_item",
   "reference_id": "f0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000009"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "f7186880-9511-423b-885f-6f0d35734c3c",
   "points": -200,
   "action_type": "redeem_item",
   "reference_id": "f0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": -50,
   "action_type": "redeem_item",
   "reference_id": "f0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "aa4471a7-c190-422d-848e-bc36c47dfb3c",
   "points": -120,
   "action_type": "redeem_item",
   "reference_id": "f0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000005"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000006"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000007"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 5,
   "action_type": "validate_idea",
   "reference_id": "c0000000-0000-0000-0000-000000000008"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000001"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000002"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000003"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 15,
   "action_type": "complete_course",
   "reference_id": "d0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": 20,
   "action_type": "complete_quiz",
   "reference_id": "d0000000-0000-0000-0000-000000000004"
  },
  {
   "user_id": "5067b328-3acb-4184-832f-b992b01f116a",
   "points": -80,
   "action_type": "redeem_item",
   "reference_id": "f0000000-0000-0000-0000-000000000003"
  }
 ],
 "moderation_alerts": [
  {
   "user_id": "9184e8f6-79c2-4d16-a162-b13f8a9b019b",
   "content": "Ideia submetida com linguagem potencialmente ofensiva: \"esse processo é uma bagunça completa feita por incompetentes\".",
   "occurrence_count": 1,
   "status": "pending"
  },
  {
   "user_id": "c1b5a1fd-a4c4-4f4c-a98d-e58ae67b2f71",
   "content": "Segunda ocorrência de conteúdo fora da política: comentário depreciativo sobre decisões de gestão.",
   "occurrence_count": 2,
   "status": "warned"
  },
  {
   "user_id": "5fef169c-3a62-4b9e-b99d-c10ff26d0ea2",
   "content": "Terceira ocorrência: tentativa de submeter ideia com dados de concorrente não autorizado. Usuário bloqueado preventivamente.",
   "occurrence_count": 3,
   "status": "blocked"
  }
 ],
 "platform_settings": [
  {
   "key": "hybrid_weight_ai",
   "value": "0.7"
  },
  {
   "key": "hybrid_weight_social",
   "value": "0.3"
  },
  {
   "key": "min_validations_for_analysis",
   "value": "5"
  },
  {
   "key": "points_publish_idea",
   "value": "10"
  },
  {
   "key": "points_idea_to_analysis",
   "value": "25"
  },
  {
   "key": "points_idea_approved",
   "value": "100"
  },
  {
   "key": "points_idea_knowledge",
   "value": "250"
  },
  {
   "key": "points_complete_course",
   "value": "15"
  },
  {
   "key": "points_complete_quiz",
   "value": "20"
  },
  {
   "key": "points_give_mentorship",
   "value": "30"
  },
  {
   "key": "points_receive_mentorship",
   "value": "15"
  },
  {
   "key": "points_validate_idea",
   "value": "5"
  },
  {
   "key": "show_points_table_marketplace",
   "value": "true"
  }
 ]
}
