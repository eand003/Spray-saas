-- =============================================================================
-- SPRAY PRECISION SAAS - Correção de Check Constraints (Fase 1 e 2)
-- Projeto: bico_saas (Supabase compartilhado)
-- Instruções: Rodar no SQL Editor do painel Supabase do projeto bico_saas
-- IMPORTANTE: Ajusta as restrições (CHECK constraints) para coincidir com as
--             opções enviadas e exibidas pelo frontend em React.
-- =============================================================================

-- 1. Corrige o constraint de status em sp_leads (permite 'visited' e 'no_fit')
ALTER TABLE public.sp_leads DROP CONSTRAINT IF EXISTS sp_leads_status_check;
ALTER TABLE public.sp_leads ADD CONSTRAINT sp_leads_status_check
  CHECK (status IN ('new', 'contact_made', 'visit_scheduled', 'visited', 'negotiating', 'proposal_sent', 'won', 'lost', 'no_fit'));

-- 2. Corrige o constraint de tipo de visita em sp_visits (permite as opções em português enviadas pelo frontend)
ALTER TABLE public.sp_visits DROP CONSTRAINT IF EXISTS sp_visits_visit_type_check;
ALTER TABLE public.sp_visits ADD CONSTRAINT sp_visits_visit_type_check
  CHECK (visit_type IN ('Prospecção', 'Demonstração em Campo', 'Instalação de Kit', 'Manutenção Técnica', 'Cobrança / Financeiro', 'Relacionamento / Pós-Venda', 'Comercial', 'Técnica', 'Relacionamento', 'Pós-venda', 'Instalação'));

-- 3. Corrige o constraint de status em sp_customers (permite 'after_sales' e 'defaulting')
ALTER TABLE public.sp_customers DROP CONSTRAINT IF EXISTS sp_customers_status_check;
ALTER TABLE public.sp_customers ADD CONSTRAINT sp_customers_status_check
  CHECK (status IN ('active', 'inactive', 'prospect', 'after_sales', 'defaulting'));
