# 02 — Módulos Funcionais

## 1. Dashboard geral

Tela inicial para administrador visualizar:

- Leads novos;
- Leads em negociação;
- Visitas realizadas no período;
- Vendas fechadas;
- Faturamento previsto;
- Contas a receber;
- Contas a pagar;
- Comissões pendentes;
- Kits em estoque;
- Kits vendidos/instalados;
- Clientes ativos;
- Mapa resumido de clientes/visitas.

Para vendedor/parceiro, o dashboard deve mostrar apenas seus próprios dados:

- Meus leads;
- Minhas visitas;
- Minhas oportunidades;
- Minhas vendas;
- Minhas comissões;
- Próximos retornos.

---

## 2. Leads

Cadastro de possíveis clientes antes de virarem clientes formais.

Campos sugeridos:

- Nome do lead/produtor/fazenda;
- Nome da empresa/grupo agrícola;
- Pessoa de contato;
- Telefone/WhatsApp;
- E-mail;
- Cidade;
- Estado;
- Origem do lead;
- Vendedor/parceiro responsável;
- Status do lead;
- Cultura principal: soja, milho, algodão, trigo, outras;
- Quantidade estimada de pulverizadores;
- Observações;
- Próxima ação;
- Data prevista de retorno.

Status sugeridos:

- Novo;
- Contato feito;
- Visita agendada;
- Visitado;
- Em negociação;
- Proposta enviada;
- Fechado;
- Perdido;
- Sem fit.

---

## 3. Clientes

Clientes são leads convertidos ou clientes já existentes.

Campos sugeridos:

- Nome do cliente;
- Nome da fazenda;
- Grupo/empresa;
- CPF/CNPJ;
- Inscrição estadual, se necessário;
- Responsável principal;
- Telefone/WhatsApp;
- E-mail;
- Cidade;
- Estado;
- Endereço administrativo;
- Localização da sede/fazenda;
- Coordenadas latitude/longitude;
- Link do Google Maps/Waze;
- Vendedor responsável;
- Status do cliente: ativo, inativo, prospect, pós-venda, inadimplente;
- Observações gerais.

O cliente poderá ter:

- Uma ou mais fazendas;
- Um ou mais pulverizadores;
- Um ou mais kits Spray Precision;
- Histórico de visitas;
- Histórico de vendas;
- Histórico financeiro;
- Histórico técnico.

---

## 4. Fazendas / Unidades do cliente

Um cliente pode ter várias fazendas ou unidades.

Campos:

- Nome da fazenda;
- Cliente vinculado;
- Cidade;
- Estado;
- Localização GPS;
- Link para rota;
- Área aproximada em hectares;
- Culturas principais;
- Observações de acesso;
- Contatos locais.

---

## 5. Visitas

Módulo central para vendedores/parceiros.

Objetivo: permitir cadastro rápido pelo celular durante ou logo após a visita.

Campos:

- Cliente ou lead vinculado;
- Fazenda/unidade visitada;
- Data e hora da visita;
- Vendedor/parceiro responsável;
- Tipo de visita: prospecção, demonstração, instalação, pós-venda, manutenção, cobrança, relacionamento;
- Localização capturada pelo celular;
- Link de rota;
- Pessoas presentes;
- Assuntos tratados;
- Dores identificadas;
- Máquinas avaliadas;
- Potencial de compra;
- Próximo passo;
- Data de retorno;
- Fotos da visita;
- Áudios/anexos, se possível futuramente;
- Resultado da visita.

Resultado da visita:

- Sem interesse;
- Interesse inicial;
- Quer proposta;
- Demonstração agendada;
- Venda provável;
- Venda fechada;
- Pós-venda realizado;
- Problema técnico identificado;
- Precisa retorno.

Recurso importante:

- Botão: **Usar minha localização atual**;
- Botão: **Abrir rota no Google Maps**;
- Botão: **Agendar retorno**.

---

## 6. Pulverizadores / Máquinas

Cadastro das máquinas dos clientes.

Campos:

- Cliente;
- Fazenda;
- Marca;
- Modelo;
- Ano;
- Número de série, se disponível;
- Tamanho da barra;
- Número aproximado de bicos/nozzles;
- Espaçamento entre bicos;
- Monitor/controlador;
- Tipo de aplicação comum;
- Observações técnicas;
- Status: sem kit, kit instalado, em manutenção, desativado.

Exemplos de marcas/modelos:

- Jacto Uniport;
- John Deere;
- Case Patriot;
- Stara Imperador;
- Kuhn;
- Montana;
- Outros.

