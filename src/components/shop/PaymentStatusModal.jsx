import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Landmark, 
  Copy, 
  Check, 
  MessageCircle, 
  X, 
  RotateCcw, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

const PaymentStatusModal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [statusType, setStatusType] = useState(null); // 'failure' | 'success' | 'pending'
  const [orderId, setOrderId] = useState(null);
  const [bankSettings, setBankSettings] = useState(null);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const notifiedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const orderIdParam = params.get('order_id') || params.get('external_reference');

    if (payment && ['failure', 'success', 'pending'].includes(payment.toLowerCase())) {
      setStatusType(payment.toLowerCase());
      setOrderId(orderIdParam);
      setIsOpen(true);

      // Cargar datos bancarios por si el usuario desea pagar con transferencia
      fetch('/api/settings/bank-transfer')
        .then(res => res.json())
        .then(data => setBankSettings(data))
        .catch(err => console.error("Error cargando datos bancarios:", err));

      // Si fue fallo, notificar proactivamente a Telegram (Human-in-the-Loop)
      if (payment.toLowerCase() === 'failure' && orderIdParam && !notifiedRef.current) {
        notifiedRef.current = true;
        fetch('/api/payments/mercadopago/notify-failure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: parseInt(orderIdParam, 10) })
        }).catch(err => console.error("Error registrando fallo de pago:", err));
      }

      // Limpiar URL silenciosamente para evitar re-aperturas al refrescar
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [location.search]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleRetryMP = async () => {
    if (!orderId) return;
    setIsRetrying(true);
    try {
      const res = await fetch('/api/payments/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: parseInt(orderId, 10) })
      });
      const data = await res.json();
      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert(data.detail || "No fue posible reabrir la pasarela de Mercado Pago. Te recomendamos abonar vía Transferencia Bancaria.");
        setShowBankDetails(true);
      }
    } catch (err) {
      console.error("Error reintentando Mercado Pago:", err);
      alert("Error de conexión con Mercado Pago. Te sugerimos realizar la transferencia bancaria.");
      setShowBankDetails(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopyBank = () => {
    if (!bankSettings) return;
    const text = `DATOS DE TRANSFERENCIA - ORIGEN CANINO\nBanco: ${bankSettings.bank_name || 'Mercado Pago'}\nTipo: ${bankSettings.bank_account_type || 'Cuenta Vista'}\nN° Cuenta: ${bankSettings.bank_account_number || ''}\nRUT: ${bankSettings.bank_rut || ''}\nTitular: ${bankSettings.bank_owner || 'ELABORACIÓN DE ALIMENTOS PREPARADOS PARA ANIMALES PATRICIO PADILLA E.I.R.L.'}\nEmail: ${bankSettings.bank_email || 'pagos@origencanino.cl'}\nAsunto: Pedido #${orderId || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2500);
    });
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(`Hola Patricio, te escribo de Origen Canino 🐶. Tuve un inconveniente al pagar mi Pedido #${orderId || ''} con Mercado Pago. ¿Me puedes ayudar a concretarlo por transferencia o revisar el pedido?`);
    window.open(`https://wa.me/56991404679?text=${text}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-200 relative overflow-hidden text-secondary-brown"
        >
          {/* Botón Cerrar */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>

          {/* --- CASO 1: FALLO O CANCELACIÓN DE PAGO (ORO PURO UX) --- */}
          {statusType === 'failure' && (
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-xs">
                <AlertTriangle size={32} />
              </div>

              <div className="text-center space-y-1.5">
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 bg-amber-100/70 px-3 py-1 rounded-full inline-block">
                  Transacción No Completada
                </span>
                <h3 className="font-header text-2xl font-bold text-secondary-brown">
                  Tu pago en Mercado Pago no se procesó
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Hubo un inconveniente con el medio de pago o la transacción fue cancelada. 
                  ¡No te preocupes! Tu <strong>Pedido #{orderId}</strong> está <strong>guardado de forma segura</strong> en nuestro sistema esperando tu confirmación.
                </p>
              </div>

              {/* Caja de Opciones de Recuperación */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleRetryMP}
                  disabled={isRetrying}
                  className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3.5 px-5 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <CreditCard size={18} />
                  {isRetrying ? 'Reconectando con Mercado Pago...' : 'Reintentar Pago con Mercado Pago'}
                </button>

                <button
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-secondary-brown font-bold py-3 px-5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer text-sm border border-stone-300/60"
                >
                  <Landmark size={18} className="text-amber-700" />
                  {showBankDetails ? 'Ocultar Datos Bancarios' : 'Pagar con Transferencia Bancaria Directa'}
                </button>

                {/* Desglose de Datos Bancarios si el usuario hace clic */}
                <AnimatePresence>
                  {showBankDetails && bankSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2 text-stone-700">
                        <div className="font-bold text-amber-900 border-b border-amber-200 pb-1.5 flex justify-between items-center">
                          <span>Datos para Transferir:</span>
                          <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md font-mono">
                            Pedido #{orderId}
                          </span>
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          <p><strong>Banco:</strong> {bankSettings.bank_name || 'Mercado Pago'}</p>
                          <p><strong>Tipo de Cuenta:</strong> {bankSettings.bank_account_type || 'Cuenta Vista'}</p>
                          <p><strong>N° de Cuenta:</strong> {bankSettings.bank_account_number}</p>
                          <p><strong>RUT:</strong> {bankSettings.bank_rut}</p>
                          <p><strong>Titular:</strong> {bankSettings.bank_owner}</p>
                          <p><strong>Email de comprobante:</strong> {bankSettings.bank_email}</p>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={handleCopyBank}
                            className="flex-1 bg-white hover:bg-stone-50 border border-stone-300 text-secondary-brown font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-2xs"
                          >
                            {copiedBank ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            {copiedBank ? '¡Copiado!' : 'Copiar Datos'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-2xs cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    Asistencia por WhatsApp
                  </button>

                  <button
                    onClick={() => { handleClose(); navigate('/mi-cuenta'); }}
                    className="flex-1 bg-white hover:bg-stone-100 text-stone-700 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 text-xs border border-stone-300 cursor-pointer"
                  >
                    Ver mi Pedido en Mi Cuenta
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- CASO 2: PAGO EXITOSO Y APROBADO --- */}
          {statusType === 'success' && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                  ¡Pago Confirmado!
                </span>
                <h3 className="font-header text-2xl font-bold text-secondary-brown">
                  ¡Muchas gracias por tu compra!
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Tu <strong>Pedido #{orderId}</strong> ha sido acreditado exitosamente. Ya comenzamos la coordinación en cocina para la preparación fresca de la comida de tu mascota.
                </p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => { handleClose(); navigate('/mi-cuenta'); }}
                  className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3.5 px-5 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Ver Estado de mi Pedido en Mi Cuenta
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* --- CASO 3: PAGO PENDIENTE DE ACREDITACIÓN --- */}
          {statusType === 'pending' && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-xs">
                <Clock size={36} />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 bg-blue-100 px-3 py-1 rounded-full inline-block">
                  En Proceso de Validación
                </span>
                <h3 className="font-header text-2xl font-bold text-secondary-brown">
                  Pago en Verificación
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Mercado Pago está procesando tu transacción para el <strong>Pedido #{orderId}</strong>. Apenas se complete la acreditación bancaria te notificaremos de inmediato.
                </p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => { handleClose(); navigate('/mi-cuenta'); }}
                  className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3 px-5 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Ir a Mi Cuenta
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentStatusModal;
