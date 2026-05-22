import React from 'react';
import { LayoutDashboard, Target, Users, MapPin, LogOut, Sprout, DollarSign } from 'lucide-react';
import { supabase } from '../config/supabase';

const Layout = ({ children, currentTab, setCurrentTab, user, onLogout }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Target },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'visits', label: 'Visitas', icon: MapPin },
    { id: 'finance', label: user?.user_metadata?.role === 'admin' ? 'Financeiro' : 'Meus Ganhos', icon: DollarSign },
  ];

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'commercial_manager': return 'Gestor';
      case 'seller': return 'Vendedor';
      case 'partner': return 'Parceiro';
      case 'technician': return 'Técnico';
      default: return 'Usuário';
    }
  };

  return (
    <div className="app-layout">
      {/* Dynamic Header */}
      <header className="app-header">
        <div className="container header-container">
          <div className="logo-area">
            <Sprout size={24} className="text-primary" style={{ color: 'var(--primary)' }} />
            <h1 className="logo-text">
              Spray<span>Precision</span>
            </h1>
          </div>
          
          {user && (
            <div className="flex align-center gap-3">
              <div className="user-badge">
                <span>{user.user_metadata?.full_name || user.email}</span>
                <span style={{ opacity: 0.6 }}>|</span>
                <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {getRoleBadge(user.user_metadata?.role)}
                </span>
              </div>
              
              {/* Desktop Logout Button */}
              <button 
                onClick={handleLogout} 
                className="btn-icon" 
                title="Sair"
                style={{ display: 'none', display: 'flex' }}
                className="btn-icon desktop-logout-btn"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid containing page views */}
      <div className="flex" style={{ width: '100%' }}>
        {/* Navigation panel */}
        <nav className="bottom-nav">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <IconComponent size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          {/* Mobile Logout Button in nav */}
          <button
            onClick={handleLogout}
            className="nav-item mobile-logout-btn"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={22} />
            <span>Sair</span>
          </button>
        </nav>

        {/* Dynamic page container */}
        <main className="main-content">
          <div className="container">
            {children}
          </div>
        </main>
      </div>
      
      {/* Simple style additions to hide/show buttons based on screen width */}
      <style>{`
        @media (min-width: 769px) {
          .mobile-logout-btn {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-logout-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
