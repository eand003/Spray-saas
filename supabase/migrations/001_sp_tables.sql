-- =============================================================================
-- SPRAY PRECISION SAAS - Migração de Tabelas (Prefixo: sp_)
-- Projeto: bico_saas (Supabase compartilhado)
-- Instruções: Rodar no SQL Editor do painel Supabase do projeto bico_saas
-- IMPORTANTE: Não altera nenhuma tabela existente do projeto bico_saas.
-- =============================================================================

-- --------------------------------------------------------
-- 1. sp_profiles — Perfis de usuários do SaaS
--    Linkado com auth.users via trigger
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'seller', 'partner', 'viewer')),
  phone           TEXT,
  avatar_url      TEXT,
  region          TEXT,
  partner_id      UUID,                    -- Referência a sp_partners (opcional)
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

ALTER TABLE public.sp_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_profiles: user vê próprio perfil"
  ON public.sp_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "sp_profiles: admin vê todos"
  ON public.sp_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "sp_profiles: user atualiza próprio perfil"
  ON public.sp_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: cria sp_profile automaticamente ao criar usuário via Supabase Auth
CREATE OR REPLACE FUNCTION public.sp_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sp_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sp_on_auth_user_created ON auth.users;
CREATE TRIGGER sp_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sp_handle_new_user();

-- --------------------------------------------------------
-- 2. sp_partners — Empresas parceiras/revendedoras
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  document        TEXT,                    -- CNPJ
  email           TEXT,
  phone           TEXT,
  city            TEXT,
  state           CHAR(2),
  address         TEXT,
  contact_name    TEXT,
  commission_rate NUMERIC(5,4) DEFAULT 0.10, -- Taxa de comissão padrão
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_partners: admin gerencia"
  ON public.sp_partners FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "sp_partners: autenticados leem"
  ON public.sp_partners FOR SELECT
  USING (auth.role() = 'authenticated');

