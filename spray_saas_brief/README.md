# Spray Precision SaaS — Briefing Técnico para Desenvolvimento

Este pacote contém a visão inicial para criação de um SaaS interno/unificado da **Spray Precision**, pensado para gestão comercial, visitas, leads, clientes, kits instalados, estoque, financeiro, comissões e operação.

O objetivo é servir como briefing para iniciar o desenvolvimento no Antigravity, Lovable, Cursor, Bolt, Replit ou qualquer ferramenta de desenvolvimento assistida por IA.

## Estrutura dos arquivos

1. `01_visao_geral.md` — visão estratégica, problema, público interno e objetivo do sistema.
2. `02_modulos_funcionais.md` — descrição dos módulos do SaaS.
3. `03_usuarios_permissoes.md` — perfis de usuário, parceiros/vendedores e regras de acesso.
4. `04_fluxos_operacionais.md` — fluxos de uso: lead, visita, venda, instalação, financeiro e comissão.
5. `05_modelagem_banco_supabase.md` — sugestão inicial de tabelas para Supabase/PostgreSQL.
6. `06_telas_e_ux.md` — telas principais e experiência mobile-first.
7. `07_regras_de_negocio.md` — regras importantes da Spray Precision.
8. `08_mvp_roadmap.md` — plano de desenvolvimento em fases.
9. `09_prompt_antigravity.md` — prompt pronto para colar no Antigravity.
10. `10_backlog_tecnico.md` — lista de tarefas técnicas para o dev/IA.

## Premissas importantes

- Sistema deve ser **mobile-first**, pois vendedores e parceiros usarão em campo.
- Deve funcionar muito bem para cadastro rápido de visita, lead e cliente pelo celular.
- Deve usar **Supabase** como banco, autenticação e storage.
- Deve permitir expansão futura para CRM, ERP leve, dashboards e automações.
- Deve registrar localização da visita para facilitar retorno ao cliente e análise geográfica.
- Deve controlar clientes com um ou mais pulverizadores e um ou mais kits Spray Precision.

