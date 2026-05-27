-- =============================================================================
-- SPRAY PRECISION SAAS — Patch 008: corrigir FK farm_id e constraints em sp_visits
-- 
-- PROBLEMA 1: farm_id em sp_visits referenciava sp_customers (workaround antigo)
--             mas agora que sp_farms existe, o farm_id deve referenciar sp_farms.
--             Isso causava: "violates foreign key constraint sp_visits_farm_id_fkey"
--
-- PROBLEMA 2: visit_type tinha CHECK CONSTRAINT restritivo ('Comercial','Técnica',etc.)
--             mas o frontend usa valores como 'Prospecção','Demonstração em Campo', etc.
--
-- Rodar no SQL Editor do Supabase (projeto bico_saas)
-- =============================================================================

-- -------------------------------------------------------
-- Passo 1: Remover CHECK CONSTRAINTs restritivos de sp_visits
-- -------------------------------------------------------
ALTER TABLE public.sp_visits
  DROP CONSTRAINT IF EXISTS sp_visits_visit_type_check;

ALTER TABLE public.sp_visits
  DROP CONSTRAINT IF EXISTS sp_visits_commercial_potential_check;

-- -------------------------------------------------------
-- Passo 2: Zerar farm_ids inválidos em sp_visits
-- (UUIDs que apontavam para sp_customers, não sp_farms)
-- -------------------------------------------------------
UPDATE public.sp_visits
SET farm_id = NULL
WHERE farm_id IS NOT NULL
  AND farm_id NOT IN (SELECT id FROM public.sp_farms);

-- -------------------------------------------------------
-- Passo 3: Dropar a FK antiga de sp_visits (→ sp_customers)
-- -------------------------------------------------------
ALTER TABLE public.sp_visits
  DROP CONSTRAINT IF EXISTS sp_visits_farm_id_fkey;

-- -------------------------------------------------------
-- Passo 4: Corrigir farm_id de sp_machines (→ sp_farms)
-- -------------------------------------------------------
UPDATE public.sp_machines
SET farm_id = NULL
WHERE farm_id IS NOT NULL
  AND farm_id NOT IN (SELECT id FROM public.sp_farms);

ALTER TABLE public.sp_machines
  DROP CONSTRAINT IF EXISTS sp_machines_farm_id_fkey;

-- -------------------------------------------------------
-- Passo 5: Corrigir farm_id de sp_kits (→ sp_farms)
-- -------------------------------------------------------
UPDATE public.sp_kits
SET farm_id = NULL
WHERE farm_id IS NOT NULL
  AND farm_id NOT IN (SELECT id FROM public.sp_farms);

ALTER TABLE public.sp_kits
  DROP CONSTRAINT IF EXISTS sp_kits_farm_id_fkey;

-- -------------------------------------------------------
-- Passo 6: Adicionar as FKs corretas apontando para sp_farms
-- -------------------------------------------------------
ALTER TABLE public.sp_visits
  ADD CONSTRAINT sp_visits_farm_id_fkey
  FOREIGN KEY (farm_id) REFERENCES public.sp_farms(id) ON DELETE SET NULL;

ALTER TABLE public.sp_machines
  ADD CONSTRAINT sp_machines_farm_id_fkey
  FOREIGN KEY (farm_id) REFERENCES public.sp_farms(id) ON DELETE SET NULL;

ALTER TABLE public.sp_kits
  ADD CONSTRAINT sp_kits_farm_id_fkey
  FOREIGN KEY (farm_id) REFERENCES public.sp_farms(id) ON DELETE SET NULL;

-- =============================================================================
-- FIM DO PATCH 008
-- Execute e confirme "Success. No rows returned"
-- Após rodar, visitas com ou sem farm poderão ser salvas normalmente.
-- =============================================================================

