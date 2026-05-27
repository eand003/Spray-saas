import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let serviceRoleKey = '';

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);
  
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) serviceRoleKey = keyMatch[1].trim();
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Erro: Credenciais do Supabase não encontradas no arquivo .env.local.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function initBucket() {
  console.log(`Conectando ao Supabase em: ${supabaseUrl}`);
  console.log('Verificando/Criando bucket "visit-photos"...');
  
  try {
    // 1. Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;
    
    const exists = buckets.some(b => b.id === 'visit-photos');
    
    if (exists) {
      console.log('O bucket "visit-photos" já existe no projeto!');
    } else {
      // 2. Create the bucket as Public
      const { data, error } = await supabase.storage.createBucket('visit-photos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });
      if (error) throw error;
      console.log('Bucket "visit-photos" criado com sucesso e configurado como PÚBLICO! 🎉');
    }
  } catch (err) {
    console.error('Erro ao gerenciar bucket:', err.message);
  }
}

initBucket();
