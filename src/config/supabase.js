import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid (i.e. present and not placeholders)
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_public_key' &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '';

// =============================================================================
// TABLE NAME MAPPING: Frontend generic names → Supabase sp_* prefixed tables
// This allows all components to use plain names (e.g. 'customers') while
// the real Supabase project stores data in sp_customers, sp_leads, etc.
// The bico_saas original tables are NEVER touched.
// =============================================================================
const SP_TABLE_MAP = {
  'profiles':              'sp_profiles',
  'organizations':         'sp_partners',
  'partners':              'sp_partners',
  'customers':             'sp_customers',
  'customer_contacts':     'sp_customer_contacts',
  'visits':                'sp_visits',
  'visit_attachments':     'sp_visit_attachments',
  'farms':                 'sp_farms',
  'sprayers':              'sp_machines',
  'machines':              'sp_machines',
  'kits':                  'sp_kits',
  'leads':                 'sp_leads',
  'deals':                 'sp_deals',
  'deal_activities':       'sp_deal_activities',
  'stock_items':           'sp_stock_items',
  'stock_movements':       'sp_stock_movements',
  'sales':                 'sp_sales',
  'accounts_receivable':   'sp_accounts_receivable',
  'accounts_payable':      'sp_accounts_payable',
  'commissions':           'sp_commissions',
};

/**
 * Wraps the Supabase client's `from()` method to transparently
 * remap generic table names to sp_* prefixed table names.
 * All other methods (auth, storage, rpc) pass through unchanged.
 */
function createSpWrappedClient(client) {
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'from') {
        return (tableName) => {
          const mappedTable = SP_TABLE_MAP[tableName] || tableName;
          if (mappedTable !== tableName) {
            console.debug(`[sp_map] ${tableName} → ${mappedTable}`);
          }
          return target.from(mappedTable);
        };
      }
      // Pass through auth, storage, rpc, etc.
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
}

export let supabase;

