import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Função simples para carregar o arquivo .env.local sem dependências externas
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env.local não encontrado no diretório raiz!');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  content.split(/\r?\n/).forEach(line => {
    // Ignora comentários e linhas vazias
    if (line.trim().startsWith('#') || !line.trim()) return;
    
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      
      // Remove aspas simples ou duplas
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      
      env[key] = value;
    }
  });
  
  return env;
}

async function main() {
  const env = loadEnv();
  
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('\n❌ Chaves ausentes no .env.local!');
    console.log('Para promover usuários pelo terminal, você precisa adicionar a chave "service_role" no seu arquivo .env.local.');
    console.log('\nComo obter a chave:');
    console.log('  1. Acesse o painel do Supabase (supabase.com)');
    console.log('  2. Vá em Settings (Configurações) > API');
    console.log('  3. Procure por "service_role key" (secret key) e copie-a');
    console.log('  4. Abra o seu arquivo .env.local e adicione a seguinte linha no final:');
    console.log('     SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui\n');
    process.exit(1);
  }
  
  const email = process.argv[2] || 'admin@spray.com';
  const role = process.argv[3] || 'admin';
  
  console.log(`⏳ Conectando ao Supabase em ${supabaseUrl}...`);
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log(`⏳ Procurando usuário com o e-mail "${email}" no Supabase Auth...`);
  
  // 1. Lista todos os usuários para encontrar o ID correspondente ao email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Erro ao listar usuários do Auth:', listError.message);
    process.exit(1);
  }
  
  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`❌ Usuário com o e-mail "${email}" não foi encontrado no Supabase Auth!`);
    console.log('Certifique-se de que o usuário já se cadastrou/criou a conta antes de promovê-lo.');
    process.exit(1);
  }
  
  console.log(`✅ Usuário encontrado! ID: ${user.id}`);
  console.log(`⏳ Atualizando raw_user_meta_data para role="${role}"...`);
  
  // 2. Atualiza os metadados do usuário via Auth Admin API (usa a service_role key para ignorar RLS)
  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { user_metadata: { role: role } }
  );
  
  if (authUpdateError) {
    console.error('❌ Erro ao atualizar metadados no Supabase Auth:', authUpdateError.message);
    process.exit(1);
  }
  
  console.log('✅ Metadados de autenticação atualizados com sucesso!');
  console.log(`⏳ Atualizando a tabela sp_profiles para role="${role}"...`);
  
  // 3. Atualiza a tabela pública sp_profiles correspondente
  const { error: profileUpdateError } = await supabase
    .from('sp_profiles')
    .update({ role: role })
    .eq('email', email);
    
  if (profileUpdateError) {
    console.error('❌ Erro ao atualizar tabela sp_profiles:', profileUpdateError.message);
    console.log('⚠️  Nota: A parte de autenticação foi atualizada, mas falhou ao atualizar a tabela de perfis.');
    process.exit(1);
  }
  
  console.log(`\n🎉 SUCESSO! O usuário "${email}" foi promovido para "${role}" com êxito!`);
  console.log('Agora você pode fazer login ou recarregar a tela para ver o painel do Administrador Geral.');
}

main().catch(err => {
  console.error('❌ Ocorreu um erro inesperado:', err);
});
