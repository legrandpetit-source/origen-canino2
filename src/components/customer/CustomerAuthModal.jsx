import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Mail, PawPrint, Eye, EyeOff, AlertCircle, ArrowRight, 
  Sparkles, Gift, DollarSign, LogIn
} from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';

const CustomerAuthModal = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    login 
  } = useCustomer();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setErrorMsg(null);
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(loginEmail.trim().toLowerCase(), loginPassword);
      setIsAuthModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCatalog = () => {
    setIsAuthModalOpen(false);
    setTimeout(() => {
      const storeSection = document.getElementById('tienda') || document.getElementById('planes');
      if (storeSection) {
        storeSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-3xl w-full max-w-md my-6 p-5 sm:p-7 relative shadow-2xl border border-[#E8DFC8] overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Glow decorativo de fondo */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-secondary-orange/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-primary-green/15 rounded-full blur-2xl pointer-events-none" />

        {/* Botón Cerrar (con z-index y espacio protegido) */}
        <button 
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 bg-white hover:bg-stone-100 p-2 rounded-full transition shadow-xs z-30 cursor-pointer"
          title="Cerrar ventana"
        >
          <X size={18} />
        </button>

        {/* Encabezado con padding derecho para evitar que la 'X' se sobreponga */}
        <div className="relative z-10 text-center mb-4 pr-9 pl-1">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 via-emerald-600/15 to-amber-500/15 text-[#68411C] text-[10.5px] font-black uppercase px-3 py-1 rounded-full border border-amber-300/60 mb-2 shadow-2xs tracking-wider max-w-[calc(100%-8px)]">
            <Sparkles size={12} className="text-amber-600 shrink-0" />
            <span className="truncate">Club de Clientes & Embajadores</span>
          </div>
          
          <h3 className="font-header text-xl sm:text-2xl font-black text-secondary-brown leading-snug">
            Portal de Clientes
          </h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto font-sans leading-relaxed">
            Ingresa a tu cuenta para gestionar la comida de tu perrito, ver tu saldo acumulado por amigos y repetir pedidos en 1 clic.
          </p>
        </div>

        {/* 3 Píldoras de Incentivos Clave del Club */}
        <div className="relative z-10 bg-white/90 backdrop-blur-xs rounded-2xl p-3 border border-[#E8DFC8] mb-4 grid grid-cols-3 gap-2 text-center shrink-0 shadow-2xs">
          <div className="p-1">
            <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Gift size={15} />
            </div>
            <p className="font-header font-bold text-[11px] text-secondary-brown leading-tight">Regala 10% OFF</p>
            <p className="text-[9.5px] text-stone-500 font-sans leading-none mt-0.5">A amigos y vecinos</p>
          </div>

          <div className="p-1 border-x border-[#F0EBE3]">
            <div className="w-7 h-7 bg-emerald-100 text-primary-green rounded-lg flex items-center justify-center mx-auto mb-1">
              <DollarSign size={15} />
            </div>
            <p className="font-header font-bold text-[11px] text-primary-green leading-tight">Gana $5.000 CLP</p>
            <p className="text-[9.5px] text-stone-500 font-sans leading-none mt-0.5">Por cada compra que hagan</p>
          </div>

          <div className="p-1">
            <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mx-auto mb-1">
              <PawPrint size={15} />
            </div>
            <p className="font-header font-bold text-[11px] text-secondary-brown leading-tight">Ficha Nutricional</p>
            <p className="text-[9.5px] text-stone-500 font-sans leading-none mt-0.5">Alerta para reponer a tiempo</p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="relative z-10 mb-3 p-2.5 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200 shrink-0">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario de Login Único */}
        <div className="relative z-10 overflow-y-auto pr-1 flex-grow">
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Mail size={13} className="text-primary-green" /> Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-xs sm:text-sm bg-white text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Lock size={13} className="text-primary-green" /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Tu contraseña secreta"
                  className="w-full border border-stone-300 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-primary-green outline-none text-xs sm:text-sm bg-white text-stone-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-header font-bold py-3.5 rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? "Iniciando sesión..." : "Ingresar a mi Cuenta"}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Footer del Modal: Explicación de Activación Automática con Compra */}
        <div className="relative z-10 pt-3 mt-4 border-t border-[#E8DFC8] text-center space-y-1.5 shrink-0">
          <p className="text-xs font-bold text-secondary-brown">
            ¿Aún no eres cliente de Origen Canino?
          </p>
          <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs mx-auto">
            Para garantizar compras y clientes 100% reales, tu cuenta y código de embajador se crean automáticamente cuando realizas tu primer pedido en la tienda.
          </p>
          <button
            type="button"
            onClick={handleGoToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-green hover:text-primary-green-dark hover:underline pt-0.5 cursor-pointer"
          >
            <span>Ver Menú de Dietas & Snacks Naturales</span>
            <ArrowRight size={13} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default CustomerAuthModal;
