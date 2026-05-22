# Guia do Administrador — Spray Precision Manager 🌱
Este guia descreve como gerenciar o SaaS, criar novas contas de usuário para sua equipe (Vendedores, Técnicos e Financeiro) e operar os módulos administrativos.

---

## 👥 1. Criação e Gestão de Usuários e Perfis

O sistema utiliza o **Supabase Auth** para controle de acesso seguro. A criação de novos usuários é feita diretamente na tela de login/cadastro ou via painel do Supabase.

### Como criar novas contas para a equipe:
1. Abra o aplicativo em seu navegador.
2. Na tela de login, clique no link **"Cadastre-se grátis"** na parte inferior.
3. Preencha os dados do novo usuário:
   - **Nome Completo**
   - **E-mail Corporativo** (ex: `financeiro@sprayprecision.com`)
   - **Senha** (mínimo de 6 caracteres)
   - **WhatsApp** (para integração com links de contato)
4. No campo **"Função / Perfil de Acesso"**, selecione o perfil correto:
   - **Administrador Geral (admin)**: Acesso financeiro completo, fluxo de caixa, liberação de comissões, cadastro de despesas e poder de override de preços mínimos de venda.
   - **Vendedor / Parceiro de Campo (seller)**: Acesso ao CRM (seus próprios leads), visitas, pulverizadores, simulador de vendas e visualização dos seus próprios ganhos.
   - **Técnico / Instalador (technician)**: Focado em visitas de campo, relatórios operacionais e instalação de kits.

> 💡 **Automação de Perfil**: Ao criar o usuário pela interface de cadastro, o banco de dados executa um trigger automático (`sp_on_auth_user_created`) que cria instantaneamente um perfil correspondente na tabela segura `sp_profiles`.

---

## 💰 2. Gestão Financeira e Acesso Administrador

Ao efetuar login com uma conta com perfil de **Administrador Geral (admin)**, a aba **Financeiro** ganha superpoderes com as seguintes abas avançadas:

### 📈 A. Fluxo de Caixa
- Apresenta um sumário dinâmico das finanças corporativas:
  - **Saldo Projetado**: Somatório de tudo o que foi recebido e o que está a receber, descontando despesas pagas e a pagar.
  - **Gráfico de Entradas vs. Saídas**: Acompanhamento visual da saúde líquida da empresa.

### 🛍️ B. Módulo de Vendas
- **Registro de Vendas**: Lançamento de kits comercializados com discriminação técnica (bicos reais na barra, largura de barra, espaçamento e quantidade de módulos isoladores eletrostáticos).
- **Override de Preço Mínimo**: A engenharia estipula um preço mínimo de tabela de **R$ 1.100,00 por módulo**. Vendedores comuns são bloqueados se tentarem fazer uma venda abaixo desse preço. O Administrador possui poder de **override** (forçar o registro) para conceder descontos estratégicos.
- **Edição e Exclusão**: Permite ajustar vendas cadastradas erradas ou excluí-las, desde que **nenhuma parcela ainda tenha sido quitada** (regra de segurança para auditoria).

### 💵 C. Contas a Receber
- Visualização de todas as parcelas devidas por clientes (prazos agrícolas como 30/60/90, entrada + safra, entrada + safra/safrinha, etc.).
- **Baixa de Parcelas**: Ao clicar em **Confirmar Recebimento (Pix/Boleto)**, o sistema registra a entrada do valor e **automaticamente libera a comissão proporcional** daquela parcela para o vendedor correspondente.

### 📉 D. Contas a Pagar (Despesas)
- Lançamento de saídas da empresa (compra de matéria-prima, comissão paga, logística, impostos).
- Ajuda a manter a projeção do fluxo de caixa atualizada em tempo real.

### 🏅 E. Comissões Geral
- Gerencie as comissões de todos os vendedores cadastrados.
- **Fluxo de Comissão**:
  1. `Prevista (Expected)`: A venda foi registrada, mas o cliente ainda não pagou a parcela correspondente.
  2. `Liberada (Released)`: O cliente pagou a parcela. O sistema altera o status automaticamente para liberada (você também pode liberar manualmente).
  3. `Paga (Paid)`: Ao realizar o pagamento da comissão ao vendedor, marque como paga. O sistema **automaticamente cria um lançamento de débito correspondente nas despesas da empresa** no Contas a Pagar, mantendo a contabilidade perfeita.

---

## 🛠️ 3. Dicas de Configuração do Supabase (Avançado)

Se precisar promover ou alterar a função de um usuário já existente manualmente (por exemplo, promover um Vendedor para Administrador), o painel do Supabase pode restringir a edição visual direta ou o comando SQL `UPDATE` direto na tabela `auth.users` devido a políticas de segurança e permissões (`ERROR: 42501: permission denied for table users`).

A forma mais rápida, segura e **100% garantida** de fazer isso é utilizando uma **função auxiliar com privilégios de superusuário (`SECURITY DEFINER`)**.

### Passo a passo para promover/alterar perfil via SQL Editor:

1. Vá no **SQL Editor** do Supabase.
2. Crie a função de segurança executando o script abaixo (você só precisa criar uma vez):

```sql
CREATE OR REPLACE FUNCTION public.sp_promote_user(user_email TEXT, new_role TEXT)
RETURNS VOID SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  -- 1. Atualiza os metadados internos de autenticação do Supabase
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE email = user_email;

  -- 2. Atualiza a tabela sp_profiles do SaaS
  UPDATE public.sp_profiles
  SET role = new_role
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;
```

3. Com a função criada, execute o comando abaixo para promover o usuário desejado (ajuste o e-mail e a role para `'admin'`, `'seller'` ou `'technician'`):

```sql
SELECT public.sp_promote_user('admin@spray.com', 'admin');
```

4. Clique em **Run** no painel do Supabase.

Pronto! As duas tabelas (`auth.users` e `sp_profiles`) serão atualizadas simultaneamente e de forma segura. O usuário terá acesso instantâneo ao novo painel no próximo login ou simplesmente atualizando a página.

