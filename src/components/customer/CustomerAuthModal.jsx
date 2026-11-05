import React, { useState } from 'react';
import { X, Lock, Mail, PawPrint, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';

const CustomerAuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, login } = useCustomer();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

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
    // Hacer scroll al catálogo de productos
    setTimeout(() => {
      const storeSection = document.getElementById('catalogo') || document.getElementById('tienda') || document.querySelector('section');
      if (storeSection) {
        storeSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-bg-cream rounded-3xl w-full max-w-md my-8 p-6 md:p-8 relative shadow-2xl border border-[#677333]/25 overflow-hidden">
        {/* Botón Cerrar */}
        <button 
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute right-5 top-5 text-stone-400 hover:text-stone-700 bg-white/80 hover:bg-white p-2 rounded-full transition shadow-2xs cursor-pointer"
          title="Cerrar ventana"
        >
          <X size={20} />
        </button>

        {/* Encabezado con Icono de Huella */}
        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 bg-primary-green/15 text-primary-green rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <PawPrint size={28} />
          </div>
          <h3 className="font-header text-2xl md:text-3xl text-secondary-brown">
            Portal de Clientes
          </h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto leading-relaxed">
            Ingresa a tu cuenta para ver el estado de tu despacho congelado y repetir pedidos en 1 clic.
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario de Login Único (Sin pestaña de registro) */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <Mail size={14} className="text-primary-green" /> Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white text-stone-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <Lock size={14} className="text-primary-green" /> Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Tu contraseña secreta"
                className="w-full border border-stone-300 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white text-stone-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-base mt-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Iniciando sesión..." : "Ingresar a mi Cuenta"}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Protección contra cuentas vacías / Invitación a comprar */}
        <div className="pt-5 mt-6 border-t border-stone-200/90 text-center space-y-2">
          <p className="text-xs font-bold text-secondary-brown">
            ¿Aún no eres cliente de Origen Canino?
          </p>
          <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs mx-auto">
            Para coordinar los despachos congelados, tu cuenta de cliente se creará automáticamente cuando realices tu primer pedido en la tienda.
          </p>
          <button
            type="button"
            onClick={handleGoToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-green hover:text-primary-green-dark hover:underline pt-1 cursor-pointer"
          >
            <span>Ver Dietas & Snacks Naturales</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerAuthModal;