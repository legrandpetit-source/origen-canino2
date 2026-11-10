import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Mail, PawPrint, Eye, EyeOff, AlertCircle, ArrowRight, 
  Sparkles, Gift, DollarSign, HeartHandshake, ShieldCheck, UserPlus, LogIn, Phone, Dog
} from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';

const CustomerAuthModal = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authModalMode, 
    setAuthModalMode, 
    login, 
    register 
  } = useCustomer();

  const [mode, setMode] = useState(authModalMode || 'register'); // 'login' o 'register'
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDogName, setRegDogName] = useState('');
  const [regDogWeight, setRegDogWeight] = useState('');
  const [regDogAge, setRegDogAge] = useState('adulto');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
    }
    setErrorMsg(null);
  }, [authModalMode, isAuthModalOpen]);

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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (regPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        phone: regPhone.trim() || null,
        dog_name: regDogName.trim() || null,
        dog_weight: regDogWeight ? parseFloat(regDogWeight) : null,
        dog_age: regDogAge
      };

      await register(payload);
      setIsAuthModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear la cuenta. Verifica tus datos.');
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
      <div className="bg-[#FAF7F2] rounded-3xl w-full max-w-lg my-6 p-5 sm:p-7 relative shadow-2xl border border-[#E8DFC8] overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Glow decorativo de fondo */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-secondary-orange/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-primary-green/15 rounded-full blur-2xl pointer-events-none" />

        {/* Botón Cerrar */}
        <button 
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 bg-white hover:bg-stone-100 p-2 rounded-full transition shadow-2xs z-20 cursor-pointer"
          title="Cerrar ventana"
        >
          <X size={18} />
        </button>

        {/* Encabezado Principal y Badge del Club */}
        <div className="relative z-10 text-center mb-4">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 via-emerald-600/15 to-amber-500/15 text-[#68411C] text-[11px] font-black uppercase px-3.5 py-1 rounded-full border border-amber-300/60 mb-2 shadow-2xs tracking-wider">
            <Sparkles size={13} className="text-amber-600" />
            <span>Club de Embajadores & Clientes Origen Canino</span>
          </div>
          
          <h3 className="font-header text-xl sm:text-2xl font-black text-secondary-brown leading-snug">
            {mode === 'register' ? '¡Recomienda, Cuida a tu Perro y Gana Comida Gratis!' : 'Bienvenido de Vuelta a Tu Club'}
          </h3>
          <p className="text-xs text-stone-600 mt-0.5 max-w-sm mx-auto font-sans leading-relaxed">
            {mode === 'register' 
              ? 'Crea tu cuenta de tutor, obtén tu código de embajador para ganar saldo en dinero y gestiona la nutrición de tu mascota.' 
              : 'Accede a tu billetera de referidos, ficha médica de tu perrito y repite pedidos en 1 clic.'}
          </p>
        </div>

        {/* Selector de Pestañas (Modo Registro vs Login) */}
        <div className="relative z-10 grid grid-cols-2 p-1 bg-white rounded-2xl border border-[#E5DACD] mb-4 shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`py-2 px-3 text-xs font-header font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-secondary-orange text-white shadow-xs'
                : 'text-stone-600 hover:text-secondary-brown'
            }`}
          >
            <UserPlus size={15} />
            <span>Unirme al Club (Gana Dinero)</span>
          </button>
          
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`py-2 px-3 text-xs font-header font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-primary-green text-white shadow-xs'
                : 'text-stone-600 hover:text-secondary-brown'
            }`}
          >
            <LogIn size={15} />
            <span>Ya soy Cliente (Ingresar)</span>
          </button>
        </div>

        {/* Banner de Beneficios Clave (Incentivos de Embajador y Nutrición) */}
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

        {/* Contenedor con Scroll para Formularios */}
        <div className="relative z-10 overflow-y-auto pr-1 flex-grow">
          {mode === 'register' ? (
            /* ==========================================
               FORMULARIO DE REGISTRO & ACTIVACIÓN DE EMBAJADOR
               ========================================== */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Tu Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej: Patricio Padilla"
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs bg-white text-stone-800 focus:ring-2 focus:ring-secondary-orange/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Phone size={12} className="text-primary-green" /> WhatsApp / Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs bg-white text-stone-800 focus:ring-2 focus:ring-secondary-orange/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Mail size={12} className="text-primary-green" /> Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs bg-white text-stone-800 focus:ring-2 focus:ring-secondary-orange/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Lock size={12} className="text-primary-green" /> Contraseña (mínimo 6) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Crea una contraseña"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 pr-8 text-xs bg-white text-stone-800 focus:ring-2 focus:ring-secondary-orange/50 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sección Opcional: Ficha del Perrito */}
              <div className="bg-white/80 rounded-2xl p-3 border border-emerald-200/80">
                <p className="text-[11px] font-bold text-secondary-brown flex items-center gap-1.5 mb-2">
                  <Dog size={14} className="text-primary-green" />
                  Datos de tu Perrito (Para activar su semáforo de comida):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre del perro"
                      value={regDogName}
                      onChange={(e) => setRegDogName(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs bg-white text-stone-800 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="90"
                      placeholder="Peso (Kg)"
                      value={regDogWeight}
                      onChange={(e) => setRegDogWeight(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs bg-white text-stone-800 outline-none"
                    />
                  </div>
                  <div>
                    <select
                      value={regDogAge}
                      onChange={(e) => setRegDogAge(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-2 py-1.5 text-xs bg-white text-stone-800 outline-none"
                    >
                      <option value="cachorro">Cachorro</option>
                      <option value="adulto">Adulto</option>
                      <option value="senior">Senior (+7)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botón CTA Registro */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-secondary-orange hover:bg-[#c98336] text-white font-header font-bold py-3 rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 mt-1"
              >
                {loading ? "Creando tu cuenta y código..." : "Activar Mi Cuenta & Código de Embajador 🐾"}
                <ArrowRight size={16} />
              </button>

              <p className="text-[10px] text-center text-stone-400 leading-tight">
                🔒 100% Gratuito. Recibirás tu enlace de referido de inmediato para compartir por WhatsApp.
              </p>
            </form>
          ) : (
            /* ==========================================
               FORMULARIO DE INICIO DE SESIÓN (LOGIN)
               ========================================== */
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
                  className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white text-stone-800"
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
                    className="w-full border border-stone-300 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white text-stone-800"
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

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(null); }}
                  className="text-xs font-bold text-secondary-orange hover:underline cursor-pointer"
                >
                  ¿No tienes cuenta aún? Únete gratis y obtén tu código de embajador →
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer del Modal: Invitación a la Tienda */}
        <div className="relative z-10 pt-3 mt-3 border-t border-[#E8DFC8] flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>¿Solo quieres comprar por primera vez?</span>
          <button
            type="button"
            onClick={handleGoToCatalog}
            className="font-bold text-primary-green hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Menú</span>
            <ArrowRight size={12} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default CustomerAuthModal;
