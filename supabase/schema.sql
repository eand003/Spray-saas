-- Schema inicial conceitual para Supabase/PostgreSQL
-- Contém a modelagem da Spray Precision, políticas de RLS e triggers úteis de sincronização

create extension if not exists "pgcrypto";

-- =========================================================================
-- 1. TABELAS DE CONFIGURAÇÃO E PERFIL
-- =========================================================================

-- Tabela: organizations (Multi-empresa)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  status text default 'active',
  created_at timestamptz default now()
);

-- Tabela: profiles (Perfis de usuário estendidos da tabela auth.users)
create table if not exists public.profiles (
  id uuid primary key, -- Referência direta a auth.users.id
  organization_id uuid references public.organizations(id),
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'seller',
  region text,
  state text,
  default_commission_rate numeric(10,4) default 0,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- =========================================================================
-- 2. TABELAS COMERCIAIS E CRM (Fase 1 e 2)
-- =========================================================================

-- Tabela: leads (Cadastro rápido de potenciais clientes)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  owner_id uuid references public.profiles(id),
  name text not null,
  company_name text,
  contact_name text,
  phone text,
  email text,
  city text,
  state text,
  source text,
  status text default 'new',
  main_crop text,
  estimated_sprayers_count integer,
  notes text,
  next_action text,
  next_action_date date,
  converted_customer_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: customers (Clientes convertidos)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  owner_id uuid references public.profiles(id),
  name text not null,
  company_name text,
  document text,
  state_registration text,
  main_contact_name text,
  phone text,
  email text,
  city text,
  state text,
  address text,
  latitude numeric(12,8),
  longitude numeric(12,8),
  maps_url text,
  status text default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: farms (Propriedades rurais vinculadas ao cliente)
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  city text,
  state text,
  address_notes text,
  latitude numeric(12,8),
  longitude numeric(12,8),
  maps_url text,
  area_hectares numeric(12,2),
  main_crops text[],
  local_contacts jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: visits (Log de visitas comerciais e técnicas)
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  lead_id uuid references public.leads(id),
  customer_id uuid references public.customers(id),
  farm_id uuid references public.farms(id),
  owner_id uuid references public.profiles(id),
  visit_type text not null, -- prospeccao, demonstracao, instalacao, pos-venda, manutencao, relacionamento
  visit_datetime timestamptz default now(),
  latitude numeric(12,8),
  longitude numeric(12,8),
  maps_url text,
  people_present text,
  topics_discussed text,
  pains_identified text,
  machines_evaluated text,
  commercial_potential text,
  result text,
  next_step text,
  next_visit_date date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: visit_attachments (Imagens e mídias das visitas)
create table if not exists public.visit_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  visit_id uuid references public.visits(id) on delete cascade,
  file_url text not null,
  file_type text,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- =========================================================================
-- 3. MÁQUINAS E TECNOLOGIA (Fase 2)
-- =========================================================================

-- Tabela: sprayers (Pulverizadores dos clientes)
create table if not exists public.sprayers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  customer_id uuid references public.customers(id),
  farm_id uuid references public.farms(id),
  brand text,
  model text,
  year integer,
  serial_number text,
  boom_width_m numeric(10,2),
  nozzle_count integer,
  nozzle_spacing_cm numeric(10,2),
  controller_monitor text,
  current_nozzle_model text,
  application_notes text,
  kit_status text default 'no_kit', -- no_kit, installed, maintenance, retired
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: kits (Kits Spray Precision instalados nas máquinas)
create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  kit_number text not null,
  customer_id uuid references public.customers(id),
  farm_id uuid references public.farms(id),
  sprayer_id uuid references public.sprayers(id),
  sale_id uuid, -- Preenchido na Fase 3
  version text,
  panel_serial_number text,
  installed_points_count integer,
  sale_date date,
  installation_date date,
  warranty_until date,
  status text default 'sold', -- sold, installed, in_installation, maintenance, cancelled
  installed_by uuid references public.profiles(id),
  seller_id uuid references public.profiles(id),
  technical_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- =========================================================================
-- 4. TABELAS DE FASES FUTURAS (Estrutura Preparada)
-- =========================================================================

-- Tabela: opportunities
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  lead_id uuid references public.leads(id),
  customer_id uuid references public.customers(id),
  owner_id uuid references public.profiles(id),
  title text not null,
  stage text default 'diagnosis', -- diagnosis, demonstration, proposal, negotiation, closed_won, closed_lost
  estimated_value numeric(14,2),
  estimated_kits_count integer,
  estimated_sprayers_count integer,
  probability numeric(5,2),
  expected_close_date date,
  last_interaction_at timestamptz,
  next_action text,
  next_action_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  opportunity_id uuid references public.opportunities(id),
  customer_id uuid references public.customers(id),
  seller_id uuid references public.profiles(id),
  sale_date date default current_date,
  total_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) default 0,
  payment_terms text,
  payment_method text,
  status text default 'pending_billing', -- pending_billing, billed, received_partial, received_total, cancelled
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: sale_items
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  sale_id uuid references public.sales(id) on delete cascade,
  item_type text,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total_price numeric(14,2) not null default 0,
  stock_item_id uuid,
  created_at timestamptz default now()
);

