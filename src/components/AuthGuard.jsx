import React, { useState } from 'react';
import { Sprout, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react';
import { supabase } from '../config/supabase';

const AuthGuard = ({ children, user, setUser, loadingSession }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('seller'); // seller default
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) throw error;
      
      setUser(data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      alert('Por favor, preencha todos os campos obrigatórios (E-mail, Senha e Nome).');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: role
          }
        }
      });

      if (error) throw error;

      alert('Cadastro realizado com sucesso! Sua conta foi criada e vinculada à organização Spray Precision.');
      setIsSignUp(false); // Redirect to login form
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="login-screen">
        <div style={{ color: 'var(--white)', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Sprout size={48} className="text-primary spin-anim" style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
          <span>Verificando sessão de campo...</span>
        </div>
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
  }

  // If user is authenticated, render the child app components
  if (user) {
    return children;
  }

  // If not authenticated, render Login/SignUp Screens
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <Sprout />
          <h1 className="logo-text" style={{ justifyContent: 'center' }}>
            Spray<span>Precision</span>
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '13px', marginTop: '4px' }}>
            SaaS de Gestão Comercial e Campo
          </p>
        </div>

        <h2 className="login-title">
          {isSignUp ? 'Criar Nova Conta' : 'Acesse o Painel'}
        </h2>
        <p className="login-subtitle">
          {isSignUp 
            ? 'Inscreva-se como vendedor ou técnico e acesse a ferramenta' 
            : 'Informe suas credenciais para acessar os dados locais'
          }
        </p>

        {errorMsg && (
          <div style={{ 
            backgroundColor: 'var(--status-lost-bg)', 
            color: 'var(--status-lost)', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)', 
            fontSize: '13px', 
            marginBottom: '20px',
            borderLeft: '4px solid var(--status-lost)',
            fontWeight: 500
          }}>
            {errorMsg}
          </div>
        )}

        {isSignUp ? (
          /* ================= SIGN UP FORM ================= */
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label>Nome Completo *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  placeholder="Seu nome completo" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>E-mail *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="vendedor@spray.com" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Senha *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>WhatsApp (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="DD + Número" 
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Função / Perfil de Acesso</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="seller">Vendedor / Parceiro de Campo</option>
                <option value="technician">Técnico / Instalador</option>
                <option value="admin">Administrador Geral</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-large" style={{ marginTop: '10px' }}>
              {loading ? 'Cadastrando...' : 'Registrar Minha Conta'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
              Já tem conta registrada?{' '}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }} 
                style={{ color: 'var(--primary)', fontWeight: 600 }}
              >
                Faça login
              </button>
            </div>
          </form>
        ) : (
          /* ================= LOGIN FORM ================= */
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>E-mail Corporativo</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="Ex: vendedor@spray.com" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Senha de Acesso</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--gray-400)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Sua senha secreta" 
                  style={{ paddingLeft: '44px' }}
                  required 
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-large" style={{ marginTop: '10px' }}>
              {loading ? 'Entrando...' : 'Acessar Spray Precision'}
            </button>

            {supabase.isMock && (
              <div style={{ 
                marginTop: '20px', 
                padding: '12px', 
                backgroundColor: 'var(--gray-100)', 
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                color: 'var(--gray-600)',
                border: '1px dashed var(--gray-300)'
              }}>
                <strong>Credenciais do banco simulado:</strong><br />
                Vendedor: <code>vendedor@spray.com</code> (senha qualquer)<br />
                Admin: <code>admin@spray.com</code> (senha qualquer)
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
              Não possui uma conta?{' '}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }} 
                style={{ color: 'var(--primary)', fontWeight: 600 }}
              >
                Cadastre-se grátis
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthGuard;
