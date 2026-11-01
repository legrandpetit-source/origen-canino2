import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, MapPin, PawPrint, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';

const CustomerAuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, login, register } = useCustomer();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: 'Santiago',
    dog_name: '',
    dog_weight: '',
    dog_age: 'adulto'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setErrorMsg(err.message || 'Credenciales inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (regForm.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await register({
        ...regForm,
        dog_weight: regForm.dog_weight ? parseFloat(regForm.dog_weight) : null
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg my-8 p-6 md:p-8 relative shadow-2xl border border-gray-100">
        {/* Close Button */}
        <button 
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Header Paw */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-green/10 text-primary-green rounded-2xl">
            <PawPrint size={28} />
          </div>
          <div>
            <h3 className="font-header text-2xl md:text-3xl text-secondary-brown">
              {authModalMode === 'login' ? 'Bienvenido a Origen Canino' : 'Crea tu Cuenta de Cliente'}
            </h3>
            <p className="text-sm text-gray-500">
              {authModalMode === 'login' 
                ? 'Accede para repetir tus pedidos y alimentar a tus perritos.' 
                : 'Guarda tus datos una sola vez y compra en 1 clic.'}
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setAuthModalMode('login'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition ${
              authModalMode === 'login' ? 'bg-white text-primary-green shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Ya tengo cuenta
          </button>
          <button
            type="button"
            onClick={() => { setAuthModalMode('register'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition ${
              authModalMode === 'register' ? 'bg-white text-primary-green shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Soy nuevo / Registrarme
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2 border border-red-200">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* --- FORM: LOGIN --- */}
        {authModalMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Mail size={16} className="text-primary-green" /> Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <Lock size={16} className="text-primary-green" /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  className="w-full border border-gray-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-green text-white font-bold py-3.5 rounded-xl hover:bg-primary-green-dark transition shadow-md flex items-center justify-center gap-2 text-base mt-2"
            >
              {loading ? "Iniciando sesión..." : "Ingresar a mi Cuenta"}
              <ArrowRight size={18} />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthModalMode('register')}
                className="text-xs text-secondary-brown hover:text-primary-green font-medium"
              >
                ¿No tienes cuenta todavía? <span className="underline font-bold text-primary-green">Regístrate en 30 segundos</span>
              </button>
            </div>
          </form>
        )}

        {/* --- FORM: REGISTER --- */}
        {authModalMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <User size={14} className="text-primary-green" /> Tu Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Phone size={14} className="text-primary-green" /> WhatsApp / Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Mail size={14} className="text-primary-green" /> Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="juan@gmail.com"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Lock size={14} className="text-primary-green" /> Contraseña (mínimo 6) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Tu clave secreta"
                    className="w-full border border-gray-200 rounded-xl p-2.5 pr-8 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin size={14} className="text-primary-green" /> Dirección de Despacho
                </label>
                <input
                  type="text"
                  value={regForm.address}
                  onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                  placeholder="Calle, Número, Depto"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Comuna (Santiago)</label>
                <input
                  type="text"
                  value={regForm.city}
                  onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                  placeholder="Ej. Las Condes, Providencia"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                />
              </div>
            </div>

            {/* Pet info card */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <PawPrint size={15} className="text-amber-700" />
                Datos de tu Mascota (Para calcular porción y recordar su dieta)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-600 font-semibold mb-0.5">Nombre Perrito</label>
                  <input
                    type="text"
                    value={regForm.dog_name}
                    onChange={(e) => setRegForm({ ...regForm, dog_name: e.target.value })}
                    placeholder="Ej. Rocky"
                    className="w-full border border-amber-200 bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary-green"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 font-semibold mb-0.5">Peso (Kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={regForm.dog_weight}
                    onChange={(e) => setRegForm({ ...regForm, dog_weight: e.target.value })}
                    placeholder="Ej. 12"
                    className="w-full border border-amber-200 bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary-green"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 font-semibold mb-0.5">Etapa</label>
                  <select
                    value={regForm.dog_age}
                    onChange={(e) => setRegForm({ ...regForm, dog_age: e.target.value })}
                    className="w-full border border-amber-200 bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary-green"
                  >
                    <option value="adulto">Adulto</option>
                    <option value="cachorro">Cachorro</option>
                    <option value="senior">Senior (+7 años)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-green text-white font-bold py-3.5 rounded-xl hover:bg-primary-green-dark transition shadow-md flex items-center justify-center gap-2 text-base mt-3"
            >
              {loading ? "Creando tu cuenta..." : "Crear mi Cuenta de Cliente"}
              <CheckCircle size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CustomerAuthModal;

