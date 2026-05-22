# 05 — Modelagem Inicial do Banco Supabase

Banco sugerido: PostgreSQL via Supabase.

## Padrões gerais

Todas as tabelas importantes devem ter:

- `id uuid primary key default gen_random_uuid()`;
- `organization_id uuid`;
- `created_at timestamptz default now()`;
- `updated_at timestamptz`;
- `created_by uuid`;
- `updated_by uuid`;
- `is_deleted boolean default false` quando fizer sentido.

---

## Tabela: organizations

Representa empresas/ambientes.

Campos:

- id;
- name;
- document;
- status;
- created_at.

---

## Tabela: profiles

Complementa o usuário autenticado do Supabase Auth.

Campos:

- id uuid — mesmo id do auth.users;
- organization_id;
- full_name;
- email;
- phone;
- role;
- region;
- state;
- default_commission_rate numeric;
- status;
- created_at;
- updated_at.

Roles sugeridas:

- admin;
- commercial_manager;
- seller;
- partner;
- technician;
- finance;
- stock.

---

## Tabela: leads

Campos:

- id;
- organization_id;
- owner_id;
- name;
- company_name;
- contact_name;
- phone;
- email;
- city;
- state;
- source;
- status;
- main_crop;
- estimated_sprayers_count integer;
- notes;
- next_action;
- next_action_date date;
- converted_customer_id;
- created_by;
- created_at;
- updated_at.

---

## Tabela: customers

Campos:

- id;
- organization_id;
- owner_id;
- name;
- company_name;
- document;
- state_registration;
- main_contact_name;
- phone;
- email;
- city;
- state;
- address;
- latitude numeric;
- longitude numeric;
- maps_url;
- status;
- notes;
- created_by;
- created_at;
- updated_at.

---

## Tabela: farms

Campos:

- id;
- organization_id;
- customer_id;
- name;
- city;
- state;
- address_notes;
- latitude numeric;
- longitude numeric;
- maps_url;
- area_hectares numeric;
- main_crops text[];
- local_contacts jsonb;
- notes;
- created_at;
- updated_at.

---

## Tabela: visits

Campos:

- id;
- organization_id;
- lead_id nullable;
- customer_id nullable;
- farm_id nullable;
- owner_id;
- visit_type;
- visit_datetime timestamptz;
- latitude numeric;
- longitude numeric;
- maps_url;
- people_present text;
- topics_discussed text;
- pains_identified text;
- machines_evaluated text;
- commercial_potential;
- result;
- next_step;
- next_visit_date date;
- notes;
- created_by;
- created_at;
- updated_at.

---

## Tabela: visit_attachments

Campos:

- id;
- organization_id;
- visit_id;
- file_url;
- file_type;
- description;
- created_by;
- created_at.

---

## Tabela: sprayers

Campos:

- id;
- organization_id;
- customer_id;
- farm_id;
- brand;
- model;
- year integer;
- serial_number;
- boom_width_m numeric;
- nozzle_count integer;
- nozzle_spacing_cm numeric;
- controller_monitor;
- current_nozzle_model;
- application_notes;
- kit_status;
- notes;
- created_at;
- updated_at.

---

## Tabela: kits

Campos:

- id;
- organization_id;
- kit_number;
- customer_id;
- farm_id;
- sprayer_id;
- sale_id nullable;
- version;
- panel_serial_number;
- installed_points_count integer;
- sale_date date;
- installation_date date;
- warranty_until date;
- status;
- installed_by uuid;
- seller_id uuid;
- technical_notes;
- created_at;
- updated_at.

---

## Tabela: opportunities

Campos:

- id;
- organization_id;
- lead_id nullable;
- customer_id nullable;
- owner_id;
- title;
- stage;
- estimated_value numeric;
- estimated_kits_count integer;
- estimated_sprayers_count integer;
- probability numeric;
- expected_close_date date;
- last_interaction_at timestamptz;
- next_action;
- next_action_date date;
- notes;
- created_at;
- updated_at.

---

## Tabela: sales

Campos:

- id;
- organization_id;
- opportunity_id nullable;
- customer_id;
- seller_id;
- sale_date date;
- total_amount numeric;
- discount_amount numeric;
- payment_terms text;
- payment_method;
- status;
- notes;
- created_at;
- updated_at.

---

## Tabela: sale_items

Campos:

- id;
- organization_id;
- sale_id;
- item_type;
- description;
- quantity numeric;
- unit_price numeric;
- total_price numeric;
- stock_item_id nullable;
- created_at.

---

## Tabela: accounts_receivable

Campos:

- id;
- organization_id;
- sale_id;
- customer_id;
- installment_number integer;
- amount numeric;
- due_date date;
- received_amount numeric;
- received_at date;
- status;
- payment_method;
- notes;
- created_at;
- updated_at.

---

## Tabela: accounts_payable

Campos:

- id;
- organization_id;
- supplier_name;
- description;
- category;
- amount numeric;
- due_date date;
- paid_at date;
- status;
- attachment_url;
- notes;
- created_at;
- updated_at.

---

## Tabela: commissions

Campos:

- id;
- organization_id;
- sale_id;
- seller_id;
- commission_type;
- commission_rate numeric;
- base_amount numeric;
- commission_amount numeric;
- status;
- released_at date;
- paid_at date;
- notes;
- created_at;
- updated_at.

Status:

- expected;
- released;
- paid;
- canceled.

---

## Tabela: stock_items

Campos:

- id;
- organization_id;
- sku;
- name;
- category;
- current_quantity numeric;
- minimum_quantity numeric;
- unit_cost numeric;
- supplier_name;
- storage_location;
- status;
- notes;
- created_at;
- updated_at.

---

## Tabela: stock_movements

Campos:

- id;
- organization_id;
- stock_item_id;
- movement_type;
- quantity numeric;
- unit_cost numeric;
- related_sale_id nullable;
- related_kit_id nullable;
- related_support_ticket_id nullable;
- description;
- created_by;
- created_at.

Movement types:

- in;
- out_sale;
- out_installation;
- out_support;
- return;
- adjustment.

---

## Tabela: support_tickets

Campos:

- id;
- organization_id;
- customer_id;
- farm_id nullable;
- sprayer_id nullable;
- kit_id nullable;
- opened_by;
- assigned_to;
- type;
- priority;
- status;
- description;
- solution;
- opened_at timestamptz;
- closed_at timestamptz;
- created_at;
- updated_at.

---

## Tabela: audit_logs

Para rastrear ações importantes.

Campos:

- id;
- organization_id;
- user_id;
- entity_type;
- entity_id;
- action;
- old_data jsonb;
- new_data jsonb;
- created_at.