-- Tabela: accounts_receivable
create table if not exists public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  sale_id uuid references public.sales(id),
  customer_id uuid references public.customers(id),
  installment_number integer,
  amount numeric(14,2) not null,
  due_date date not null,
  received_amount numeric(14,2) default 0,
  received_at date,
  status text default 'open', -- open, overdue, partial, received, cancelled
  payment_method text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Tabela: accounts_payable
create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  supplier_name text,
  description text not null,
  category text,
  amount numeric(14,2) not null,
  due_date date not null,
  paid_at date,
  status text default 'open',
  attachment_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Tabela: commissions
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  sale_id uuid references public.sales(id),
  seller_id uuid references public.profiles(id),
  commission_type text default 'percentage',
  commission_rate numeric(10,4),
  base_amount numeric(14,2),
  commission_amount numeric(14,2),
  status text default 'expected', -- expected, released, paid, cancelled
  released_at date,
  paid_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Tabela: stock_items
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  sku text,
  name text not null,
  category text,
  current_quantity numeric(12,2) default 0,
  minimum_quantity numeric(12,2) default 0,
  unit_cost numeric(14,2),
  supplier_name text,
  storage_location text,
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabela: stock_movements
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  stock_item_id uuid references public.stock_items(id),
  movement_type text not null, -- in, out_sale, out_installation, out_support, return, adjustment
  quantity numeric(12,2) not null,
  unit_cost numeric(14,2),
  related_sale_id uuid references public.sales(id),
  related_kit_id uuid references public.kits(id),
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Tabela: support_tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  customer_id uuid references public.customers(id),
  farm_id uuid references public.farms(id),
  sprayer_id uuid references public.sprayers(id),
  kit_id uuid references public.kits(id),
  opened_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  type text,
  priority text default 'medium', -- low, medium, high, critical
  status text default 'open', -- open, in_progress, pending, closed
  description text not null,
  solution text,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Tabela: audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  user_id uuid references public.profiles(id),
  entity_type text,
  entity_id uuid,
  action text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- =========================================================================
-- 5. ÍNDICES DE PERFORMANCE E CONSULTAS
-- =========================================================================
create index if not exists idx_leads_owner on public.leads(owner_id);
create index if not exists idx_leads_organization on public.leads(organization_id);
create index if not exists idx_customers_owner on public.customers(owner_id);
create index if not exists idx_customers_organization on public.customers(organization_id);
create index if not exists idx_visits_owner on public.visits(owner_id);
create index if not exists idx_visits_customer on public.visits(customer_id);
create index if not exists idx_farms_customer on public.farms(customer_id);
create index if not exists idx_kits_customer on public.kits(customer_id);
create index if not exists idx_sprayers_customer on public.sprayers(customer_id);
create index if not exists idx_sales_customer on public.sales(customer_id);
create index if not exists idx_sales_seller on public.sales(seller_id);

