import React, { useState, useEffect } from 'react';
import { CreditCard, Landmark, Save, ShieldCheck, CheckCircle, AlertCircle, KeyRound, ExternalLink } from 'lucide-react';

const PaymentSettingsManager = ({ fetchWithAuth }) => {
  const [settings, setSettings] = useState({
    bank_name: '',
    bank_account_type: '',
    bank_account_number: '',
    bank_rut: '',
    bank_owner: '',
    bank_email: '',
    mercadopago_enabled: '1',
    mercadopago_access_token: '',
    has_mp_token: false,
    mercadopago_access_token_masked: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/settings');
      const data = await res.json();
      setSettings(prev => ({
        ...prev,
        ...data,
        mercadopago_access_token: '' // Mantener vacío por seguridad a menos que se sobreescriba
      }));
    } catch (err) {
      console.error("Error cargando ajustes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const payload = {
        settings: {
          bank_name: settings.bank_name,
          bank_account_type: settings.bank_account_type,
          bank_account_number: settings.bank_account_number,
          bank_rut: settings.bank_rut,
          bank_owner: settings.bank_owner,
          bank_email: settings.bank_email,
          mercadopago_enabled: settings.mercadopago_enabled,
        }
      };

      // Si el usuario ingresó un nuevo token, incluirlo
      if (settings.mercadopago_access_token && settings.mercadopago_access_token.trim().length > 10) {
        payload.settings.mercadopago_access_token = settings.mercadopago_access_token.trim();
      }

      await fetchWithAuth('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setSuccessMsg("¡Configuración guardada exitosamente!");
      setTimeout(() => setSuccessMsg(null), 3500);
      loadSettings();
    } catch (err) {
      alert("Error guardando ajustes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h3 className="font-header text-2xl text-secondary-brown flex items-center gap-2">
            <CreditCard className="text-primary-green" /> 
            Configuración de Pasarelas y Pagos
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Gestiona la cuenta bancaria para transferencias manuales y el Access Token oficial de Mercado Pago.
          </p>
        </div>

        {successMsg && (
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-green-300">
            <CheckCircle size={15} /> {successMsg}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Sección Mercado Pago */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                <CreditCard size={24} />
              </div>
              <div>
                <h4 className="font-header text-xl text-secondary-brown font-bold">Mercado Pago (Empresa)</h4>
                <p className="text-xs text-gray-500">Cobros automáticos con tarjetas de crédito, débito y dinero en cuenta</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700">Estado:</label>
              <select
                name="mercadopago_enabled"
                value={settings.mercadopago_enabled}
                onChange={handleChange}
                className="border rounded-lg text-xs font-bold p-1.5 outline-none focus:ring-2 focus:ring-primary-green"
              >
                <option value="1">Activo en Checkout</option>
                <option value="0">Desactivado (Solo Transferencia)</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/70 p-4 rounded-xl flex items-start justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-blue-900 flex items-center gap-1.5">
                <KeyRound size={16} className="text-blue-600" />
                Access Token de Producción
              </p>
              <p className="text-blue-800/80">
                {settings.has_mp_token ? (
                  <span className="text-green-700 font-bold flex items-center gap-1">
                    <CheckCircle size={14} /> Token configurado actualmente: <code className="bg-white/80 px-2 py-0.5 rounded border">{settings.mercadopago_access_token_masked}</code>
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <AlertCircle size={14} /> Aún no hay Access Token configurado. Ingresa el token de tu cuenta de Mercado Pago abajo.
                  </span>
                )}
              </p>
            </div>

            <a 
              href="https://www.mercadopago.cl/developers/panel/credentials" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 shadow-2xs"
            >
              Panel Developers MP <ExternalLink size={12} />
            </a>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {settings.has_mp_token ? 'Actualizar / Sobreescribir Access Token:' : 'Ingresar Access Token (Bearer):'}
            </label>
            <input 
              type="password"
              name="mercadopago_access_token"
              value={settings.mercadopago_access_token}
              onChange={handleChange}
              placeholder="APP_USR-..."
              className="w-full border p-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-primary-green"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              El token se almacena de forma segura para crear preferencias de pago y validar webhooks en tiempo real.
            </span>
          </div>
        </div>

        {/* Sección Datos de Transferencia */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b pb-3">
            <div className="bg-amber-50 text-amber-700 p-2 rounded-xl">
              <Landmark size={24} />
            </div>
            <div>
              <h4 className="font-header text-xl text-secondary-brown font-bold">Datos para Transferencia Bancaria</h4>
              <p className="text-xs text-gray-500">Estos datos se despliegan directamente al cliente en el modal de checkout</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Nombre del Banco</label>
              <input 
                type="text"
                name="bank_name"
                value={settings.bank_name}
                onChange={handleChange}
                placeholder="Ej. Banco Santander"
                className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Tipo de Cuenta</label>
              <input 
                type="text"
                name="bank_account_type"
                value={settings.bank_account_type}
                onChange={handleChange}
                placeholder="Ej. Cuenta Corriente"
                className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Número de Cuenta</label>
              <input 
                type="text"
                name="bank_account_number"
                value={settings.bank_account_number}
                onChange={handleChange}
                placeholder="Ej. 764521890"
                className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">RUT Empresa</label>
              <input 
                type="text"
                name="bank_rut"
                value={settings.bank_rut}
                onChange={handleChange}
                placeholder="Ej. 77.123.456-7"
                className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Nombre / Razón Social del Titular</label>
              <input 
                type="text"
                name="bank_owner"
                value={settings.bank_owner}
                onChange={handleChange}
                placeholder="Ej. Origen Canino SpA"
                className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Email para Envío de Comprobantes</label>
              <input 
                type="email"
                name="bank_email"
                value={settings.bank_email}
                onChange={handleChange}
                placeholder="Ej. pagos@origencanino.cl"
                className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
              />
            </div>
          </div>
        </div>

        {/* Botón de Guardado */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-green hover:bg-primary-green-dark text-white font-bold px-8 py-3.5 rounded-xl transition shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Save size={18} /> {saving ? 'Guardando ajustes...' : 'Guardar Todos los Ajustes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSettingsManager;
