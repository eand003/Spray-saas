import React from 'react';
import { LayoutDashboard, Target, Users, MapPin, LogOut, Sprout, DollarSign } from 'lucide-react';
import { supabase } from '../config/supabase';

const getInitials = (name) => {
  if (!name) return 'U';
  const cleanName = name.includes('@') ? name.split('@')[0] : name;
  const parts = cleanName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

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
            <div className="flex align-center gap-2">
              {/* Initials Avatar */}
              <div className="user-avatar" title={user.user_metadata?.full_name || user.email}>
                {getInitials(user.user_metadata?.full_name || user.email)}
              </div>

              {/* Desktop User Badge */}
              <div className="user-badge desktop-only-badge">
                <span>{user.user_metadata?.full_name || user.email}</span>
                <span style={{ opacity: 0.6 }}>|</span>
                <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {getRoleBadge(user.user_metadata?.role)}
                </span>
              </div>
              
              {/* Universal Header Logout Button */}
              <button 
                onClick={handleLogout} 
                className="btn-icon" 
                title="Sair"
                style={{ width: '36px', height: '36px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid containing page views */}
      <div className="flex" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
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
        </nav>

        {/* Dynamic page container */}
        <main className="main-content">
          <div className="container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
