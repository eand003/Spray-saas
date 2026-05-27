import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, MapPin, Sprout, ArrowLeft, Layers, Sliders, CheckSquare, Wrench, Trash2, Edit2 } from 'lucide-react';
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
  const [editingFarm, setEditingFarm] = useState(null);
  const [editingSprayer, setEditingSprayer] = useState(null);
  const [editingKit, setEditingKit] = useState(null);
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

  // ADD & EDIT FARM
  const handleOpenAddFarm = () => {
    setEditingFarm(null);
    setFarmForm({ name: '', city: selectedCustomer.city, state: selectedCustomer.state, area_hectares: '', notes: '' });
    setIsAddFarmOpen(true);
  };

  const handleOpenEditFarm = (farm) => {
    setEditingFarm(farm);
    setFarmForm({
      name: farm.name,
      city: farm.city || selectedCustomer.city,
      state: farm.state || selectedCustomer.state,
      area_hectares: farm.area_hectares || '',
      notes: farm.notes || ''
    });
    setIsAddFarmOpen(true);
  };

  const handleCreateFarm = async (e) => {
    e.preventDefault();
    if (!farmForm.name) return;
    try {
      setLoading(true);
      const payload = {
        name: farmForm.name,
        city: farmForm.city || selectedCustomer.city,
        state: farmForm.state || selectedCustomer.state,
        area_hectares: farmForm.area_hectares ? parseFloat(farmForm.area_hectares) : null,
        notes: farmForm.notes
      };

      if (editingFarm) {
        const { error } = await supabase.from('farms').update(payload).eq('id', editingFarm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('farms').insert({
          customer_id: selectedCustomer.id,
          ...payload
        });
        if (error) throw error;
      }

      setIsAddFarmOpen(false);
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers(); // Refresh all summaries in background card cache
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFarm = async (farmId, farmName) => {
    const confirmDelete = window.confirm(`Tem certeza de que deseja excluir a fazenda "${farmName}"?`);
    if (!confirmDelete) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('farms').delete().eq('id', farmId);
      if (error) throw error;
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers();
    } catch (err) {
      alert('Erro ao excluir fazenda: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD & EDIT SPRAYER
  const handleOpenAddSprayer = () => {
    setEditingSprayer(null);
    setSprayerForm({ brand: 'Jacto', model: '', year: '', serial_number: '', boom_width_m: '', nozzle_count: '', nozzle_spacing_cm: '', controller_monitor: '', current_nozzle_model: '', flow_rate_l_ha: '', working_speed_km_h: '', kit_status: 'no_kit', notes: '', farm_id: farms[0]?.id || '' });
    setIsAddSprayerOpen(true);
  };

  const handleOpenEditSprayer = (sprayer) => {
    setEditingSprayer(sprayer);
    setSprayerForm({
      brand: sprayer.brand,
      model: sprayer.model,
      year: sprayer.year || '',
      serial_number: sprayer.serial_number || '',
      boom_width_m: sprayer.boom_width_m || '',
      nozzle_count: sprayer.nozzle_count || '',
      nozzle_spacing_cm: sprayer.nozzle_spacing_cm || '',
      controller_monitor: sprayer.controller_monitor || '',
      current_nozzle_model: sprayer.current_nozzle_model || '',
      flow_rate_l_ha: sprayer.flow_rate_l_ha || '',
      working_speed_km_h: sprayer.working_speed_km_h || '',
      kit_status: sprayer.kit_status || 'no_kit',
      notes: sprayer.notes || '',
      farm_id: selectedCustomer.id // Bypass DB schema constraint
    });
    setIsAddSprayerOpen(true);
  };

  const handleCreateSprayer = async (e) => {
    e.preventDefault();
    if (!sprayerForm.model) {
      alert('Modelo é obrigatório.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
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

      if (editingSprayer) {
        const { error } = await supabase.from('sprayers').update(payload).eq('id', editingSprayer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sprayers').insert({
          customer_id: selectedCustomer.id,
          farm_id: selectedCustomer.id, // Bypass DB fkey constraint
          ...payload
        });
        if (error) throw error;
      }

      setIsAddSprayerOpen(false);
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers(); // Refresh all summaries in background card cache
    } catch (err) {
      alert('Erro ao salvar pulverizador: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSprayer = async (sprayerId, sprayerName) => {
    const confirmDelete = window.confirm(`Tem certeza de que deseja excluir a máquina "${sprayerName}"?`);
    if (!confirmDelete) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('sprayers').delete().eq('id', sprayerId);
      if (error) throw error;
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers();
    } catch (err) {
      alert('Erro ao excluir máquina: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD & EDIT KIT
  const handleOpenAddKit = () => {
    setEditingKit(null);
    setKitForm({ kit_number: '', sprayer_id: sprayers[0]?.id || '', version: 'Bico Eletrostático Localizado V2', panel_serial_number: '', installed_points_count: sprayers[0]?.nozzle_count || '', sale_date: '', installation_date: '', warranty_until: '', status: 'installed', technical_notes: '', farm_id: farms[0]?.id || '' });
    setIsAddKitOpen(true);
  };

  const handleOpenEditKit = (kit) => {
    setEditingKit(kit);
    setKitForm({
      kit_number: kit.kit_number,
      sprayer_id: kit.sprayer_id,
      version: kit.version || 'Bico Eletrostático Localizado V2',
      panel_serial_number: kit.panel_serial_number || '',
      installed_points_count: kit.installed_points_count || '',
      sale_date: kit.sale_date || '',
      installation_date: kit.installation_date || '',
      warranty_until: kit.warranty_until || '',
      status: kit.status || 'installed',
      technical_notes: kit.technical_notes || '',
      farm_id: selectedCustomer.id // Bypass DB fkey constraint
    });
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
        sprayer_id: kitForm.sprayer_id,
        kit_number: kitForm.kit_number,
        version: kitForm.version,
        panel_serial_number: kitForm.panel_serial_number,
        installed_points_count: kitForm.installed_points_count ? parseInt(kitForm.installed_points_count) : null,
        sale_date: kitForm.sale_date || null,
        installation_date: kitForm.installation_date || null,
        warranty_until: kitForm.warranty_until || null,
        status: kitForm.status,
        technical_notes: kitForm.technical_notes
      };

      if (editingKit) {
        const { error: kitErr } = await supabase.from('kits').update(payload).eq('id', editingKit.id);
        if (kitErr) throw kitErr;
      } else {
        const { error: kitErr } = await supabase.from('kits').insert({
          customer_id: selectedCustomer.id,
          farm_id: selectedCustomer.id, // Bypass DB fkey constraint
          seller_id: user.id,
          ...payload
        });
        if (kitErr) throw kitErr;

        // Update sprayer status to 'installed'
        await supabase.from('sprayers').update({ kit_status: 'installed' }).eq('id', kitForm.sprayer_id);
      }

      setIsAddKitOpen(false);
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers(); // Refresh all summaries in background card cache
    } catch (err) {
      alert('Erro ao salvar Kit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKit = async (kitId, kitNumber) => {
    const confirmDelete = window.confirm(`Tem certeza de que deseja excluir o Kit "${kitNumber}"?`);
    if (!confirmDelete) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('kits').delete().eq('id', kitId);
      if (error) throw error;
      fetchCustomerRelations(selectedCustomer.id);
      fetchCustomers();
    } catch (err) {
      alert('Erro ao excluir kit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisitForCustomer = () => {
    setPreselectedLeadForVisit({ id: selectedCustomer.id, name: selectedCustomer.name, isLead: false });
    setCurrentTab('visits');
  };

  return (
    <div style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
      {/* 1. DIRECTORY LIST OR DUAL LAYER DETAILS */}
      {!selectedCustomer ? (
        <div style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
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
                    {(customerSprayers.length > 0 || customerFarms.length > 0 || hasKit) && (
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
                        {/* Sprayers Map */}
                        {customerSprayers.map((s, idx) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px' }}>🚜</span> 
                            <span>
                              <strong>Máquina {customerSprayers.length > 1 ? `${idx + 1}` : ''}:</strong> {s.brand} {s.model}
                              {s.kit_status === 'installed' ? ' (Com Kit Eletrostático ⚡)' : ' (Sem Kit)'}
                            </span>
                          </div>
                        ))}
                        
                        {/* Farms Map */}
                        {customerFarms.map((f, idx) => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px' }}>🌾</span> 
                            <span>
                              <strong>Propriedade {customerFarms.length > 1 ? `${idx + 1}` : ''}:</strong> {f.name} {f.area_hectares ? `(${f.area_hectares} ha)` : ''}
                            </span>
                          </div>
                        ))}

                        {/* Kits Map */}
                        {customerKits.map((k, idx) => (
                          <div key={k.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                            <div style={{ color: 'var(--primary-dark)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '14px' }}>⚡</span>
                              <span><strong>Kit {customerKits.length > 1 ? `${idx + 1}` : ''}:</strong> {k.kit_number}</span>
                            </div>
                            {k.warranty_until && (
                              <div style={{ color: '#d97706', fontSize: '11.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '2px' }}>
                                <span style={{ fontSize: '12px' }}>🛡️</span>
                                <span>Garantia ativa até {formatDate(k.warranty_until)}</span>
                              </div>
                            )}
                          </div>
                        ))}
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
        <div style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
          {/* NATIVE APP-LIKE COMPACT STICKY HEADER */}
          <div className="detail-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px',
            backgroundColor: 'var(--white)',
            padding: '16px',
            borderBottom: '1px solid var(--gray-200)',
            margin: '-24px -20px 16px -20px',
            position: 'sticky',
            top: 'var(--nav-height)',
            zIndex: 10
          }}>
            {/* Back button arrow icon */}
            <button 
              onClick={() => setSelectedCustomer(null)} 
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'var(--gray-100)',
                color: 'var(--gray-700)',
                flexShrink: 0
              }}
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>

            {/* Title & Subtitle */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--gray-900)' }}>
                {selectedCustomer.name}
              </h2>
              <p style={{ color: 'var(--gray-500)', fontSize: '12px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginTop: '1px' }}>
                📍 {selectedCustomer.city} - {selectedCustomer.state} {selectedCustomer.company_name ? `• ${selectedCustomer.company_name}` : ''}
              </p>
            </div>

            {/* Trash button icon */}
            <button
              onClick={() => handleDeleteCustomer(selectedCustomer)}
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.1)',
                flexShrink: 0
              }}
              title="Excluir Cliente"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Swipeable Tabs Bar */}
          <div className="tabs-container scroll-hide" style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            flexWrap: 'nowrap', 
            width: '100%',
            maxWidth: '100%',
            borderBottom: '1px solid var(--gray-200)',
            marginBottom: '16px', 
            gap: '8px',
            WebkitOverflowScrolling: 'touch' /* Smooth momentum scrolling on iOS */
          }}>
            <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
              Resumo
            </button>
            <button className={`tab-btn ${activeTab === 'farms' ? 'active' : ''}`} onClick={() => setActiveTab('farms')}>
              Fazendas ({farms.length})
            </button>
            <button className={`tab-btn ${activeTab === 'sprayers' ? 'active' : ''}`} onClick={() => setActiveTab('sprayers')}>
              Máquinas ({sprayers.length})
            </button>
            <button className={`tab-btn ${activeTab === 'kits' ? 'active' : ''}`} onClick={() => setActiveTab('kits')}>
              Kits ({kits.length})
            </button>
            <button className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => setActiveTab('visits')}>
              Visitas ({visits.length})
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="tab-content-area">
            
            {/* SUB-TAB 1: SUMMARY / 360° DASHBOARD */}
            {activeTab === 'summary' && (
              <div className="flex flex-col gap-4" style={{ width: '100%' }}>
                {/* 1. DADOS DE CONTATO & OBSERVAÇÕES */}
                <div className="card">
                  <h3 style={{ fontSize: '15px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px', color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📞</span> Dados de Contato
                  </h3>
                  <div className="flex flex-col gap-2" style={{ fontSize: '13.5px' }}>
                    <div><strong>WhatsApp:</strong> {selectedCustomer.phone}</div>
                    {selectedCustomer.email && <div><strong>E-mail:</strong> {selectedCustomer.email}</div>}
                    {selectedCustomer.document && <div><strong>CPF/CNPJ:</strong> {selectedCustomer.document}</div>}
                    {selectedCustomer.notes && (
                      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)', fontSize: '13px' }}>
                        <strong>Observações Comerciais:</strong>
                        <p style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--gray-600)' }}>"{selectedCustomer.notes}"</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions - stacked vertically on mobile for native app touch targets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <a 
                      href={`https://wa.me/55${selectedCustomer.phone}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn"
                      style={{ 
                        backgroundColor: '#25d366', 
                        color: 'var(--white)',
                        fontWeight: '700',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 10px rgba(37, 211, 102, 0.15)'
                      }}
                    >
                      <Phone size={16} />
                      Chamar no WhatsApp
                    </a>
                    <button 
                      onClick={handleCreateVisitForCustomer} 
                      className="btn btn-primary"
                      style={{ 
                        fontWeight: '700',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <MapPin size={16} />
                      Registrar Nova Visita
                    </button>
                  </div>
                </div>

                {/* 2. ESTRUTURA OPERACIONAL (FAZENDAS & MÁQUINAS) */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px' }}>
                    <h3 style={{ fontSize: '15px', color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🌾</span> Propriedades e Lavouras ({farms.length})
                    </h3>
                    <button onClick={() => setActiveTab('farms')} style={{ fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--primary-light)' }}>
                      Gerenciar →
                    </button>
                  </div>
                  {farms.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', fontStyle: 'italic' }}>Nenhuma fazenda cadastrada.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {farms.map((f, idx) => (
                        <div key={f.id} style={{ fontSize: '13px', padding: '8px 10px', backgroundColor: 'var(--gray-50)', borderRadius: '6px', borderLeft: '3px solid var(--gray-300)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: '700', color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {idx + 1}. {f.name} {f.area_hectares ? `(${f.area_hectares} ha)` : ''}
                            </div>
                            <div style={{ color: 'var(--gray-500)', fontSize: '12px', marginTop: '2px' }}>
                              📍 {f.city} - {f.state}
                            </div>
                          </div>
                          <button onClick={() => handleOpenEditFarm(f)} style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--white)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-500)' }} title="Editar fazenda">
                            <Edit2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px' }}>
                    <h3 style={{ fontSize: '15px', color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🚜</span> Frota de Pulverizadores ({sprayers.length})
                    </h3>
                    <button onClick={() => setActiveTab('sprayers')} style={{ fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--primary-light)' }}>
                      Gerenciar →
                    </button>
                  </div>
                  {sprayers.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', fontStyle: 'italic' }}>Nenhum pulverizador cadastrado.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sprayers.map((s, idx) => {
                        const farm = farms.find(f => f.id === s.farm_id);
                        return (
                          <div key={s.id} style={{ fontSize: '13px', padding: '8px 10px', backgroundColor: 'var(--gray-50)', borderRadius: '6px', borderLeft: s.kit_status === 'installed' ? '3px solid var(--primary)' : '3px solid var(--gray-300)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: '700', color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {idx + 1}. {s.brand} {s.model} {s.year ? `(${s.year})` : ''}
                              </div>
                              <div style={{ color: 'var(--gray-500)', fontSize: '12px', marginTop: '2px' }}>
                                Barra: {s.boom_width_m || '--'}m • {s.nozzle_count || '--'} bicos
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <span className={`badge ${s.kit_status === 'installed' ? 'badge-won' : 'badge-no_fit'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                {s.kit_status === 'installed' ? 'Kit ⚡' : 'Sem Kit'}
                              </span>
                              <button onClick={() => handleOpenEditSprayer(s)} style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--white)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-500)' }} title="Editar máquina">
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. TECNOLOGIA SPRAY PRECISION & GARANTIAS */}
                {kits.length > 0 && (
                  <div className="card" style={{ borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--primary-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span> Tecnologia Spray Precision ({kits.length})
                      </h3>
                      <button onClick={() => setActiveTab('kits')} style={{ fontSize: '12px', color: 'var(--primary-dark)', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', fontWeight: '600', padding: '4px 8px', borderRadius: '6px' }}>
                        Gerenciar →
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {kits.map((k, idx) => {
                        const sprayer = sprayers.find(s => s.id === k.sprayer_id);
                        return (
                          <div key={k.id} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong style={{ color: 'var(--primary-dark)' }}>Kit {kits.length > 1 ? `${idx + 1}:` : ''} {k.kit_number}</strong>
                                <span className="badge badge-won" style={{ fontSize: '10px', padding: '2px 6px' }}>Ativo</span>
                              </div>
                              <div style={{ color: 'var(--gray-700)', fontSize: '12.5px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div><strong>Equipamento:</strong> {sprayer ? `${sprayer.brand} ${sprayer.model}` : 'Pulverizador'}</div>
                                <div><strong>Versão:</strong> {k.version}</div>
                                {k.warranty_until && (
                                  <div style={{ color: '#d97706', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                    <span>🛡️</span> Garantia válida até {formatDate(k.warranty_until)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button onClick={() => handleOpenEditKit(k)} style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-dark)', marginTop: '2px' }} title="Editar kit">
                              <Edit2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. ÚLTIMA VISITA DE CAMPO */}
                <div className="card">
                  <h3 style={{ fontSize: '15px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px', color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📋</span> Última Visita de Campo
                  </h3>
                  {visits.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', fontStyle: 'italic' }}>Nenhuma visita registrada para este cliente.</p>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span className="badge badge-new" style={{ fontSize: '10px', padding: '2px 8px' }}>{visits[0].visit_type}</span>
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDate(visits[0].visit_datetime)}</span>
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--gray-800)' }}>
                        Resultado: {visits[0].result || 'Sem resultado'}
                      </div>
                      {visits[0].pains_identified && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
                          <strong>Dores identificadas:</strong> {visits[0].pains_identified}
                        </div>
                      )}
                      <p style={{ fontSize: '12.5px', color: 'var(--gray-500)', marginTop: '6px', fontStyle: 'italic', padding: '8px', backgroundColor: 'var(--gray-50)', borderRadius: '4px' }}>
                        "{visits[0].notes}"
                      </p>
                      {visits[0].next_visit_date && (
                        <div style={{ fontSize: '12px', color: 'var(--status-scheduled)', fontWeight: '700', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📆</span> Retorno Agendado: {formatDate(visits[0].next_visit_date)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: FARMS */}
            {activeTab === 'farms' && (
              <div className="flex flex-col gap-3">
                {/* Mobile-optimized header: stacks title and action button vertically to avoid horizontal overflow */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '15.5px', color: 'var(--gray-900)', fontWeight: '700' }}>Fazendas & Unidades</h3>
                  <button onClick={handleOpenAddFarm} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}>
                    <Plus size={14} /> Adicionar Fazenda
                  </button>
                </div>

                {farms.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '20px' }}>Nenhuma fazenda cadastrada.</p>
                ) : (
                  farms.map(f => (
                    <div key={f.id} className="mobile-card" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, wordBreak: 'break-word' }}>{f.name}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
                        📍 {f.city} - {f.state}
                      </p>
                      <div className="flex flex-wrap gap-2" style={{ marginTop: '10px', fontSize: '13px', wordBreak: 'break-word' }}>
                        {f.area_hectares && <span><strong>Área:</strong> {f.area_hectares} ha</span>}
                        {f.main_crops && f.main_crops.length > 0 && (
                          <span>• <strong>Culturas:</strong> {f.main_crops.join(', ')}</span>
                        )}
                      </div>
                      {f.notes && (
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '6px', fontStyle: 'italic', wordBreak: 'break-word' }}>
                          "{f.notes}"
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--gray-100)', paddingTop: '10px' }}>
                        <button onClick={() => handleOpenEditFarm(f)} className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <Edit2 size={12} /> Editar
                        </button>
                        <button onClick={() => handleDeleteFarm(f.id, f.name)} className="btn btn-danger" style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SUB-TAB 3: SPRAYERS MACHINERY */}
            {activeTab === 'sprayers' && (
              <div className="flex flex-col gap-3">
                {/* Mobile-optimized header: stacks title and action button vertically to avoid horizontal overflow */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '15.5px', color: 'var(--gray-900)', fontWeight: '700' }}>Máquinas & Pulverizadores</h3>
                  <button onClick={handleOpenAddSprayer} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }} disabled={farms.length === 0}>
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
                        <div className="detail-info-grid" style={{ borderTop: '1px solid var(--gray-200)' }}>
                          <div><span style={{ color: 'var(--gray-600)' }}>Barra:</span> <strong>{s.boom_width_m || '--'} m</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Bicos:</span> <strong>{s.nozzle_count || '--'} bicos</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Espaço:</span> <strong>{s.nozzle_spacing_cm || '--'} cm</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Modelo Bico:</span> <strong>{s.current_nozzle_model || '--'}</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Vazão Calda:</span> <strong>{s.flow_rate_l_ha || '--'} L/ha</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Velocidade:</span> <strong>{s.working_speed_km_h || '--'} km/h</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Nº Série:</span> <strong>{s.serial_number || '--'}</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Monitor:</span> <strong>{s.controller_monitor || '--'}</strong></div>
                        </div>
                        {s.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '6px', fontStyle: 'italic' }}>
                            "{s.notes}"
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--gray-200)', paddingTop: '10px' }}>
                          <button onClick={() => handleOpenEditSprayer(s)} className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Edit2 size={12} /> Editar
                          </button>
                          <button onClick={() => handleDeleteSprayer(s.id, `${s.brand} ${s.model}`)} className="btn btn-danger" style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SUB-TAB 4: INSTALLED SPRAY KITS */}
            {activeTab === 'kits' && (
              <div className="flex flex-col gap-3">
                {/* Mobile-optimized header: stacks title and action button vertically to avoid horizontal overflow */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '15.5px', color: 'var(--gray-900)', fontWeight: '700' }}>Tecnologia Spray Precision Instalada</h3>
                  <button onClick={handleOpenAddKit} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }} disabled={sprayers.length === 0}>
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
                        <div className="detail-info-grid" style={{ borderTop: '1px solid rgba(16, 185, 129, 0.15)', color: 'var(--gray-800)' }}>
                          <div><span style={{ color: 'var(--gray-600)' }}>Bicos Indução:</span> <strong>{k.installed_points_count || '--'}</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Versão Kit:</span> <strong>{k.version}</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Série Painel:</span> <strong>{k.panel_serial_number || '--'}</strong></div>
                          <div><span style={{ color: 'var(--gray-600)' }}>Garantia:</span> <strong style={{ color: '#d97706' }}>{k.warranty_until ? formatDate(k.warranty_until) : '--'}</strong></div>
                        </div>
                        {k.technical_notes && (
                          <div style={{ fontSize: '12px', color: 'var(--primary-dark)', marginTop: '8px', backgroundColor: 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '4px' }}>
                            <strong>Notas Técnicas:</strong> {k.technical_notes}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '10px' }}>
                          <button onClick={() => handleOpenEditKit(k)} className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Edit2 size={12} /> Editar
                          </button>
                          <button onClick={() => handleDeleteKit(k.id, k.kit_number)} className="btn btn-danger" style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SUB-TAB 5: VISITS TIMELINE */}
            {activeTab === 'visits' && (
              <div className="flex flex-col gap-3">
                {/* Mobile-optimized header: stacks title and action button vertically to avoid horizontal overflow */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '15.5px', color: 'var(--gray-900)', fontWeight: '700' }}>Histórico de Visitas de Campo</h3>
                  <button onClick={handleCreateVisitForCustomer} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}>
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
      <Modal isOpen={isAddFarmOpen} onClose={() => setIsAddFarmOpen(false)} title={editingFarm ? "Editar Fazenda" : "Adicionar Fazenda"}>
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
            {loading ? 'Salvando...' : (editingFarm ? 'Salvar Alterações' : 'Adicionar Fazenda')}
          </button>
        </form>
      </Modal>

      {/* C. ADD SPRAYER MACHINERY MODAL */}
      <Modal isOpen={isAddSprayerOpen} onClose={() => setIsAddSprayerOpen(false)} title={editingSprayer ? "Editar Pulverizador" : "Adicionar Pulverizador"}>
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
            {loading ? 'Salvando...' : (editingSprayer ? 'Salvar Alterações' : 'Adicionar Pulverizador')}
          </button>
        </form>
      </Modal>

      {/* D. ADD KIT SPRAY PRECISION MODAL */}
      <Modal isOpen={isAddKitOpen} onClose={() => setIsAddKitOpen(false)} title={editingKit ? "Editar Instalação de Kit" : "Registrar Instalação de Kit"}>
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
            {loading ? 'Salvando...' : (editingKit ? 'Salvar Alterações' : 'Registrar Instalação')}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