-- =========================================================================
-- 6. TRIGGERS AUTOMÁTICOS
-- =========================================================================

-- Reusable update trigger function to keep updated_at clean
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to relevant tables
create or replace trigger update_profiles_updated_at before update on public.profiles for each row execute procedure public.update_updated_at_column();
create or replace trigger update_leads_updated_at before update on public.leads for each row execute procedure public.update_updated_at_column();
create or replace trigger update_customers_updated_at before update on public.customers for each row execute procedure public.update_updated_at_column();
create or replace trigger update_farms_updated_at before update on public.farms for each row execute procedure public.update_updated_at_column();
create or replace trigger update_visits_updated_at before update on public.visits for each row execute procedure public.update_updated_at_column();
create or replace trigger update_sprayers_updated_at before update on public.sprayers for each row execute procedure public.update_updated_at_column();
create or replace trigger update_kits_updated_at before update on public.kits for each row execute procedure public.update_updated_at_column();

-- Automating profile creation upon signup on Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_org_id uuid;
begin
  -- Search for existing default organization, or create it
  select id into default_org_id from public.organizations where name = 'Spray Precision' limit 1;
  if default_org_id is null then
    insert into public.organizations (name, status)
    values ('Spray Precision', 'active')
    returning id into default_org_id;
  end if;

  -- Create public.profiles record
  insert into public.profiles (id, organization_id, full_name, email, role, status)
  values (
    new.id,
    default_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'seller'),
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed initial organizations
insert into public.organizations (name, status)
values ('Spray Precision', 'active')
on conflict do nothing;

-- =========================================================================
-- 7. EXEMPLOS DE REGULAMENTO RLS (Row Level Security)
-- =========================================================================

-- Ativar RLS nas tabelas principais
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.farms enable row level security;
alter table public.visits enable row level security;
alter table public.visit_attachments enable row level security;
alter table public.sprayers enable row level security;
alter table public.kits enable row level security;

-- 7a. Políticas para perfis: Usuários leem apenas perfis da sua organização
create policy "Users can view profiles in their organization"
  on public.profiles for select
  using ( organization_id = (select organization_id from public.profiles where id = auth.uid()) );

create policy "Admins can manage all profiles"
  on public.profiles for all
  using ( 
    (select role from public.profiles where id = auth.uid()) = 'admin' 
    and organization_id = (select organization_id from public.profiles where id = auth.uid()) 
  );

-- 7b. Políticas para Leads
create policy "Sellers see their own leads, Admins see all"
  on public.leads for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'commercial_manager')
    or owner_id = auth.uid()
  );

create policy "Users can insert leads for their own organization"
  on public.leads for insert
  with check (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and owner_id = auth.uid()
  );

create policy "Sellers update their own leads, Admins update all"
  on public.leads for update
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'commercial_manager')
    or owner_id = auth.uid()
  );

-- 7c. Políticas para Clientes (Customers)
create policy "Sellers see their own customers, Admins see all"
  on public.customers for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'commercial_manager', 'technician')
    or owner_id = auth.uid()
  );

create policy "Users can insert customers for their own organization"
  on public.customers for insert
  with check (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
  );

create policy "Sellers update their own customers, Admins update all"
  on public.customers for update
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'commercial_manager')
    or owner_id = auth.uid()
  );

-- 7d. Políticas para Visitas (Visits)
create policy "Sellers see their own visits, Admins see all"
  on public.visits for select
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'commercial_manager')
    or owner_id = auth.uid()
  );

create policy "Users can insert visits for their own organization"
  on public.visits for insert
  with check (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and owner_id = auth.uid()
  );

create policy "Users can update their own visits, Admins update all"
  on public.visits for update
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'commercial_manager')
    or owner_id = auth.uid()
  );