-- --------------------------------------------------------
-- 3. sp_customers — Clientes agricultores
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES public.sp_profiles(id),
  partner_id      UUID REFERENCES public.sp_partners(id),
  name            TEXT NOT NULL,
  company_name    TEXT,
  document        TEXT,                    -- CPF/CNPJ
  phone           TEXT,
  email           TEXT,
  city            TEXT,
  state           CHAR(2),
  address         TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  maps_url        TEXT,
  -- Especificações técnicas de campo
  main_crop       TEXT,
  farm_area_ha    NUMERIC(10,2),
  -- Status
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_customers: owner vê próprios"
  ON public.sp_customers FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "sp_customers: admin vê todos"
  ON public.sp_customers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 4. sp_customer_contacts — Contatos adicionais
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_customer_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES public.sp_customers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  role            TEXT,                    -- Cargo/função
  phone           TEXT,
  email           TEXT,
  is_primary      BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sp_customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_customer_contacts: herda acesso do customer"
  ON public.sp_customer_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_customers c
      WHERE c.id = customer_id AND (c.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

-- --------------------------------------------------------
-- 5. sp_visits — Visitas técnicas/comerciais
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID REFERENCES public.sp_profiles(id),
  customer_id         UUID REFERENCES public.sp_customers(id),
  visit_type          TEXT DEFAULT 'Comercial' CHECK (visit_type IN ('Comercial', 'Técnica', 'Relacionamento', 'Pós-venda', 'Instalação')),
  visit_datetime      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  maps_url            TEXT,
  people_present      TEXT,
  topics_discussed    TEXT,
  pains_identified    TEXT,
  machines_evaluated  TEXT,
  commercial_potential TEXT CHECK (commercial_potential IN ('Alto', 'Médio', 'Baixo', 'Sem potencial')),
  result              TEXT,
  next_step           TEXT,
  next_visit_date     DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_visits: owner gerencia próprias"
  ON public.sp_visits FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "sp_visits: admin vê todas"
  ON public.sp_visits FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 6. sp_machines — Pulverizadores dos clientes
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_machines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID REFERENCES public.sp_customers(id),
  brand                 TEXT,
  model                 TEXT,
  year                  SMALLINT,
  serial_number         TEXT,
  boom_width_m          NUMERIC(6,2),
  nozzle_count          SMALLINT,           -- Bicos físicos reais
  nozzle_spacing_cm     SMALLINT,           -- Espaçamento entre bicos
  controller_monitor    TEXT,
  current_nozzle_model  TEXT,              -- Modelo de bico atual na máquina
  flow_rate_l_ha        NUMERIC(8,2),
  working_speed_km_h    NUMERIC(6,2),
  kit_status            TEXT DEFAULT 'no_kit' CHECK (kit_status IN ('no_kit', 'quoted', 'sold', 'installed', 'maintenance')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ,
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_machines: acesso via customer"
  ON public.sp_machines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_customers c
      WHERE c.id = customer_id AND (c.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

-- --------------------------------------------------------
-- 7. sp_kits — Kits eletrostáticos instalados
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_kits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_number            TEXT UNIQUE,
  customer_id           UUID REFERENCES public.sp_customers(id),
  machine_id            UUID REFERENCES public.sp_machines(id),
  seller_id             UUID REFERENCES public.sp_profiles(id),
  version               TEXT,
  panel_serial_number   TEXT,
  installed_modules_count SMALLINT,        -- Módulos isoladores eletrostáticos (sp_machines.nozzle_count pode diferir para espaç 35cm)
  sale_date             DATE,
  installation_date     DATE,
  warranty_until        DATE,
  status                TEXT NOT NULL DEFAULT 'sold' CHECK (status IN ('quoted', 'sold', 'installed', 'maintenance', 'deactivated')),
  technical_notes       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ,
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_kits: seller vê próprios"
  ON public.sp_kits FOR ALL
  USING (seller_id = auth.uid());

CREATE POLICY "sp_kits: admin vê todos"
  ON public.sp_kits FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 8. sp_leads — Leads comerciais
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_leads (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                  UUID REFERENCES public.sp_profiles(id),
  name                      TEXT NOT NULL,
  company_name              TEXT,
  contact_name              TEXT,
  phone                     TEXT,
  email                     TEXT,
  city                      TEXT,
  state                     CHAR(2),
  source                    TEXT,
  status                    TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contact_made', 'visit_scheduled', 'proposal_sent', 'negotiating', 'won', 'lost')),
  main_crop                 TEXT,
  estimated_sprayers_count  SMALLINT,
  notes                     TEXT,
  next_action               TEXT,
  next_action_date          DATE,
  lost_reason               TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ,
  is_deleted                BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_leads: owner gerencia próprios"
  ON public.sp_leads FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "sp_leads: admin vê todos"
  ON public.sp_leads FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 9. sp_deals — Oportunidades comerciais (CRM Pipeline)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES public.sp_profiles(id),
  customer_id     UUID REFERENCES public.sp_customers(id),
  lead_id         UUID REFERENCES public.sp_leads(id),
  title           TEXT NOT NULL,
  stage           TEXT NOT NULL DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  estimated_value NUMERIC(12,2),
  close_date      DATE,
  probability     SMALLINT DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  notes           TEXT,
  lost_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_deals: owner gerencia próprios"
  ON public.sp_deals FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "sp_deals: admin vê todos"
  ON public.sp_deals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 10. sp_deal_activities — Atividades por oportunidade
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_deal_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES public.sp_deals(id) ON DELETE CASCADE,
  owner_id        UUID REFERENCES public.sp_profiles(id),
  type            TEXT NOT NULL CHECK (type IN ('call', 'email', 'visit', 'proposal', 'note', 'task')),
  title           TEXT NOT NULL,
  description     TEXT,
  activity_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_completed    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sp_deal_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_deal_activities: via deal owner"
  ON public.sp_deal_activities FOR ALL
  USING (owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 11. sp_stock_items — Itens de estoque
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_stock_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT UNIQUE,
  name            TEXT NOT NULL,
  category        TEXT,
  description     TEXT,
  unit            TEXT DEFAULT 'un',
  current_qty     NUMERIC(12,3) DEFAULT 0,
  min_qty         NUMERIC(12,3) DEFAULT 0,
  cost_price      NUMERIC(12,2),
  sale_price      NUMERIC(12,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

ALTER TABLE public.sp_stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_stock_items: autenticados leem"
  ON public.sp_stock_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "sp_stock_items: admin gerencia"
  ON public.sp_stock_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 12. sp_stock_movements — Movimentações de estoque
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES public.sp_stock_items(id),
  user_id         UUID REFERENCES public.sp_profiles(id),
  movement_type   TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'kit_assembly')),
  qty             NUMERIC(12,3) NOT NULL,
  reason          TEXT,
  reference_id    UUID,                    -- sale_id, kit_id, etc
  reference_type  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sp_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_stock_movements: admin gerencia"
  ON public.sp_stock_movements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "sp_stock_movements: autenticados leem"
  ON public.sp_stock_movements FOR SELECT
  USING (auth.role() = 'authenticated');

-- --------------------------------------------------------
-- 13. sp_sales — Vendas comerciais
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_sales (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               UUID REFERENCES public.sp_customers(id),
  seller_id                 UUID REFERENCES public.sp_profiles(id),
  machine_id                UUID REFERENCES public.sp_machines(id),
  kit_id                    UUID REFERENCES public.sp_kits(id),
  sale_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Especificações da máquina/kit vendido
  nozzles_count             SMALLINT,                           -- Módulos eletrostáticos
  physical_nozzles_count    SMALLINT,                           -- Bicos físicos da barra
  boom_width_m              NUMERIC(6,2),
  nozzle_spacing_cm         SMALLINT,
  -- Precificação
  pricing_mode              TEXT DEFAULT 'per_nozzle' CHECK (pricing_mode IN ('per_nozzle', 'flat_rate')),
  price_per_nozzle          NUMERIC(12,2),
  equivalent_price_per_nozzle NUMERIC(12,2),
  flat_rate_amount          NUMERIC(12,2),
  total_amount              NUMERIC(14,2) NOT NULL,
  discount_amount           NUMERIC(12,2) DEFAULT 0,
  -- Condições de pagamento
  payment_terms             TEXT,
  payment_method            TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending_billing' CHECK (status IN ('pending_billing', 'billed', 'received_partial', 'received_full', 'cancelled')),
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ,
  is_deleted                BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.sp_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_sales: seller vê próprias"
  ON public.sp_sales FOR ALL
  USING (seller_id = auth.uid());

CREATE POLICY "sp_sales: admin vê todas"
  ON public.sp_sales FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 14. sp_accounts_receivable — Parcelas a receber
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_accounts_receivable (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id             UUID REFERENCES public.sp_sales(id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES public.sp_customers(id),
  installment_number  SMALLINT,
  amount              NUMERIC(14,2) NOT NULL,
  due_date            DATE NOT NULL,
  received_amount     NUMERIC(14,2) DEFAULT 0,
  received_at         DATE,
  payment_method      TEXT,
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'received', 'overdue', 'cancelled')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

ALTER TABLE public.sp_accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_accounts_receivable: admin gerencia"
  ON public.sp_accounts_receivable FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "sp_accounts_receivable: seller lê próprias (via sale)"
  ON public.sp_accounts_receivable FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_sales s
      WHERE s.id = sale_id AND s.seller_id = auth.uid()
    )
  );

-- --------------------------------------------------------
-- 15. sp_accounts_payable — Contas a pagar / Despesas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_accounts_payable (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name   TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  amount          NUMERIC(14,2) NOT NULL,
  due_date        DATE NOT NULL,
  paid_amount     NUMERIC(14,2) DEFAULT 0,
  paid_at         DATE,
  payment_method  TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'overdue', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

ALTER TABLE public.sp_accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_accounts_payable: admin gerencia"
  ON public.sp_accounts_payable FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- 16. sp_commissions — Comissões de vendedores
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id             UUID REFERENCES public.sp_sales(id) ON DELETE CASCADE,
  seller_id           UUID REFERENCES public.sp_profiles(id),
  commission_type     TEXT DEFAULT 'percentage',
  commission_rate     NUMERIC(5,4) NOT NULL,
  base_amount         NUMERIC(14,2) NOT NULL,
  commission_amount   NUMERIC(14,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'released', 'paid', 'cancelled')),
  released_at         DATE,
  paid_at             DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

ALTER TABLE public.sp_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_commissions: seller vê próprias"
  ON public.sp_commissions FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "sp_commissions: admin gerencia"
  ON public.sp_commissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --------------------------------------------------------
-- FIM DA MIGRAÇÃO
-- Tabelas criadas com sucesso: sp_profiles, sp_partners,
-- sp_customers, sp_customer_contacts, sp_visits, sp_machines,
-- sp_kits, sp_leads, sp_deals, sp_deal_activities,
-- sp_stock_items, sp_stock_movements, sp_sales,
-- sp_accounts_receivable, sp_accounts_payable, sp_commissions
-- --------------------------------------------------------
