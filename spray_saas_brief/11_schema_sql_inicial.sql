-- Schema inicial conceitual para Supabase/PostgreSQL
-- Ajustar e testar no Supabase antes de produção.

create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key,
  organization_id uuid references organizations(id),
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

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  owner_id uuid references profiles(id),
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
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  owner_id uuid references profiles(id),
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
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  customer_id uuid references customers(id),
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

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  lead_id uuid references leads(id),
  customer_id uuid references customers(id),
  farm_id uuid references farms(id),
  owner_id uuid references profiles(id),
  visit_type text not null,
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
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

create table if not exists visit_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  visit_id uuid references visits(id) on delete cascade,
  file_url text not null,
  file_type text,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists sprayers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  customer_id uuid references customers(id),
  farm_id uuid references farms(id),
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
  kit_status text default 'no_kit',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

create table if not exists kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  kit_number text not null,
  customer_id uuid references customers(id),
  farm_id uuid references farms(id),
  sprayer_id uuid references sprayers(id),
  sale_id uuid,
  version text,
  panel_serial_number text,
  installed_points_count integer,
  sale_date date,
  installation_date date,
  warranty_until date,
  status text default 'sold',
  installed_by uuid references profiles(id),
  seller_id uuid references profiles(id),
  technical_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

-- Tabelas preparadas para fases futuras

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  lead_id uuid references leads(id),
  customer_id uuid references customers(id),
  owner_id uuid references profiles(id),
  title text not null,
  stage text default 'diagnosis',
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

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  opportunity_id uuid references opportunities(id),
  customer_id uuid references customers(id),
  seller_id uuid references profiles(id),
  sale_date date default current_date,
  total_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) default 0,
  payment_terms text,
  payment_method text,
  status text default 'pending_billing',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_deleted boolean default false
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  sale_id uuid references sales(id) on delete cascade,
  item_type text,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total_price numeric(14,2) not null default 0,
  stock_item_id uuid,
  created_at timestamptz default now()
);

create table if not exists accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  sale_id uuid references sales(id),
  customer_id uuid references customers(id),
  installment_number integer,
  amount numeric(14,2) not null,
  due_date date not null,
  received_amount numeric(14,2) default 0,
  received_at date,
  status text default 'open',
  payment_method text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists accounts_payable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
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

create table if not exists commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  sale_id uuid references sales(id),
  seller_id uuid references profiles(id),
  commission_type text default 'percentage',
  commission_rate numeric(10,4),
  base_amount numeric(14,2),
  commission_amount numeric(14,2),
  status text default 'expected',
  released_at date,
  paid_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
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

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  stock_item_id uuid references stock_items(id),
  movement_type text not null,
  quantity numeric(12,2) not null,
  unit_cost numeric(14,2),
  related_sale_id uuid references sales(id),
  related_kit_id uuid references kits(id),
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  customer_id uuid references customers(id),
  farm_id uuid references farms(id),
  sprayer_id uuid references sprayers(id),
  kit_id uuid references kits(id),
  opened_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  type text,
  priority text default 'medium',
  status text default 'open',
  description text not null,
  solution text,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  user_id uuid references profiles(id),
  entity_type text,
  entity_id uuid,
  action text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- Índices úteis
create index if not exists idx_leads_owner on leads(owner_id);
create index if not exists idx_customers_owner on customers(owner_id);
create index if not exists idx_visits_owner on visits(owner_id);
create index if not exists idx_visits_customer on visits(customer_id);
create index if not exists idx_kits_customer on kits(customer_id);
create index if not exists idx_sprayers_customer on sprayers(customer_id);
create index if not exists idx_sales_customer on sales(customer_id);
create index if not exists idx_sales_seller on sales(seller_id);

-- RLS deve ser ativado após criação das funções de permissão.
-- Exemplo:
-- alter table leads enable row level security;
-- create policy "Admin can view all leads" on leads for select using (...);
