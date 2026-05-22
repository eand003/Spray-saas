-- 005_sp_promote_user_function.sql
-- Essa migração cria uma função utilitária com SECURITY DEFINER (executada com privilégios de superusuário)
-- para promover ou atualizar a role de qualquer usuário com segurança, contornando restrições de permissões
-- na tabela interna auth.users no Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.sp_promote_user(user_email TEXT, new_role TEXT)
RETURNS VOID SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  -- 1. Atualiza os metadados internos de autenticação do Supabase
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE email = user_email;

  -- 2. Atualiza a tabela sp_profiles do SaaS
  UPDATE public.sp_profiles
  SET role = new_role
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de uso no SQL Editor do Supabase:
-- SELECT public.sp_promote_user('admin@spray.com', 'admin');
