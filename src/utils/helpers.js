// UTILITIES AND HELPERS FOR SPRAY PRECISION MANAGER

// Format phone number to (XX) XXXXX-XXXX or (XX) XXXX-XXXX
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = ('' + phone).replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return phone;
};

// Format currency to BRL (R$)
export const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Format Date string to DD/MM/YYYY
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

// Format Date & Time string to DD/MM/YYYY HH:MM
export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch (e) {
    return dateTimeStr;
  }
};

// Translate Lead status value to user-friendly label
export const getLeadStatusLabel = (status) => {
  switch (status) {
    case 'new': return 'Novo';
    case 'contact_made': return 'Contato Realizado';
    case 'visit_scheduled': return 'Visita Agendada';
    case 'visited': return 'Visitado';
    case 'negotiating': return 'Em Negociação';
    case 'proposal_sent': return 'Proposta Enviada';
    case 'won': return 'Fechado (Cliente)';
    case 'lost': return 'Perdido';
    case 'no_fit': return 'Sem Fit';
    default: return status;
  }
};

// Translate Customer status value to user-friendly label
export const getCustomerStatusLabel = (status) => {
  switch (status) {
    case 'active': return 'Ativo';
    case 'inactive': return 'Inativo';
    case 'prospect': return 'Prospect';
    case 'after_sales': return 'Pós-Venda';
    case 'defaulting': return 'Inadimplente';
    default: return status;
  }
};

// Static data options for Select Dropdowns
export const OPTIONS = {
  STATES: [
    { value: 'SP', label: 'São Paulo' },
    { value: 'PR', label: 'Paraná' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'BA', label: 'Bahia' },
    { value: 'TO', label: 'Tocantins' }
  ],
  CROPS: [
    'Soja',
    'Milho',
    'Algodão',
    'Cana de Açúcar',
    'Trigo',
    'Laranja / Citros',
    'Café',
    'Hortifrúti',
    'Silvicultura',
    'Outros'
  ],
  LEAD_SOURCES: [
    'Indicação de Cliente',
    'Indicação de Parceiro',
    'Redes Sociais',
    'Site / Landing Page',
    'Feira Agrícola / Evento',
    'Abordagem Fria (Porta a Porta)',
    'Outros'
  ],
  VISIT_TYPES: [
    'Prospecção',
    'Demonstração em Campo',
    'Instalação de Kit',
    'Manutenção Técnica',
    'Cobrança / Financeiro',
    'Relacionamento / Pós-Venda'
  ],
  VISIT_RESULTS: [
    'Sem Interesse Inicial',
    'Interesse Inicial / Agendamento',
    'Solicitou Proposta Comercial',
    'Agendou Demonstração Prática',
    'Venda Provável',
    'Venda Fechada',
    'Manutenção Concluída',
    'Precisa de Novo Retorno'
  ],
  SPRAYER_BRANDS: [
    'Jacto',
    'John Deere',
    'Case IH',
    'Stara',
    'Kuhn',
    'Fendt',
    'Massey Ferguson',
    'Valtra',
    'Pla',
    'Outra'
  ]
};
