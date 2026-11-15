import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, Building2, Lock, ShoppingBag, Upload, AlertCircle, UserCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';

const DirectPaymentPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loadAssistedCart, setIsCartOpen } = useCart();
  const { customer, openAuthModal } = useCustomer();

  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Transferencia (para modo post_delivery_order)
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [bank, setBank] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paidMessage, setPaidMessage] = useState('');

  useEffect(() => {
    const fetchLink = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/payment-links/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Link no encontrado.');
        setLinkData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [token]);

  const handleProceedAssistedCart = () => {
    if (!linkData) return;
    loadAssistedCart(linkData.items_json || [], token);
    setIsCartOpen(true);
    navigate('/');
  };

  const handlePayMercadoPago = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`/api/payment-links/${token}/mercadopago`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        throw new Error(data.detail || 'No se pudo iniciar Mercado Pago.');
      }
      window.location.href = data.init_point;
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!bank.trim() || !receiptNumber.trim() || !receiptFile) {
      setError('Completa tu banco, número de operación y adjunta la foto del comprobante.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const formData = new FormData();
      formData.append('file', receiptFile);
      const upRes = await fetch('/api/orders/upload-receipt', { method: 'POST', body: formData });
      const upJson = await upRes.json();
      if (!upRes.ok || !upJson.url) throw new Error(upJson.detail || 'Error subiendo comprobante.');

      const res = await fetch(`/api/payment-links/${token}/pay-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer?.name || linkData?.customer_name || 'Cliente Origen Canino',
          customer_email: customer?.email || linkData?.customer_email || 'cliente@origencanino.cl',
          customer_phone: customer?.phone || linkData?.customer_phone || '',
          transfer_bank: bank,
          transfer_receipt_number: receiptNumber,
          transfer_receipt_url: upJson.url
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error enviando comprobante.');
      setPaidMessage('¡Comprobante enviado con éxito! Validaremos tu transferencia a la brevedad. Muchas gracias.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-green mx-auto mb-4" />
        <p className="text-secondary-brown font-medium">Cargando tu pedido Origen Canino...</p>
      </div>
    );
  }

  if (error && !linkData) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <AlertCircle size={44} className="text-red-500 mx-auto mb-3" />
        <h1 className="font-header text-2xl font-bold text-secondary-brown mb-2">Link no disponible</h1>
        <p className="text-stone-600 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="bg-primary-green text-white font-bold px-6 py-3 rounded-xl">
          Volver a la Tienda
        </button>
      </div>
    );
  }

  const isAlreadyPaid = linkData?.status === 'pagado' || Boolean(paidMessage);
  const itemsSubtotal = (linkData?.items_json || []).reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
    0
  );
  const shippingCost = Math.max(0, Number(linkData?.total_clp || 0) - itemsSubtotal);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[#E8E0D5] shadow-lg p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-3 py-1 rounded-full mb-2">
              <Lock size={12} /> Link Directo de Pago
            </span>
            <h1 className="font-header text-2xl sm:text-3xl font-extrabold text-secondary-brown">
              Hola {linkData?.customer_name || 'Cliente'}
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              {linkData?.mode === 'post_delivery_order'
                ? `Resumen de tu alimento ya entregado (Pedido #${linkData.order_id}).`
                : 'Preparamos tu carrito listo para que puedas pagar de forma rápida y segura.'}
            </p>
          </div>
          <ShoppingBag className="text-primary-green shrink-0" size={32} />
        </div>

        {/* Detalle de productos y envío */}
        <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 border border-[#EFE8DE] space-y-3">
          <h2 className="font-header font-bold text-sm uppercase tracking-wider text-stone-500">
            Detalle de Productos
          </h2>
          {(linkData?.items_json || []).map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-base border-b border-stone-200/60 pb-2 last:border-0 last:pb-0">
              <div>
                <span className="font-bold text-secondary-brown">{it.quantity}x {it.name}</span>
                {it.weight && <span className="text-xs text-stone-500 ml-2">({it.weight})</span>}
              </div>
              <span className="font-mono font-bold text-secondary-brown">
                ${(Number(it.price) * Number(it.quantity)).toLocaleString('es-CL')}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-stone-200 space-y-1.5 text-sm text-stone-700">
            <div className="flex items-center justify-between">
              <span>Subtotal Productos</span>
              <span className="font-mono font-semibold">${itemsSubtotal.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Envío / Despacho</span>
              <span className="font-mono font-semibold">
                {shippingCost > 0 ? `$${shippingCost.toLocaleString('es-CL')}` : 'Gratis'}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-stone-300 flex items-center justify-between text-xl font-extrabold text-secondary-brown">
            <span>Total a Pagar</span>
            <span>${Number(linkData?.total_clp || 0).toLocaleString('es-CL')} CLP</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isAlreadyPaid ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
            <CheckCircle2 size={44} className="text-emerald-600 mx-auto" />
            <h3 className="font-header text-xl font-bold text-emerald-900">
              {paidMessage || '¡Este pedido ya se encuentra pagado!'}
            </h3>
            <p className="text-sm text-emerald-700">Gracias por confiar en Origen Canino.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Paso 1: Cuenta de usuario */}
            {!customer ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="text-blue-700 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-sm text-blue-950">Paso 1: Inicia sesión o crea tu usuario</p>
                    <p className="text-xs text-blue-800">Solo te tomará 20 segundos para asociar tu pedido.</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="bg-white border border-blue-300 text-blue-800 text-xs font-bold px-4 py-2.5 rounded-xl"
                  >
                    Crear Cuenta
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-sm text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Conectado como <strong>{customer.name}</strong> ({customer.email})</span>
              </div>
            )}

            {/* Paso 2: Pago */}
            {linkData?.mode === 'assisted_cart' ? (
              <button
                onClick={handleProceedAssistedCart}
                className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-header font-bold text-lg py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CreditCard size={22} />
                Ir Directo a Pagar mi Carrito
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  disabled={submitting}
                  onClick={handlePayMercadoPago}
                  className="w-full bg-[#009EE3] hover:bg-[#0086C3] disabled:opacity-60 text-white font-header font-bold text-lg py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={22} />
                  {submitting ? 'Abriendo Mercado Pago...' : 'Pagar con Mercado Pago (Tarjeta / Débito)'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTransferForm(!showTransferForm)}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-secondary-brown font-header font-bold text-base py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Building2 size={20} />
                  Pagar por Transferencia Bancaria
                </button>

                {showTransferForm && (
                  <form onSubmit={handleSubmitTransfer} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 mt-2">
                    <input
                      type="text"
                      required
                      placeholder="Banco desde el que transferiste (ej. BancoEstado, Santander)"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Número de operación / comprobante"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                    />
                    <label className="flex items-center gap-2 px-3.5 py-3 rounded-xl border border-dashed border-stone-400 bg-white cursor-pointer text-sm text-stone-700">
                      <Upload size={18} className="text-primary-green" />
                      <span>{receiptFile ? receiptFile.name : 'Adjuntar foto o captura del comprobante'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3 rounded-xl"
                    >
                      {submitting ? 'Enviando comprobante...' : 'Confirmar Transferencia'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectPaymentPage;

