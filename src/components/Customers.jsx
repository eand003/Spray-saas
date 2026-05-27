import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, MapPin, Sprout, ArrowLeft, Layers, Sliders, CheckSquare, Wrench, Trash2 } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatDate, OPTIONS } from '../utils/helpers';
import Modal from './UI/Modal';

const Customers = ({ user, setCurrentTab, setPreselectedLeadForVisit }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [search, setSearch] = useState('');
  
  // Selection & Details panel
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // summary, farms, sprayers, kits, visits
  
  // Dynamic collections for selected customer
  const [farms, setFarms] = useState([]);
  const [sprayers, setSprayers] = useState([]);
  const [kits, setKits] = useState([]);
  const [visits, setVisits] = useState([]);

  // Relationship cache for summaries in main customer list cards
  const [allFarms, setAllFarms] = useState([]);
  const [allSprayers, setAllSprayers] = useState([]);
  const [allKits, setAllKits] = useState([]);

  // Modal forms states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddFarmOpen, setIsAddFarmOpen] = useState(false);
  const [isAddSprayerOpen, setIsAddSprayerOpen] = useState(false);
  const [isAddKitOpen, setIsAddKitOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forms payloads
  const [customerForm, setCustomerForm] = useState({ name: '', company_name: '', document: '', phone: '', email: '', city: '', state: 'SP', notes: '' });
  const [farmForm, setFarmForm] = useState({ name: '', city: '', state: 'SP', area_hectares: '', notes: '' });
  const [sprayerForm, setSprayerForm] = useState({ brand: 'Jacto', model: '', year: '', serial_number: '', boom_width_m: '', nozzle_count: '', nozzle_spacing_cm: '', controller_monitor: '', current_nozzle_model: '', flow_rate_l_ha: '', working_speed_km_h: '', kit_status: 'no_kit', notes: '', farm_id: '' });
  const [kitForm, setKitForm] = useState({ kit_number: '', sprayer_id: '', version: 'Bico Eletrostático Localizado V2', panel_serial_number: '', installed_points_count: '', sale_date: '', installation_date: '', warranty_until: '', status: 'installed', technical_notes: '', farm_id: '' });

  const isUserAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerRelations(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    // Filter logic
    let res = customers;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      res = res.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.company_name && c.company_name.toLowerCase().includes(q)) || 
        c.city.toLowerCase().includes(q)
      );
    }
    setFilteredCustomers(res);
  }, [search, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let query = supabase.from('customers').select('*').eq('is_deleted', false);
      if (!isUserAdmin) {
        query = query.eq('owner_id', user.id);
      }
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      setCustomers(data || []);

      // Fetch all customer farms, sprayers, and kits to display on the cards
      const { data: farmsData } = await supabase.from('farms').select('*');
      const { data: sprayersData } = await supabase.from('sprayers').select('*');
      const { data: kitsData } = await supabase.from('kits').select('*');
      
      setAllFarms(farmsData || []);
      setAllSprayers(sprayersData || []);
      setAllKits(kitsData || []);
    } catch (e) {
      console.error('Erro ao buscar clientes e relações:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerRelations = async (customerId) => {
    try {
      // Farms
      const { data: farmsData } = await supabase.from('farms').select('*').eq('customer_id', customerId);
      setFarms(farmsData || []);

      // Sprayers
      const { data: sprayersData } = await supabase.from('sprayers').select('*').eq('customer_id', customerId);
      setSprayers(sprayersData || []);

      // Kits
      const { data: kitsData } = await supabase.from('kits').select('*').eq('customer_id', customerId);
      setKits(kitsData || []);

      // Visits
      const { data: visitsData } = await supabase.from('visits').select('*').eq('customer_id', customerId).order('visit_datetime', { ascending: false });
      setVisits(visitsData || []);
    } catch (err) {
      console.error('Erro ao buscar relações:', err);
    }
  };

  // ADD CUSTOMER
  const handleOpenAddCustomer = () => {
    setCustomerForm({ name: '', company_name: '', document: '', phone: '', email: '', city: '', state: 'SP', notes: '' });
    setIsAddCustomerOpen(true);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.phone || !customerForm.city || !customerForm.state) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...customerForm,
        owner_id: user.id,
        created_by: user.id
      };
      const { data, error } = await supabase.from('customers').insert(payload).select().single();
      if (error) throw error;

      // Create a default Farm instantly
      await supabase.from('farms').insert({
        customer_id: data.id,
        name: customerForm.company_name || 'Fazenda Sede',
        city: customerForm.city,
        state: customerForm.state,
        notes: 'Fazenda padrão criada automaticamente.'
      });

      setIsAddCustomerOpen(false);
      fetchCustomers();
      setSelectedCustomer(data); // Open details panel for newly created customer
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    const confirmDelete = window.confirm(`Tem certeza de que deseja excluir o cliente "${customer.name}"? Esta ação ocultará o cliente e todas as suas fazendas e máquinas associadas.`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('customers')
        .update({ is_deleted: true })
        .eq('id', customer.id);

      if (error) throw error;

      alert(`Cliente "${customer.name}" excluído com sucesso.`);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert('Erro ao excluir cliente: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD FARM
  const handleOpenAddFarm = () => {
    setFarmForm({ name: '', city: selectedCustomer.city, state: selectedCustomer.state, area_hectares: '', notes: '' });
    setIsAddFarmOpen(true);
  };

  const handleCreateFarm = async (e) => {
    e.preventDefault();
    if (!farmForm.name) return;
    try {
      setLoading(true);
      const payload = {
        customer_id: selectedCustomer.id,
        name: farmForm.name,
        city: farmForm.city || selectedCustomer.city,
        state: farmForm.state || selectedCustomer.state,
        area_hectares: farmForm.area_hectares ? parseFloat(farmForm.area_hectares) : null,
        notes: farmForm.notes
      };
      const { error } = await supabase.from('farms').insert(payload);
      if (error) throw error;
      setIsAddFarmOpen(false);
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers(); // Refresh all summaries in background card cache
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD SPRAYER
  const handleOpenAddSprayer = () => {
    setSprayerForm({ brand: 'Jacto', model: '', year: '', serial_number: '', boom_width_m: '', nozzle_count: '', nozzle_spacing_cm: '', controller_monitor: '', current_nozzle_model: '', flow_rate_l_ha: '', working_speed_km_h: '', kit_status: 'no_kit', notes: '', farm_id: farms[0]?.id || '' });
    setIsAddSprayerOpen(true);
  };

  const handleCreateSprayer = async (e) => {
    e.preventDefault();
    if (!sprayerForm.model || !sprayerForm.farm_id) {
      alert('Modelo e Fazenda vinculada são obrigatórios.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        customer_id: selectedCustomer.id,
        // Bypass database schema bug: sp_machines_farm_id_fkey points to sp_customers(id) instead of sp_farms(id)
        farm_id: selectedCustomer.id, 
        brand: sprayerForm.brand,
        model: sprayerForm.model,
        year: sprayerForm.year ? parseInt(sprayerForm.year) : null,
        serial_number: sprayerForm.serial_number,
        boom_width_m: sprayerForm.boom_width_m ? parseFloat(sprayerForm.boom_width_m) : null,
        nozzle_count: sprayerForm.nozzle_count ? parseInt(sprayerForm.nozzle_count) : null,
        nozzle_spacing_cm: sprayerForm.nozzle_spacing_cm ? parseInt(sprayerForm.nozzle_spacing_cm) : null,
        controller_monitor: sprayerForm.controller_monitor,
        current_nozzle_model: sprayerForm.current_nozzle_model,
        flow_rate_l_ha: sprayerForm.flow_rate_l_ha ? parseFloat(sprayerForm.flow_rate_l_ha) : null,
        working_speed_km_h: sprayerForm.working_speed_km_h ? parseFloat(sprayerForm.working_speed_km_h) : null,
        kit_status: sprayerForm.kit_status,
        notes: sprayerForm.notes
      };
      const { error } = await supabase.from('sprayers').insert(payload);
      if (error) throw error;
      setIsAddSprayerOpen(false);
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers(); // Refresh all summaries in background card cache
    } catch (err) {
      alert('Erro ao salvar pulverizador: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD KIT
  const handleOpenAddKit = () => {
    setKitForm({ kit_number: '', sprayer_id: sprayers[0]?.id || '', version: 'Bico Eletrostático Localizado V2', panel_serial_number: '', installed_points_count: sprayers[0]?.nozzle_count || '', sale_date: '', installation_date: '', warranty_until: '', status: 'installed', technical_notes: '', farm_id: farms[0]?.id || '' });
    setIsAddKitOpen(true);
  };

  const handleCreateKit = async (e) => {
    e.preventDefault();
    if (!kitForm.kit_number || !kitForm.sprayer_id) {
      alert('Nº do Kit e Pulverizador são obrigatórios.');
      return;
    }
    try {
      setLoading(true);
      
      const payload = {
        customer_id: selectedCustomer.id,
        // Bypass database schema bug: sp_kits_farm_id_fkey points to sp_customers(id) instead of sp_farms(id)
        farm_id: selectedCustomer.id, 
        sprayer_id: kitForm.sprayer_id,
        kit_number: kitForm.kit_number,
        version: kitForm.version,
        panel_serial_number: kitForm.panel_serial_number,
        installed_points_count: kitForm.installed_points_count ? parseInt(kitForm.installed_points_count) : null,
        sale_date: kitForm.sale_date || null,
        installation_date: kitForm.installation_date || null,
        warranty_until: kitForm.warranty_until || null,
        status: kitForm.status,
        seller_id: user.id,
        technical_notes: kitForm.technical_notes
      };

      const { error: kitErr } = await supabase.from('kits').insert(payload);
      if (kitErr) throw kitErr;

      // Update sprayer status to 'installed'
      await supabase.from('sprayers').update({ kit_status: 'installed' }).eq('id', kitForm.sprayer_id);

      setIsAddKitOpen(false);
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers(); // Refresh all summaries in background card cache
    } catch (err) {
      alert('Erro ao salvar Kit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisitForCustomer = () => {
    setPreselectedLeadForVisit({ id: selectedCustomer.id, name: selectedCustomer.name, isLead: false });
    setCurrentTab('visits');
  };

  return (
    <div>
      {/* 1. DIRECTORY LIST OR DUAL LAYER DETAILS */}
      {!selectedCustomer ? (
        <div>
          <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px' }}>Carteira de Clientes</h2>
            <button onClick={handleOpenAddCustomer} className="btn btn-primary">
              <Plus size={18} />
              <span>Novo Cliente</span>
            </button>
          </div>

          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Buscar por cliente, fazenda, cidade..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading && customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Carregando carteira...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className="mobile-card-list">
              {filteredCustomers.map((cust) => {
                const customerSprayers = allSprayers.filter(s => s.customer_id === cust.id);
                const customerFarms = allFarms.filter(f => f.customer_id === cust.id);
                const customerKits = allKits.filter(k => k.customer_id === cust.id);
                const hasKit = customerKits.length > 0;

                return (
                  <div 
                    key={cust.id} 
                    className="mobile-card" 
                    onClick={() => { setSelectedCustomer(cust); setActiveTab('summary'); }}
                    style={{ cursor: 'pointer', borderLeft: hasKit ? '4px solid var(--primary)' : '1px solid var(--gray-200)' }}
                  >
                    <div className="mobile-card-header">
                      <div>
                        <h3 className="mobile-card-title">{cust.name}</h3>
                        <div className="mobile-card-subtitle">
                          <span>📍 {cust.city} - {cust.state}</span>
                        </div>
                      </div>
                      <span className={`badge ${hasKit ? 'badge-won' : 'badge-no_fit'}`}>
                        {hasKit ? 'Instalado' : 'Ativo'}
                      </span>
                    </div>

                    {cust.company_name && cust.company_name !== cust.name && (
                      <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                        <strong>Fazenda/Grupo:</strong> {cust.company_name}
                      </div>
                    )}

                    {/* Rich visual relationships summaries exactly like the pitch demo card */}
                    {customerSprayers.length > 0 && (
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--gray-700)', 
                        marginTop: '8px', 
                        borderTop: '1px solid var(--gray-100)', 
                        paddingTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>🚜</span> 
                          <span><strong>Máquina:</strong> {customerSprayers[0].brand} {customerSprayers[0].model}</span>
                        </div>
                        
                        {customerFarms.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px' }}>🌾</span> 
                            <span><strong>Propriedade:</strong> {customerFarms[0].name} {customerFarms[0].area_hectares ? `(${customerFarms[0].area_hectares} ha)` : ''}</span>
                          </div>
                        )}

                        {hasKit && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                            <div style={{ color: 'var(--primary-dark)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '14px' }}>⚡</span>
                              <span><strong>Kit Eletrostático:</strong> {customerKits[0].kit_number}</span>
                            </div>
                            {customerKits[0].warranty_until && (
                              <div style={{ color: '#d97706', fontSize: '11.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '2px' }}>
                                <span style={{ fontSize: '12px' }}>🛡️</span>
                                <span>Garantia ativa até {formatDate(customerKits[0].warranty_until)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between align-center" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '10px', marginTop: '10px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Ver Detalhes do Cliente</span>
                      <ArrowLeft size={16} style={{ transform: 'rotate(180deg)', color: 'var(--primary)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2. DYNAMIC COMPREHENSIVE DETAIL TABS PANEL */
        <div>
          {/* Back to list */}
          <button 
            onClick={() => setSelectedCustomer(null)} 
            className="btn btn-secondary" 
            style={{ marginBottom: '16px', display: 'inline-flex', padding: '8px 16px' }}
          >
            <ArrowLeft size={16} />
            <span>Voltar para Lista</span>
          </button>

          {/* Customer Header card */}
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px' }}>{selectedCustomer.name}</h2>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
                📍 {selectedCustomer.city} - {selectedCustomer.state} {selectedCustomer.company_name ? `• ${selectedCustomer.company_name}` : ''}
              </p>
            </div>
            <button
              onClick={() => handleDeleteCustomer(selectedCustomer)}
              className="btn btn-secondary"
              style={{ color: '#ef4444', borderColor: '#ef4444', padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Excluir Cliente"
            >
              <Trash2 size={14} />
              <span>Excluir</span>
            </button>
          </div>

          {/* Swipeable Tabs Bar */}
          <div className="tabs-container">
            <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
              Resumo
            </button>
            <button className={`tab-btn ${activeTab === 'farms' ? 'active' : ''}`} onClick={() => setActiveTab('farms')}>
              Fazendas ({farms.length})
            </button>
            <button className={`tab-btn ${activeTab === 'sprayers' ? 'active' : ''}`} onClick={() => setActiveTab('sprayers')}>
              Pulverizadores ({sprayers.length})
            </button>
            <button className={`tab-btn ${activeTab === 'kits' ? 'active' : ''}`} onClick={() => setActiveTab('kits')}>
              Kits Spray ({kits.length})
            </button>
            <button className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => setActiveTab('visits')}>
              Visitas ({visits.length})
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="tab-content-area">
            
            {/* SUB-TAB 1: SUMMARY */}
            {activeTab === 'summary' && (
              <div className="flex flex-col gap-4">
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px' }}>
                    Dados de Contato
                  </h3>
                  <div className="flex flex-col gap-2" style={{ fontSize: '14px' }}>
                    <div><strong>Contato WhatsApp:</strong> {selectedCustomer.phone}</div>
                    {selectedCustomer.email && <div><strong>E-mail:</strong> {selectedCustomer.email}</div>}
                    {selectedCustomer.document && <div><strong>Documento (CPF/CNPJ):</strong> {selectedCustomer.document}</div>}
                    {selectedCustomer.notes && (
                      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--gray-300)' }}>
                        <strong>Observações Comerciais:</strong>
                        <p style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--gray-600)' }}>"{selectedCustomer.notes}"</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Shortcuts */}
                  <div className="flex gap-2" style={{ marginTop: '20px' }}>
                    <a 
                      href={`https://wa.me/55${selectedCustomer.phone}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                      style={{ flex: 1, backgroundColor: '#25d366' }}
                    >
                      <Phone size={16} />
                      Chamar no WhatsApp
                    </a>
                    <button 
                      onClick={handleCreateVisitForCustomer} 
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      <MapPin size={16} />
                      Registrar Visita
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: FARMS */}
            {activeTab === 'farms' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between align-center">
                  <h3 style={{ fontSize: '16px' }}>Fazendas & Unidades</h3>
                  <button onClick={handleOpenAddFarm} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }}>
                    <Plus size={14} /> Adicionar Fazenda
                  </button>
                </div>

                {farms.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '20px' }}>Nenhuma fazenda cadastrada.</p>
                ) : (
                  farms.map(f => (
                    <div key={f.id} className="mobile-card">
                      <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{f.name}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
                        📍 {f.city} - {f.state}
                      </p>
                      <div className="flex flex-wrap gap-2" style={{ marginTop: '10px', fontSize: '13px' }}>
                        {f.area_hectares && <span><strong>Área:</strong> {f.area_hectares} ha</span>}
                        {f.main_crops && f.main_crops.length > 0 && (
                          <span>• <strong>Culturas:</strong> {f.main_crops.join(', ')}</span>
                        )}
                      </div>
                      {f.notes && (
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '6px', fontStyle: 'italic' }}>
                          "{f.notes}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SUB-TAB 3: SPRAYERS MACHINERY */}
            {activeTab === 'sprayers' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between align-center">
                  <h3 style={{ fontSize: '16px' }}>Máquinas & Pulverizadores</h3>
                  <button onClick={handleOpenAddSprayer} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} disabled={farms.length === 0}>
                    <Plus size={14} /> Adicionar Máquina
                  </button>
                </div>

                {farms.length === 0 && (
                  <div style={{ color: 'var(--status-lost)', fontSize: '13px', textAlign: 'center', padding: '12px', backgroundColor: 'var(--status-lost-bg)', borderRadius: 'var(--radius-sm)' }}>
                    Cadastre pelo menos uma fazenda antes de registrar máquinas.
                  </div>
                )}

                {sprayers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '20px' }}>Nenhum pulverizador cadastrado.</p>
                ) : (
                  sprayers.map(s => {
                    const farm = farms.find(f => f.id === s.farm_id);
                    return (
                      <div key={s.id} className="mobile-card" style={{ borderLeft: s.kit_status === 'installed' ? '4px solid var(--primary)' : '4px solid var(--gray-400)' }}>
                        <div className="flex justify-between align-center">
                          <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{s.brand} {s.model}</h4>
                          <span className={`badge ${s.kit_status === 'installed' ? 'badge-won' : 'badge-no_fit'}`}>
                            {s.kit_status === 'installed' ? 'Com Kit SP' : 'Sem Kit'}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
                          🚜 Fazenda: {farm ? farm.name : 'Sede'} {s.year ? `• Ano: ${s.year}` : ''}
                        </p>
                        <div className="grid grid-cols-2 gap-2" style={{ marginTop: '10px', fontSize: '13px' }}>
                          <div><strong>Barra:</strong> {s.boom_width_m || '--'} m</div>
                          <div><strong>Bicos Reais:</strong> {s.nozzle_count || '--'} bicos</div>
                          <div><strong>Espaçamento:</strong> {s.nozzle_spacing_cm || '--'} cm</div>
                          <div><strong>Bico Atual:</strong> {s.current_nozzle_model || '--'}</div>
                          <div><strong>Vazão Calda:</strong> {s.flow_rate_l_ha || '--'} L/ha</div>
                          <div><strong>Velocidade:</strong> {s.working_speed_km_h || '--'} km/h</div>
                          <div><strong>Série:</strong> {s.serial_number || '--'}</div>
                          <div><strong>Monitor:</strong> {s.controller_monitor || '--'}</div>
                        </div>
                        {s.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '6px', fontStyle: 'italic' }}>
                            "{s.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SUB-TAB 4: INSTALLED SPRAY KITS */}
            {activeTab === 'kits' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between align-center">
                  <h3 style={{ fontSize: '16px' }}>Tecnologia Spray Precision Instalada</h3>
                  <button onClick={handleOpenAddKit} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} disabled={sprayers.length === 0}>
                    <Plus size={14} /> Registrar Instalação
                  </button>
                </div>

                {sprayers.length === 0 && (
                  <div style={{ color: 'var(--status-lost)', fontSize: '13px', textAlign: 'center', padding: '12px', backgroundColor: 'var(--status-lost-bg)', borderRadius: 'var(--radius-sm)' }}>
                    Cadastre uma máquina/pulverizador antes de vincular um Kit Eletrostático.
                  </div>
                )}

                {kits.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '20px' }}>Nenhum kit Spray Precision instalado.</p>
                ) : (
                  kits.map(k => {
                    const sprayer = sprayers.find(s => s.id === k.sprayer_id);
                    return (
                      <div key={k.id} className="mobile-card" style={{ borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--primary-light)' }}>
                        <div className="flex justify-between align-center">
                          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary-dark)' }}>Kit: {k.kit_number}</h4>
                          <span className="badge badge-won">INSTALADO</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '2px' }}>
                          🔧 Máquina: {sprayer ? `${sprayer.brand} ${sprayer.model}` : 'Pulverizador'}
                        </p>
                        <div className="grid grid-cols-2 gap-2" style={{ marginTop: '10px', fontSize: '13px', color: 'var(--gray-800)' }}>
                          <div><strong>Pontos Indução:</strong> {k.installed_points_count || '--'} bicos</div>
                          <div><strong>Versão:</strong> {k.version}</div>
                          <div><strong>Painel Série:</strong> {k.panel_serial_number || '--'}</div>
                          <div><strong>Garantia:</strong> {k.warranty_until ? formatDate(k.warranty_until) : '--'}</div>
                        </div>
                        {k.technical_notes && (
                          <div style={{ fontSize: '12px', color: 'var(--primary-dark)', marginTop: '8px', backgroundColor: 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '4px' }}>
                            <strong>Notas Técnicas:</strong> {k.technical_notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SUB-TAB 5: VISITS TIMELINE */}
            {activeTab === 'visits' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between align-center">
                  <h3 style={{ fontSize: '16px' }}>Histórico de Visitas de Campo</h3>
                  <button onClick={handleCreateVisitForCustomer} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }}>
                    <Plus size={14} /> Registrar Nova Visita
                  </button>
                </div>

                {visits.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '20px' }}>Nenhuma visita registrada.</p>
                ) : (
                  <div className="timeline" style={{ marginTop: '10px' }}>
                    {visits.map(v => (
                      <div key={v.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-header">
                          <span>{v.visit_type}</span>
                          <span>{formatDate(v.visit_datetime)}</span>
                        </div>
                        <div className="timeline-title">Resultado: {v.result || 'Sem resultado'}</div>
                        
                        {v.pains_identified && (
                          <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '4px' }}>
                            <strong>Dores mapeadas:</strong> {v.pains_identified}
                          </div>
                        )}
                        
                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '4px', fontStyle: 'italic' }}>
                          "{v.notes}"
                        </p>

                        {v.next_visit_date && (
                          <div style={{ fontSize: '12px', color: 'var(--status-scheduled)', fontWeight: 600, marginTop: '4px' }}>
                            📆 Retorno agendado para: {formatDate(v.next_visit_date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================== MODALS DEFINITIONS ========================== */}

      {/* A. CLIENT CREATION MODAL */}
      <Modal isOpen={isAddCustomerOpen} onClose={() => setIsAddCustomerOpen(false)} title="Cadastrar Novo Cliente">
        <form onSubmit={handleCreateCustomer}>
          <div className="form-group">
            <label>Nome do Cliente / Proprietário *</label>
            <input 
              type="text" 
              value={customerForm.name} 
              onChange={e => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: José de Souza Martins" 
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>WhatsApp *</label>
              <input 
                type="tel" 
                value={customerForm.phone} 
                onChange={e => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Ex: 16999992222" 
                required
              />
            </div>
            <div className="form-group">
              <label>CPF ou CNPJ</label>
              <input 
                type="text" 
                value={customerForm.document} 
                onChange={e => setCustomerForm(prev => ({ ...prev, document: e.target.value }))}
                placeholder="Ex: 123.456.789-00" 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Fazenda Principal / Grupo Comercial</label>
            <input 
              type="text" 
              value={customerForm.company_name} 
              onChange={e => setCustomerForm(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Ex: Fazenda Recanto Verde" 
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cidade *</label>
              <input 
                type="text" 
                value={customerForm.city} 
                onChange={e => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ex: Sertãozinho" 
                required
              />
            </div>
            <div className="form-group">
              <label>Estado *</label>
              <select 
                value={customerForm.state} 
                onChange={e => setCustomerForm(prev => ({ ...prev, state: e.target.value }))}
              >
                {OPTIONS.STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Observações</label>
            <textarea 
              value={customerForm.notes} 
              onChange={e => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Histórico técnico, culturas cultivadas, perfil de compra..." 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar Cliente e Abrir Ficha'}
          </button>
        </form>
      </Modal>

      {/* B. ADD FARM MODAL */}
      <Modal isOpen={isAddFarmOpen} onClose={() => setIsAddFarmOpen(false)} title="Adicionar Fazenda">
        <form onSubmit={handleCreateFarm}>
          <div className="form-group">
            <label>Nome da Fazenda / Propriedade *</label>
            <input 
              type="text" 
              value={farmForm.name} 
              onChange={e => setFarmForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Sede Recanto Verde" 
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cidade</label>
              <input 
                type="text" 
                value={farmForm.city} 
                onChange={e => setFarmForm(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select 
                value={farmForm.state} 
                onChange={e => setFarmForm(prev => ({ ...prev, state: e.target.value }))}
              >
                {OPTIONS.STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Área em Hectares (opcional)</label>
            <input 
              type="number" 
              value={farmForm.area_hectares} 
              onChange={e => setFarmForm(prev => ({ ...prev, area_hectares: e.target.value }))}
              placeholder="Ex: 450" 
            />
          </div>
          <div className="form-group">
            <label>Diretrizes de Acesso / Notas</label>
            <textarea 
              value={farmForm.notes} 
              onChange={e => setFarmForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Instruções para chegar na fazenda..." 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Salvando...' : 'Adicionar Fazenda'}
          </button>
        </form>
      </Modal>

      {/* C. ADD SPRAYER MACHINERY MODAL */}
      <Modal isOpen={isAddSprayerOpen} onClose={() => setIsAddSprayerOpen(false)} title="Adicionar Pulverizador">
        <form onSubmit={handleCreateSprayer}>
          <div className="form-row">
            <div className="form-group">
              <label>Marca *</label>
              <select 
                value={sprayerForm.brand} 
                onChange={e => setSprayerForm(prev => ({ ...prev, brand: e.target.value }))}
              >
                {OPTIONS.SPRAYER_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Modelo *</label>
              <input 
                type="text" 
                value={sprayerForm.model} 
                onChange={e => setSprayerForm(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Ex: M4040 ou 3030" 
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Ano de Fabricação</label>
              <input 
                type="number" 
                value={sprayerForm.year} 
                onChange={e => setSprayerForm(prev => ({ ...prev, year: e.target.value }))}
                placeholder="Ex: 2021" 
              />
            </div>
            <div className="form-group">
              <label>Vincular à Fazenda *</label>
              <select 
                value={sprayerForm.farm_id} 
                onChange={e => setSprayerForm(prev => ({ ...prev, farm_id: e.target.value }))}
                required
              >
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Largura da Barra (m)</label>
              <input 
                type="number" 
                value={sprayerForm.boom_width_m} 
                onChange={e => setSprayerForm(prev => ({ ...prev, boom_width_m: e.target.value }))}
                placeholder="Ex: 36" 
              />
            </div>
            <div className="form-group">
              <label>Nº de Bicos Reais</label>
              <input 
                type="number" 
                value={sprayerForm.nozzle_count} 
                onChange={e => setSprayerForm(prev => ({ ...prev, nozzle_count: e.target.value }))}
                placeholder="Ex: 72" 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Espaçamento entre Bicos (cm)</label>
              <input 
                type="number" 
                value={sprayerForm.nozzle_spacing_cm} 
                onChange={e => setSprayerForm(prev => ({ ...prev, nozzle_spacing_cm: e.target.value }))}
                placeholder="Ex: 35 ou 50" 
              />
            </div>
            <div className="form-group">
              <label>Nº de Série da Máquina</label>
              <input 
                type="text" 
                value={sprayerForm.serial_number} 
                onChange={e => setSprayerForm(prev => ({ ...prev, serial_number: e.target.value }))}
                placeholder="Ex: JD999888" 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Monitor / Controlador</label>
              <input 
                type="text" 
                value={sprayerForm.controller_monitor} 
                onChange={e => setSprayerForm(prev => ({ ...prev, controller_monitor: e.target.value }))}
                placeholder="Ex: GreenStar 4" 
              />
            </div>
            <div className="form-group">
              <label>Modelo do Bico Instalado</label>
              <input 
                type="text" 
                value={sprayerForm.current_nozzle_model} 
                onChange={e => setSprayerForm(prev => ({ ...prev, current_nozzle_model: e.target.value }))}
                placeholder="Ex: TeeJet AIXR 11002" 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Vazão Calda Utilizada (L/ha)</label>
              <input 
                type="number" 
                value={sprayerForm.flow_rate_l_ha} 
                onChange={e => setSprayerForm(prev => ({ ...prev, flow_rate_l_ha: e.target.value }))}
                placeholder="Ex: 80" 
              />
            </div>
            <div className="form-group">
              <label>Velocidade de Trabalho (km/h)</label>
              <input 
                type="number" 
                value={sprayerForm.working_speed_km_h} 
                onChange={e => setSprayerForm(prev => ({ ...prev, working_speed_km_h: e.target.value }))}
                placeholder="Ex: 16" 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações da Máquina</label>
            <textarea 
              value={sprayerForm.notes} 
              onChange={e => setSprayerForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Condições operacionais, necessidades técnicas específicas..." 
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Salvando...' : 'Adicionar Pulverizador'}
          </button>
        </form>
      </Modal>

      {/* D. ADD KIT SPRAY PRECISION MODAL */}
      <Modal isOpen={isAddKitOpen} onClose={() => setIsAddKitOpen(false)} title="Registrar Instalação de Kit">
        <form onSubmit={handleCreateKit}>
          <div className="form-group">
            <label>Identificação do Kit (Nº Spray Precision) *</label>
            <input 
              type="text" 
              value={kitForm.kit_number} 
              onChange={e => setKitForm(prev => ({ ...prev, kit_number: e.target.value }))}
              placeholder="Ex: SP-091A" 
              required
            />
          </div>

          <div className="form-group">
            <label>Vincular ao Pulverizador *</label>
            <select 
              value={kitForm.sprayer_id} 
              onChange={e => setKitForm(prev => ({ ...prev, sprayer_id: e.target.value, installed_points_count: sprayers.find(s => s.id === e.target.value)?.nozzle_count || '' }))}
              required
            >
              {sprayers.map(s => <option key={s.id} value={s.id}>{s.brand} {s.model} ({s.serial_number || 'Sem série'})</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Pontos Eletrostáticos Instalados</label>
              <input 
                type="number" 
                value={kitForm.installed_points_count} 
                onChange={e => setKitForm(prev => ({ ...prev, installed_points_count: e.target.value }))}
                placeholder="Ex: 72" 
              />
            </div>
            <div className="form-group">
              <label>Versão / Tecnologia do Kit</label>
              <input 
                type="text" 
                value={kitForm.version} 
                onChange={e => setKitForm(prev => ({ ...prev, version: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Nº Série do Painel Eletrostático</label>
            <input 
              type="text" 
              value={kitForm.panel_serial_number} 
              onChange={e => setKitForm(prev => ({ ...prev, panel_serial_number: e.target.value }))}
              placeholder="Ex: PNL-777" 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de Venda</label>
              <input 
                type="date" 
                value={kitForm.sale_date} 
                onChange={e => setKitForm(prev => ({ ...prev, sale_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Data da Instalação</label>
              <input 
                type="date" 
                value={kitForm.installation_date} 
                onChange={e => setKitForm(prev => ({ ...prev, installation_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Fim da Garantia (Opcional)</label>
            <input 
              type="date" 
              value={kitForm.warranty_until} 
              onChange={e => setKitForm(prev => ({ ...prev, warranty_until: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Especificações Técnicas de Instalação</label>
            <textarea 
              value={kitForm.technical_notes} 
              onChange={e => setKitForm(prev => ({ ...prev, technical_notes: e.target.value }))}
              placeholder="Observações do anel indutor de inox, isolante, pressões e vazões recomendadas (evitar tensões numéricas)..." 
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Salvando...' : 'Registrar Instalação'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
