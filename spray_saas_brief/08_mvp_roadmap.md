# 08 — MVP e Roadmap

## Estratégia geral

Desenvolver por fases para evitar criar um sistema grande demais antes de validar a operação.

Prioridade absoluta:

1. Leads;
2. Clientes;
3. Visitas com localização;
4. Vendedores/parceiros;
5. Pulverizadores;
6. Kits instalados.

Financeiro, comissões e estoque entram depois, quando o CRM estiver sólido.

---

## Fase 1 — MVP Comercial de Campo

Objetivo: vendedores/parceiros conseguirem cadastrar leads, clientes e visitas pelo celular.

Entregas:

- Login com Supabase Auth;
- Perfis: admin e vendedor/parceiro;
- Cadastro de leads;
- Cadastro de clientes;
- Cadastro de visitas;
- Captura de localização;
- Upload de fotos da visita;
- Listagem dos meus leads;
- Listagem dos meus clientes;
- Histórico de visitas por cliente;
- Dashboard simples;
- Regras básicas de permissão.

Critério de sucesso:

- Um vendedor consegue visitar uma fazenda, cadastrar o lead/cliente, salvar localização, registrar observações e agendar retorno em menos de 3 minutos.

---

## Fase 2 — Máquinas, Kits e Funil

Objetivo: controlar potencial técnico/comercial e instalações.

Entregas:

- Cadastro de fazendas;
- Cadastro de pulverizadores;
- Cadastro de kits;
- Vincular kit a pulverizador;
- Funil de oportunidades em kanban;
- Conversão de lead em cliente;
- Próximas ações;
- Filtros por vendedor, cidade, status;
- Mapa básico de clientes/visitas.

Critério de sucesso:

- A Spray consegue saber quais clientes têm kit, em qual pulverizador, instalado quando e por quem.

---

## Fase 3 — Vendas e Comissões

Objetivo: transformar oportunidade em venda e comissão.

Entregas:

- Cadastro de venda;
- Itens da venda;
- Condições de pagamento;
- Comissão automática prevista;
- Painel de comissões por vendedor;
- Status de venda;
- Relatórios comerciais básicos.

Critério de sucesso:

- Ao fechar uma venda, o sistema gera valor vendido, vendedor responsável e comissão prevista.

---

## Fase 4 — Financeiro

Objetivo: controlar contas a receber e a pagar.

Entregas:

- Contas a receber geradas pela venda;
- Baixa de recebimentos;
- Contas a pagar;
- Status de vencidos;
- Fluxo resumido;
- Liberação de comissão após recebimento;
- Exportação CSV/Excel.

Critério de sucesso:

- A empresa sabe quanto tem a receber, o que está vencido e quais comissões podem ser pagas.

---

## Fase 5 — Estoque e Operação

Objetivo: controlar kits, componentes e peças.

Entregas:

- Cadastro de itens;
- Entrada e saída;
- Estoque mínimo;
- Vincular saída a venda/instalação;
- Histórico de movimentação;
- Alertas de estoque crítico.

Critério de sucesso:

- A empresa sabe quantos kits/componentes possui e para onde cada item saiu.

---

## Fase 6 — Pós-venda e Suporte

Objetivo: acompanhar clientes instalados e chamados técnicos.

Entregas:

- Abertura de chamados;
- Vincular chamado a kit/pulverizador;
- Fotos/anexos;
- Status e prioridade;
- Histórico de solução;
- Indicador de clientes sem acompanhamento.

---

## Fase 7 — Inteligência e Automação

Objetivo: gestão avançada.

Entregas futuras:

- Mapa de calor de clientes;
- Ranking de vendedores;
- Conversão por região;
- Lembretes automáticos por WhatsApp/e-mail;
- Integração com Google Calendar;
- Geração de proposta comercial em PDF;
- Geração de relatório de visita em PDF;
- Importação/exportação de dados;
- API para integração futura com site/landing pages.
