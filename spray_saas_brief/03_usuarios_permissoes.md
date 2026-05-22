# 03 — Usuários e Permissões

## Perfis de usuário

### 1. Administrador

Acesso total ao sistema.

Pode:

- Criar, editar e excluir usuários;
- Ver todos os leads;
- Ver todos os clientes;
- Ver todas as visitas;
- Ver financeiro;
- Ver contas a pagar e a receber;
- Ver comissões;
- Gerenciar estoque;
- Gerenciar vendas;
- Alterar permissões;
- Acessar relatórios completos.

### 2. Gestor comercial

Pode:

- Ver leads, clientes, visitas e vendas de todos os vendedores;
- Criar e editar oportunidades;
- Acompanhar funil;
- Aprovar propostas;
- Ver relatórios comerciais;
- Ver comissões previstas, se autorizado.

Não deve necessariamente ver contas a pagar completas, custos internos ou dados sensíveis.

### 3. Vendedor / Parceiro

Usuário externo ou interno que fará prospecção e visitas.

Pode:

- Cadastrar leads;
- Cadastrar clientes, se autorizado;
- Cadastrar visitas;
- Registrar localização da visita;
- Adicionar fotos e observações;
- Criar oportunidades;
- Ver somente seus próprios leads, clientes, visitas e vendas;
- Ver suas próprias comissões;
- Consultar clientes que ele atende.

Não pode:

- Ver leads de outros vendedores, salvo permissão específica;
- Ver financeiro geral;
- Ver contas a pagar;
- Ver estoque completo, salvo disponibilidade simples;
- Alterar comissão;
- Excluir vendas.

### 4. Técnico / Instalador

Pode:

- Ver clientes com instalação agendada;
- Ver dados técnicos da máquina;
- Registrar instalação;
- Registrar fotos;
- Registrar número do kit instalado;
- Abrir suporte técnico;
- Atualizar status técnico do kit.

Não deve acessar:

- Financeiro completo;
- Comissões;
- Dados estratégicos de vendas.

### 5. Financeiro

Pode:

- Ver vendas faturadas;
- Gerenciar contas a receber;
- Gerenciar contas a pagar;
- Registrar pagamentos;
- Baixar parcelas;
- Ver comissões liberadas e pagas;
- Emitir relatórios financeiros.

### 6. Estoque / Operação

Pode:

- Cadastrar itens;
- Registrar entradas e saídas;
- Ver estoque atual;
- Vincular saída de kit a venda/instalação;
- Consultar histórico de movimentações.

---

## Cadastro de parceiro/vendedor

Campos do usuário:

- Nome completo;
- E-mail;
- WhatsApp;
- Tipo de usuário;
- Região de atuação;
- Cidades atendidas;
- Estado;
- Percentual padrão de comissão;
- Status: ativo/inativo;
- Observações;
- Data de criação;
- Último acesso.

---

## Regras de acesso importantes

1. Parceiro só vê o que ele cadastrou ou foi atribuído a ele.
2. Administrador vê tudo.
3. Lead pode ser transferido de um vendedor para outro pelo administrador.
4. Cliente pode ter múltiplos responsáveis, mas deve haver um responsável principal.
5. Comissão deve ser travada após venda fechada, permitindo alteração apenas por administrador.
6. Exclusão física deve ser evitada. Preferir status inativo/cancelado.
7. Todas as ações importantes devem registrar `created_by`, `updated_by` e data/hora.

---

## Segurança recomendada no Supabase

Usar Row Level Security, também chamada RLS.

Regras sugeridas:

- Usuário autenticado só acessa registros da sua organização;
- Vendedor só acessa registros onde `owner_id = auth.uid()` ou onde está listado como responsável;
- Admin acessa todos os registros da organização;
- Financeiro acessa módulos financeiros;
- Técnico acessa módulos técnicos autorizados.

---

## Estrutura multiempresa futura

Mesmo que inicialmente seja apenas Spray Precision, criar estrutura preparada para multiempresa:

- Tabela `organizations`;
- Todo registro importante deve ter `organization_id`;
- Usuário pertence a uma organização;
- Isso permite futuramente criar ambiente separado para revendas, parceiros ou outras empresas do grupo.
