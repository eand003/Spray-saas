# 07 — Regras de Negócio

## Regra 1 — Cliente pode ter múltiplas fazendas

Um mesmo cliente/grupo pode possuir várias fazendas. Por isso, a localização não deve ficar somente no cadastro do cliente. Deve existir entidade própria para fazenda/unidade.

## Regra 2 — Cliente pode ter múltiplos pulverizadores

Um cliente pode ter mais de um pulverizador. Cada máquina deve ser cadastrada individualmente.

## Regra 3 — Cliente pode ter múltiplos kits

Cada kit Spray Precision deve ter número próprio e estar vinculado preferencialmente a um pulverizador específico.

Exemplo:

- Cliente X;
- Fazenda Y;
- Pulverizador Jacto 3030;
- Kit SP-001 instalado;
- Pulverizador John Deere;
- Kit SP-002 instalado.

## Regra 4 — Visita deve poder existir para lead ou cliente

Nem toda visita será feita em cliente já cadastrado. O vendedor pode visitar um prospect.

Por isso, visita pode estar vinculada a:

- Lead;
- Cliente;
- Fazenda;
- Ou combinação desses dados.

## Regra 5 — Localização da visita é estratégica

A localização deve ser armazenada com latitude e longitude.

Objetivos:

- Voltar na fazenda facilmente;
- Comprovar visita;
- Criar mapa de atuação;
- Planejar rotas;
- Analisar concentração de clientes.

## Regra 6 — O vendedor/parceiro deve enxergar somente seus dados

Por padrão, vendedor externo/parceiro não deve acessar a carteira de outro vendedor.

Exceção somente se admin liberar.

## Regra 7 — Venda deve gerar financeiro

Ao fechar uma venda, o sistema deve permitir gerar parcelas de contas a receber.

Exemplo:

- Venda de R$ 120.000;
- Entrada de R$ 40.000;
- 4 parcelas de R$ 20.000;
- Cada parcela entra no contas a receber.

## Regra 8 — Venda deve gerar comissão prevista

Toda venda com vendedor/parceiro deve gerar comissão prevista automaticamente, conforme percentual configurado.

## Regra 9 — Comissão só deve ser paga após critério financeiro

Sugestão inicial:

- Venda fechada: comissão prevista;
- Recebimento do cliente: comissão liberada proporcional ou total;
- Pagamento ao vendedor: comissão paga.

## Regra 10 — Estoque deve ser afetado por venda, instalação ou manutenção

Saídas devem ser rastreadas.

Uma peça ou kit pode sair por:

- Venda;
- Instalação;
- Manutenção;
- Troca em garantia;
- Ajuste.

## Regra 11 — Evitar exclusão definitiva

Dados comerciais e financeiros não devem ser apagados definitivamente pelo usuário comum.

Usar status:

- Cancelado;
- Inativo;
- Perdido;
- Excluído lógico.

## Regra 12 — Histórico é ativo estratégico

Tudo que acontece com o cliente deve ficar no histórico:

- Ligações importantes;
- WhatsApp relevantes;
- Visitas;
- Propostas;
- Vendas;
- Instalações;
- Suporte;
- Cobranças.

## Regra 13 — Comunicação comercial da Spray Precision

Em campos públicos, relatórios comerciais e textos para cliente, evitar citar valores numéricos de tensão elétrica. Usar apenas:

- Alta tensão aplicada na ponta do eletrodo;
- Indução localizada na ponta do bico;
- Carga gota a gota no momento da pulverização.

## Regra 14 — Proposta técnica da empresa

O sistema deve respeitar o posicionamento:

- A Spray Precision não promete milagre;
- A empresa vende eficiência de aplicação;
- A comparação ideal é sistema ligado versus desligado mantendo padrão operacional da fazenda;
- O foco é reduzir perdas invisíveis e aumentar deposição no alvo.

## Regra 15 — Dados mínimos para operação em campo

Para não travar o vendedor, o sistema deve permitir cadastro mínimo rápido.

Lead mínimo:

- Nome;
- Telefone;
- Cidade;
- Estado.

Visita mínima:

- Lead ou cliente;
- Tipo;
- Data;
- Observação.

Cliente mínimo:

- Nome;
- Telefone;
- Cidade;
- Estado.
