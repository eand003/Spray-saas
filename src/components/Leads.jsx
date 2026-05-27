import React, { useState, useEffect } from 'react';
import { Target, Search, Filter, Phone, Calendar, Plus, Edit2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../config/supabase';
import { getLeadStatusLabel, formatDate, OPTIONS } from '../utils/helpers';
import Modal from './UI/Modal';

const Leads = ({ user, activeQuickAction, onClearQuickAction, setCurrentTab, setPreselectedLeadForVisit }) => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: '',
    state: 'SP',
    source: 'Indicação de Cliente',
    status: 'new',
    main_crop: 'Soja',
    estimated_sprayers_count: '',
    notes: '',
    next_action: '',
    next_action_date: ''
  });

  const isUserAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    fetchLeads();
  }, [user]);

  useEffect(() => {
    // Listen for dashboard quick action triggers
    if (activeQuickAction === 'add-lead') {
      handleOpenAddModal();
      onClearQuickAction();
    }
  }, [activeQuickAction]);

  useEffect(() => {
    // Dynamic filtering
    let result = leads;
    
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(l => 
        l.name.toLowerCase().includes(q) || 
        (l.company_name && l.company_name.toLowerCase().includes(q)) ||
        (l.contact_name && l.contact_name.toLowerCase().includes(q)) ||
        l.city.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== '') {
      result = result.filter(l => l.status === statusFilter);
    }
    
    setFilteredLeads(result);
  }, [search, statusFilter, leads]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let query = supabase.from('leads').select('*').eq('is_deleted', false);
      if (!isUserAdmin) {
        query = query.eq('owner_id', user.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (e) {
      console.error('Erro ao carregar leads:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      company_name: '',
      contact_name: '',
      phone: '',
      email: '',
      city: '',
      state: 'SP',
      source: 'Indicação de Cliente',
      status: 'new',
      main_crop: 'Soja',
      estimated_sprayers_count: '',
      notes: '',
      next_action: '',
      next_action_date: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      company_name: lead.company_name || '',
      contact_name: lead.contact_name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city,
      state: lead.state,
      source: lead.source || 'Indicação de Cliente',
      status: lead.status,
      main_crop: lead.main_crop || 'Soja',
      estimated_sprayers_count: lead.estimated_sprayers_count || '',
      notes: lead.notes || '',
      next_action: lead.next_action || '',
      next_action_date: lead.next_action_date || ''
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Quick validation
    if (!formData.name || !formData.phone || !formData.city || !formData.state) {
      alert('Por favor, preencha os campos obrigatórios: Nome, WhatsApp, Cidade e Estado.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        next_action_date: formData.next_action_date ? formData.next_action_date : null,
        next_action: formData.next_action ? formData.next_action : null,
        estimated_sprayers_count: formData.estimated_sprayers_count ? parseInt(formData.estimated_sprayers_count) : null,
        owner_id: editingLead ? editingLead.owner_id : user.id,
        created_by: editingLead ? editingLead.created_by : user.id
      };

      if (editingLead) {
        const { error } = await supabase.from('leads').update(payload).eq('id', editingLead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leads').insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchLeads();
    } catch (err) {
      alert('Erro ao salvar lead: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // FAST CRM PIPELINE TRANSITION: CONVERT LEAD TO ACTIVE CUSTOMER
  const handleConvertLead = async (lead) => {
    const confirmConversion = window.confirm(`Deseja converter o lead "${lead.name}" em Cliente oficial da Spray Precision? Isto criará um cadastro de cliente e uma fazenda automaticamente.`);
    if (!confirmConversion) return;

    try {
      setLoading(true);

      // 1. Create a Customer record
      const customerPayload = {
        organization_id: lead.organization_id,
        owner_id: lead.owner_id,
        name: lead.name,
        company_name: lead.company_name || lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        state: lead.state,
        notes: lead.notes ? `Convertido do Lead. Observações originais: ${lead.notes}` : 'Cliente convertido do Lead.',
        status: 'active',
        created_by: user.id
      };

      const { data: customerData, error: custErr } = await supabase
        .from('customers')
        .insert(customerPayload)
        .select()
        .single();

      if (custErr) throw custErr;

      // 2. Create an initial Farm record
      const farmPayload = {
        organization_id: lead.organization_id,
        customer_id: customerData.id,
        name: lead.company_name || 'Fazenda Principal',
        city: lead.city,
        state: lead.state,
        main_crops: lead.main_crop ? [lead.main_crop] : ['Soja'],
        notes: 'Fazenda inicial criada automaticamente na conversão do lead.'
      };

      const { error: farmErr } = await supabase.from('farms').insert(farmPayload);
      if (farmErr) throw farmErr;

      // 3. Update the Lead status to 'won' and save converted_customer_id reference
      const { error: leadErr } = await supabase
        .from('leads')
        .update({ status: 'won', converted_customer_id: customerData.id })
        .eq('id', lead.id);

      if (leadErr) throw leadErr;

      alert(`🎉 Lead "${lead.name}" convertido com absoluto sucesso! O Cliente e sua Fazenda inicial foram criados.`);
      
      // Update data and redirect to Customers tab
      fetchLeads();
      setCurrentTab('customers');

    } catch (err) {
      alert('Falha na conversão do lead: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (lead) => {
    const confirmDelete = window.confirm(`Tem certeza de que deseja excluir o lead "${lead.name}"?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('leads')
        .update({ is_deleted: true })
        .eq('id', lead.id);

      if (error) throw error;

      alert(`Lead "${lead.name}" excluído com sucesso.`);
      fetchLeads();
    } catch (err) {
      alert('Erro ao excluir lead: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisitForLead = (lead) => {
    setPreselectedLeadForVisit({ id: lead.id, name: lead.name, isLead: true });
    setCurrentTab('visits');
  };

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px' }}>Gestão de Leads (CRM)</h2>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Cadastrar Lead</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="search-filter-bar flex-col gap-2" style={{ display: 'flex', marginBottom: '24px' }}>
        <div className="search-input-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Buscar por produtor, fazenda, cidade..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex align-center gap-2" style={{ overflowX: 'auto', paddingBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Filtrar Status:
          </span>
          <button 
            className={`badge ${statusFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('')}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Todos
          </button>
          <button 
            className={`badge ${statusFilter === 'new' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('new')}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Novo
          </button>
          <button 
            className={`badge ${statusFilter === 'contact_made' ? 'badge-contact_made' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('contact_made')}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Contato
          </button>
          <button 
            className={`badge ${statusFilter === 'visit_scheduled' ? 'badge-scheduled' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('visit_scheduled')}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Visita
          </button>
          <button 
            className={`badge ${statusFilter === 'negotiating' ? 'badge-negotiating' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('negotiating')}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Negociação
          </button>
          <button 
            className={`badge ${statusFilter === 'won' ? 'badge-won' : 'badge-no_fit'}`}
            onClick={() => setStatusFilter('won')}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            Won (Fechado)
          </button>
        </div>
      </div>

      {/* LEADS LIST */}
      {loading && leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
          Nenhum lead encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="mobile-card-list">
          {filteredLeads.map((ld) => (
            <div key={ld.id} className="mobile-card">
              <div className="mobile-card-header">
                <div>
                  <h3 className="mobile-card-title">{ld.name}</h3>
                  <div className="mobile-card-subtitle">
                    <span>📍 {ld.city} - {ld.state}</span>
                    <span>•</span>
                    <span>🌾 {ld.main_crop || 'Sem cultura'}</span>
                  </div>
                </div>
                <span className={`badge badge-${ld.status}`}>
                  {getLeadStatusLabel(ld.status)}
                </span>
              </div>

              {ld.company_name && (
                <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                  <strong>Grupo:</strong> {ld.company_name}
                </div>
              )}

              {ld.next_action_date && (
                <div style={{ 
                  fontSize: '13px', 
                  backgroundColor: 'var(--gray-100)', 
                  padding: '8px 12px', 
                  borderRadius: 'var(--radius-sm)', 
                  marginBottom: '12px',
                  borderLeft: '3px solid var(--status-scheduled)'
                }}>
                  <div className="flex align-center gap-1" style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                    <Calendar size={14} />
                    Próxima ação: {formatDate(ld.next_action_date)}
                  </div>
                  <div style={{ color: 'var(--gray-600)', marginTop: '2px' }}>{ld.next_action}</div>
                </div>
              )}

              {ld.notes && (
                <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '12px', fontStyle: 'italic' }}>
                  "{ld.notes}"
                </p>
              )}

              {/* ACTION SHORTCUT BUTTONS */}
              <div className="mobile-card-actions">
                <a 
                  href={`https://wa.me/55${ld.phone}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="action-btn action-btn-whatsapp"
                >
                  <Phone size={14} />
                  WhatsApp
                </a>
                
                {ld.status !== 'won' && (
                  <>
                    <button 
                      onClick={() => handleCreateVisitForLead(ld)} 
                      className="action-btn action-btn-primary"
                    >
                      <Plus size={14} />
                      Nova Visita
                    </button>
                    <button 
                      onClick={() => handleConvertLead(ld)} 
                      className="action-btn"
                      style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                    >
                      <CheckCircle2 size={14} />
                      Converter
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => handleOpenEditModal(ld)} 
                  className="action-btn" 
                  style={{ flex: '0 0 auto', width: '40px' }}
                >
                  <Edit2 size={14} />
                </button>
                
                <button 
                  onClick={() => handleDeleteLead(ld)} 
                  className="action-btn" 
                  style={{ flex: '0 0 auto', width: '40px', color: '#ef4444', borderColor: '#ef4444' }}
                  title="Excluir Lead"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEAD CREATION / MODIFICATION MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingLead ? 'Editar Lead' : 'Cadastrar Novo Lead'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Produtor ou Fazenda *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              placeholder="Ex: José da Silva (Fazenda Recreio)"
              required 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>WhatsApp / Telefone *</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleInputChange} 
                placeholder="Ex: 16999998888"
                required 
              />
            </div>
            <div className="form-group">
              <label>E-mail (opcional)</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                placeholder="Ex: produtor@email.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Empresa ou Grupo Agrícola</label>
            <input 
              type="text" 
              name="company_name" 
              value={formData.company_name} 
              onChange={handleInputChange} 
              placeholder="Ex: Grupo Ferreira Agro"
            />
          </div>

          <div className="form-group">
            <label>Contato Principal da Fazenda</label>
            <input 
              type="text" 
              name="contact_name" 
              value={formData.contact_name} 
              onChange={handleInputChange} 
              placeholder="Ex: Marcos (Gerente de Campo)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cidade *</label>
              <input 
                type="text" 
                name="city" 
                value={formData.city} 
                onChange={handleInputChange} 
                placeholder="Ex: Ribeirão Preto"
                required 
              />
            </div>
            <div className="form-group">
              <label>Estado *</label>
              <select name="state" value={formData.state} onChange={handleInputChange}>
                {OPTIONS.STATES.map(st => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cultura Principal</label>
              <select name="main_crop" value={formData.main_crop} onChange={handleInputChange}>
                {OPTIONS.CROPS.map(cr => (
                  <option key={cr} value={cr}>{cr}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nº Pulverizadores Estimados</label>
              <input 
                type="number" 
                name="estimated_sprayers_count" 
                value={formData.estimated_sprayers_count} 
                onChange={handleInputChange} 
                placeholder="Ex: 2"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Origem do Lead</label>
              <select name="source" value={formData.source} onChange={handleInputChange}>
                {OPTIONS.LEAD_SOURCES.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status do Processo</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="new">Novo</option>
                <option value="contact_made">Contato feito</option>
                <option value="visit_scheduled">Visita agendada</option>
                <option value="visited">Visitado</option>
                <option value="negotiating">Em negociação</option>
                <option value="won">Fechado</option>
                <option value="lost">Perdido</option>
                <option value="no_fit">Sem fit</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ 
            border: '1px solid var(--gray-200)', 
            padding: '12px', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--gray-50)' 
          }}>
            <label style={{ color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} /> Próxima Ação Agendada (Opcional)
            </label>
            <div className="form-row" style={{ marginTop: '8px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Data Limite</label>
                <input 
                  type="date" 
                  name="next_action_date" 
                  value={formData.next_action_date} 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>O que fazer?</label>
                <input 
                  type="text" 
                  name="next_action" 
                  value={formData.next_action} 
                  onChange={handleInputChange} 
                  placeholder="Ex: Ligar para agendar"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Observações Gerais</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange} 
              placeholder="Dores identificadas, tamanho da propriedade, etc..."
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-large">
            {loading ? 'Salvando...' : editingLead ? 'Salvar Alterações' : 'Criar Lead'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Leads;
