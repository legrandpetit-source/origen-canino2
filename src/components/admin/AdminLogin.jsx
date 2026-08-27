import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';

const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Login, 2: 2FA
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Error de autenticación');
      }
      
      if (data.requires_2fa) {
        setSessionId(data.session_id);
        setStep(2);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, code })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Código inválido');
      }
      
      localStorage.setItem('admin_token', data.access_token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="bg-primary-green-dark p-6 text-center text-white">
          <ShieldCheck className="mx-auto h-12 w-12 mb-2 text-primary-orange" />
          <h2 className="font-header text-2xl">Acceso Administrativo</h2>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center mb-6">
              {error}
            </div>
          )}
          
          {step === 1 ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-primary-green outline-none"
                    placeholder="admin@origencanino.cl"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-primary-green outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary-green text-white font-bold py-3 rounded-lg hover:bg-primary-green-dark transition mt-4 disabled:opacity-70"
              >
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4 text-center">
              <p className="text-gray-600 mb-4">
                Hemos enviado un código de 5 dígitos a tu Telegram para autorizar este inicio de sesión.
              </p>
              
              <div>
                <input 
                  type="text" 
                  required 
                  maxLength={5}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full max-w-[200px] mx-auto text-center text-3xl tracking-widest border rounded-lg py-3 focus:ring-2 focus:ring-primary-green outline-none"
                  placeholder="12345"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading || code.length !== 5}
                className="w-full bg-primary-orange text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition mt-4 disabled:opacity-70"
              >
                {loading ? 'Verificando...' : 'Confirmar Código'}
              </button>
              
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-700 underline mt-4"
              >
                Volver
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
