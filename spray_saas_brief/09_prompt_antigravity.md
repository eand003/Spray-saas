# 09 — Prompt Pronto para Antigravity

Copie e cole este prompt no Antigravity para iniciar o projeto.

---

Quero criar uma aplicação SaaS web/mobile-first chamada inicialmente **Spray Precision Manager**.

A aplicação será usada pela empresa Spray Precision para gerenciar leads, clientes, visitas comerciais/técnicas, vendedores/parceiros, pulverizadores, kits instalados, vendas, faturamento, contas a receber, contas a pagar, comissões e estoque.

Use como base todos os arquivos `.md` deste pacote de briefing.

## Stack desejada

- Frontend moderno e responsivo;
- Mobile-first;
- Supabase para autenticação, banco PostgreSQL e storage;
- Row Level Security para permissões;
- Deploy em Vercel;
- Código limpo e organizado;
- Componentização clara;
- Interface simples, profissional e rápida.

## Prioridade inicial

Comece pela Fase 1 do MVP:

1. Login com Supabase Auth;
2. Perfis de usuário: admin e vendedor/parceiro;
3. Cadastro/listagem/edição de leads;
4. Cadastro/listagem/edição de clientes;
5. Cadastro/listagem de visitas;
6. Captura de localização da visita usando geolocation do navegador;
7. Upload de fotos da visita no Supabase Storage;
8. Dashboard simples;
9. Regra: vendedor só vê seus próprios registros; admin vê todos.

## Requisitos de UX

- Deve funcionar muito bem no celular;
- Usar cards no mobile;
- Botões grandes;
- Formulários simples;
- Poucos campos obrigatórios;
- Tela de nova visita muito rápida;
- Botão “Capturar localização atual”;
- Botão “Abrir rota no Google Maps” quando houver coordenadas;
- Visual limpo, claro e profissional.

## Entidades iniciais obrigatórias

- organizations;
- profiles;
- leads;
- customers;
- farms;
- visits;
- visit_attachments;
- sprayers;
- kits.

As entidades de vendas, financeiro, comissões e estoque podem ser preparadas no banco, mas a interface pode entrar nas fases seguintes.

## Importante sobre o negócio

A Spray Precision vende tecnologia de pulverização eletrostática por indução localizada, aplicada na ponta do bico, com anel indutor em inox e isolador. O sistema aumenta a eficiência da pulverização, melhorando deposição no alvo e reduzindo perdas invisíveis. Clientes podem ter mais de uma fazenda, mais de um pulverizador e mais de um kit instalado.

## Entrega esperada

1. Criar estrutura inicial do projeto;
2. Criar schema SQL do Supabase;
3. Criar autenticação;
4. Criar layout responsivo;
5. Criar telas do MVP;
6. Criar políticas RLS básicas;
7. Criar instruções de setup em README;
8. Garantir que o projeto rode localmente e possa ser publicado na Vercel.

Antes de codar, leia os arquivos de briefing e proponha uma arquitetura inicial objetiva. Depois implemente a Fase 1.
