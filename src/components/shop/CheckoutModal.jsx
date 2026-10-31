import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ArrowLeft, CreditCard, Landmark, Sparkles, Building2, ShieldCheck, Copy, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const CheckoutModal = ({ isOpen, onClose, onBack, isSubscription = false }) => {
  const { items, total, clearCart, dogData, nfcCommunity, nfcDiscount } = useCart();
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_city: '',
    customer_region: 'Región Metropolitana',
    dog_name: dogData?.name || '',
    dog_weight: dogData?.weight || '',
    dog_age: dogData?.age || 'adult_normal',
    transfer_bank: '',
    transfer_receipt_number: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState('mercadopago'); // 'mercadopago' | 'transferencia'
  const [bankSettings, setBankSettings] = useState({
    bank_name: 'Banco Santander',
    bank_account_type: 'Cuenta Corriente',
    bank_account_number: '764521890',
    bank_rut: '77.123.456-7',
    bank_owner: 'Origen Canino SpA',
    bank_email: 'pagos@origencanino.cl',
    mercadopago_ready: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [copiedBankInfo, setCopiedBankInfo] = useState(false);

  // Cargar datos de transferencia bancaria actualizados desde el backend
  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings/bank-transfer')
        .then(res => res.json())
        .then(data => {
          if (data && Object.keys(data).length > 0) {
            setBankSettings(prev => ({ ...prev, ...data }));
          }
        })
        .catch(err => console.error("Error cargando configuración bancaria:", err));
    }
  }, [isOpen]);

  // Actualizar datos del perro si vienen del contexto
  useEffect(() => {
    if (dogData) {
      setFormData(prev => ({
        ...prev,
        dog_name: prev.dog_name || dogData.name || '',
        dog_weight: prev.dog_weight || dogData.weight || '',
        dog_age: prev.dog_age || dogData.age || 'adult_normal'
      }));
    }
  }, [dogData]);

  // Descuentos: Suscripción (10%) o Descuento de Comunidad NFC
  const subscriptionDiscount = isSubscription ? Math.round(total * 0.1) : 0;
  const appliedNfcDiscount = (!isSubscription && nfcDiscount > 0) ? nfcDiscount : 0;
  const totalDiscount = subscriptionDiscount + appliedNfcDiscount;

  const subtotalAfterDiscount = Math.max(0, total - totalDiscount);
  const shippingCost = isSubscription ? 0 : (subtotalAfterDiscount < 100000 ? 5000 : 0);
  const finalTotal = subtotalAfterDiscount + shippingCost;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const copyBankDetails = () => {
    const text = `Datos de Transferencia Origen Canino:\nBanco: ${bankSettings.bank_name}\nTipo: ${bankSettings.bank_account_type}\nN° Cuenta: ${bankSettings.bank_account_number}\nRUT: ${bankSettings.bank_rut}\nTitular: ${bankSettings.bank_owner}\nEmail: ${bankSettings.bank_email}`;
    navigator.clipboard.writeText(text);
    setCopiedBankInfo(true);
    setTimeout(() => setCopiedBankInfo(false), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const orderData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        customer_city: formData.customer_city,
        customer_region: formData.customer_region,
        dog_name: formData.dog_name,
        dog_weight: formData.dog_weight ? parseFloat(formData.dog_weight) : null,
        dog_age: formData.dog_age,
        payment_method: paymentMethod,
        transfer_bank: paymentMethod === 'transferencia' ? formData.transfer_bank : null,
        transfer_receipt_number: paymentMethod === 'transferencia' ? formData.transfer_receipt_number : null,
        nfc_building_code: nfcCommunity ? nfcCommunity.slug : null,
        discount_amount: totalDiscount,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        is_subscription: isSubscription
      };

      // 1. Crear Orden en el Backend
      const res = await fetch(`/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Error al procesar la orden");
      }

      const createdOrderId = data.order_id;

      // 2. Si eligió Mercado Pago, crear preferencia y redirigir
      if (paymentMethod === 'mercadopago') {
        const mpRes = await fetch(`/api/payments/mercadopago/create-preference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: createdOrderId })
        });

        const mpData = await mpRes.json();
        if (mpRes.ok && mpData.init_point) {
          clearCart();
          window.location.href = mpData.init_point;
          return;
        } else {
          // Si MP falla o no tiene token configurado, informar al usuario
          alert(mpData.detail || "Mercado Pago no disponible en este momento. Por favor selecciona Transferencia Bancaria.");
          setPaymentMethod('transferencia');
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Si eligió Transferencia Bancaria, mostrar pantalla de confirmación
      setOrderSuccess(createdOrderId);
      clearCart();
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Hubo un error al procesar tu pedido: " + (error.message || "Intenta nuevamente."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setOrderSuccess(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60]"
            onClick={orderSuccess ? handleFinish : onClose}
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[650px] bg-white shadow-2xl z-[70] overflow-y-auto flex flex-col"
          >
            {orderSuccess ? (
              <div className="p-8 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="bg-green-100 p-4 rounded-full text-primary-green mb-4">
                  <CheckCircle size={64} />
                </div>
                <h2 className="text-3xl font-header text-primary-green-dark mb-2">¡Pedido Registrado con Éxito!</h2>
                <p className="text-gray-600 mb-4 max-w-md">
                  Tu número de orden es el <strong className="text-primary-green text-xl font-bold">#{orderSuccess}</strong>.
                </p>

                {/* Resumen de Transferencia */}
                <div className="w-full max-w-md bg-bg-cream border border-gray-200 rounded-2xl p-5 mb-6 text-left text-sm space-y-2">
                  <div className="flex justify-between items-center border-b pb-2 mb-2">
                    <span className="font-bold text-secondary-brown flex items-center gap-1.5">
                      <Landmark size={18} className="text-primary-green" /> Datos para Transferir
                    </span>
                    <button 
                      type="button" 
                      onClick={copyBankDetails}
                      className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                    >
                      {copiedBankInfo ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      {copiedBankInfo ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p><span className="text-gray-500">Banco:</span> <strong>{bankSettings.bank_name}</strong></p>
                  <p><span className="text-gray-500">Tipo de Cuenta:</span> <strong>{bankSettings.bank_account_type}</strong></p>
                  <p><span className="text-gray-500">N° de Cuenta:</span> <strong>{bankSettings.bank_account_number}</strong></p>
                  <p><span className="text-gray-500">RUT:</span> <strong>{bankSettings.bank_rut}</strong></p>
                  <p><span className="text-gray-500">Titular:</span> <strong>{bankSettings.bank_owner}</strong></p>
                  <p><span className="text-gray-500">Email:</span> <strong>{bankSettings.bank_email}</strong></p>
                  <p className="text-xs text-gray-500 pt-2 border-t">
                    * Al transferir, incluye en el asunto tu número de orden <strong>#{orderSuccess}</strong>.
                  </p>
                </div>

                <p className="text-xs text-gray-500 mb-6 max-w-sm">
                  Hemos notificado a nuestro equipo por WhatsApp y Telegram. Validaremos tu transferencia a la brevedad para despachar tu pedido.
                </p>

                <button 
                  onClick={handleFinish}
                  className="bg-primary-green text-white font-bold py-3.5 px-8 rounded-full hover:bg-primary-green-dark transition shadow-lg"
                >
                  Volver a la Tienda
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center p-4 border-b bg-bg-cream sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    {onBack && (
                      <button type="button" onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-600 flex items-center justify-center" title="Volver al carrito">
                        <ArrowLeft size={24} />
                      </button>
                    )}
                    <h2 className="text-2xl font-header text-primary-green-dark">Finalizar Compra</h2>
                  </div>
                  <button type="button" onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
                  {/* Badge Comunidad NFC si aplica */}
                  {nfcCommunity && (
                    <div className="bg-primary-green/10 border border-primary-green/30 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-primary-green text-white p-1.5 rounded-lg">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary-green-dark">
                            Comunidad {nfcCommunity.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {nfcCommunity.street_references || nfcCommunity.address}
                          </p>
                        </div>
                      </div>
                      <span className="bg-primary-green text-white font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles size={12} /> {nfcCommunity.discount_percent}% OFF
                      </span>
                    </div>
                  )}

                  {/* Datos de Contacto */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-secondary-brown flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-green text-white text-xs rounded-full flex items-center justify-center">1</span>
                      Datos de Contacto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Nombre Completo *</label>
                        <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none" placeholder="Ej. Juan Pérez" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Teléfono (WhatsApp) *</label>
                        <input required type="text" name="customer_phone" value={formData.customer_phone} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none" placeholder="+56 9 1234 5678" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Correo Electrónico *</label>
                        <input required type="email" name="customer_email" value={formData.customer_email} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none" placeholder="juan@ejemplo.com" />
                      </div>
                    </div>
                  </div>

                  {/* Datos del Perro */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-secondary-brown flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-green text-white text-xs rounded-full flex items-center justify-center">2</span>
                      Datos de tu Mascota
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Nombre del Perro *</label>
                        <input required type="text" name="dog_name" value={formData.dog_name} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none" placeholder="Ej. Max" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Peso en Kg *</label>
                        <input required type="number" step="0.1" name="dog_weight" value={formData.dog_weight} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none" placeholder="Ej. 18.5" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Etapa / Actividad</label>
                        <select name="dog_age" value={formData.dog_age} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none">
                          <option value="puppy_small">Cachorro (2 a 6 meses)</option>
                          <option value="puppy_large">Cachorro (6 a 12 meses)</option>
                          <option value="adult_low">Adulto (Baja Actividad / Senior)</option>
                          <option value="adult_normal">Adulto (Actividad Normal)</option>
                          <option value="adult_high">Adulto (Alta Actividad / Deporte)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dirección de Despacho */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-secondary-brown flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-green text-white text-xs rounded-full flex items-center justify-center">3</span>
                      Dirección de Despacho
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Dirección (Calle, Número, Depto/Torre) *</label>
                        <input required type="text" name="customer_address" value={formData.customer_address} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none" placeholder="Av. Las Condes 1234, Depto 502" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Comuna / Ciudad *</label>
                        <input required type="text" name="customer_city" value={formData.customer_city} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none" placeholder="Las Condes, Santiago" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Región</label>
                        <select name="customer_region" value={formData.customer_region} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none">
                          <option value="Región Metropolitana">Región Metropolitana</option>
                          <option value="Región de Valparaíso">Región de Valparaíso</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Selector de Método de Pago */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-secondary-brown flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-green text-white text-xs rounded-full flex items-center justify-center">4</span>
                      Selecciona Método de Pago
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {/* Opción Mercado Pago */}
                      <div 
                        onClick={() => setPaymentMethod('mercadopago')}
                        className={`cursor-pointer p-4 rounded-2xl border-2 transition relative flex flex-col justify-between ${
                          paymentMethod === 'mercadopago' 
                            ? 'border-primary-green bg-green-50/50 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="text-primary-green" size={22} />
                            <span className="font-bold text-gray-800">Mercado Pago</span>
                          </div>
                          <span className="bg-primary-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Online
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Tarjetas de Débito, Crédito, Prepago o Dinero en cuenta Mercado Pago. Aprobación inmediata.
                        </p>
                      </div>

                      {/* Opción Transferencia */}
                      <div 
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`cursor-pointer p-4 rounded-2xl border-2 transition relative flex flex-col justify-between ${
                          paymentMethod === 'transferencia' 
                            ? 'border-primary-green bg-green-50/50 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Landmark className="text-secondary-brown" size={22} />
                            <span className="font-bold text-gray-800">Transferencia</span>
                          </div>
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Manual
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Transfiere directamente a nuestra cuenta corriente y adjunta tu comprobante.
                        </p>
                      </div>
                    </div>

                    {/* Subformulario de Transferencia si está seleccionado */}
                    {paymentMethod === 'transferencia' && (
                      <div className="bg-bg-cream border border-gray-200 rounded-2xl p-4 text-xs space-y-3 mb-4">
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="font-bold text-secondary-brown">Datos de Nuestra Cuenta:</span>
                          <button 
                            type="button" 
                            onClick={copyBankDetails}
                            className="bg-white border text-gray-700 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 hover:bg-gray-50"
                          >
                            {copiedBankInfo ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                            {copiedBankInfo ? 'Copiado' : 'Copiar Datos'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-gray-700">
                          <div><span className="text-gray-500">Banco:</span> <strong>{bankSettings.bank_name}</strong></div>
                          <div><span className="text-gray-500">Tipo:</span> <strong>{bankSettings.bank_account_type}</strong></div>
                          <div><span className="text-gray-500">N° Cuenta:</span> <strong>{bankSettings.bank_account_number}</strong></div>
                          <div><span className="text-gray-500">RUT:</span> <strong>{bankSettings.bank_rut}</strong></div>
                          <div className="col-span-2"><span className="text-gray-500">Titular:</span> <strong>{bankSettings.bank_owner}</strong></div>
                          <div className="col-span-2"><span className="text-gray-500">Email comprobante:</span> <strong>{bankSettings.bank_email}</strong></div>
                        </div>

                        <div className="pt-2 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-600 font-semibold mb-1">Tu Banco Emisor (Opcional)</label>
                            <input 
                              type="text" 
                              name="transfer_bank" 
                              value={formData.transfer_bank} 
                              onChange={handleChange} 
                              placeholder="Ej: Banco de Chile, BCI, Santander" 
                              className="w-full bg-white border p-2 rounded-lg text-xs outline-none" 
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 font-semibold mb-1">N° Comprobante / Operación</label>
                            <input 
                              type="text" 
                              name="transfer_receipt_number" 
                              value={formData.transfer_receipt_number} 
                              onChange={handleChange} 
                              placeholder="Ej: 987654321" 
                              className="w-full bg-white border p-2 rounded-lg text-xs outline-none" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resumen Financiero */}
                  <div className="bg-gray-50 p-4 rounded-2xl border space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal ({items.length} productos)</span>
                      <span>${total.toLocaleString('es-CL')}</span>
                    </div>

                    {isSubscription && (
                      <div className="flex justify-between text-sm text-primary-green font-semibold">
                        <span>Descuento Suscripción Mensual (10%)</span>
                        <span>-${subscriptionDiscount.toLocaleString('es-CL')}</span>
                      </div>
                    )}

                    {appliedNfcDiscount > 0 && (
                      <div className="flex justify-between text-sm text-primary-green font-bold bg-green-50 p-1.5 rounded-lg">
                        <span className="flex items-center gap-1.5">
                          <Building2 size={16} /> Descuento Comunidad ({nfcCommunity.name} -{nfcCommunity.discount_percent}%)
                        </span>
                        <span>-${appliedNfcDiscount.toLocaleString('es-CL')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Costo de Despacho</span>
                      <span>{shippingCost === 0 ? <strong className="text-primary-green">¡GRATIS!</strong> : `$${shippingCost.toLocaleString('es-CL')}`}</span>
                    </div>

                    {shippingCost > 0 && !isSubscription && (
                      <p className="text-xs text-primary-green">
                        ¡Agrega ${(100000 - subtotalAfterDiscount).toLocaleString('es-CL')} más para despacho gratis en RM!
                      </p>
                    )}

                    <div className="border-t pt-2.5 mt-2 flex justify-between font-bold text-xl">
                      <span>Total a Pagar</span>
                      <span className="text-primary-green-dark">${finalTotal.toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  {/* Botón de Envío Dinámico según Método */}
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-secondary-orange text-white font-bold py-3.5 rounded-xl hover:bg-[#d65d21] transition shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 text-base"
                  >
                    {isSubmitting ? (
                      'Procesando pedido...'
                    ) : paymentMethod === 'mercadopago' ? (
                      <>
                        <CreditCard size={20} /> Pagar con Mercado Pago (${finalTotal.toLocaleString('es-CL')})
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} /> Confirmar Pedido por Transferencia
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <ShieldCheck size={16} className="text-primary-green" />
                    <span>Pago 100% seguro con respaldo de Origen Canino</span>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