if (isConfigured) {
  const rawClient = createClient(supabaseUrl, supabaseAnonKey);
  supabase = createSpWrappedClient(rawClient);
  console.log('🔌 Connected to Supabase (bico_saas project) — tables mapped to sp_* prefix.');
} else {
  console.warn('⚠️ Supabase credentials not found or incomplete. Falling back to LocalStorage Mock DB for visual testing.');

  // HIGH-FIDELITY LOCALSTORAGE-BACKED MOCK DATABASE FOR INSTANT PREVIEW
  const MOCK_STORAGE_KEYS = {
    ORGANIZATIONS: 'spray_mock_orgs',
    PROFILES: 'spray_mock_profiles',
    LEADS: 'spray_mock_leads',
    CUSTOMERS: 'spray_mock_customers',
    FARMS: 'spray_mock_farms',
    VISITS: 'spray_mock_visits',
    SPRAYERS: 'spray_mock_sprayers',
    KITS: 'spray_mock_kits',
    SALES: 'spray_mock_sales',
    RECEIVABLES: 'spray_mock_receivables',
    PAYABLES: 'spray_mock_payables',
    COMMISSIONS: 'spray_mock_commissions',
    SESSION: 'spray_mock_session'
  };

  // Helper to initialize local data if empty
  const getOrInit = (key, defaultVal) => {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(val);
  };

  const save = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Seed default data
  const defaultOrgId = 'org-spray-precision-001';
  getOrInit(MOCK_STORAGE_KEYS.ORGANIZATIONS, [
    { id: defaultOrgId, name: 'Spray Precision', status: 'active', created_at: new Date().toISOString() }
  ]);

  const defaultAdminId = 'user-admin-001';
  const defaultSellerId = 'user-seller-002';
  getOrInit(MOCK_STORAGE_KEYS.PROFILES, [
    {
      id: defaultAdminId,
      organization_id: defaultOrgId,
      full_name: 'Eduardo Administrador',
      email: 'admin@spray.com',
      role: 'admin',
      phone: '(11) 99999-9999',
      status: 'active'
    },
    {
      id: defaultSellerId,
      organization_id: defaultOrgId,
      full_name: 'Marcos Vendedor',
      email: 'vendedor@spray.com',
      role: 'seller',
      phone: '(19) 98888-8888',
      region: 'Ribeirão Preto / SP',
      status: 'active'
    }
  ]);

  // Seed default leads
  getOrInit(MOCK_STORAGE_KEYS.LEADS, [
    {
      id: 'lead-1',
      organization_id: defaultOrgId,
      owner_id: defaultSellerId,
      name: 'Fazenda Santa Maria (Antônio Silva)',
      company_name: 'Grupo Silva Agrícola',
      contact_name: 'Antônio Silva',
      phone: '16991234567',
      email: 'antonio@santamaria.com',
      city: 'Ribeirão Preto',
      state: 'SP',
      source: 'Indicação',
      status: 'new',
      main_crop: 'Soja',
      estimated_sprayers_count: 2,
      notes: 'Produtor interessado em reduzir derivas. Possui pulverizadores autopropelidos John Deere.',
      next_action: 'Agendar visita técnica para demonstração',
      next_action_date: '2026-05-30',
      created_at: new Date().toISOString(),
      is_deleted: false
    },
    {
      id: 'lead-2',
      organization_id: defaultOrgId,
      owner_id: defaultSellerId,
      name: 'Fazenda Bela Vista (Carlos Ferreira)',
      company_name: 'Ferreira Agro',
      contact_name: 'Carlos Ferreira',
      phone: '19987654321',
      email: 'carlos@belavista.com',
      city: 'Limeira',
      state: 'SP',
      source: 'Redes Sociais',
      status: 'contact_made',
      main_crop: 'Laranja',
      estimated_sprayers_count: 3,
      notes: 'Dificuldade extrema com aderência de calda na folha da laranja. Demonstrado interesse em eletrostática.',
      next_action: 'Ligar para alinhar data de vistoria',
      next_action_date: '2026-05-25',
      created_at: new Date().toISOString(),
      is_deleted: false
    }
  ]);

  // Seed default customers, farms, visits, sprayers, kits
  getOrInit(MOCK_STORAGE_KEYS.CUSTOMERS, [
    {
      id: 'cust-1',
      organization_id: defaultOrgId,
      owner_id: defaultSellerId,
      name: 'José de Souza Martins',
      company_name: 'Fazenda Recanto Verde',
      document: '123.456.789-00',
      phone: '16999992222',
      email: 'jose@recantoverde.com',
      city: 'Sertãozinho',
      state: 'SP',
      latitude: -21.1378,
      longitude: -48.0001,
      maps_url: 'https://www.google.com/maps?q=-21.1378,-48.0001',
      status: 'active',
      notes: 'Cliente excelente, entusiasta de novas tecnologias agrícolas.',
      created_at: new Date().toISOString(),
      is_deleted: false
    }
  ]);

  getOrInit(MOCK_STORAGE_KEYS.FARMS, [
    {
      id: 'farm-1',
      organization_id: defaultOrgId,
      customer_id: 'cust-1',
      name: 'Sede Recanto Verde',
      city: 'Sertãozinho',
      state: 'SP',
      area_hectares: 450,
      main_crops: ['Cana de Açúcar', 'Milho'],
      latitude: -21.1378,
      longitude: -48.0001,
      maps_url: 'https://www.google.com/maps?q=-21.1378,-48.0001',
      notes: 'Entrada principal pela Rodovia SP-322, km 12.',
      created_at: new Date().toISOString()
    }
  ]);

  getOrInit(MOCK_STORAGE_KEYS.SPRAYERS, [
    {
      id: 'sprayer-1',
      organization_id: defaultOrgId,
      customer_id: 'cust-1',
      farm_id: 'farm-1',
      brand: 'John Deere',
      model: 'M4040',
      year: 2021,
      serial_number: 'JD999888777',
      boom_width_m: 36,
      nozzle_count: 72,
      nozzle_spacing_cm: 50,
      controller_monitor: 'GreenStar 4',
      current_nozzle_model: 'TeeJet AIXR 11002',
      flow_rate_l_ha: 80,
      working_speed_km_h: 16,
      kit_status: 'installed',
      notes: 'Máquina em perfeito estado com bicos AIXR e vazão estável.',
      created_at: new Date().toISOString()
    }
  ]);

  getOrInit(MOCK_STORAGE_KEYS.KITS, [
    {
      id: 'kit-1',
      organization_id: defaultOrgId,
      kit_number: 'SP-091A',
      customer_id: 'cust-1',
      farm_id: 'farm-1',
      sprayer_id: 'sprayer-1',
      version: 'Bico Eletrostático Localizado V2',
      panel_serial_number: 'PNL-777123',
      installed_points_count: 72,
      sale_date: '2026-02-10',
      installation_date: '2026-02-15',
      warranty_until: '2027-02-15',
      status: 'installed',
      seller_id: defaultSellerId,
      technical_notes: 'Instalação com indução eletrostática direta no bico. Tubulações em inox isoladas.',
      created_at: new Date().toISOString()
    }
  ]);

  getOrInit(MOCK_STORAGE_KEYS.VISITS, [
    {
      id: 'visit-1',
      organization_id: defaultOrgId,
      customer_id: 'cust-1',
      farm_id: 'farm-1',
      owner_id: defaultSellerId,
      visit_type: 'Relacionamento',
      visit_datetime: '2026-05-10T14:30:00Z',
      latitude: -21.1378,
      longitude: -48.0001,
      maps_url: 'https://www.google.com/maps?q=-21.1378,-48.0001',
      people_present: 'José Martins (Produtor), Marcos (Vendedor)',
      topics_discussed: 'Acompanhamento do kit instalado e planejamento para a próxima safra.',
      pains_identified: 'Deseja expandir a área de cobertura com o sistema eletrostático para milho.',
      machines_evaluated: 'JD M4040 com kit funcionando perfeitamente.',
      commercial_potential: 'Alto',
      result: 'Pós-venda realizado',
      next_step: 'Ligar em 30 dias para oferecer kit adicional',
      next_visit_date: '2026-06-10',
      notes: 'Visita muito produtiva, cliente serviu um ótimo café.',
      created_at: new Date().toISOString()
    }
  ]);

  // Seed default financial data
  getOrInit(MOCK_STORAGE_KEYS.SALES, [
    {
      id: 'sale-1',
      organization_id: defaultOrgId,
      customer_id: 'cust-1',
      seller_id: defaultSellerId,
      sale_date: '2026-05-15',
      nozzles_count: 60, // Módulos Isoladores
      physical_nozzles_count: 60,
      boom_width_m: 30,
      nozzle_spacing_cm: 50,
      pricing_mode: 'per_nozzle',
      price_per_nozzle: 1500, // Sold at 1500 (Base cost: 1100)
      equivalent_price_per_nozzle: 1500,
      total_amount: 90000.00,
      discount_amount: 0,
      payment_terms: '3x',
      payment_method: 'Pix / Boleto',
      status: 'received_partial',
      notes: 'Venda de sistema eletrostático para pulverizador John Deere M4040. Entrada paga em Pix.'
    }
  ]);

  getOrInit(MOCK_STORAGE_KEYS.RECEIVABLES, [
    {
      id: 'receivable-1-1',
      organization_id: defaultOrgId,
      sale_id: 'sale-1',
      customer_id: 'cust-1',
      installment_number: 1,
      amount: 30000.00,
      due_date: '2026-05-15',
      received_amount: 30000.00,
      received_at: '2026-05-15',
      status: 'received',
      payment_method: 'Pix',
      notes: 'Entrada referente a 1a parcela.'
    },
    {
      id: 'receivable-1-2',
      organization_id: defaultOrgId,
      sale_id: 'sale-1',
      customer_id: 'cust-1',
      installment_number: 2,
      amount: 30000.00,
      due_date: '2026-06-15',
      received_amount: 0,
      status: 'open',
      notes: '2a parcela do financiamento direto.'
    },
    {
      id: 'receivable-1-3',
      organization_id: defaultOrgId,
      sale_id: 'sale-1',
      customer_id: 'cust-1',
      installment_number: 3,
      amount: 30000.00,
      due_date: '2026-07-15',
      received_amount: 0,
      status: 'open',
      notes: '3a parcela do financiamento direto.'
    }
  ]);

  getOrInit(MOCK_STORAGE_KEYS.PAYABLES, [
    {
      id: 'payable-1',
      organization_id: defaultOrgId,
      supplier_name: 'Inox Brasil S/A',
      description: 'Compra de tubulação de aço inoxidável para novos kits eletrostáticos.',
      category: 'Matéria-prima',
      amount: 15000.00,
      due_date: '2026-06-05',
      status: 'open',
      notes: 'Boleto faturado em 20 dias.'
    },
    {
      id: 'payable-2',
      organization_id: defaultOrgId,
      supplier_name: 'Logística Rápido Campo',
      description: 'Frete e transporte de kits de pulverização para Sertãozinho/SP.',
      category: 'Frete',
      amount: 2400.00,
      due_date: '2026-05-20',
      paid_at: '2026-05-20',
      status: 'paid',
      notes: 'Serviço prestado com nota fiscal.'
    }
  ]);

  getOrInit(MOCK_STORAGE_KEYS.COMMISSIONS, [
    {
      id: 'commission-1-1',
      organization_id: defaultOrgId,
      sale_id: 'sale-1',
      seller_id: defaultSellerId,
      commission_type: 'percentage',
      commission_rate: 0.10, // 10%
      base_amount: 27000.00, // Liquido correspondente a 1a parcela de 30000 faturada (-10% imposto = 27000)
      commission_amount: 2700.00, // 10% de 27000
      status: 'paid', // Paid because installment 1 is received
      paid_at: '2026-05-16',
      notes: 'Comissão referente a parcela 1 recebida do cliente.'
    },
    {
      id: 'commission-1-2',
      organization_id: defaultOrgId,
      sale_id: 'sale-1',
      seller_id: defaultSellerId,
      commission_type: 'percentage',
      commission_rate: 0.10,
      base_amount: 54000.00, // Liquido das parcelas 2 e 3 pendentes (60000 - 6000 imposto = 54000)
      commission_amount: 5400.00, // 10% de 54000
      status: 'expected', // Expected since installments are open
      notes: 'Comissão pendente de recebimento das parcelas 2 e 3.'
    }
  ]);

  // BUILD MOCK CLIENT INTERFACE
  supabase = {
    isMock: true,

    auth: {
      listeners: [],

      async getSession() {
        const sessionJson = localStorage.getItem(MOCK_STORAGE_KEYS.SESSION);
        if (sessionJson) {
          return { data: { session: JSON.parse(sessionJson) }, error: null };
        }
        return { data: { session: null }, error: null };
      },

      async signInWithPassword({ email, password }) {
        const profiles = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEYS.PROFILES));
        const user = profiles.find(p => p.email === email.trim().toLowerCase());
        
        if (user) {
          const session = {
            access_token: 'mock-jwt-token-' + Math.random(),
            user: {
              id: user.id,
              email: user.email,
              user_metadata: {
                full_name: user.full_name,
                role: user.role
              }
            }
          };
          localStorage.setItem(MOCK_STORAGE_KEYS.SESSION, JSON.stringify(session));
          
          // Trigger listeners
          this.listeners.forEach(fn => fn('SIGNED_IN', session));
          return { data: { session, user: session.user }, error: null };
        }
        
        return { data: null, error: { message: 'Credenciais inválidas no banco simulado (tente admin@spray.com ou vendedor@spray.com).' } };
      },

      async signUp({ email, password, options }) {
        const profiles = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEYS.PROFILES)) || [];
        if (profiles.some(p => p.email === email)) {
          return { data: null, error: { message: 'E-mail já cadastrado.' } };
        }

        const newId = 'user-' + Math.random().toString(36).substr(2, 9);
        const name = options?.data?.full_name || email.split('@')[0];
        const role = options?.data?.role || 'seller';
        
        const newProfile = {
          id: newId,
          organization_id: defaultOrgId,
          full_name: name,
          email,
          role,
          status: 'active',
          created_at: new Date().toISOString()
        };

        profiles.push(newProfile);
        save(MOCK_STORAGE_KEYS.PROFILES, profiles);

        const session = {
          access_token: 'mock-jwt-token-' + Math.random(),
          user: {
            id: newId,
            email,
            user_metadata: { full_name: name, role }
          }
        };
        localStorage.setItem(MOCK_STORAGE_KEYS.SESSION, JSON.stringify(session));
        this.listeners.forEach(fn => fn('SIGNED_IN', session));

        return { data: { session, user: session.user }, error: null };
      },

      async signOut() {
        localStorage.removeItem(MOCK_STORAGE_KEYS.SESSION);
        this.listeners.forEach(fn => fn('SIGNED_OUT', null));
        return { error: null };
      },

      onAuthStateChange(callback) {
        this.listeners.push(callback);
        // Fire initial session status
        this.getSession().then(({ data }) => {
          callback(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session);
        });
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this.listeners = this.listeners.filter(fn => fn !== callback);
              }
            }
          }
        };
      }
    },

    from(table) {
      let storageKey;
      switch (table) {
        case 'leads': storageKey = MOCK_STORAGE_KEYS.LEADS; break;
        case 'customers': storageKey = MOCK_STORAGE_KEYS.CUSTOMERS; break;
        case 'farms': storageKey = MOCK_STORAGE_KEYS.FARMS; break;
        case 'visits': storageKey = MOCK_STORAGE_KEYS.VISITS; break;
        case 'sprayers': storageKey = MOCK_STORAGE_KEYS.SPRAYERS; break;
        case 'kits': storageKey = MOCK_STORAGE_KEYS.KITS; break;
        case 'sales': storageKey = MOCK_STORAGE_KEYS.SALES; break;
        case 'accounts_receivable': storageKey = MOCK_STORAGE_KEYS.RECEIVABLES; break;
        case 'accounts_payable': storageKey = MOCK_STORAGE_KEYS.PAYABLES; break;
        case 'commissions': storageKey = MOCK_STORAGE_KEYS.COMMISSIONS; break;
        case 'profiles': storageKey = MOCK_STORAGE_KEYS.PROFILES; break;
        case 'organizations': storageKey = MOCK_STORAGE_KEYS.ORGANIZATIONS; break;
        default: storageKey = table;
      }

      const getItems = () => JSON.parse(localStorage.getItem(storageKey)) || [];
      const saveItems = (items) => localStorage.setItem(storageKey, JSON.stringify(items));

      return {
        select(fields) {
          const items = getItems();
          // Simulating active logic (not deleted)
          const activeItems = items.filter(item => !item.is_deleted);
          
          return {
            eq(field, value) {
              const filtered = activeItems.filter(item => item[field] === value);
              return {
                order(orderByField, { ascending = false } = {}) {
                  const sorted = [...filtered].sort((a, b) => {
                    const valA = a[orderByField];
                    const valB = b[orderByField];
                    if (valA < valB) return ascending ? -1 : 1;
                    if (valA > valB) return ascending ? 1 : -1;
                    return 0;
                  });
                  return Promise.resolve({ data: sorted, error: null });
                },
                then(resolve) {
                  return resolve({ data: filtered, error: null });
                }
              };
            },
            order(orderByField, { ascending = false } = {}) {
              const sorted = [...activeItems].sort((a, b) => {
                const valA = a[orderByField];
                const valB = b[orderByField];
                if (valA < valB) return ascending ? -1 : 1;
                if (valA > valB) return ascending ? 1 : -1;
                return 0;
              });
              return {
                then(resolve) {
                  return resolve({ data: sorted, error: null });
                }
              };
            },
            then(resolve) {
              return resolve({ data: activeItems, error: null });
            }
          };
        },

        insert(record) {
          const records = Array.isArray(record) ? record : [record];
          const currentItems = getItems();
          
          const inserted = records.map(rec => ({
            id: rec.id || 'rec-' + Math.random().toString(36).substr(2, 9),
            organization_id: rec.organization_id || defaultOrgId,
            created_at: new Date().toISOString(),
            ...rec
          }));

          currentItems.push(...inserted);
          saveItems(currentItems);

          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: inserted[0], error: null });
                },
                then(resolve) {
                  return resolve({ data: inserted, error: null });
                }
              };
            },
            then(resolve) {
              return resolve({ data: inserted, error: null });
            }
          };
        },

        update(updatedData) {
          return {
            eq(field, value) {
              const currentItems = getItems();
              let updatedCount = 0;
              const modifiedItems = currentItems.map(item => {
                if (item[field] === value) {
                  updatedCount++;
                  return { ...item, ...updatedData, updated_at: new Date().toISOString() };
                }
                return item;
              });
              
              saveItems(modifiedItems);

              return {
                then(resolve) {
                  return resolve({ data: modifiedItems.filter(item => item[field] === value), error: null });
                }
              };
            }
          };
        },

        delete() {
          return {
            eq(field, value) {
              const currentItems = getItems();
              // Soft delete or hard delete depending on table
              const remaining = currentItems.filter(item => item[field] !== value);
              saveItems(remaining);
              return {
                then(resolve) {
                  return resolve({ data: remaining, error: null });
                }
              };
            }
          };
        }
      };
    },

    storage: {
      from(bucketName) {
        return {
          async upload(path, fileBody) {
            console.log(`📤 Mock Upload to bucket '${bucketName}': path = ${path}`);
            // Mock file url
            const fileUrl = `https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600`;
            return { data: { path, publicUrl: fileUrl }, error: null };
          },
          getPublicUrl(path) {
            console.log(`🔗 Mock GetPublicUrl for bucket '${bucketName}': path = ${path}`);
            const defaultUrl = `https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600`;
            return { data: { publicUrl: defaultUrl } };
          }
        };
      }
    }
  };
}
