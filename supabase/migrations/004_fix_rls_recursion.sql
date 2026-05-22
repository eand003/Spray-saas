-- =============================================================================
-- SPRAY PRECISION SAAS — Patch 004: Correção de Recursão Infinita em Políticas RLS
-- Rodar no SQL Editor do Supabase (projeto bico_saas)
-- =============================================================================

-- 1. Criar função auxiliar SECURITY DEFINER para verificar se o usuário é admin.
-- Por ser SECURITY DEFINER, ela roda com privilégios do criador (bypassando RLS),
-- evitando a recursão infinita ao consultar sp_profiles dentro de suas próprias políticas.
CREATE OR REPLACE FUNCTION public.sp_is_admin()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sp_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Atualizar políticas da tabela sp_profiles
DROP POLICY IF EXISTS "sp_profiles: admin vê todos" ON public.sp_profiles;
CREATE POLICY "sp_profiles: admin vê todos"
  ON public.sp_profiles FOR ALL
  USING (public.sp_is_admin());

-- 3. Atualizar políticas da tabela sp_partners
DROP POLICY IF EXISTS "sp_partners: admin gerencia" ON public.sp_partners;
CREATE POLICY "sp_partners: admin gerencia"
  ON public.sp_partners FOR ALL
  USING (public.sp_is_admin());

-- 4. Atualizar políticas da tabela sp_customers
DROP POLICY IF EXISTS "sp_customers: admin vê todos" ON public.sp_customers;
CREATE POLICY "sp_customers: admin vê todos"
  ON public.sp_customers FOR ALL
  USING (public.sp_is_admin());

-- 5. Atualizar políticas da tabela sp_customer_contacts
DROP POLICY IF EXISTS "sp_customer_contacts: herda acesso do customer" ON public.sp_customer_contacts;
CREATE POLICY "sp_customer_contacts: herda acesso do customer"
  ON public.sp_customer_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_customers c
      WHERE c.id = customer_id AND (c.owner_id = auth.uid() OR public.sp_is_admin())
    )
  );

-- 6. Atualizar políticas da tabela sp_visits
DROP POLICY IF EXISTS "sp_visits: admin vê todas" ON public.sp_visits;
CREATE POLICY "sp_visits: admin vê todas"
  ON public.sp_visits FOR ALL
  USING (public.sp_is_admin());

-- 7. Atualizar políticas da tabela sp_machines
DROP POLICY IF EXISTS "sp_machines: acesso via customer" ON public.sp_machines;
CREATE POLICY "sp_machines: acesso via customer"
  ON public.sp_machines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sp_customers c
      WHERE c.id = customer_id AND (c.owner_id = auth.uid() OR public.sp_is_admin())
    )
  );

-- 8. Atualizar políticas da tabela sp_kits
DROP POLICY IF EXISTS "sp_kits: admin vê todos" ON public.sp_kits;
CREATE POLICY "sp_kits: admin vê todos"
  ON public.sp_kits FOR ALL
  USING (public.sp_is_admin());

-- 9. Atualizar políticas da tabela sp_leads
DROP POLICY IF EXISTS "sp_leads: admin vê todos" ON public.sp_leads;
CREATE POLICY "sp_leads: admin vê todos"
  ON public.sp_leads FOR ALL
  USING (public.sp_is_admin());

-- 10. Atualizar políticas da tabela sp_deals
DROP POLICY IF EXISTS "sp_deals: admin vê todos" ON public.sp_deals;
CREATE POLICY "sp_deals: admin vê todos"
  ON public.sp_deals FOR ALL
  USING (public.sp_is_admin());

-- 11. Atualizar políticas da tabela sp_deal_activities
DROP POLICY IF EXISTS "sp_deal_activities: via deal owner" ON public.sp_deal_activities;
CREATE POLICY "sp_deal_activities: via deal owner"
  ON public.sp_deal_activities FOR ALL
  USING (owner_id = auth.uid() OR public.sp_is_admin());

-- 12. Atualizar políticas da tabela sp_stock_items
DROP POLICY IF EXISTS "sp_stock_items: admin gerencia" ON public.sp_stock_items;
CREATE POLICY "sp_stock_items: admin gerencia"
  ON public.sp_stock_items FOR ALL
  USING (public.sp_is_admin());

-- 13. Atualizar políticas da tabela sp_stock_movements
DROP POLICY IF EXISTS "sp_stock_movements: admin gerencia" ON public.sp_stock_movements;
CREATE POLICY "sp_stock_movements: admin gerencia"
  ON public.sp_stock_movements FOR ALL
  USING (public.sp_is_admin());

-- 14. Atualizar políticas da tabela sp_sales
DROP POLICY IF EXISTS "sp_sales: admin vê todas" ON public.sp_sales;
CREATE POLICY "sp_sales: admin vê todas"
  ON public.sp_sales FOR ALL
  USING (public.sp_is_admin());

-- 15. Atualizar políticas da tabela sp_accounts_receivable
DROP POLICY IF EXISTS "sp_accounts_receivable: admin gerencia" ON public.sp_accounts_receivable;
CREATE POLICY "sp_accounts_receivable: admin gerencia"
  ON public.sp_accounts_receivable FOR ALL
  USING (public.sp_is_admin());

-- 16. Atualizar políticas da tabela sp_accounts_payable
DROP POLICY IF EXISTS "sp_accounts_payable: admin gerencia" ON public.sp_accounts_payable;
CREATE POLICY "sp_accounts_payable: admin gerencia"
  ON public.sp_accounts_payable FOR ALL
  USING (public.sp_is_admin());

-- 17. Atualizar políticas da tabela sp_commissions
DROP POLICY IF EXISTS "sp_commissions: admin gerencia" ON public.sp_commissions;
CREATE POLICY "sp_commissions: admin gerencia"
  ON public.sp_commissions FOR ALL
  USING (public.sp_is_admin());
