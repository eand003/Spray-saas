-- =============================================================================
-- SPRAY PRECISION SAAS — Patch 003: ajustes de schema e tabelas extras
-- Rodar no SQL Editor do Supabase (projeto bico_saas)
-- =============================================================================

-- -------------------------------------------------------
-- sp_customers: adicionar status 'after_sales'
-- -------------------------------------------------------
ALTER TABLE public.sp_customers
  DROP CONSTRAINT IF EXISTS sp_customers_status_check;

ALTER TABLE public.sp_customers
  ADD CONSTRAINT sp_customers_status_check
  CHECK (status IN ('active', 'inactive', 'prospect', 'after_sales'));

-- -------------------------------------------------------
-- sp_kits: adicionar sprayer_id (alias de machine_id) e 
--          installed_points_count (alias de installed_modules_count)
-- Mantemos ambos para compatibilidade com o frontend
-- -------------------------------------------------------
ALTER TABLE public.sp_kits
  ADD COLUMN IF NOT EXISTS sprayer_id             UUID REFERENCES public.sp_machines(id),
  ADD COLUMN IF NOT EXISTS installed_points_count SMALLINT;

-- -------------------------------------------------------
-- sp_visits: adicionar lead_id (visitas podem ser para leads)
-- -------------------------------------------------------
ALTER TABLE public.sp_visits
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.sp_leads(id);

-- -------------------------------------------------------
-- sp_visit_attachments: fotos e anexos de visitas
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sp_visit_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT,
  visit_id        UUID NOT NULL REFERENCES public.sp_visits(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_type       TEXT DEFAULT 'image',
  description     TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sp_visit_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_visit_attachments: acesso autenticado"
  ON public.sp_visit_attachments FOR ALL
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- FIM DO PATCH 003
-- =============================================================================
