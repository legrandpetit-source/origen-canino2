import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Copy, Check, Send, RefreshCw, Plus } from 'lucide-react';

const DirectPaymentLinksPanel = ({ products = [], prefillOrder = null, onClearPrefill }) => {
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [linkMode, setLinkMode] = useState('post_delivery_order');
  const [linkOrderId, setLinkOrderId] = useState('');
  const [linkCustName, setLinkCustName] = useState('');
  const [linkCustPhone, setLinkCustPhone] = useState('');
  const [linkCustEmail, setLinkCustEmail] = useState('');
  const [linkItems, setLinkItems] = useState([{ product_id: '', quantity: 1 }]);
  const [linkNotes, setLinkNotes] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [toast, setToast] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const fetchPaymentLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payment-links', { headers: authHeaders() });
      if (res.ok) setPaymentLinks(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchPaymentLinks();
  }, [fetchPaymentLinks]);

  useEffect(() => {
    if (prefillOrder) {
      setLinkMode('post_delivery_order');
      setLinkOrderId(String(prefillOrder.id || ''));
      setLinkCustName(prefillOrder.customer_name || '');
      setLinkCustPhone(prefillOrder.customer_phone || '');
      setLinkCustEmail(prefillOrder.customer_email || '');
    }
  }, [prefillOrder]);

  const handleCreatePaymentLink = async (e) => {
    e.preventDefault();
    const cleanItems = linkItems
      .filter((i) => i.product_id && i.quantity > 0)
      .map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) }));

    const body = {
      mode: linkMode,
      order_id: linkMode === 'post_delivery_order' && linkOrderId ? Number(linkOrderId) : null,
      customer_name: linkCustName || null,
      customer_phone: linkCustPhone || null,
      customer_email: linkCustEmail || null,
      items: cleanItems,
      notes: linkNotes || null,
      mark_delivered_now: linkMode === 'post_delivery_order' && !linkOrderId,
    };

    const res = await fetch('/api/admin/payment-links', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || 'Error creando link de pago.');
      return;
    }
    showToast(`Link generado: ${window.location.origin}${data.url_path}`);
    setLinkOrderId('');
    setLinkNotes('');
    if (onClearPrefill) onClearPrefill();
    fetchPaymentLinks();
  };

  const copyLinkUrl = (token) => {
    const url = `${window.location.origin}/pagar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2500);
  };

  const buildWaUrl = (phone, text) => {
    const clean = String(phone || '').replace(/\D/g, '');
    const withPrefix = clean.startsWith('56') ? clean : `56${clean}`;
    return `https://wa.me/${withPrefix}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-md text-xs font-semibold">
          {toast}
        </div>
      )}

      <form onSubmit={handleCreatePaymentLink} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-header text-base font-extrabold text-secondary-brown flex items-center gap-2">
              <Link2 size={18} className="text-primary-green" /> Generar Link de Pago Directo (Cobranza / Pedidos Asistidos)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Envía un enlace directo al cliente con su pedido listo para pagar por Mercado Pago o Transferencia (sin descuentos).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1">Tipo de Cobro (¿Cuándo descuenta stock?)</label>
            <select
              value={linkMode}
              onChange={(e) => setLinkMode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white"
            >
              <option value="post_delivery_order">Cobro Post-Entrega (Ya entregado e impago · Descuenta stock ahora)</option>
              <option value="assisted_cart">Cobro Previo a Entrega (Aún sin entregar · Descuenta stock al pagar)</option>
            </select>
            <p className="text-[11px] text-stone-500 mt-1">
              {linkMode === 'post_delivery_order'
                ? 'Úsalo cuando ya entregaste el alimento y solo falta cobrarlo (no descontará dos veces al pagar).'
                : 'Úsalo cuando el cliente aún no recibe su pedido; el stock se descontará recién cuando concrete el pago.'}
            </p>
          </div>

          {linkMode === 'post_delivery_order' && (
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">N° Pedido Existente (opcional)</label>
              <input
                type="number"
                placeholder="Dejar vacío para crear el pedido desde aquí"
                value={linkOrderId}
                onChange={(e) => setLinkOrderId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nombre del Cliente"
            value={linkCustName}
            onChange={(e) => setLinkCustName(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
          <input
            type="tel"
            placeholder="WhatsApp (+569...)"
            value={linkCustPhone}
            onChange={(e) => setLinkCustPhone(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
          <input
            type="email"
            placeholder="Correo (opcional)"
            value={linkCustEmail}
            onChange={(e) => setLinkCustEmail(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-stone-300 text-sm"
          />
        </div>

        {(!linkOrderId || linkMode === 'assisted_cart') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600">Productos y Kilos / Unidades</span>
              <button
                type="button"
                onClick={() => setLinkItems([...linkItems, { product_id: '', quantity: 1 }])}
                className="text-xs font-bold text-primary-green hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Agregar producto
              </button>
            </div>
            {linkItems.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={it.product_id}
                  onChange={(e) => {
                    const copy = [...linkItems];
                    copy[idx].product_id = e.target.value;
                    setLinkItems(copy);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-sm bg-white"
                >
                  <option value="">-- Seleccionar Menú --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.weight}) — ${p.price.toLocaleString('es-CL')}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => {
                    const copy = [...linkItems];
                    copy[idx].quantity = parseInt(e.target.value || '1', 10);
                    setLinkItems(copy);
                  }}
                  className="w-24 px-3 py-2 rounded-xl border border-stone-300 text-sm text-center"
                />
              </div>
            ))}
          </div>
        )}

        <button type="submit" className="bg-primary-green hover:bg-primary-green-dark text-white font-bold text-sm px-5 py-2.5 rounded-xl">
          Generar Link Directo
        </button>
      </form>

      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-header font-extrabold text-sm text-secondary-brown">Links de Pago Generados</h4>
          <button onClick={fetchPaymentLinks} className="text-xs font-bold text-stone-500 hover:text-primary-green flex items-center gap-1">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
        <div className="space-y-2">
          {paymentLinks.map((l) => (
            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-stone-200 text-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{l.customer_name || 'Cliente'}</strong>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    l.status === 'pagado' ? 'bg-emerald-100 text-emerald-800'
                      : l.status === 'abierto' ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {l.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                    {l.mode === 'post_delivery_order' ? 'Post-Entrega' : 'Previo a Entrega'}
                  </span>
                  <span className="font-mono font-bold">${Number(l.total_clp || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="text-stone-500 font-mono mt-0.5">/pagar/{l.token} {l.order_id ? `· Pedido #${l.order_id}` : ''}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyLinkUrl(l.token)}
                  className="border border-stone-300 hover:bg-stone-100 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1"
                >
                  {copiedToken === l.token ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copiedToken === l.token ? 'Copiado' : 'Copiar Link'}
                </button>
                {l.customer_phone && l.status !== 'pagado' && (
                  <a
                    href={buildWaUrl(l.customer_phone, `¡Hola ${l.customer_name || ''}! Aquí tienes tu link directo de pago de Origen Canino por $${Number(l.total_clp).toLocaleString('es-CL')} CLP: ${window.location.origin}/pagar/${l.token}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                  >
                    <Send size={12} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
          {paymentLinks.length === 0 && (
            <p className="text-xs text-stone-400">No hay links de pago generados aún.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectPaymentLinksPanel;
