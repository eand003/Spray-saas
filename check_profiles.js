import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env.local não encontrado!');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('⏳ Carregando usuários do Supabase Auth...');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('❌ Erro ao listar usuários do Auth:', authError.message);
    process.exit(1);
  }

  console.log('⏳ Carregando perfis da tabela sp_profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('sp_profiles')
    .select('*');

  if (profileError) {
    console.error('❌ Erro ao listar perfis de sp_profiles:', profileError.message);
    process.exit(1);
  }

  console.log(`\n📊 Encontrados: ${users.length} usuários no Auth e ${profiles.length} perfis em sp_profiles.`);

  const profileIds = new Set(profiles.map(p => p.id));
  const missingProfiles = [];

  for (const user of users) {
    if (!profileIds.has(user.id)) {
      missingProfiles.push(user);
    }
  }

  if (missingProfiles.length === 0) {
    console.log('🎉 Tudo perfeito! Todos os usuários do Auth possuem um perfil correspondente em sp_profiles.');
    return;
  }

  console.log(`⚠️  Aviso: Encontrados ${missingProfiles.length} usuários sem perfil em sp_profiles.`);
  
  for (const user of missingProfiles) {
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário Sem Nome';
    const role = user.user_metadata?.role || 'seller';
    
    console.log(`⏳ Criando perfil automático para: ${user.email} (${fullName}) com role "${role}"...`);
    
    const { error: insertError } = await supabase
      .from('sp_profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        email: user.email,
        role: role,
        status: 'active'
      });

    if (insertError) {
      console.error(`❌ Falha ao criar perfil para ${user.email}:`, insertError.message);
    } else {
      console.log(`✅ Perfil de ${user.email} criado com sucesso!`);
    }
  }

  console.log('\n🎉 Sincronização concluída! Todos os perfis em falta foram criados.');
}

main().catch(console.error);
