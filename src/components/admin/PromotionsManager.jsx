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
  ShoppingBag,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Clock,
  Users,
  Copy,
  Check,
  X
} from 'lucide-react';

export default function PromotionsManager({ fetchWithAuth }) {
  const [activeSubTab, setActiveSubTab] = useState('coupons'); // 'coupons' | 'welcome'

  // --- First-Order Welcome Promo State ---
  const [enabled, setEnabled] = useState(true);
  const [percent, setPercent] = useState(10);
  const [code, setCode] = useState('BIENVENIDO10');
  const [title, setTitle] = useState('¡10% OFF en tu primera compra!');
  const [description, setDescription] = useState('Descuento automático exclusivo para nuevos clientes en su primer pedido.');
  const [savingWelcome, setSavingWelcome] = useState(false);

  // Email simulation check
  const [testEmail, setTestEmail] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState(null);

  // --- Dynamic Coupons State ---
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage', // 'percentage' | 'fixed'
    discount_value: 15,
    min_order_amount: 0,
    max_discount_amount: '',
    usage_limit: '',
    usage_per_customer: 1,
    start_date: '',
    end_date: '',
    is_active: true
  });

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const fetchPromoSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/promotions/first-order');
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled ?? true);
        setPercent(data.percent ?? 10);
        setCode(data.code || 'BIENVENIDO10');
        setTitle(data.title || '¡10% OFF en tu primera compra!');
        setDescription(data.description || 'Descuento automático exclusivo para nuevos clientes en su primer pedido.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCouponsList = async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetchWithAuth('/api/admin/promotions');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      } else {
        notify('error', 'No se pudieron cargar los cupones.');
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Error al cargar los cupones desde el servidor.');
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchPromoSettings(), fetchCouponsList()]);
      setLoading(false);
    };
    init();
  }, []);

  // Save Welcome Promo
  const handleSaveWelcome = async (e) => {
    if (e) e.preventDefault();
    setSavingWelcome(true);
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
        notify('success', '¡Promoción de primera compra guardada con éxito!');
      } else {
        const err = await res.json();
        notify('error', err.detail || 'Error al guardar los cambios.');
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Error al enviar la solicitud.');
    } finally {
      setSavingWelcome(false);
    }
  };

  // Check Email Eligibility
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

  // Open Coupon Modal for Create / Edit
  const handleOpenCouponModal = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type || 'percentage',
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount || 0,
        max_discount_amount: coupon.max_discount_amount || '',
        usage_limit: coupon.usage_limit || '',
        usage_per_customer: coupon.usage_per_customer || 1,
        start_date: coupon.start_date ? coupon.start_date.substring(0, 16) : '',
        end_date: coupon.end_date ? coupon.end_date.substring(0, 16) : '',
        is_active: coupon.is_active ?? true
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 15,
        min_order_amount: 0,
        max_discount_amount: '',
        usage_limit: '',
        usage_per_customer: 1,
        start_date: '',
        end_date: '',
        is_active: true
      });
    }
    setIsCouponModalOpen(true);
  };

  // Save Coupon (Create or Update)
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    setSavingCoupon(true);
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim(),
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        min_order_amount: couponForm.min_order_amount ? parseInt(couponForm.min_order_amount) : 0,
        max_discount_amount: couponForm.max_discount_amount ? parseInt(couponForm.max_discount_amount) : null,
        usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit) : null,
        usage_per_customer: couponForm.usage_per_customer ? parseInt(couponForm.usage_per_customer) : 1,
        start_date: couponForm.start_date ? new Date(couponForm.start_date).toISOString() : null,
        end_date: couponForm.end_date ? new Date(couponForm.end_date).toISOString() : null,
        is_active: couponForm.is_active
      };

      let res;
      if (editingCoupon) {
        res = await fetchWithAuth(`/api/admin/promotions/${editingCoupon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetchWithAuth('/api/admin/promotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al guardar el cupón');
      }

      notify('success', editingCoupon ? `¡Cupón ${payload.code} actualizado!` : `¡Cupón ${payload.code} creado exitosamente!`);
      setIsCouponModalOpen(false);
      fetchCouponsList();
    } catch (err) {
      notify('error', err.message || 'Error al procesar la solicitud');
    } finally {
      setSavingCoupon(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (coupon) => {
    try {
      const res = await fetchWithAuth(`/api/admin/promotions/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active })
      });
      if (res.ok) {
        setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
        notify('success', `Cupón ${coupon.code} ${!coupon.is_active ? 'activado' : 'pausado'}.`);
      }
    } catch (err) {
      notify('error', 'Error al cambiar estado del cupón.');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (coupon) => {
    if (!window.confirm(`¿Estás seguro de eliminar el cupón "${coupon.code}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/admin/promotions/${coupon.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCoupons(prev => prev.filter(c => c.id !== coupon.id));
        notify('success', `Cupón ${coupon.code} eliminado correctamente.`);
      } else {
        const data = await res.json();
        notify('error', data.detail || 'Error al eliminar cupón');
      }
    } catch (err) {
      notify('error', 'Error al eliminar el cupón.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-stone-500">
        <RefreshCw className="animate-spin mb-3 text-[#677333]" size={36} />
        <p className="font-medium font-body text-base">Cargando promociones y cupones...</p>
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

      {/* Main Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-[#677333]/10 text-[#677333] rounded-full text-xs font-bold uppercase tracking-wider font-body flex items-center gap-1.5">
              <Gift size={13} /> Fidelización & Campañas Comerciales
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#3c2716] font-display">
            Promociones y Cupones
          </h2>
          <p className="text-stone-600 font-body text-sm md:text-base mt-1">
            Gestiona la oferta automática de bienvenida y crea cupones personalizados por porcentaje o monto fijo en $ CLP.
          </p>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="bg-[#EDE8DF] p-1.5 rounded-2xl border border-[#EBE4DA] flex gap-2 self-start md:self-auto shadow-2xs">
          <button
            onClick={() => setActiveSubTab('coupons')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'coupons'
                ? 'bg-[#677333] text-white shadow-sm'
                : 'text-stone-700 hover:text-[#677333] hover:bg-white/60'
            }`}
          >
            <Tag size={15} />
            <span>Cupones de Campaña ({coupons.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('welcome')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'welcome'
                ? 'bg-[#677333] text-white shadow-sm'
                : 'text-stone-700 hover:text-[#677333] hover:bg-white/60'
            }`}
          >
            <Sparkles size={15} />
            <span>1ra Compra (Automática)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: CUPONES DE CAMPAÑA */}
      {/* ========================================================================= */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-6">
          {/* Header & Quick Action */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-stone-100 shadow-sm">
            <div>
              <h3 className="font-display text-xl font-extrabold text-[#3c2716]">
                Códigos Promocionales Activos
              </h3>
              <p className="text-xs text-stone-500 font-body mt-0.5">
                Los clientes pueden ingresar estos códigos directamente en el carrito o checkout para aplicar el descuento.
              </p>
            </div>
            <button
              onClick={() => handleOpenCouponModal()}
              className="bg-[#677333] hover:bg-[#556029] text-white font-bold px-5 py-3 rounded-2xl shadow-sm text-xs md:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap"
            >
              <Plus size={18} />
              <span>Crear Nuevo Cupón</span>
            </button>
          </div>

          {/* Coupons List */}
          {coupons.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-stone-100 shadow-sm space-y-4">
              <div className="p-4 bg-amber-50 text-amber-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center border border-amber-200">
                <Tag size={30} />
              </div>
              <h4 className="font-display text-lg font-bold text-[#3c2716]">Aún no has creado cupones de campaña</h4>
              <p className="text-stone-500 text-sm max-w-sm mx-auto font-body">
                Crea cupones como <span className="font-mono font-bold text-[#677333]">CANELO15</span> o <span className="font-mono font-bold text-[#677333]">VERANO2026</span> para premiar clientes recurrentes o promociones de temporada.
              </p>
              <button
                onClick={() => handleOpenCouponModal()}
                className="bg-[#677333] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#556029] transition shadow-xs text-xs font-body cursor-pointer"
              >
                Crear el primer cupón
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {coupons.map((coupon) => {
                const isExpired = coupon.end_date && new Date(coupon.end_date) < new Date();
                const limitReached = coupon.usage_limit && coupon.times_used >= coupon.usage_limit;

                return (
                  <div 
                    key={coupon.id}
                    className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                      !coupon.is_active || isExpired || limitReached
                        ? 'border-stone-200 opacity-80'
                        : 'border-[#EBE4DA]'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Code + Toggle Switch */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-lg text-[#3c2716] tracking-wider px-3 py-1 bg-[#FAF7F2] border border-[#EBE4DA] rounded-xl flex items-center gap-1.5 shadow-2xs">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(coupon.code)}
                            className="p-1.5 text-stone-400 hover:text-[#677333] hover:bg-stone-50 rounded-lg transition"
                            title="Copiar código"
                          >
                            {copiedCode === coupon.code ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>

                        {/* Active Switch */}
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                            coupon.is_active 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                          }`}
                          title={coupon.is_active ? 'Pausar cupón' : 'Activar cupón'}
                        >
                          <span className={`w-2 h-2 rounded-full ${coupon.is_active ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                          <span>{coupon.is_active ? 'Activo' : 'Pausado'}</span>
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-stone-600 font-body line-clamp-2 min-h-[32px] mb-3">
                        {coupon.description || 'Sin descripción adicional.'}
                      </p>

                      {/* Benefit Badge */}
                      <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#EBE4DA] mb-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-body">
                          <span className="text-stone-500 font-semibold">Beneficio:</span>
                          <span className="font-extrabold text-[#677333] text-sm">
                            {coupon.discount_type === 'percentage' 
                              ? `${coupon.discount_value}% OFF` 
                              : `-$${Number(coupon.discount_value).toLocaleString('es-CL')} CLP`}
                          </span>
                        </div>

                        {coupon.min_order_amount > 0 && (
                          <div className="flex justify-between items-center text-[11px] font-body text-stone-500">
                            <span>Compra mínima:</span>
                            <span className="font-bold text-stone-700">${Number(coupon.min_order_amount).toLocaleString('es-CL')} CLP</span>
                          </div>
                        )}

                        {coupon.max_discount_amount && (
                          <div className="flex justify-between items-center text-[11px] font-body text-stone-500">
                            <span>Tope de rebaja:</span>
                            <span className="font-bold text-stone-700">${Number(coupon.max_discount_amount).toLocaleString('es-CL')} CLP</span>
                          </div>
                        )}
                      </div>

                      {/* Usage & Expiration Badges */}
                      <div className="space-y-1.5 text-[11px] text-stone-500 font-body mb-2">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1"><Users size={12} /> Canjes realizados:</span>
                          <span className="font-bold text-stone-700">
                            {coupon.times_used} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : 'usos'}
                          </span>
                        </div>

                        {coupon.end_date && (
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1"><Clock size={12} /> Vence:</span>
                            <span className={`font-bold ${isExpired ? 'text-red-600' : 'text-stone-700'}`}>
                              {new Date(coupon.end_date).toLocaleDateString('es-CL')} {isExpired && '(Expirado)'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-stone-100 flex justify-end items-center gap-1.5 mt-2">
                      <button
                        onClick={() => handleOpenCouponModal(coupon)}
                        className="px-3 py-1.5 text-stone-600 hover:text-[#677333] hover:bg-[#FAF7F2] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon)}
                        className="px-3 py-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: PROMOCIÓN PRIMERA COMPRA (AUTOMÁTICA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'welcome' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Settings */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-stone-100">
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#3c2716]">
                  Ajustes del Descuento Automático
                </h3>
                <p className="text-xs text-stone-500 font-body">
                  Aplica a carritos que superen la compra mínima de $30.000 CLP.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`px-4 py-2 rounded-2xl font-bold font-body text-xs flex items-center gap-2 transition shadow-sm ${
                  enabled 
                    ? 'bg-[#677333] text-white hover:bg-[#56602b]' 
                    : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-white animate-pulse' : 'bg-stone-400'}`} />
                {enabled ? 'Activa' : 'Pausada'}
              </button>
            </div>

            <form onSubmit={handleSaveWelcome} className="space-y-6">
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
              </div>

              {/* Coupon Code for Welcome */}
              <div>
                <label className="block text-sm font-bold text-[#3c2716] mb-1 font-display">
                  Código de Activación Manual (Opcional)
                </label>
                <p className="text-xs text-stone-500 mb-2 font-body">
                  Permite al cliente ingresarlo manualmente si no se le activa de forma automática.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="BIENVENIDO10"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#677333] font-mono text-base font-bold text-[#3c2716] uppercase tracking-wider"
                    required
                  />
                  <Tag size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#3c2716] mb-1 font-display">
                    Título Visible en el Banner y Notificaciones
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#677333] font-body text-sm text-[#3c2716]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#3c2716] mb-1 font-display">
                    Texto Explicativo
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#677333] font-body text-sm text-[#3c2716]"
                    required
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={savingWelcome}
                className="w-full bg-[#677333] hover:bg-[#56602b] text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-sm font-body text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingWelcome ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                <span>Guardar Ajustes de Bienvenida</span>
              </button>
            </form>
          </div>

          {/* Right Column: Preview & Eligibility Testing */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Preview Card */}
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 font-body flex items-center gap-1.5">
                  <Eye size={14} /> Vista Previa del Cliente
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                }`}>
                  {enabled ? 'Visible en tienda' : 'Oculto'}
                </span>
              </div>

              {/* Badge Preview */}
              <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#ebe4da] space-y-2">
                <div className="flex items-center gap-2 text-[#db994b] font-bold text-xs uppercase tracking-wider">
                  <Sparkles size={14} /> Descuento Automático
                </div>
                <h4 className="font-display font-extrabold text-[#3c2716] text-base">
                  {title}
                </h4>
                <p className="text-xs text-stone-600 font-body">
                  {description}
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-[#ebe4da]/60">
                  <span className="font-mono text-xs font-bold text-[#677333] bg-[#677333]/10 px-2 py-1 rounded-md">
                    {code}
                  </span>
                  <span className="text-xs font-bold text-stone-500">
                    Aplica automáticamente
                  </span>
                </div>
              </div>

              {/* Simulation Breakdown */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 text-xs font-body space-y-2">
                <p className="font-bold text-stone-700">Simulación en un carrito de $35.000 CLP:</p>
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>$35.000 CLP</span>
                </div>
                <div className="flex justify-between font-bold text-[#677333] bg-[#677333]/10 px-2 py-1 rounded-lg">
                  <span className="flex items-center gap-1">
                    <Sparkles size={13} /> Descuento 1ra Compra ({percent}%):
                  </span>
                  <span>-${Math.round(35000 * (Number(percent) / 100)).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between font-extrabold text-[#3c2716] pt-1 border-t border-stone-100 text-sm">
                  <span>Total estimado:</span>
                  <span>${(35000 - Math.round(35000 * (Number(percent) / 100))).toLocaleString('es-CL')} CLP</span>
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
                      <span>Cliente Recurrente: Ya posee {emailCheckResult.order_count} orden(es) registrada(s). No aplica descuento de primera compra.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR CUPÓN */}
      {/* ========================================================================= */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 md:p-8 border border-[#EBE4DA] shadow-xl space-y-6 relative my-8">
            <div className="flex justify-between items-center pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#677333]/10 text-[#677333] flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[#3c2716]">
                    {editingCoupon ? `Editar Cupón: ${editingCoupon.code}` : 'Crear Nuevo Cupón de Descuento'}
                  </h3>
                  <p className="text-xs text-stone-500 font-body">
                    Configura las condiciones comerciales del código promocional.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCouponModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-5">
              {/* Código */}
              <div>
                <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                  Código del Cupón *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCoupon}
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: CANELO15, VERANO2026, DESPACHO5K"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 font-mono text-base font-bold text-[#3c2716] uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#677333] disabled:bg-stone-100"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                  Descripción Interna / Campaña
                </label>
                <input
                  type="text"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="Ej: Descuento 15% para clientes de Algarrobo y Viña"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs md:text-sm font-body text-[#3c2716] focus:outline-none focus:ring-2 focus:ring-[#677333]"
                />
              </div>

              {/* Tipo y Valor de Descuento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Tipo de Descuento *
                  </label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs md:text-sm font-body text-[#3c2716] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#677333]"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($ CLP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Valor del Descuento *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      step={couponForm.discount_type === 'percentage' ? '1' : '500'}
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                      placeholder={couponForm.discount_type === 'percentage' ? '15' : '5000'}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-[#3c2716] font-body focus:outline-none focus:ring-2 focus:ring-[#677333]"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">
                      {couponForm.discount_type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compra mínima y Tope de Descuento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Compra Mínima ($ CLP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={couponForm.min_order_amount}
                    onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: e.target.value })}
                    placeholder="0 = sin mínimo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs md:text-sm font-body text-[#3c2716] focus:outline-none focus:ring-2 focus:ring-[#677333]"
                  />
                  <span className="text-[10px] text-stone-400">0 para no exigir monto mínimo.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Tope Máximo de Rebaja ($ CLP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    disabled={couponForm.discount_type === 'fixed'}
                    value={couponForm.max_discount_amount}
                    onChange={(e) => setCouponForm({ ...couponForm, max_discount_amount: e.target.value })}
                    placeholder="Opcional (sólo para %)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs md:text-sm font-body text-[#3c2716] focus:outline-none focus:ring-2 focus:ring-[#677333] disabled:bg-stone-50"
                  />
                  <span className="text-[10px] text-stone-400">Límite en pesos para descuentos en %.</span>
                </div>
              </div>

              {/* Límites de Uso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Límite Total de Usos (Tienda)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.usage_limit}
                    onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                    placeholder="Vacío = Ilimitado"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs md:text-sm font-body text-[#3c2716] focus:outline-none focus:ring-2 focus:ring-[#677333]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Usos por Cliente (Email)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.usage_per_customer}
                    onChange={(e) => setCouponForm({ ...couponForm, usage_per_customer: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs md:text-sm font-body text-[#3c2716] focus:outline-none focus:ring-2 focus:ring-[#677333]"
                  />
                </div>
              </div>

              {/* Fechas de Vigencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Fecha de Inicio (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={couponForm.start_date}
                    onChange={(e) => setCouponForm({ ...couponForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-body text-[#3c2716] focus:outline-none focus:ring-2 focus:ring-[#677333]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3c2716] uppercase tracking-wider mb-1 font-display">
                    Fecha de Vencimiento (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={couponForm.end_date}
                    onChange={(e) => setCouponForm({ ...couponForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-body text-[#3c2716] focus:outline-none focus:ring-2 focus:ring-[#677333]"
                  />
                </div>
              </div>

              {/* Estado Activo */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="text-xs font-bold text-[#3c2716] font-display">
                  ¿Habilitar cupón de inmediato?
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={couponForm.is_active}
                    onChange={(e) => setCouponForm({ ...couponForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#677333]"></div>
                </label>
              </div>

              {/* Botones */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 font-bold rounded-2xl hover:bg-stone-50 transition text-xs font-body cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="flex-1 py-3 bg-[#677333] hover:bg-[#556029] text-white font-bold rounded-2xl transition shadow-sm text-xs font-body flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingCoupon ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>{editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
