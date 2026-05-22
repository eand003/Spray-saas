-- 006_create_sp_farms_table.sql
-- Essa migração cria a tabela sp_farms (Propriedades rurais vinculadas ao cliente)
-- para resolver o erro de coluna ausente 'customer_id' na conversão de leads e gestão de fazendas.

CREATE TABLE IF NOT EXISTS public.sp_farms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  customer_id     UUID NOT NULL REFERENCES public.sp_customers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  city            TEXT,
  state           CHAR(2),
  address_notes   TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  maps_url        TEXT,
  area_hectares   NUMERIC(12,2),
  main_crops      TEXT[],                  -- Array de culturas
  local_contacts  JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE
);

-- Ativa RLS (Row Level Security)
ALTER TABLE public.sp_farms ENABLE ROW LEVEL SECURITY;

-- Cria política de segurança RLS: Vendedores acessam as fazendas dos seus clientes, Admins acessam todas.
CREATE POLICY "sp_farms: acesso via customer owner ou admin"
  ON public.sp_farms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_customers c
      WHERE c.id = customer_id AND (c.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.sp_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );
