import React, { useState, useEffect } from 'react';
import { MapPin, Search, Calendar, Plus, Navigation, Image as ImageIcon, Camera, Check, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatDate, OPTIONS } from '../utils/helpers';
import Modal from './UI/Modal';

const Visits = ({ user, preselectedLeadForVisit, onClearPreselectedLead }) => {
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [editingVisit, setEditingVisit] = useState(null);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Geolocation state
  const [geoLocating, setGeoLocating] = useState(false);

  // Form payload
  const [formType, setFormType] = useState('customer'); // lead or customer
  const [visitForm, setVisitForm] = useState({
    lead_id: '',
    customer_id: '',
    farm_id: '',
    visit_type: 'Prospecção',
    visit_datetime: '',
    latitude: '',
    longitude: '',
    people_present: '',
    topics_discussed: '',
    pains_identified: '',
    machines_evaluated: '',
    commercial_potential: 'Médio',
    result: 'Interesse Inicial / Agendamento',
    next_step: '',
    next_visit_date: '',
    notes: ''
  });

  const [attachedPhoto, setAttachedPhoto] = useState(null); // stores photo url/blob

  const isUserAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    fetchVisits();
    fetchLeadsAndCustomers();
  }, [user]);

  useEffect(() => {
    // Handle redirect with pre-selected lead/customer from dashboard or CRM list
    if (preselectedLeadForVisit) {
      const { id, isLead } = preselectedLeadForVisit;
      setFormType(isLead ? 'lead' : 'customer');
      setVisitForm(prev => ({
        ...prev,
        lead_id: isLead ? id : '',
        customer_id: isLead ? '' : id,
        farm_id: ''
      }));
      
      // Auto open modal
      setIsAddVisitOpen(true);
      
      // Clear the trigger
      onClearPreselectedLead();
    }
  }, [preselectedLeadForVisit]);

  useEffect(() => {
    // When customer changes in form, load their farms
    if (formType === 'customer' && visitForm.customer_id) {
      fetchCustomerFarms(visitForm.customer_id);
    } else {
      setFarms([]);
    }
  }, [visitForm.customer_id, formType]);

  useEffect(() => {
    // Filter logic
    let res = visits;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      res = res.filter(v => 
        v.visit_type.toLowerCase().includes(q) || 
        (v.notes && v.notes.toLowerCase().includes(q)) || 
        (v.entityName && v.entityName.toLowerCase().includes(q))
      );
    }
    setFilteredVisits(res);
  }, [search, visits]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      let query = supabase.from('visits').select('*').eq('is_deleted', false);
      if (!isUserAdmin) {
        query = query.eq('owner_id', user.id);
      }
      const { data, error } = await query.order('visit_datetime', { ascending: false });
      if (error) throw error;

      // Resolve Entity names
      const leadsRes = await supabase.from('leads').select('id, name');
      const custsRes = await supabase.from('customers').select('id, name');

      // Fetch visit attachments
      const { data: attachments } = await supabase.from('visit_attachments').select('visit_id, file_url');

      const resolved = (data || []).map(visit => {
        let name = 'Desconhecido';
        if (visit.customer_id) {
          const c = (custsRes.data || []).find(cust => cust.id === visit.customer_id);
          name = c ? c.name : 'Cliente';
        } else if (visit.lead_id) {
          const l = (leadsRes.data || []).find(ld => ld.id === visit.lead_id);
          name = l ? l.name : 'Lead';
        }
        const att = (attachments || []).find(a => a.visit_id === visit.id);
        return { 
          ...visit, 
          entityName: name,
          photoUrl: att ? att.file_url : null
        };
      });

      setVisits(resolved);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsAndCustomers = async () => {
    try {
      let leadsQ = supabase.from('leads').select('id, name');
      let custsQ = supabase.from('customers').select('id, name');

      if (!isUserAdmin) {
        leadsQ = leadsQ.eq('owner_id', user.id);
        custsQ = custsQ.eq('owner_id', user.id);
      }

      const { data: leadsData } = await leadsQ;
      const { data: custsData } = await custsQ;

      setLeads(leadsData || []);
      setCustomers(custsData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomerFarms = async (customerId) => {
    try {
      const { data } = await supabase.from('farms').select('id, name').eq('customer_id', customerId);
      setFarms(data || []);
      if (data && data.length > 0) {
        setVisitForm(prev => ({ ...prev, farm_id: data[0].id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAddModal = () => {
    setEditingVisit(null);
    setVisitForm({
      lead_id: leads[0]?.id || '',
      customer_id: customers[0]?.id || '',
      farm_id: '',
      visit_type: 'Prospecção',
      visit_datetime: new Date().toISOString().substring(0, 16), // current datetime local
      latitude: '',
      longitude: '',
      people_present: '',
      topics_discussed: '',
      pains_identified: '',
      machines_evaluated: '',
      commercial_potential: 'Médio',
      result: 'Interesse Inicial / Agendamento',
      next_step: '',
      next_visit_date: '',
      notes: ''
    });
    setAttachedPhoto(null);
    setIsAddVisitOpen(true);
  };

  const handleOpenEditModal = (visit) => {
    setEditingVisit(visit);
    setFormType(visit.customer_id ? 'customer' : 'lead');
    setVisitForm({
      lead_id: visit.lead_id || '',
      customer_id: visit.customer_id || '',
      farm_id: visit.farm_id || '',
      visit_type: visit.visit_type || 'Prospecção',
      visit_datetime: visit.visit_datetime ? new Date(visit.visit_datetime).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16),
      latitude: visit.latitude || '',
      longitude: visit.longitude || '',
      people_present: visit.people_present || '',
      topics_discussed: visit.topics_discussed || '',
      pains_identified: visit.pains_identified || '',
      machines_evaluated: visit.machines_evaluated || '',
      commercial_potential: visit.commercial_potential || 'Médio',
      result: visit.result || 'Interesse Inicial / Agendamento',
      next_step: visit.next_step || '',
      next_visit_date: visit.next_visit_date || '',
      notes: visit.notes || ''
    });
    setAttachedPhoto(visit.photoUrl || null);
    setIsAddVisitOpen(true);
  };

  // INTEGRATED GEOLOCATION CAPTURE (Querying native device sensors)
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador ou dispositivo não possui suporte a geolocalização.');
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setVisitForm(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        }));
        setGeoLocating(false);
      },
      (error) => {
        console.error('Erro de GPS:', error);
        alert('Não foi possível obter sua localização exata. Verifique se o GPS e as permissões estão ativos.');
        setGeoLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      if (supabase.isMock) {
        // Mock DB: Simulate photo upload with beautiful ag-tech image from Unsplash
        const randomAgImages = [
          'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=600'
        ];
        const chosen = randomAgImages[Math.floor(Math.random() * randomAgImages.length)];
        setAttachedPhoto(chosen);
      } else {
        // Active Supabase: Upload to Storage Bucket 'visit-photos'
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage.from('visit-photos').upload(fileName, file);
        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage.from('visit-photos').getPublicUrl(fileName);
        setAttachedPhoto(urlData.publicUrl);
      }
    } catch (err) {
      alert('Falha no upload da foto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isLeadType = formType === 'lead';
    const activeTargetId = isLeadType ? visitForm.lead_id : visitForm.customer_id;

    if (!activeTargetId || !visitForm.notes) {
      alert('Selecione um alvo (Lead ou Cliente) e informe as anotações da visita.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        organization_id: user.user_metadata?.organization_id || 'org-spray-precision-001',
        owner_id: user.id,
        visit_type: visitForm.visit_type,
        visit_datetime: visitForm.visit_datetime ? new Date(visitForm.visit_datetime).toISOString() : new Date().toISOString(),
        latitude: visitForm.latitude ? parseFloat(visitForm.latitude) : null,
        longitude: visitForm.longitude ? parseFloat(visitForm.longitude) : null,
        maps_url: visitForm.latitude ? `https://www.google.com/maps?q=${visitForm.latitude},${visitForm.longitude}` : null,
        people_present: visitForm.people_present,
        topics_discussed: visitForm.topics_discussed,
        pains_identified: visitForm.pains_identified,
        machines_evaluated: visitForm.machines_evaluated,
        commercial_potential: visitForm.commercial_potential,
        result: visitForm.result,
        next_step: visitForm.next_step,
        next_visit_date: visitForm.next_visit_date || null,
        notes: visitForm.notes,
        created_by: user.id
      };

      if (isLeadType) {
        payload.lead_id = activeTargetId;
        
        // Also update next action date in leads table dynamically! Beautiful integration!
        if (visitForm.next_visit_date && visitForm.next_step) {
          await supabase.from('leads').update({
            status: 'visited',
            next_action_date: visitForm.next_visit_date,
            next_action: visitForm.next_step
          }).eq('id', activeTargetId);
        } else {
          await supabase.from('leads').update({ status: 'visited' }).eq('id', activeTargetId);
        }
      } else {
        payload.customer_id = activeTargetId;
        // Only send farm_id if it's a valid UUID from the loaded farms list
        // An empty string or invalid value would violate the FK constraint
        const validFarmId = farms.find(f => f.id === visitForm.farm_id);
        payload.farm_id = validFarmId ? visitForm.farm_id : null;

        // Also update customer table notes
        if (visitForm.next_visit_date) {
          await supabase.from('customers').update({ status: 'after_sales' }).eq('id', activeTargetId);
        }
      }

      let visitData;
      if (editingVisit) {
        const { data, error } = await supabase
          .from('visits')
          .update(payload)
          .eq('id', editingVisit.id)
          .select()
          .single();
        if (error) throw error;
        visitData = data;
      } else {
        const { data, error } = await supabase
          .from('visits')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        visitData = data;
      }

      // If photo was uploaded or changed, update attachment
      if (attachedPhoto && (!editingVisit || attachedPhoto !== editingVisit.photoUrl)) {
        if (editingVisit) {
          await supabase.from('visit_attachments').delete().eq('visit_id', editingVisit.id);
        }
        await supabase.from('visit_attachments').insert({
          organization_id: payload.organization_id,
          visit_id: visitData.id,
          file_url: attachedPhoto,
          file_type: 'image',
          description: 'Foto registrada durante a visita comercial.',
          created_by: user.id
        });
      } else if (!attachedPhoto && editingVisit && editingVisit.photoUrl) {
        await supabase.from('visit_attachments').delete().eq('visit_id', editingVisit.id);
      }

      setIsAddVisitOpen(false);
      fetchVisits();
    } catch (err) {
      alert('Erro ao registrar visita: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async (visit) => {
    const confirmDelete = window.confirm(`Tem certeza de que deseja excluir esta visita de "${visit.entityName}"?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('visits')
        .update({ is_deleted: true })
        .eq('id', visit.id);

      if (error) throw error;

      alert(`Visita excluída com sucesso.`);
      fetchVisits();
    } catch (err) {
      alert('Erro ao excluir visita: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px' }}>Visitas Comerciais e Técnicas</h2>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Registrar Visita</span>
        </button>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Buscar visitas por cultura, observações ou produtor..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && visits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando histórico...</div>
      ) : filteredVisits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
          Nenhuma visita registrada recentemente.
        </div>
      ) : (
        <div className="mobile-card-list">
          {filteredVisits.map((v) => (
            <div key={v.id} className="mobile-card" style={{ borderLeft: '4px solid var(--primary-dark)' }}>
              <div className="mobile-card-header">
                <div>
                  <h3 className="mobile-card-title">{v.entityName}</h3>
                  <div className="mobile-card-subtitle">
                    <span>📆 {formatDate(v.visit_datetime)}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{v.visit_type}</span>
                  </div>
                </div>
                <span className="badge badge-visited">{v.result?.substring(0, 15)}...</span>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--gray-800)', marginTop: '8px' }}>
                <strong>Resumo da Visita:</strong>
                <p style={{ marginTop: '4px', color: 'var(--gray-600)' }}>"{v.notes}"</p>
              </div>

              {v.machines_evaluated && (
                <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '6px' }}>
                  <strong>Máquinas avaliadas:</strong> {v.machines_evaluated}
                </div>
              )}

              {/* Geo Coordinate links */}
              {v.latitude && (
                <div className="flex justify-between align-center flex-wrap gap-2" style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--gray-50)', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  border: '1px solid var(--gray-200)'
                }}>
                  <span style={{ color: 'var(--gray-500)', fontFamily: 'monospace', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', minWidth: '130px', flex: '1 1 auto' }} title={`GPS: ${v.latitude}, ${v.longitude}`}>
                    GPS: {v.latitude}, {v.longitude}
                  </span>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex align-center gap-1"
                    style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', flex: '0 0 auto' }}
                  >
                    <Navigation size={12} />
                    Abrir Rota
                  </a>
                </div>
              )}

              {v.next_visit_date && (
                <div style={{ fontSize: '12px', color: 'var(--status-scheduled)', fontWeight: 600, marginTop: '8px' }}>
                  📆 Retorno Agendado: {formatDate(v.next_visit_date)} {v.next_step ? `(${v.next_step})` : ''}
                </div>
              )}

              {v.photoUrl && (
                <div style={{ marginTop: '12px' }}>
                  <img 
                    src={v.photoUrl} 
                    alt="Foto da Visita" 
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                  />
                </div>
              )}

              {/* ACTION SHORTCUT BUTTONS */}
              <div className="mobile-card-actions">
                <button 
                  onClick={() => handleOpenEditModal(v)} 
                  className="action-btn action-btn-primary"
                  style={{ justifyContent: 'center' }}
                >
                  <Edit2 size={14} />
                  <span>Editar</span>
                </button>
                <button 
                  onClick={() => handleDeleteVisit(v)} 
                  className="action-btn" 
                  style={{ color: '#ef4444', borderColor: '#ef4444', justifyContent: 'center' }}
                  title="Excluir Visita"
                >
                  <Trash2 size={14} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================= REGISTRATION MODAL ======================= */}
      <Modal isOpen={isAddVisitOpen} onClose={() => setIsAddVisitOpen(false)} title={editingVisit ? "Editar Visita" : "Registrar Nova Visita"}>
        <form onSubmit={handleSubmit}>
          {/* Target choice */}
          <div className="form-group">
            <label>Tipo de Alvo</label>
            <div className="flex gap-4" style={{ marginBottom: '10px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  checked={formType === 'customer'} 
                  onChange={() => setFormType('customer')}
                  style={{ width: 'auto', padding: 0 }}
                />
                Cliente Ativo
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  checked={formType === 'lead'} 
                  onChange={() => setFormType('lead')}
                  style={{ width: 'auto', padding: 0 }}
                />
                Lead (Prospecção)
              </label>
            </div>
          </div>

          {/* Dynamic selector */}
          <div className="form-group">
            <label>{formType === 'customer' ? 'Selecionar Cliente *' : 'Selecionar Lead *'}</label>
            {formType === 'customer' ? (
              <select 
                value={visitForm.customer_id} 
                onChange={e => setVisitForm(prev => ({ ...prev, customer_id: e.target.value }))}
                required
              >
                <option value="">-- Escolha o Cliente --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <select 
                value={visitForm.lead_id} 
                onChange={e => setVisitForm(prev => ({ ...prev, lead_id: e.target.value }))}
                required
              >
                <option value="">-- Escolha o Lead --</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
          </div>

          {/* Farms selector if Customer is selected */}
          {formType === 'customer' && farms.length > 0 && (
            <div className="form-group">
              <label>Fazenda Visitada</label>
              <select 
                value={visitForm.farm_id} 
                onChange={e => setVisitForm(prev => ({ ...prev, farm_id: e.target.value }))}
              >
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Tipo da Visita *</label>
              <select 
                value={visitForm.visit_type} 
                onChange={e => setVisitForm(prev => ({ ...prev, visit_type: e.target.value }))}
                required
              >
                {OPTIONS.VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Data & Hora</label>
              <input 
                type="datetime-local" 
                value={visitForm.visit_datetime} 
                onChange={e => setVisitForm(prev => ({ ...prev, visit_datetime: e.target.value }))}
              />
            </div>
          </div>

          {/* CRITICAL GEOLOCATION GPS BUTTON */}
          <div className="geo-container">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-dark)', margin: 0 }}>
              <MapPin size={18} />
              Geolocalização de Campo
            </label>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={handleCaptureLocation} 
                className="btn btn-secondary"
                style={{ flex: 1, height: '44px', display: 'flex', gap: '8px', fontSize: '13px' }}
                disabled={geoLocating}
              >
                <Navigation size={16} className={geoLocating ? 'spin-anim' : ''} />
                {geoLocating ? 'Localizando...' : 'Capturar Minhas Coordenadas'}
              </button>
            </div>
            {visitForm.latitude && (
              <div className="geo-coordinates">
                📍 Lat: {visitForm.latitude} | Lng: {visitForm.longitude}
              </div>
            )}
          </div>

          {/* PHOTO UPLINK STORAGE BUCKET */}
          <div className="form-group">
            <label>Anexar Foto de Visita (Campo/Instalação)</label>
            <div className="flex align-center gap-3" style={{ marginTop: '8px' }}>
              <label className="btn btn-secondary" style={{ flex: 1, padding: '12px', justifyContent: 'center', cursor: 'pointer' }}>
                <Camera size={18} />
                <span>Fotografar / Upload</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
              
              {attachedPhoto && (
                <div className="flex align-center gap-1" style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}>
                  <Check size={16} /> Foto Carregada
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dores Identificadas / Necessidades</label>
              <input 
                type="text" 
                value={visitForm.pains_identified} 
                onChange={e => setVisitForm(prev => ({ ...prev, pains_identified: e.target.value }))}
                placeholder="Ex: Deriva excessiva, escorrimento" 
              />
            </div>
            <div className="form-group">
              <label>Máquinas / Bicos Avaliados</label>
              <input 
                type="text" 
                value={visitForm.machines_evaluated} 
                onChange={e => setVisitForm(prev => ({ ...prev, machines_evaluated: e.target.value }))}
                placeholder="Ex: John Deere 4040, pontas JD" 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Resultado da Visita *</label>
              <select 
                value={visitForm.result} 
                onChange={e => setVisitForm(prev => ({ ...prev, result: e.target.value }))}
                required
              >
                {OPTIONS.VISIT_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Potencial Comercial</label>
              <select 
                value={visitForm.commercial_potential} 
                onChange={e => setVisitForm(prev => ({ ...prev, commercial_potential: e.target.value }))}
              >
                <option value="Baixo">Baixo</option>
                <option value="Médio">Médio</option>
                <option value="Alto">Alto</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ 
            border: '1px solid var(--gray-200)', 
            padding: '12px', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--gray-50)' 
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-dark)' }}>
              <Calendar size={16} /> Próximo Agendamento / Retorno
            </label>
            <div className="form-row" style={{ marginTop: '8px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Data de Retorno</label>
                <input 
                  type="date" 
                  value={visitForm.next_visit_date} 
                  onChange={e => setVisitForm(prev => ({ ...prev, next_visit_date: e.target.value }))} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Ação Prevista</label>
                <input 
                  type="text" 
                  value={visitForm.next_step} 
                  onChange={e => setVisitForm(prev => ({ ...prev, next_step: e.target.value }))} 
                  placeholder="Ex: Apresentar proposta comercial"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Anotações / Diário da Visita *</label>
            <textarea 
              value={visitForm.notes} 
              onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Descreva detalhadamente a conversa com o produtor, impressões técnicas, observações agrícolas..."
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Salvando...' : editingVisit ? 'Salvar Alterações' : 'Registrar Visita em Campo'}
          </button>
        </form>
      </Modal>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Visits;
