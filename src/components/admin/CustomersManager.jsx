import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, RefreshCw, Download, MessageCircle, Mail, Key, Ban, Unlock,
  Trash2, Eye, X, Save, Plus, Minus, PawPrint, ShoppingBag, Wallet, Activity,
  Tag, CheckCircle2, AlertTriangle, ShieldAlert, Send, Settings, Copy, Check,
  UserPlus, Clock, Sparkles, Filter
} from 'lucide-react';

const WHATSAPP_TEMPLATES = [
  {
    id: 'welcome_post',
    label: 'Seguimiento Post-Compra',
    text: '¡Hola {nombre}! 🐾 Te escribo de Origen Canino para saber cómo le cayó la comida real a {perro}. Si tienes cualquier duda con las porciones o transición, cuéntame por aquí.'
  },
  {
    id: 'reposicion',
    label: 'Recordatorio de Reposición',
    text: '¡Hola {nombre}! 🥩 Calculamos que a {perro} ya le debe ir quedando poca comida. ¿Quieres que te reservemos su menú para el próximo despacho con cadena de frío?'
  },
  {
    id: 'activar_sin_compra',
    label: 'Activar Registrado Sin Compra',
    text: '¡Hola {nombre}! 🐾 Vi que creaste tu cuenta en Origen Canino para {perro}. Recuerda que tienes 10% de descuento en tu primera compra usando el cupón BIENVENIDO10 en origencanino.cl. ¿Te ayudo a elegir la dieta ideal?'
  },
  {
    id: 'embajador',
    label: 'Activar Club de Embajadores',
    text: '¡Hola {nombre}! 🌟 Gracias por ser parte de la Familia Origen Canino. Recuerda que compartiendo tu código {codigo_embajador} tus amigos obtienen 10% OFF en su primera compra y tú acumulas $5.000 CLP sin tope para la comida de {perro}.'
  },
  {
    id: 'invitado_crear_cuenta',
    label: 'Invitar a Crear Cuenta (Invitados)',
    text: '¡Hola {nombre}! 🐾 Muchas gracias por confiar en Origen Canino para {perro}. Te invito a crear tu cuenta en origencanino.cl con tu mismo correo para repetir pedidos en 1 clic y obtener tu código de embajador ($5.000 CLP por cada amigo que invites).'
  },
  {
    id: 'libre',
    label: 'Mensaje Libre Personalizado',
    text: '¡Hola {nombre}! Te escribimos desde Origen Canino 🐾 '
  }
];

const formatCLP = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-CL')}`;

const formatShortDate = (iso) => {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (iso) => {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const cleanPhoneForWA = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('56')) return digits;
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  if (digits.length === 8) return `569${digits}`;
  return digits;
};

const interpolateTemplate = (tpl, person) => {
  const firstName = String(person?.name || 'Amigo').trim().split(/\s+/)[0] || 'Amigo';
  const dogName =
    (person?.dogs && person.dogs.length > 0 && person.dogs[0].name) ||
    person?.dog_name ||
    'tu perro';
  const refCode = person?.referral_code || 'ORIGEN';
  return String(tpl || '')
    .replace(/\{nombre\}/g, firstName)
    .replace(/\{perro\}/g, dogName)
    .replace(/\{codigo_embajador\}/g, refCode);
};

