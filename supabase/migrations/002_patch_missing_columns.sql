-- =============================================================================
-- SPRAY PRECISION SAAS — Patch de colunas faltantes
-- Rodar no SQL Editor do Supabase (projeto bico_saas)
-- Adiciona colunas que o frontend usa mas não estavam na migration inicial
-- Todas as alterações são seguras (IF NOT EXISTS / sem remover nada)
-- =============================================================================

-- -------------------------------------------------------
-- sp_leads: adicionar created_by e converted_customer_id
-- -------------------------------------------------------
ALTER TABLE public.sp_leads
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS converted_customer_id UUID REFERENCES public.sp_customers(id),
  ADD COLUMN IF NOT EXISTS organization_id  TEXT;        -- campo herdado do mock

-- -------------------------------------------------------
-- sp_customers: adicionar created_by e organization_id
-- -------------------------------------------------------
ALTER TABLE public.sp_customers
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS organization_id  TEXT;

-- -------------------------------------------------------
-- sp_visits: adicionar created_by, organization_id e farm_id
-- farm_id mapeia para um cliente (farms ficam em sp_customers)
-- -------------------------------------------------------
ALTER TABLE public.sp_visits
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS organization_id  TEXT,
  ADD COLUMN IF NOT EXISTS farm_id          UUID REFERENCES public.sp_customers(id);

-- -------------------------------------------------------
-- sp_machines (sprayers): adicionar farm_id e organization_id
-- -------------------------------------------------------
ALTER TABLE public.sp_machines
  ADD COLUMN IF NOT EXISTS farm_id          UUID REFERENCES public.sp_customers(id),
  ADD COLUMN IF NOT EXISTS organization_id  TEXT;

-- -------------------------------------------------------
-- sp_kits: adicionar farm_id e organization_id
-- -------------------------------------------------------
ALTER TABLE public.sp_kits
  ADD COLUMN IF NOT EXISTS farm_id          UUID REFERENCES public.sp_customers(id),
  ADD COLUMN IF NOT EXISTS organization_id  TEXT;

-- -------------------------------------------------------
-- sp_customers: adicionar main_crops (array) e farm fields
-- O frontend usa main_crops como array de culturas na "fazenda"
-- -------------------------------------------------------
ALTER TABLE public.sp_customers
  ADD COLUMN IF NOT EXISTS main_crops       TEXT[],       -- ex: ['Soja','Milho']
  ADD COLUMN IF NOT EXISTS area_hectares    NUMERIC(10,2);

-- =============================================================================
-- FIM DO PATCH — Execute e confirme "Success. No rows returned"
-- =============================================================================
