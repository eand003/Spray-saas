import React, { useState, useEffect } from 'react';
import { Target, Users, MapPin, Wrench, Sprout, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatDate } from '../utils/helpers';

const Dashboard = ({ user, onQuickAction, setCurrentTab }) => {
  const [stats, setStats] = useState({
    leads: 0,
    visits: 0,
    customers: 0,
    kits: 0
  });
  const [upcomingReturns, setUpcomingReturns] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const isUserAdmin = user?.user_metadata?.role === 'admin';

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch Leads
      let leadsQuery = supabase.from('leads').select('*').eq('is_deleted', false);
      if (!isUserAdmin) {
        leadsQuery = leadsQuery.eq('owner_id', user.id);
      }
      const { data: leadsData } = await leadsQuery;
      const leadsCount = leadsData?.length || 0;

      // Fetch Customers
      let customersQuery = supabase.from('customers').select('*').eq('is_deleted', false);
      if (!isUserAdmin) {
        customersQuery = customersQuery.eq('owner_id', user.id);
      }
      const { data: customersData } = await customersQuery;
      const customersCount = customersData?.length || 0;

      // Fetch Visits
      let visitsQuery = supabase.from('visits').select('*').eq('is_deleted', false);
      if (!isUserAdmin) {
        visitsQuery = visitsQuery.eq('owner_id', user.id);
      }
      const { data: visitsData } = await visitsQuery;
      const visitsCount = visitsData?.length || 0;

      // Fetch Kits
      let kitsQuery = supabase.from('kits').select('*');
      if (!isUserAdmin) {
        // Kits are linked to customers. If not admin, filter kits belonging to seller's customers
        const sellerCustomerIds = (customersData || []).map(c => c.id);
        const { data: kitsData } = await kitsQuery;
        const filteredKits = (kitsData || []).filter(k => sellerCustomerIds.includes(k.customer_id));
        setStats({
          leads: leadsCount,
          customers: customersCount,
          visits: visitsCount,
          kits: filteredKits.length
        });
      } else {
        const { data: kitsData } = await kitsQuery;
        setStats({
          leads: leadsCount,
          customers: customersCount,
          visits: visitsCount,
          kits: kitsData?.length || 0
        });
      }

      // Process Upcoming Returns (Leads with next_action_date)
      const returns = (leadsData || [])
        .filter(l => l.next_action_date && l.status !== 'won' && l.status !== 'lost')
        .sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date))
        .slice(0, 3);
      setUpcomingReturns(returns);

      // Process Recent Visits
      let recentVisitsQuery = supabase.from('visits').select('*').eq('is_deleted', false);
      if (!isUserAdmin) {
        recentVisitsQuery = recentVisitsQuery.eq('owner_id', user.id);
      }
      const { data: recentVisitsData } = await recentVisitsQuery.order('visit_datetime', { ascending: false });
      
      // We need to resolve customer name for visits
      const visitsWithNames = (recentVisitsData || []).slice(0, 3).map(visit => {
        let name = 'Carregando...';
        if (visit.customer_id) {
          const cust = (customersData || []).find(c => c.id === visit.customer_id);
          name = cust ? cust.name : 'Cliente';
        } else if (visit.lead_id) {
          const ld = (leadsData || []).find(l => l.id === visit.lead_id);
          name = ld ? ld.name : 'Lead';
        }
        return { ...visit, entityName: name };
      });
      setRecentVisits(visitsWithNames);

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Sleek Greeting Card with agricultural backdrop blur */}
      <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--primary)' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>
          Olá, {user?.user_metadata?.full_name || 'Agente de Campo'}! 🌱
        </h2>
        <p style={{ color: 'var(--gray-600)', fontSize: '14px', fontStyle: 'italic' }}>
          "Gestão comercial e operacional para transformar eficiência de pulverização em resultado mensurável."
        </p>
      </div>

      {/* QUICK ACTIONS FOR MOBILE AGENTS */}
      <div className="quick-actions">
        <h2>Ações Rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <button 
            className="btn btn-primary" 
            onClick={() => onQuickAction('add-lead')}
            style={{ padding: '16px', borderRadius: 'var(--radius-lg)', justifyContent: 'center' }}
          >
            <Target size={20} />
            <span>Novo Lead</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => onQuickAction('add-visit')}
            style={{ padding: '16px', borderRadius: 'var(--radius-lg)', justifyContent: 'center', backgroundColor: 'var(--primary-dark)' }}
          >
            <MapPin size={20} />
            <span>Nova Visita</span>
          </button>
        </div>
      </div>

      {/* METRICS DASHBOARD GRID */}
      <div className="dashboard-grid">
        <div className="stat-card" onClick={() => setCurrentTab('leads')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--status-new-bg)', color: 'var(--status-new)' }}>
            <Target size={22} />
          </div>
          <div>
            <div className="stat-value">{loading ? '...' : stats.leads}</div>
            <div className="stat-label">{isUserAdmin ? 'Leads Cadastrados' : 'Meus Leads'}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setCurrentTab('customers')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--status-won-bg)', color: 'var(--status-won)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value">{loading ? '...' : stats.customers}</div>
            <div className="stat-label">{isUserAdmin ? 'Clientes Ativos' : 'Meus Clientes'}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setCurrentTab('visits')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--status-visited-bg)', color: 'var(--status-visited)' }}>
            <MapPin size={22} />
          </div>
          <div>
            <div className="stat-value">{loading ? '...' : stats.visits}</div>
            <div className="stat-label">{isUserAdmin ? 'Visitas Realizadas' : 'Minhas Visitas'}</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--status-scheduled-bg)', color: 'var(--status-scheduled)' }}>
            <Sprout size={22} />
          </div>
          <div>
            <div className="stat-value">{loading ? '...' : stats.kits}</div>
            <div className="stat-label">Kits Instalados</div>
          </div>
        </div>
      </div>

      {/* TIMELINE AND NOTIFICATIONS GRID */}
      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '24px', display: 'flex', flexDirection: 'column' }}>
        
        {/* UPCOMING SCHEDULES / RETURNS */}
        <div className="card">
          <div className="flex align-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 className="flex align-center gap-2" style={{ fontSize: '17px' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              Próximos Retornos Agendados
            </h3>
            <button className="tab-btn" onClick={() => setCurrentTab('leads')} style={{ padding: 0, fontSize: '13px' }}>
              Ver todos
            </button>
          </div>

          {upcomingReturns.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', textAlign: 'center', padding: '12px' }}>
              Nenhum retorno agendado para os próximos dias.
            </p>
          ) : (
            <div className="mobile-card-list">
              {upcomingReturns.map((ld) => (
                <div key={ld.id} className="mobile-card" style={{ borderLeft: '4px solid var(--status-scheduled)' }}>
                  <div className="flex justify-between align-center">
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{ld.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>
                      📆 {formatDate(ld.next_action_date)}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '6px' }}>
                    <strong>Ação:</strong> {ld.next_action || 'Sem ação cadastrada'}
                  </div>
                  <div className="flex justify-between align-center" style={{ marginTop: '10px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--gray-400)' }}>📍 {ld.city} - {ld.state}</span>
                    <a href={`https://wa.me/55${ld.phone}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25d366', fontWeight: 600 }}>
                      Falar no WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT SALES VISITS CHRONOLOGICAL TIMELINE */}
        <div className="card">
          <div className="flex align-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 className="flex align-center gap-2" style={{ fontSize: '17px' }}>
              <MapPin size={18} style={{ color: 'var(--primary)' }} />
              Atividades Recentes de Campo
            </h3>
            <button className="tab-btn" onClick={() => setCurrentTab('visits')} style={{ padding: 0, fontSize: '13px' }}>
              Ver histórico
            </button>
          </div>

          {recentVisits.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', textAlign: 'center', padding: '12px' }}>
              Nenhuma visita comercial ou técnica registrada recentemente.
            </p>
          ) : (
            <div className="timeline">
              {recentVisits.map((v) => (
                <div key={v.id} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-header">
                    <span>{v.visit_type}</span>
                    <span>{formatDate(v.visit_datetime)}</span>
                  </div>
                  <div className="timeline-title">{v.entityName}</div>
                  <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '2px' }}>
                    {v.notes ? v.notes.substring(0, 80) + '...' : 'Visita registrada.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