export default function CustomersManager({ fetchWithAuth }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ kpis: {}, customers: [], guests: [], comunas: [] });
  const [subTab, setSubTab] = useState('registered'); // 'registered' | 'guests' | 'marketing'

  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all'); // all, buyers, no_orders, vip, inactive, ambassadors, blocked
  const [comunaFilter, setComunaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // recent, spent, orders, visits, last_seen
  const [selectedIds, setSelectedIds] = useState([]);

  // Ficha 360° Modal
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Acciones de soporte dentro de Ficha 360°
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [tempPasswordResult, setTempPasswordResult] = useState(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [walletDelta, setWalletDelta] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Modal Ficha & Edición de Mascota (desde tabla o Ficha 360°)
  const [dogModal, setDogModal] = useState(null); // { customerId, customerName, dog (null si nuevo) }
  const [dogEditForm, setDogEditForm] = useState({
    name: '',
    weight: '',
    age_stage: 'adulto',
    favorite_diet: 'barf',
    birth_date: '',
    birth_date_approx: false,
    notes: ''
  });
  const [savingDogAdmin, setSavingDogAdmin] = useState(false);

  const openDogAdminModal = (customerId, customerName, dog = null) => {
    setDogModal({ customerId, customerName, dog });
    if (dog) {
      const rawStage = dog.computed_stage || dog.age_stage || 'adulto';
      setDogEditForm({
        name: dog.name || '',
        weight: dog.weight ?? '',
        age_stage: rawStage === 'senior' ? 'adult_low' : (rawStage === 'adult_normal' ? 'adulto' : rawStage),
        favorite_diet: dog.favorite_diet || 'barf',
        birth_date: dog.birth_date || '',
        birth_date_approx: Boolean(dog.birth_date_approx),
        notes: dog.notes || ''
      });
    } else {
      setDogEditForm({
        name: '',
        weight: '',
        age_stage: 'adulto',
        favorite_diet: 'barf',
        birth_date: '',
        birth_date_approx: false,
        notes: ''
      });
    }
  };

  const handleSaveDogAdmin = async (e) => {
    e.preventDefault();
    if (!dogModal) return;
    setSavingDogAdmin(true);
    try {
      const isEdit = Boolean(dogModal.dog?.id);
      const url = isEdit
        ? `/api/admin/customers/${dogModal.customerId}/dogs/${dogModal.dog.id}`
        : `/api/admin/customers/${dogModal.customerId}/dogs`;
      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dogEditForm.name.trim(),
          weight: parseFloat(dogEditForm.weight || '0'),
          age_stage: dogEditForm.age_stage || 'adulto',
          favorite_diet: dogEditForm.favorite_diet || 'barf',
          birth_date: dogEditForm.birth_date || null,
          birth_date_approx: Boolean(dogEditForm.birth_date_approx),
          notes: dogEditForm.notes || ''
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Error guardando mascota');
      showToast('success', `Ficha de ${json.dog.name} guardada correctamente.`);
      setDogModal(null);
      await loadCustomers();
      if (detailData && detailData.customer.id === dogModal.customerId) {
        openCustomer360(dogModal.customerId);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSavingDogAdmin(false);
    }
  };

  // Marketing Directo
  const [campaignAudience, setCampaignAudience] = useState('selected'); // selected, all_filtered, no_orders, inactive, vip, ambassadors, guests
  const [selectedTemplateId, setSelectedTemplateId] = useState('reposicion');
  const [waMessageText, setWaMessageText] = useState(WHATSAPP_TEMPLATES[1].text);
  const [openedWaKeys, setOpenedWaKeys] = useState({});
  const [sentWaKeys, setSentWaKeys] = useState({});
  const [pendingWaConfirm, setPendingWaConfirm] = useState(null); // { person, text, key }

  const formatStageBadge = (stage) => {
    const s = String(stage || 'adulto').toLowerCase();
    if (s === 'cachorro') return 'Cachorro';
    if (s === 'senior' || s === 'adult_low') return 'Senior';
    return 'Adulto';
  };

  // Email Marketing + SMTP
  const [emailSubject, setEmailSubject] = useState('Novedades de Origen Canino para {perro} 🐾');
  const [emailBody, setEmailBody] = useState(
    'Hola {nombre},\n\nQueremos contarte que ya abrimos agenda para nuestros próximos despachos de comida real 100% natural para {perro}.\n\nRecuerda que con tu código personal {codigo_embajador} tus amigos obtienen 10% de descuento en su primera compra y tú acumulas $5.000 CLP sin tope.\n\n¡Un abrazo de todo el equipo de Origen Canino!'
  );
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_name: 'Origen Canino',
    smtp_from_email: '',
    smtp_use_ssl: false,
    smtp_password_configured: false
  });
  const [savingSmtp, setSavingSmtp] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/customers');
      if (!res.ok) throw new Error('Error cargando clientes');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      showToast('error', 'No se pudo cargar la lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const loadSmtpSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/customers/smtp-settings');
      if (res.ok) {
        const s = await res.json();
        setSmtpForm((prev) => ({ ...prev, ...s, smtp_password: '' }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadSmtpSettings();
  }, []);

  const openCustomer360 = async (customerId) => {
    setDetailLoading(true);
    setTempPasswordResult(null);
    setNewPasswordInput('');
    setWalletDelta('');
    setWalletReason('');
    try {
      const res = await fetchWithAuth(`/api/admin/customers/${customerId}`);
      if (!res.ok) throw new Error('No se pudo cargar la ficha');
      const json = await res.json();
      setDetailData(json);
      setEditForm({
        name: json.customer.name || '',
        phone: json.customer.phone || '',
        address: json.customer.address || '',
        city: json.customer.city || '',
        region: json.customer.region || 'Región Metropolitana',
        admin_notes: json.customer.admin_notes || '',
        tags: json.customer.tags || '',
        marketing_opt_in: json.customer.marketing_opt_in !== false
      });
      setBlockReason(json.customer.blocked_reason || '');
    } catch (err) {
      showToast('error', err.message || 'Error abriendo ficha 360°');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveCustomerEdit = async () => {
    if (!detailData || !editForm) return;
    setSavingEdit(true);
    try {
      const res = await fetchWithAuth(`/api/admin/customers/${detailData.customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('Error guardando cambios');
      showToast('success', 'Datos y notas CRM guardados.');
      await Promise.all([openCustomer360(detailData.customer.id), loadCustomers()]);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async () => {
    if (!detailData) return;
    try {
      const res = await fetchWithAuth(`/api/admin/customers/${detailData.customer.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPasswordInput.trim() || null })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Error cambiando contraseña');
      setTempPasswordResult(json.temporary_password);
      setNewPasswordInput('');
      showToast('success', 'Contraseña restablecida con éxito.');
      openCustomer360(detailData.customer.id);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleToggleBlock = async (targetBlocked) => {
    if (!detailData) return;
    const msg = targetBlocked
      ? `¿Bloquear la cuenta de ${detailData.customer.name}? No podrá iniciar sesión.`
      : `¿Desbloquear la cuenta de ${detailData.customer.name}?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetchWithAuth(`/api/admin/customers/${detailData.customer.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: targetBlocked, reason: blockReason })
      });
      if (!res.ok) throw new Error('Error actualizando estado de bloqueo');
      showToast('success', targetBlocked ? 'Cuenta bloqueada.' : 'Cuenta desbloqueada.');
      await Promise.all([openCustomer360(detailData.customer.id), loadCustomers()]);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleAdjustWallet = async () => {
    if (!detailData) return;
    const amt = parseInt(walletDelta, 10);
    if (!amt || isNaN(amt)) return showToast('error', 'Ingresa un monto entero distinto de 0 (ej: 5000 o -2000).');
    if (!walletReason.trim()) return showToast('error', 'Indica el motivo del ajuste de saldo.');
    try {
      const res = await fetchWithAuth(`/api/admin/customers/${detailData.customer.id}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, reason: walletReason.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Error ajustando billetera');
      setWalletDelta('');
      setWalletReason('');
      showToast('success', `Billetera actualizada a ${formatCLP(json.wallet_balance)}.`);
      await Promise.all([openCustomer360(detailData.customer.id), loadCustomers()]);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!detailData) return;
    const c = detailData.customer;
    const confirmText = window.prompt(
      `⚠️ Confirmación de seguridad:\nSi ${c.name} tiene compras pagadas, su cuenta se desactivará y anonimizará para proteger la contabilidad.\nSi NO tiene compras pagadas, se eliminará definitivamente.\n\nEscribe ELIMINAR para confirmar:`
    );
    if (confirmText !== 'ELIMINAR') return;
    try {
      const res = await fetchWithAuth(`/api/admin/customers/${c.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Error eliminando cliente');
      showToast('success', json.message || 'Cliente eliminado.');
      setDetailData(null);
      loadCustomers();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const res = await fetchWithAuth('/api/admin/customers/smtp-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm)
      });
      if (!res.ok) throw new Error('No se pudo guardar SMTP');
      showToast('success', 'Configuración SMTP guardada.');
      loadSmtpSettings();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSavingSmtp(false);
    }
  };

  // Filtrado de clientes registrados
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = (data.customers || []).filter((c) => {
      if (segmentFilter === 'buyers' && c.paid_orders_count === 0) return false;
      if (segmentFilter === 'no_orders' && c.paid_orders_count > 0) return false;
      if (segmentFilter === 'vip' && c.paid_orders_count < 3) return false;
      if (segmentFilter === 'inactive' && !(c.paid_orders_count > 0 && c.days_since_last_order >= 35)) return false;
      if (segmentFilter === 'ambassadors' && !(c.referred_count > 0 || c.wallet_balance > 0)) return false;
      if (segmentFilter === 'blocked' && !c.is_blocked) return false;
      if (comunaFilter !== 'all' && (c.city || '').trim() !== comunaFilter) return false;

      if (q) {
        const dogsStr = (c.dogs || []).map((d) => d.name).join(' ').toLowerCase();
        const hay = `${c.name} ${c.email} ${c.phone} ${c.city} ${c.referral_code} ${c.tags} ${dogsStr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'spent') return (b.total_spent || 0) - (a.total_spent || 0);
      if (sortBy === 'orders') return (b.paid_orders_count || 0) - (a.paid_orders_count || 0);
      if (sortBy === 'visits') return (b.visit_count || 0) - (a.visit_count || 0);
      if (sortBy === 'last_seen') return new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0);
      return b.id - a.id;
    });
    return list;
  }, [data.customers, search, segmentFilter, comunaFilter, sortBy]);

  // Audiencia calculada para Marketing Directo
  const marketingRecipients = useMemo(() => {
    const allC = (data.customers || []).filter((c) => !c.is_blocked);
    if (campaignAudience === 'selected') {
      return allC.filter((c) => selectedIds.includes(c.id));
    }
    if (campaignAudience === 'all_filtered') return filteredCustomers.filter((c) => !c.is_blocked);
    if (campaignAudience === 'no_orders') return allC.filter((c) => c.paid_orders_count === 0);
    if (campaignAudience === 'inactive') return allC.filter((c) => c.paid_orders_count > 0 && c.days_since_last_order >= 35);
    if (campaignAudience === 'vip') return allC.filter((c) => c.paid_orders_count >= 3);
    if (campaignAudience === 'ambassadors') return allC.filter((c) => c.referred_count > 0 || c.wallet_balance > 0);
    if (campaignAudience === 'guests') return data.guests || [];
    return allC;
  }, [campaignAudience, data.customers, data.guests, filteredCustomers, selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Abre WhatsApp SIN registrar aún como enviado (evita falsos positivos si el admin cierra la pestaña sin enviar)
  const handleOpenWhatsApp = (person, customText) => {
    const phone = cleanPhoneForWA(person.phone);
    if (!phone) {
      showToast('error', `${person.name} no tiene teléfono válido registrado.`);
      return;
    }
    const text = interpolateTemplate(customText, person);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    const key = person.id ? `c-${person.id}` : `g-${person.key}`;
    setOpenedWaKeys((prev) => ({ ...prev, [key]: text }));
    if (person.id) {
      setPendingWaConfirm({ person, text, key });
    }
  };

  // Registra el envío en CRM únicamente cuando el admin confirma que sí lo envió en WhatsApp
  const handleConfirmWhatsAppSent = async (person, text, key) => {
    setSentWaKeys((prev) => ({ ...prev, [key]: true }));
    setPendingWaConfirm(null);
    if (person?.id) {
      try {
        await fetchWithAuth('/api/admin/customers/crm-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: person.id,
            event_type: 'whatsapp_sent',
            details: `WhatsApp confirmado: "${text.slice(0, 90)}${text.length > 90 ? '...' : ''}"`
          })
        });
        showToast('success', `Envío de WhatsApp a ${person.name} registrado en el CRM.`);
        if (detailData && detailData.customer.id === person.id) {
          openCustomer360(person.id);
        }
      } catch (err) {
        showToast('error', 'No se pudo registrar el evento en el CRM.');
      }
    }
  };

  const handleDeleteCrmEvent = async (eventId) => {
    if (!detailData) return;
    try {
      const res = await fetchWithAuth(`/api/admin/customers/crm-event/${eventId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error eliminando evento');
      setDetailData((prev) =>
        prev ? { ...prev, events: prev.events.filter((ev) => ev.id !== eventId) } : prev
      );
      showToast('success', 'Evento eliminado del historial.');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleSendEmailCampaign = async () => {
    const registeredRecipients = marketingRecipients.filter((r) => Boolean(r.id));
    if (registeredRecipients.length === 0) {
      return showToast('error', 'No hay clientes registrados en la audiencia seleccionada para envío de correo.');
    }
    if (!window.confirm(`¿Enviar correo corporativo a ${registeredRecipients.length} cliente(s)?`)) return;
    setSendingEmail(true);
    try {
      const res = await fetchWithAuth('/api/admin/customers/send-email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_ids: registeredRecipients.map((r) => r.id),
          subject: emailSubject,
          body_text: emailBody
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Error enviando campaña');
      showToast(
        'success',
        `Campaña enviada: ${json.sent} correo(s) entregados${json.skipped_opt_out ? `, ${json.skipped_opt_out} excluidos por opt-out` : ''}.`
      );
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCSV = (list, filename = 'clientes-origen-canino.csv') => {
    const headers = ['Nombre', 'Email', 'Telefono', 'Comuna', 'Mascota', 'Pedidos Pagados', 'Total Gastado', 'Logins', 'Visitas', 'Codigo Embajador', 'Saldo Billetera'];
    const rows = list.map((p) => [
      p.name || '',
      p.email || '',
      p.phone || '',
      p.city || '',
      (p.dogs && p.dogs.map((d) => d.name).join(' / ')) || p.dog_name || '',
      p.paid_orders_count || 0,
      p.total_spent || 0,
      p.login_count || 0,
      p.visit_count || 0,
      p.referral_code || '',
      p.wallet_balance || 0
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = data.kpis || {};

  return (
    <div className="space-y-6">
      {/* Banner flotante de confirmación real de envío WhatsApp */}
      {pendingWaConfirm && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-emerald-500 shadow-2xl rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 max-w-xl text-xs">
          <MessageCircle size={18} className="text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <span className="font-bold text-secondary-brown">
              ¿Enviaste el mensaje de WhatsApp a {pendingWaConfirm.person.name}?
            </span>
            <p className="text-[11px] text-stone-500">Solo se registrará en su historial CRM si lo confirmas.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                handleConfirmWhatsAppSent(
                  pendingWaConfirm.person,
                  pendingWaConfirm.text,
                  pendingWaConfirm.key
                )
              }
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
            >
              Sí, registrar envío ✓
            </button>
            <button
              onClick={() => setPendingWaConfirm(null)}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl cursor-pointer"
            >
              No lo envié
            </button>
          </div>
        </div>
      )}

      {/* Toast flotante */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-header text-2xl md:text-3xl font-extrabold text-secondary-brown flex items-center gap-2.5">
            <Users className="text-primary-green" size={28} />
            Clientes & Marketing Directo (CRM)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Control total de cuentas, historial de compras, ingresos al sitio, soporte y campañas por WhatsApp / Email.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCSV(filteredCustomers)}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download size={14} /> Exportar CSV ({filteredCustomers.length})
          </button>
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="px-3.5 py-2 bg-primary-green hover:bg-primary-green-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs clicables */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          onClick={() => { setSubTab('registered'); setSegmentFilter('all'); }}
          className="text-left bg-white p-4 rounded-2xl border border-[#EBE4DA] hover:border-primary-green/50 transition shadow-2xs cursor-pointer"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Registrados</span>
          <p className="text-2xl font-extrabold text-secondary-brown mt-1">{kpis.total_customers || 0}</p>
          <span className="text-[11px] text-stone-400">+ {kpis.guests_count || 0} invitados sin cuenta</span>
        </button>

        <button
          onClick={() => { setSubTab('registered'); setSegmentFilter('buyers'); }}
          className="text-left bg-white p-4 rounded-2xl border border-emerald-200/80 hover:border-emerald-400 transition shadow-2xs cursor-pointer"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Activos (30d)</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{kpis.active_30d || 0}</p>
          <span className="text-[11px] text-stone-400">Ticket prom: {formatCLP(kpis.avg_ticket)}</span>
        </button>

        <button
          onClick={() => { setSubTab('registered'); setSegmentFilter('no_orders'); }}
          className="text-left bg-white p-4 rounded-2xl border border-amber-200/80 hover:border-amber-400 transition shadow-2xs cursor-pointer"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Sin Comprar</span>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{kpis.no_orders || 0}</p>
          <span className="text-[11px] text-stone-400">Oportunidad 1ra compra</span>
        </button>

        <button
          onClick={() => { setSubTab('registered'); setSegmentFilter('inactive'); }}
          className="text-left bg-white p-4 rounded-2xl border border-rose-200/80 hover:border-rose-400 transition shadow-2xs cursor-pointer"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Inactivos (+35d)</span>
          <p className="text-2xl font-extrabold text-rose-700 mt-1">{kpis.inactive_35d || 0}</p>
          <span className="text-[11px] text-stone-400">{kpis.blocked || 0} bloqueados</span>
        </button>

        <div className="bg-gradient-to-br from-[#2F3E1E] to-[#4A5F30] text-white p-4 rounded-2xl shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200">LTV Acumulado</span>
          <p className="text-2xl font-extrabold mt-1">{formatCLP(kpis.total_ltv)}</p>
          <span className="text-[11px] text-white/80">Billeteras: {formatCLP(kpis.total_wallet_balance)}</span>
        </div>
      </div>

      {/* Próximos Cumpleaños de Mascotas (30 días) */}
      {(data.upcoming_birthdays || []).length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-[#FAF7F2] to-emerald-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-header font-bold text-sm text-secondary-brown flex items-center gap-2">
              🎂 Próximos Cumpleaños Perrunos ({data.upcoming_birthdays.length})
            </h3>
            <span className="text-[11px] text-stone-500">Próximos 30 días · Ideal para saludo o regalito</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.upcoming_birthdays.map((b) => (
              <div
                key={`${b.customer_id}-${b.dog_id}`}
                className="bg-white border border-amber-200/70 rounded-xl px-3 py-2 flex items-center gap-3 text-xs shadow-2xs"
              >
                <div>
                  <span className="font-bold text-secondary-brown">{b.dog_name}</span>
                  <span className="text-stone-400"> ({b.customer_name.split(' ')[0]})</span>
                  <div className="text-[10px] text-amber-800 font-semibold">
                    {b.days_to_birthday === 0
                      ? '🎉 ¡Hoy está de cumpleaños!'
                      : `En ${b.days_to_birthday} día${b.days_to_birthday === 1 ? '' : 's'} · ${b.age_label || ''}`}
                  </div>
                </div>
                {b.customer_phone && (
                  <button
                    onClick={() =>
                      handleOpenWhatsApp(
                        { id: b.customer_id, name: b.customer_name, phone: b.customer_phone, dog_name: b.dog_name },
                        `¡Hola {nombre}! 🎂🐾 En Origen Canino vimos que {perro} está de cumpleaños${b.days_to_birthday === 0 ? ' hoy' : ' muy pronto'} y queríamos mandarle un abrazo gigante. ¡Que cumpla muchos años más lleno de salud y comida real!`
                      )
                    }
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle size={12} /> Saludar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EBE4DA] pb-3">
        {[
          { id: 'registered', label: `Clientes Registrados (${(data.customers || []).length})`, icon: Users },
          { id: 'guests', label: `Compradores Invitados (${(data.guests || []).length})`, icon: UserPlus },
          { id: 'marketing', label: `Marketing Directo & Campañas`, icon: Send }
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                active
                  ? 'bg-primary-green text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-[#EBE4DA] hover:bg-stone-50'
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* === SUB-TAB 1: CLIENTES REGISTRADOS === */}
      {subTab === 'registered' && (
        <div className="space-y-4">
          {/* Barra de búsqueda y filtros */}
          <div className="bg-white p-4 rounded-2xl border border-[#EBE4DA] space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, correo, teléfono, comuna, código o nombre del perro..."
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-green/30 outline-none"
                />
              </div>

              <select
                value={comunaFilter}
                onChange={(e) => setComunaFilter(e.target.value)}
                className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700"
              >
                <option value="all">Todas las Comunas</option>
                {(data.comunas || []).map((com) => (
                  <option key={com} value={com}>{com}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700"
              >
                <option value="recent">Más recientes</option>
                <option value="spent">Mayor gasto (LTV)</option>
                <option value="orders">Más pedidos</option>
                <option value="visits">Más visitas al sitio</option>
                <option value="last_seen">Última actividad</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'buyers', label: 'Con Compras' },
                  { id: 'no_orders', label: 'Sin Comprar' },
                  { id: 'vip', label: 'VIP (3+)' },
                  { id: 'inactive', label: 'Inactivos (+35d)' },
                  { id: 'ambassadors', label: 'Embajadores' },
                  { id: 'blocked', label: 'Bloqueados' }
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setSegmentFilter(chip.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                      segmentFilter === chip.id
                        ? 'bg-secondary-brown text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {selectedIds.length > 0 && (
                <button
                  onClick={() => { setCampaignAudience('selected'); setSubTab('marketing'); }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send size={13} /> Enviar campaña a {selectedIds.length} seleccionados
                </button>
              )}
            </div>
          </div>

          {/* Tabla Maestra */}
          <div className="bg-white rounded-2xl border border-[#EBE4DA] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-stone-500 uppercase text-[10px] font-bold border-b border-[#EBE4DA]">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Mascota(s)</th>
                    <th className="p-3">Compras & LTV</th>
                    <th className="p-3">Actividad Sitio</th>
                    <th className="p-3">Embajador</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-stone-400">Cargando clientes...</td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-stone-400">No se encontraron clientes con estos filtros.</td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className={`hover:bg-[#FAF7F2]/70 transition ${c.is_blocked ? 'bg-red-50/40' : ''}`}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleSelectOne(c.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => openCustomer360(c.id)}
                              className="font-bold text-secondary-brown hover:text-primary-green text-left cursor-pointer"
                            >
                              {c.name}
                            </button>
                            {c.paid_orders_count >= 3 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-extrabold">VIP</span>
                            )}
                            {c.is_blocked && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-extrabold">BLOQUEADO</span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500">{c.email}</div>
                          <div className="text-[11px] text-stone-400">
                            {c.phone || 'Sin teléfono'} {c.city ? `· ${c.city}` : ''}
                          </div>
                        </td>
                        <td className="p-3">
                          {c.dogs && c.dogs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {c.dogs.map((d) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => openDogAdminModal(c.id, c.name, d)}
                                  className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-primary-green/15 border border-stone-200 hover:border-primary-green/40 px-2.5 py-1 rounded-full text-[11px] text-stone-700 transition cursor-pointer group"
                                  title={`Ver / editar ficha de ${d.name}`}
                                >
                                  <PawPrint size={11} className="text-primary-green shrink-0" />
                                  <span className="font-semibold">{d.name}</span>
                                  {d.age_label ? <span className="text-primary-green font-semibold">· {d.age_label}</span> : null}
                                  <span className="text-stone-400">({d.weight ?? 0}kg)</span>
                                  {d.days_to_birthday !== null && d.days_to_birthday !== undefined && d.days_to_birthday <= 14 ? (
                                    <span title={`Cumpleaños en ${d.days_to_birthday} días`}>🎂</span>
                                  ) : null}
                                  <Eye size={11} className="text-stone-400 group-hover:text-primary-green ml-0.5" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openDogAdminModal(c.id, c.name, null)}
                              className="text-[11px] text-stone-400 hover:text-primary-green italic inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={11} /> Agregar perro
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-extrabold text-secondary-brown">{formatCLP(c.total_spent)}</div>
                          <div className="text-[11px] text-stone-500">
                            {c.paid_orders_count} pagado(s) · {c.last_order_at ? formatShortDate(c.last_order_at) : 'Sin compras'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-stone-700 flex items-center gap-1">
                            <Activity size={12} className="text-primary-green" />
                            <span>{c.visit_count || 0} visitas</span>
                            <span className="text-stone-400 font-normal">({c.login_count || 0} logins)</span>
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Últ: {formatDateTime(c.last_seen_at || c.last_login_at)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-[11px] font-bold text-stone-700">{c.referral_code || '—'}</div>
                          <div className="text-[11px] text-emerald-700 font-semibold">
                            {formatCLP(c.wallet_balance)} · {c.referred_count || 0} ref.
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openCustomer360(c.id)}
                              className="p-2 bg-stone-100 hover:bg-primary-green hover:text-white text-stone-700 rounded-lg transition cursor-pointer"
                              title="Ver Ficha 360°"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenWhatsApp(c, WHATSAPP_TEMPLATES[0].text)}
                              className="p-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-lg transition cursor-pointer"
                              title="Escribir por WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === SUB-TAB 2: COMPRADORES INVITADOS SIN CUENTA === */}
      {subTab === 'guests' && (
        <div className="bg-white rounded-2xl border border-[#EBE4DA] overflow-hidden shadow-2xs">
          <div className="p-4 bg-amber-50/70 border-b border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-amber-900">
              <strong>Compradores Invitados:</strong> Personas que compraron en Origen Canino sin crear cuenta. Invítalos por WhatsApp a registrarse para activar su código de embajador.
            </div>
            <button
              onClick={() => handleExportCSV(data.guests || [], 'invitados-origen-canino.csv')}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Exportar Invitados CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-stone-500 uppercase text-[10px] font-bold border-b border-[#EBE4DA]">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Contacto & Comuna</th>
                  <th className="p-3">Perro</th>
                  <th className="p-3">Pedidos & Total</th>
                  <th className="p-3 text-right">Invitar a Crear Cuenta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(data.guests || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400">Todos tus compradores ya tienen cuenta registrada.</td>
                  </tr>
                ) : (
                  (data.guests || []).map((g) => (
                    <tr key={g.key} className="hover:bg-[#FAF7F2]/70">
                      <td className="p-3 font-bold text-secondary-brown">{g.name}</td>
                      <td className="p-3">
                        <div className="text-stone-600">{g.email || 'Sin correo'}</div>
                        <div className="text-[11px] text-stone-400">{g.phone || 'Sin teléfono'} {g.city ? `· ${g.city}` : ''}</div>
                      </td>
                      <td className="p-3 text-stone-600">{g.dog_name || '—'}</td>
                      <td className="p-3">
                        <span className="font-extrabold text-secondary-brown">{formatCLP(g.total_spent)}</span>
                        <span className="text-stone-400 ml-1">({g.paid_orders_count} pagado)</span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenWhatsApp(g, WHATSAPP_TEMPLATES[4].text)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle size={13} /> Invitar por WhatsApp
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === SUB-TAB 3: MARKETING DIRECTO & CAMPAÑAS === */}
      {subTab === 'marketing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna izquierda: Audiencia + WhatsApp Asistido */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-[#EBE4DA] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-header font-bold text-lg text-secondary-brown flex items-center gap-2">
                  <Filter size={18} className="text-primary-green" /> 1. Elegir Audiencia ({marketingRecipients.length})
                </h3>
                <button
                  onClick={() => handleExportCSV(marketingRecipients, `audiencia-${campaignAudience}.csv`)}
                  className="text-xs font-bold text-primary-green hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download size={13} /> Descargar CSV
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'selected', label: `Seleccionados (${selectedIds.length})` },
                  { id: 'all_filtered', label: `Filtro Actual (${filteredCustomers.length})` },
                  { id: 'no_orders', label: 'Sin Comprar (Leads)' },
                  { id: 'inactive', label: 'Inactivos (+35d)' },
                  { id: 'vip', label: 'Clientes VIP (3+)' },
                  { id: 'ambassadors', label: 'Embajadores' },
                  { id: 'guests', label: 'Invitados sin cuenta' }
                ].map((aud) => (
                  <button
                    key={aud.id}
                    onClick={() => setCampaignAudience(aud.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition cursor-pointer ${
                      campaignAudience === aud.id
                        ? 'bg-primary-green text-white border-primary-green'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cola Asistida de WhatsApp */}
            <div className="bg-white p-5 rounded-2xl border border-[#EBE4DA] space-y-4">
              <div>
                <h3 className="font-header font-bold text-lg text-secondary-brown flex items-center gap-2">
                  <MessageCircle size={18} className="text-emerald-600" /> 2. Cola Asistida de WhatsApp (Cero Riesgo de Baneo)
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Variables automáticas: <code>{'{nombre}'}</code>, <code>{'{perro}'}</code>, <code>{'{codigo_embajador}'}</code>.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {WHATSAPP_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => { setSelectedTemplateId(tpl.id); setWaMessageText(tpl.text); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      selectedTemplateId === tpl.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={waMessageText}
                onChange={(e) => setWaMessageText(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/30"
              />

              <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 border border-stone-100 rounded-xl">
                {marketingRecipients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-400">
                    Selecciona una audiencia arriba o marca clientes en la tabla.
                  </div>
                ) : (
                  marketingRecipients.map((p) => {
                    const key = p.id ? `c-${p.id}` : `g-${p.key}`;
                    const sent = Boolean(sentWaKeys[key]);
                    const openedText = openedWaKeys[key];
                    return (
                      <div key={key} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-secondary-brown truncate">{p.name}</div>
                          <div className="text-[11px] text-stone-400 truncate">
                            {p.phone || 'Sin teléfono'} · {p.dogs?.[0]?.name || p.dog_name || 'Sin perro'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenWhatsApp(p, waMessageText)}
                            disabled={!p.phone}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <MessageCircle size={13} />
                            <span>Abrir WA</span>
                          </button>
                          {openedText && !sent && (
                            <button
                              onClick={() => handleConfirmWhatsAppSent(p, openedText, key)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer"
                              title="Confirmar que enviaste el mensaje en WhatsApp"
                            >
                              Confirmar ✓
                            </button>
                          )}
                          {sent && (
                            <span className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <Check size={13} /> Registrado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha: Email Marketing Corporativo + SMTP */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-[#EBE4DA] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-header font-bold text-lg text-secondary-brown flex items-center gap-2">
                  <Mail size={18} className="text-secondary-orange" /> Campaña Email HTML
                </h3>
                <button
                  onClick={() => setShowSmtpConfig((v) => !v)}
                  className="text-xs font-bold text-stone-600 hover:text-primary-green flex items-center gap-1 cursor-pointer"
                >
                  <Settings size={14} /> {showSmtpConfig ? 'Ocultar SMTP' : 'Configurar SMTP'}
                </button>
              </div>

              {showSmtpConfig && (
                <form onSubmit={handleSaveSmtp} className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E6DCCB] space-y-2.5 text-xs">
                  <div className="font-bold text-secondary-brown mb-1">Credenciales Correo Saliente (SMTP)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="smtp.zoho.com / gmail"
                      value={smtpForm.smtp_host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                      className="col-span-2 p-2 bg-white border border-stone-200 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="587"
                      value={smtpForm.smtp_port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: Number(e.target.value) })}
                      className="p-2 bg-white border border-stone-200 rounded-lg"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Usuario SMTP (ej: hola@origencanino.cl)"
                    value={smtpForm.smtp_user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                  />
                  <input
                    type="password"
                    placeholder={smtpForm.smtp_password_configured ? '•••••••• (guardada, dejar vacío para mantener)' : 'Contraseña / App Password SMTP'}
                    value={smtpForm.smtp_password}
                    onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                  />
                  <label className="flex items-center gap-2 text-[11px] text-stone-600">
                    <input
                      type="checkbox"
                      checked={smtpForm.smtp_use_ssl}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_use_ssl: e.target.checked })}
                    />
                    Usar SSL directo (puerto 465)
                  </label>
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="w-full py-2 bg-secondary-brown text-white rounded-lg font-bold cursor-pointer"
                  >
                    {savingSmtp ? 'Guardando...' : 'Guardar Configuración SMTP'}
                  </button>
                </form>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Asunto del Correo</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Cuerpo del Mensaje (se formatea con plantilla corporativa)</label>
                  <textarea
                    rows={7}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none leading-relaxed"
                  />
                </div>
                <button
                  onClick={handleSendEmailCampaign}
                  disabled={sendingEmail || marketingRecipients.filter((r) => Boolean(r.id)).length === 0}
                  className="w-full py-3 bg-secondary-orange hover:bg-[#c58235] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>
                    {sendingEmail
                      ? 'Enviando campaña...'
                      : `Enviar Correo a ${marketingRecipients.filter((r) => Boolean(r.id)).length} Cliente(s)`}
                  </span>
                </button>
                <p className="text-[11px] text-stone-400">
                  Respeta automáticamente el consentimiento de marketing (<code>opt-in</code>) y registra cada envío en la ficha del cliente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL FICHA 360° DEL CLIENTE === */}
      {(detailLoading || detailData) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-[#FAF7F2] w-full max-w-3xl h-full overflow-y-auto shadow-2xl border-l border-[#E5DACD] p-5 md:p-7 space-y-6">
            {detailLoading || !detailData ? (
              <div className="py-20 text-center text-stone-500 text-sm">Cargando ficha 360°...</div>
            ) : (
              <>
                {/* Header Ficha */}
                <div className="flex items-start justify-between gap-4 border-b border-[#E5DACD] pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-header text-2xl font-extrabold text-secondary-brown">
                        {detailData.customer.name}
                      </h3>
                      {detailData.customer.is_blocked && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px] font-extrabold">
                          BLOQUEADO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {detailData.customer.email} · Registrado el {formatShortDate(detailData.customer.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailData(null)}
                    className="p-2 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 text-stone-600 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Mini-KPIs del cliente */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-[#EBE4DA]">
                    <span className="text-[10px] font-bold uppercase text-stone-400">Pedidos</span>
                    <p className="text-xl font-extrabold text-secondary-brown">
                      {detailData.orders.filter((o) => o.payment_status === 'Pagado').length}
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#EBE4DA]">
                    <span className="text-[10px] font-bold uppercase text-stone-400">Total Gastado</span>
                    <p className="text-xl font-extrabold text-primary-green">
                      {formatCLP(
                        detailData.orders
                          .filter((o) => o.payment_status === 'Pagado')
                          .reduce((s, o) => s + Number(o.total || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#EBE4DA]">
                    <span className="text-[10px] font-bold uppercase text-stone-400">Visitas / Logins</span>
                    <p className="text-xl font-extrabold text-secondary-brown">
                      {detailData.customer.visit_count || 0} <span className="text-xs font-normal text-stone-400">/ {detailData.customer.login_count || 0}</span>
                    </p>
                    <span className="text-[10px] text-stone-400 block truncate">
                      Últ: {formatDateTime(detailData.customer.last_seen_at || detailData.customer.last_login_at)}
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">Billetera</span>
                    <p className="text-xl font-extrabold text-emerald-700">
                      {formatCLP(detailData.customer.wallet_balance)}
                    </p>
                    <span className="text-[10px] font-mono text-stone-500">{detailData.customer.referral_code || '—'}</span>
                  </div>
                </div>

                {/* Mascotas */}
                <div className="bg-white p-4 rounded-2xl border border-[#EBE4DA] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-header font-bold text-sm text-secondary-brown flex items-center gap-1.5">
                      <PawPrint size={15} className="text-primary-green" /> Mascotas Registradas ({detailData.dogs.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => openDogAdminModal(detailData.customer.id, detailData.customer.name, null)}
                      className="text-[11px] font-bold text-primary-green hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Agregar Mascota
                    </button>
                  </div>
                  {detailData.dogs.length === 0 ? (
                    <p className="text-xs text-stone-400">Sin mascotas registradas todavía.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {detailData.dogs.map((d) => (
                        <div key={d.id} className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EBE4DA] text-xs">
                          <div className="font-bold text-secondary-brown flex items-center justify-between gap-2">
                            <span>{d.name} · {d.weight} kg</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-2 py-0.5 bg-primary-green/10 text-primary-green rounded-full">
                                {d.age_label ? `${d.age_label} (${formatStageBadge(d.computed_stage || d.age_stage)})` : formatStageBadge(d.age_stage)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openDogAdminModal(detailData.customer.id, detailData.customer.name, d)}
                                className="p-1 text-stone-400 hover:text-primary-green rounded-lg hover:bg-white transition cursor-pointer"
                                title={`Editar ficha de ${d.name}`}
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-1 flex flex-wrap gap-2">
                            <span>Dieta: <strong className="uppercase">{d.favorite_diet || 'BARF'}</strong></span>
                            {d.birth_date ? (
                              <span>· Nac: {formatShortDate(d.birth_date)}{d.birth_date_approx ? ' (aprox)' : ''}</span>
                            ) : (
                              <span className="text-amber-700">· Sin fecha de nac.</span>
                            )}
                          </div>
                          {d.notes && <div className="text-[11px] text-stone-500 mt-1">{d.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edición de Perfil + Notas CRM */}
                {editForm && (
                  <div className="bg-white p-4 rounded-2xl border border-[#EBE4DA] space-y-3 text-xs">
                    <h4 className="font-header font-bold text-sm text-secondary-brown">Datos de Soporte & Notas CRM</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Nombre"
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      />
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="Teléfono (+569...)"
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      />
                      <input
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Dirección"
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      />
                      <input
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="Comuna"
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      />
                    </div>
                    <input
                      value={editForm.tags}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      placeholder="Etiquetas CRM separadas por coma (ej: VIP, BARF, Condominio, Alérgico)"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                    <textarea
                      rows={2}
                      value={editForm.admin_notes}
                      onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                      placeholder="Notas privadas internas (solo visibles para administración)..."
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-stone-600 font-semibold">
                        <input
                          type="checkbox"
                          checked={editForm.marketing_opt_in}
                          onChange={(e) => setEditForm({ ...editForm, marketing_opt_in: e.target.checked })}
                        />
                        Acepta comunicaciones de marketing
                      </label>
                      <button
                        onClick={handleSaveCustomerEdit}
                        disabled={savingEdit}
                        className="px-4 py-2 bg-primary-green hover:bg-primary-green-dark text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save size={14} /> {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Herramientas de Soporte: Contraseña + Billetera */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Restablecer Contraseña */}
                  <div className="bg-white p-4 rounded-2xl border border-[#EBE4DA] space-y-2.5 text-xs">
                    <h4 className="font-header font-bold text-sm text-secondary-brown flex items-center gap-1.5">
                      <Key size={15} className="text-secondary-orange" /> Restablecer Contraseña
                    </h4>
                    <input
                      type="text"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Nueva clave (o vacío = generar automática)"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                    <button
                      onClick={handleResetPassword}
                      className="w-full py-2 bg-secondary-orange hover:bg-[#c58235] text-white font-bold rounded-xl cursor-pointer"
                    >
                      Cambiar / Generar Clave Temporal
                    </button>
                    {tempPasswordResult && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                        <div className="text-[11px] text-emerald-900 font-bold">Nueva clave temporal asignada:</div>
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 font-mono font-extrabold text-sm">
                          <span>{tempPasswordResult}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(tempPasswordResult);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }}
                            className="text-emerald-700 cursor-pointer"
                          >
                            {copiedPass ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        {detailData.customer.phone && (
                          <button
                            onClick={() =>
                              handleOpenWhatsApp(
                                detailData.customer,
                                `¡Hola {nombre}! 🐾 Te enviamos tu nueva contraseña temporal para ingresar a origencanino.cl:\n\nCorreo: ${detailData.customer.email}\nClave temporal: ${tempPasswordResult}\n\n¡Cualquier ayuda nos avisas!`
                              )
                            }
                            className="w-full py-1.5 bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageCircle size={13} /> Enviar Clave por WhatsApp
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ajuste Manual de Billetera */}
                  <div className="bg-white p-4 rounded-2xl border border-[#EBE4DA] space-y-2.5 text-xs">
                    <h4 className="font-header font-bold text-sm text-secondary-brown flex items-center gap-1.5">
                      <Wallet size={15} className="text-emerald-600" /> Ajuste Manual de Billetera
                    </h4>
                    <input
                      type="number"
                      value={walletDelta}
                      onChange={(e) => setWalletDelta(e.target.value)}
                      placeholder="Monto (+5000 abonar / -2000 descontar)"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                    <input
                      type="text"
                      value={walletReason}
                      onChange={(e) => setWalletReason(e.target.value)}
                      placeholder="Motivo (ej: Bono fidelidad / Compensación)"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                    <button
                      onClick={handleAdjustWallet}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Aplicar Ajuste de Saldo
                    </button>
                  </div>
                </div>

                {/* Historial de Pedidos */}
                <div className="bg-white p-4 rounded-2xl border border-[#EBE4DA] space-y-2.5">
                  <h4 className="font-header font-bold text-sm text-secondary-brown flex items-center gap-1.5">
                    <ShoppingBag size={15} className="text-primary-green" /> Historial de Pedidos ({detailData.orders.length})
                  </h4>
                  {detailData.orders.length === 0 ? (
                    <p className="text-xs text-stone-400">Aún no realiza pedidos.</p>
                  ) : (
                    <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto text-xs">
                      {detailData.orders.map((o) => (
                        <div key={o.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <span className="font-bold text-secondary-brown">Orden #{o.id}</span>
                            <span className="text-stone-400 ml-2">{formatShortDate(o.created_at)}</span>
                            <div className="text-[11px] text-stone-500">
                              {(o.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ') || 'Sin detalle'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-extrabold text-secondary-brown">{formatCLP(o.total)}</div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              o.payment_status === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {o.payment_status} · {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Línea de tiempo CRM */}
                <div className="bg-white p-4 rounded-2xl border border-[#EBE4DA] space-y-2.5">
                  <h4 className="font-header font-bold text-sm text-secondary-brown flex items-center gap-1.5">
                    <Clock size={15} className="text-stone-500" /> Actividad y Eventos CRM
                  </h4>
                  {detailData.events.length === 0 ? (
                    <p className="text-xs text-stone-400">Sin eventos registrados aún.</p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 text-xs">
                      {detailData.events.map((ev) => (
                        <div key={ev.id} className="py-2 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-stone-700 uppercase text-[10px] bg-stone-100 px-1.5 py-0.5 rounded mr-1.5">
                              {ev.event_type}
                            </span>
                            <span className="text-stone-600">{ev.details}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-stone-400">{formatDateTime(ev.created_at)}</span>
                            <button
                              onClick={() => handleDeleteCrmEvent(ev.id)}
                              className="text-stone-300 hover:text-red-500 transition cursor-pointer"
                              title="Eliminar evento del historial"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Zona de Control: Bloquear / Eliminar */}
                <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200 space-y-3 text-xs">
                  <h4 className="font-header font-bold text-sm text-red-800 flex items-center gap-1.5">
                    <ShieldAlert size={15} /> Control de Acceso y Zona de Riesgo
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Motivo de bloqueo (opcional)"
                      className="flex-1 p-2 bg-white border border-red-200 rounded-xl"
                    />
                    {detailData.customer.is_blocked ? (
                      <button
                        onClick={() => handleToggleBlock(false)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Unlock size={14} /> Desbloquear Cuenta
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleBlock(true)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Ban size={14} /> Bloquear Cuenta
                      </button>
                    )}
                    <button
                      onClick={handleDeleteCustomer}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Trash2 size={14} /> Eliminar / Anonimizar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* === MODAL FICHA & EDICIÓN DE MASCOTA (ADMIN) === */}
      {dogModal && (
        <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-[#EBE4DA] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#EBE4DA] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] border border-[#EBE4DA] text-primary-green flex items-center justify-center shrink-0">
                  <PawPrint size={20} />
                </div>
                <div>
                  <h4 className="font-header text-xl font-extrabold text-secondary-brown">
                    {dogModal.dog ? `Ficha de ${dogModal.dog.name}` : 'Agregar Mascota'}
                  </h4>
                  <p className="text-[11px] text-stone-500">Tutor: {dogModal.customerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDogModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDogAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Nombre del Perro *</label>
                <input
                  type="text"
                  required
                  value={dogEditForm.name}
                  onChange={(e) => setDogEditForm({ ...dogEditForm, name: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-green/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Peso (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={dogEditForm.weight}
                    onChange={(e) => setDogEditForm({ ...dogEditForm, weight: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-green/30"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Etapa de Vida</label>
                  <select
                    value={dogEditForm.age_stage}
                    onChange={(e) => setDogEditForm({ ...dogEditForm, age_stage: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="adulto">Adulto</option>
                    <option value="cachorro">Cachorro</option>
                    <option value="adult_low">Adulto / Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Dieta Habitual</label>
                <select
                  value={dogEditForm.favorite_diet}
                  onChange={(e) => setDogEditForm({ ...dogEditForm, favorite_diet: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none cursor-pointer"
                >
                  <option value="barf">BARF Cruda</option>
                  <option value="cocinada">Cocinada al Vapor</option>
                </select>
              </div>

              <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#EBE4DA] space-y-2">
                <label className="font-bold text-stone-700 block">🎂 Fecha de Nacimiento</label>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dogEditForm.birth_date || ''}
                  onChange={(e) => setDogEditForm({ ...dogEditForm, birth_date: e.target.value })}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl outline-none"
                />
                <label className="flex items-center gap-2 text-[11px] text-stone-500">
                  <input
                    type="checkbox"
                    checked={dogEditForm.birth_date_approx}
                    onChange={(e) => setDogEditForm({ ...dogEditForm, birth_date_approx: e.target.checked })}
                  />
                  Fecha aproximada (perro adoptado / estimada)
                </label>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Notas de Salud / Alergias</label>
                <textarea
                  rows={2}
                  value={dogEditForm.notes}
                  onChange={(e) => setDogEditForm({ ...dogEditForm, notes: e.target.value })}
                  placeholder="Ej. Alérgico al pollo, castrado, etc."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE4DA]">
                <button
                  type="button"
                  onClick={() => setDogModal(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDogAdmin}
                  className="px-4 py-2 bg-primary-green hover:bg-primary-green-dark text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} /> {savingDogAdmin ? 'Guardando...' : 'Guardar Mascota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