---

## 7. Kits Spray Precision instalados

Um cliente pode ter mais de um kit, pois pode ter mais de um pulverizador.

Campos:

- Número do kit;
- Cliente;
- Fazenda;
- Pulverizador vinculado;
- Data da venda;
- Data da instalação;
- Quantidade de bicos/pontos instalados;
- Modelo/versão do kit;
- Número de série do painel, se houver;
- Número de série de módulos/componentes, se houver;
- Status: vendido, instalado, em instalação, em manutenção, substituído, cancelado;
- Garantia até;
- Observações técnicas;
- Fotos da instalação;
- Responsável pela instalação;
- Vendedor responsável.

---

## 8. Oportunidades / Negociações

Representa uma venda em andamento.

Campos:

- Lead ou cliente;
- Vendedor/parceiro;
- Valor estimado;
- Quantidade de kits;
- Quantidade de máquinas;
- Etapa do funil;
- Probabilidade;
- Data prevista de fechamento;
- Última interação;
- Próxima ação;
- Observações.

Etapas sugeridas:

- Diagnóstico;
- Demonstração;
- Proposta;
- Negociação;
- Fechado ganho;
- Fechado perdido.

---

## 9. Vendas

Quando uma oportunidade é fechada, vira venda.

Campos:

- Cliente;
- Oportunidade vinculada;
- Vendedor/parceiro;
- Data da venda;
- Valor total;
- Forma de pagamento;
- Condições comerciais;
- Quantidade de kits;
- Itens vendidos;
- Desconto;
- Comissão calculada;
- Status: aguardando faturamento, faturado, recebido parcial, recebido total, cancelado.

---

## 10. Financeiro — Contas a receber

Campos:

- Venda vinculada;
- Cliente;
- Parcela;
- Valor;
- Vencimento;
- Data de recebimento;
- Status: aberto, vencido, recebido parcial, recebido, cancelado;
- Forma de recebimento;
- Observações.

---

## 11. Financeiro — Contas a pagar

Campos:

- Fornecedor;
- Descrição;
- Categoria;
- Valor;
- Vencimento;
- Data de pagamento;
- Status;
- Anexo de nota/boleto;
- Observações.

Categorias sugeridas:

- Compra de peças;
- Frete;
- Instalação;
- Deslocamento;
- Marketing;
- Impostos;
- Administrativo;
- Ferramentas;
- Outros.

---

## 12. Comissões

Calcular e acompanhar comissões de vendedores/parceiros.

Campos:

- Venda vinculada;
- Vendedor/parceiro;
- Percentual ou valor fixo;
- Base de cálculo;
- Valor da comissão;
- Status: prevista, liberada, paga, cancelada;
- Data de liberação;
- Data de pagamento;
- Observações.

Regra inicial sugerida:

- Comissão nasce como **prevista** ao fechar a venda;
- Só vira **liberada** após recebimento parcial ou total, conforme regra definida pela empresa;
- Só vira **paga** após lançamento no financeiro.

---

## 13. Estoque

Controle de kits, componentes e peças.

Itens possíveis:

- Kit completo;
- Painel;
- Módulo;
- Anel indutor;
- Isolador;
- Cabos;
- Chicotes;
- Fontes/conversores;
- Suportes;
- Peças de reposição.

Campos:

- Código do item;
- Nome;
- Categoria;
- Quantidade atual;
- Quantidade mínima;
- Custo unitário;
- Fornecedor;
- Local de estoque;
- Observações.

Movimentações:

- Entrada;
- Saída para venda;
- Saída para instalação;
- Saída para manutenção;
- Devolução;
- Ajuste manual.

---

## 14. Pós-venda / Suporte técnico

Campos:

- Cliente;
- Kit;
- Pulverizador;
- Tipo de chamado;
- Descrição;
- Fotos/anexos;
- Responsável;
- Status;
- Prioridade;
- Data de abertura;
- Data de conclusão;
- Solução aplicada.

Tipos:

- Dúvida operacional;
- Manutenção;
- Falha elétrica;
- Revisão de instalação;
- Treinamento;
- Atualização de painel;
- Acompanhamento de resultado.

---

## 15. Relatórios

Relatórios futuros:

- Leads por origem;
- Visitas por vendedor;
- Conversão por vendedor;
- Vendas por período;
- Faturamento por período;
- Comissões a pagar;
- Clientes com kits instalados;
- Clientes sem visita nos últimos X dias;
- Estoque crítico;
- Mapa de clientes e visitas;
- Pipeline comercial.
