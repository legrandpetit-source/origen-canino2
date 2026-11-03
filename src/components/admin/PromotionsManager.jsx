import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Sparkles, 
  Percent, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Search, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Gift,
  HelpCircle,
  ShoppingBag
} from 'lucide-react';

export default function PromotionsManager({ fetchWithAuth }) {
  const [enabled, setEnabled] = useState(true);
  const [percent, setPercent] = useState(10);
  const [code, setCode] = useState('BIENVENIDO10');
  const [title, setTitle] = useState('¡10% OFF en tu primera compra!');
  const [description, setDescription] = useState('Descuento automático exclusivo para nuevos clientes en su primer pedido.');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Email simulation check
  const [testEmail, setTestEmail] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState(null);

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchPromoSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/promotions/first-order');
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled ?? true);
        setPercent(data.percent ?? 10);
        setCode(data.code || 'BIENVENIDO10');
        setTitle(data.title || '¡10% OFF en tu primera compra!');
        setDescription(data.description || 'Descuento automático exclusivo para nuevos clientes en su primer pedido.');
      } else {
        notify('error', 'No se pudo cargar la configuración de la promoción.');
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoSettings();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/admin/promotions/first-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          percent: Number(percent),
          code: code.trim().toUpperCase(),
          title: title.trim(),
          description: description.trim()
        })
      });

      if (res.ok) {
        notify('success', '¡Promoción de primera compra actualizada y guardada con éxito!');
      } else {
        const err = await res.json();
        notify('error', err.detail || 'Error al guardar los cambios.');
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Error al enviar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckEmail = async (e) => {
    if (e) e.preventDefault();
    if (!testEmail.trim()) return;
    setCheckingEmail(true);
    setEmailCheckResult(null);
    try {
      const res = await fetch(`/api/promotions/check-eligibility?email=${encodeURIComponent(testEmail.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setEmailCheckResult(data);
      } else {
        setEmailCheckResult({ error: 'Error al consultar el servidor' });
      }
    } catch (err) {
      setEmailCheckResult({ error: 'Error de red' });
    } finally {
      setCheckingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-stone-500">
        <RefreshCw className="animate-spin mb-3 text-[#677333]" size={36} />
        <p className="font-medium font-body text-base">Cargando configuración de promociones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Feedback Alert */}
      {feedback && (
        <div 
          className={`p-4 rounded-2xl flex items-center gap-3 font-body shadow-sm transition-all ${
            feedback.type === 'success' 
              ? 'bg-[#677333]/15 text-[#3c2716] border border-[#677333]/30' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={22} className="text-[#677333] shrink-0" />
          ) : (
            <AlertCircle size={22} className="text-red-600 shrink-0" />
          )}
          <span className="font-semibold text-sm md:text-base">{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-[#677333]/10 text-[#677333] rounded-full text-xs font-bold uppercase tracking-wider font-body flex items-center gap-1.5">
              <Gift size={13} /> Fidelización & Adquisición
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#3c2716] font-display">
            Promoción de Primera Compra
          </h2>
          <p className="text-stone-600 font-body text-sm md:text-base mt-1">
            Gestiona el porcentaje de descuento y el mensaje flotante para nuevos clientes sin modificar el código.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`px-5 py-2.5 rounded-2xl font-bold font-body text-sm flex items-center gap-2 transition shadow-sm ${
              enabled 
                ? 'bg-[#677333] text-white hover:bg-[#56602b]' 
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-white animate-pulse' : 'bg-stone-400'}`} />
            {enabled ? 'Promoción Activa' : 'Promoción En Pausa'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Settings */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Discount Percentage */}
            <div>
              <label className="block text-sm font-bold text-[#3c2716] mb-2 font-display">
                Porcentaje de Descuento (%)
              </label>
              
              {/* Preset Chips */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[5, 10, 15, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPercent(preset);
                      setCode(`BIENVENIDO${preset}`);
                      setTitle(`¡${preset}% OFF en tu primera compra!`);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-sm transition border ${
                      Number(percent) === preset
                        ? 'bg-[#677333] text-white border-[#677333] shadow-sm'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#677333] font-body text-lg font-bold text-[#3c2716]"
                  required
                />
                <Percent size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
              <p className="text-xs text-stone-500 mt-1.5 font-body">
                Se descuenta automáticamente en el subtotal a cualquier cliente que no tenga pedidos previos registrados.
              </p>
            </div>

            {/* Promo Code Identifier */}
            <div>
              <label className="block text-sm font-bold text-[#3c2716] mb-1.5 font-display">
                Código Promocional de Referencia
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#677333] font-body font-mono font-bold text-[#3c2716] uppercase"
                  placeholder="BIENVENIDO10"
                  required
                />
                <Tag size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
              <p className="text-xs text-stone-500 mt-1 font-body">
                Identificador que aparecerá en los reportes, boletas y en la notificación de Telegram.
              </p>
            </div>

            {/* Title / Headline */}
            <div>
              <label className="block text-sm font-bold text-[#3c2716] mb-1.5 font-display">
                Titular del Descuento
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#677333] font-body text-base text-[#3c2716] font-semibold"
                placeholder="¡10% OFF en tu primera compra!"
                required
              />
            </div>

            {/* Subtitle / Description */}
            <div>
              <label className="block text-sm font-bold text-[#3c2716] mb-1.5 font-display">
                Descripción / Letra Chica
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#677333] font-body text-sm text-[#3c2716]"
                placeholder="Descuento automático exclusivo para nuevos clientes en su primer pedido."
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#677333] hover:bg-[#56602b] text-white py-3.5 px-6 rounded-2xl font-bold font-body transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Guardando cambios...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Configuración de Promociones
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Preview & Eligibility Checker */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-[#FAF7F2] p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#3c2716] uppercase tracking-wider font-body">
              <span className="flex items-center gap-1.5">
                <Eye size={15} className="text-[#677333]" /> Vista Previa del Widget
              </span>
              <span className="px-2 py-0.5 bg-white text-stone-500 rounded-md border border-stone-200">
                Página Principal
              </span>
            </div>

            {/* Mock Floating Widget */}
            <div className="relative bg-white rounded-2xl p-4 shadow-lg border border-[#677333]/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#677333]/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#677333] text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-sm font-display">
                  %{percent}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-extrabold text-[#c64a4c] bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider font-body">
                      EXCLUSIVO 1RA COMPRA
                    </span>
                  </div>
                  <h4 className="font-extrabold text-[#3c2716] text-sm font-display leading-snug">
                    {title || `¡${percent}% OFF en tu primer pedido!`}
                  </h4>
                  <p className="text-[11px] text-stone-500 font-body line-clamp-2 mt-0.5">
                    {description}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#677333] bg-[#677333]/10 px-2 py-0.5 rounded">
                  {code}
                </span>
                <span className="text-[11px] font-bold text-[#3c2716] flex items-center gap-1 font-body">
                  <ShoppingBag size={12} className="text-[#677333]" /> Se aplica en el carrito
                </span>
              </div>
            </div>

            {/* Summary Breakdown Preview */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200/60 space-y-2 text-xs font-body">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal (Ejemplo 6 pouches):</span>
                <span>$32.940</span>
              </div>
              <div className="flex justify-between font-bold text-[#677333] bg-[#677333]/10 px-2 py-1 rounded-lg">
                <span className="flex items-center gap-1">
                  <Sparkles size={13} /> Descuento 1ra Compra ({percent}%):
                </span>
                <span>-${Math.round(32940 * (Number(percent) / 100)).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between font-extrabold text-[#3c2716] pt-1 border-t border-stone-100 text-sm">
                <span>Total estimado:</span>
                <span>${(32940 - Math.round(32940 * (Number(percent) / 100))).toLocaleString('es-CL')} CLP</span>
              </div>
            </div>
          </div>

          {/* Test Eligibility Tool */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-[#3c2716] font-display flex items-center gap-2">
              <Search size={18} className="text-[#677333]" /> Probar Elegibilidad de Cliente
            </h3>
            <p className="text-xs text-stone-600 font-body">
              Ingresa el correo de un cliente para comprobar si el sistema lo reconoce como comprador nuevo (0 órdenes previas) o recurrente.
            </p>

            <form onSubmit={handleCheckEmail} className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="cliente@ejemplo.cl"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#677333]"
                required
              />
              <button
                type="submit"
                disabled={checkingEmail}
                className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs font-body transition disabled:opacity-50"
              >
                {checkingEmail ? '...' : 'Verificar'}
              </button>
            </form>

            {emailCheckResult && (
              <div className={`p-3 rounded-xl text-xs font-body border ${
                emailCheckResult.eligible 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {emailCheckResult.eligible ? (
                  <div className="flex items-center gap-2 font-bold">
                    <UserCheck size={16} className="text-emerald-600 shrink-0" />
                    <span>¡Cliente Nuevo! Califica para el {percent}% de descuento (0 órdenes previas).</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-bold">
                    <UserX size={16} className="text-amber-600 shrink-0" />
                    <span>Cliente Recurrente: Ya posee {emailCheckResult.order_count} orden(es) registrada(s). No aplica descuento.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
