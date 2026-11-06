import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ArrowLeft, CreditCard, Landmark, Sparkles, Building2, ShieldCheck, Copy, Check, UserCheck, Dog, RefreshCw, Info, Gift, Tag, Mail, Lock, User, Phone, MapPin, Eye, EyeOff, ArrowRight, Wallet } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';

const CheckoutModal = ({ isOpen, onClose, onBack, isSubscription = false }) => {
  const { 
    items, total, clearCart, dogData, nfcCommunity, nfcDiscount, 
    firstOrderPromo, isFirstPurchaseEligible, markAsPurchased 
  } = useCart();
  const { customer, dogs, openAuthModal, login, register } = useCustomer();
  
  const [checkoutStep, setCheckoutStep] = useState('checkout'); // 'checkout' | 'register'
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_password: '',
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

  // Estado para el formulario dedicado de Registro de nuevo cliente
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: 'Santiago',
    region: 'Región Metropolitana',
    dog_name: '',
    dog_weight: '',
    dog_age: 'adult_normal'
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [existingCustomerName, setExistingCustomerName] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  
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
  const [couponInput, setCouponInput] = useState(() => localStorage.getItem('origencanino_coupon_code') || '');
  const [appliedCoupon, setAppliedCoupon] = useState(() => localStorage.getItem('origencanino_coupon_code') || '');
  const [appliedCouponData, setAppliedCouponData] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

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

  // Autocompletar datos del cliente si tiene sesión iniciada
  useEffect(() => {
    if (customer && isOpen) {
      setFormData(prev => ({
        ...prev,
        customer_name: prev.customer_name || customer.name || '',
        customer_email: prev.customer_email || customer.email || '',
        customer_phone: prev.customer_phone || customer.phone || '',
        customer_address: prev.customer_address || customer.address || '',
        customer_city: prev.customer_city || customer.city || '',
        customer_region: customer.region || prev.customer_region || 'Región Metropolitana',
      }));

      // Si no hay perrito seleccionado en el formulario y el cliente tiene perritos guardados, seleccionar el primero
      if (dogs && dogs.length > 0) {
        setFormData(prev => {
          if (!prev.dog_name) {
            return {
              ...prev,
              dog_name: dogs[0].name || '',
              dog_weight: dogs[0].weight ? String(dogs[0].weight) : '',
              dog_age: dogs[0].age_stage || 'adult_normal'
            };
          }
          return prev;
        });
      }
    }
  }, [customer, dogs, isOpen]);

  const [emailCheckEligible, setEmailCheckEligible] = useState(null);

  useEffect(() => {
    const email = formData.customer_email?.trim().toLowerCase();
    if (email && email.includes('@') && email.includes('.')) {
      fetch(`/api/promotions/check-eligibility?email=${encodeURIComponent(email)}`)
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.eligible === 'boolean') {
            setEmailCheckEligible(data.eligible);
          }
        })
        .catch(() => {});
    } else {
      setEmailCheckEligible(null);
    }
  }, [formData.customer_email]);

  // Descuentos: Suscripción (10%), Comunidad NFC o Promoción / Cupón
  const subscriptionDiscount = isSubscription ? Math.round(total * 0.1) : 0;
  const appliedNfcDiscount = (!isSubscription && nfcDiscount > 0) ? nfcDiscount : 0;
  
  const isEligibleForFirstOrder = emailCheckEligible !== null ? emailCheckEligible : isFirstPurchaseEligible;

  // Cálculo del descuento promocional (cupón dinámico O bienvenida automática)
  let appliedPromoDiscount = 0;
  let promoDiscountLabel = 'Descuento Promocional';

  if (!isSubscription && appliedNfcDiscount === 0) {
    if (appliedCoupon && appliedCouponData && appliedCouponData.valid) {
      appliedPromoDiscount = appliedCouponData.discount_amount || 0;
      promoDiscountLabel = appliedCouponData.is_referral
        ? (appliedCouponData.description || `Código Amigo (${appliedCouponData.discount_value}% OFF)`)
        : (appliedCouponData.discount_type === 'percentage'
          ? `Cupón ${appliedCoupon} (${appliedCouponData.discount_value}% OFF)`
          : `Cupón ${appliedCoupon} (-$${appliedCouponData.discount_amount.toLocaleString('es-CL')})`);
    } else if (isEligibleForFirstOrder && firstOrderPromo?.enabled && !appliedCoupon) {
      appliedPromoDiscount = Math.round(total * (Number(firstOrderPromo.percent || 10) / 100));
      promoDiscountLabel = `Descuento 1ra Compra (${firstOrderPromo.percent}% OFF)`;
    }
  }

  const totalDiscount = subscriptionDiscount + appliedNfcDiscount + appliedPromoDiscount;

  const subtotalAfterDiscount = Math.max(0, total - totalDiscount);
  const shippingCost = isSubscription ? 0 : (subtotalAfterDiscount < 100000 ? 5000 : 0);
  
  // Descuento de Billetera Virtual (Referidos)
  const availableWallet = Number(customer?.wallet_balance || 0);
  const totalBeforeWallet = subtotalAfterDiscount + shippingCost;
  const walletDeduction = (useWalletBalance && availableWallet > 0) ? Math.min(availableWallet, totalBeforeWallet) : 0;
  const finalTotal = Math.max(0, totalBeforeWallet - walletDeduction);

  // Validación de cupón contra el endpoint /api/promotions/validate
  const validateAndApplyCoupon = async (codeToTest) => {
    const clean = (codeToTest || couponInput).trim().toUpperCase();
    if (!clean) {
      setCouponError('Por favor ingresa un código.');
      return;
    }
    setValidatingCoupon(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const res = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: clean,
          email: formData.customer_email.trim(),
          subtotal: total
        })
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon(clean);
        setAppliedCouponData(data);
        localStorage.setItem('origencanino_coupon_code', clean);
        setCouponSuccess(data.message || `¡Cupón ${clean} aplicado con éxito!`);
        setCouponError('');
      } else {
        setAppliedCoupon('');
        setAppliedCouponData(null);
        localStorage.removeItem('origencanino_coupon_code');
        setCouponError(data.message || 'Código de cupón inválido o expirado.');
      }
    } catch (err) {
      setCouponError('Error al contactar el servidor para validar el cupón.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setAppliedCouponData(null);
    setCouponInput('');
    localStorage.removeItem('origencanino_coupon_code');
    setCouponSuccess('');
    setCouponError('');
  };

  // Re-validar cupón automáticamente si cambia el subtotal
  useEffect(() => {
    if (isOpen && appliedCoupon && total > 0) {
      validateAndApplyCoupon(appliedCoupon);
    }
  }, [total, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const copyBankDetails = () => {
    const text = `Datos de Transferencia Origen Canino:\nBanco: ${bankSettings.bank_name}\nTipo: ${bankSettings.bank_account_type}\nN° Cuenta: ${bankSettings.bank_account_number}\nRUT: ${bankSettings.bank_rut}\nTitular: ${bankSettings.bank_owner}\nEmail: ${bankSettings.bank_email}`;
    navigator.clipboard.writeText(text);
    setCopiedBankInfo(true);
    setTimeout(() => setCopiedBankInfo(false), 2500);
  };

  const handleEmailChange = (val) => {
    setFormData(prev => ({ ...prev, customer_email: val }));
    
    // Al escribir, editar o borrar, reseteamos de inmediato la validación previa
    setEmailChecked(false);
    setIsExistingCustomer(false);
    setExistingCustomerName('');
    setLoginError('');

    const clean = val.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(clean)) {
      checkEmail(clean);
    }
  };

  const checkEmail = async (emailToTest) => {
    const clean = (emailToTest || '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(clean)) {
      setEmailChecked(false);
      setIsExistingCustomer(false);
      setExistingCustomerName('');
      return;
    }
    
    // Si ya está logueado como cliente con ese mismo correo
    if (customer && customer.email?.toLowerCase() === clean) {
      setIsExistingCustomer(true);
      setEmailChecked(true);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const res = await fetch('/api/customer/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean })
      });
      const data = await res.json();
      
      setFormData(current => {
        // Verificar que el input no haya cambiado mientras se esperaba la respuesta
        if (current.customer_email.trim().toLowerCase() === clean) {
          setEmailChecked(true);
          if (data && data.exists) {
            setIsExistingCustomer(true);
            setExistingCustomerName(data.customer_name);
            return {
              ...current,
              customer_name: current.customer_name || data.customer_name || '',
              customer_phone: current.customer_phone || data.phone || '',
              customer_address: current.customer_address || data.address || '',
              customer_city: current.customer_city || data.city || '',
              customer_region: data.region || current.customer_region || 'Región Metropolitana',
              dog_name: current.dog_name || data.dog_name || '',
              dog_weight: current.dog_weight || data.dog_weight || '',
              dog_age: current.dog_age || data.dog_age || 'adult_normal',
            };
          } else {
            setIsExistingCustomer(false);
            setExistingCustomerName('');
          }
        }
        return current;
      });
    } catch (e) {
      console.error("Error consultando correo de cliente:", e);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleQuickLogin = async () => {
    if (!loginPasswordInput) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await login(formData.customer_email, loginPasswordInput);
      setLoginPasswordInput('');
      setIsExistingCustomer(true);
    } catch (err) {
      setLoginError(err.message || 'Contraseña incorrecta');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenRegisterStep = (email = '') => {
    setRegForm({
      name: formData.customer_name || '',
      email: (email || formData.customer_email || '').trim().toLowerCase(),
      password: '',
      phone: formData.customer_phone || '',
      address: formData.customer_address || '',
      city: formData.customer_city || 'Santiago',
      region: formData.customer_region || 'Región Metropolitana',
      dog_name: formData.dog_name || dogData?.name || '',
      dog_weight: formData.dog_weight || (dogData?.weight ? String(dogData.weight) : ''),
      dog_age: formData.dog_age || dogData?.age || 'adult_normal'
    });
    setRegError('');
    setCheckoutStep('register');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!regForm.password || regForm.password.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!regForm.name.trim() || !regForm.email.trim()) {
      setRegError('Tu nombre y correo electrónico son obligatorios.');
      return;
    }

    setRegLoading(true);
    try {
      await register({
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        password: regForm.password,
        phone: regForm.phone.trim(),
        address: regForm.address.trim(),
        city: regForm.city.trim(),
        region: regForm.region || 'Región Metropolitana',
        dog_name: regForm.dog_name ? regForm.dog_name.trim() : null,
        dog_weight: regForm.dog_weight ? parseFloat(regForm.dog_weight) : null,
        dog_age: regForm.dog_age || 'adult_normal'
      });

      // Sincronizar automáticamente datos con formData de Checkout
      setFormData(prev => ({
        ...prev,
        customer_name: regForm.name.trim(),
        customer_email: regForm.email.trim().toLowerCase(),
        customer_phone: regForm.phone.trim(),
        customer_address: regForm.address.trim(),
        customer_city: regForm.city.trim(),
        customer_region: regForm.region || 'Región Metropolitana',
        dog_name: regForm.dog_name ? regForm.dog_name.trim() : prev.dog_name,
        dog_weight: regForm.dog_weight ? String(regForm.dog_weight) : prev.dog_weight,
        dog_age: regForm.dog_age || prev.dog_age
      }));

      setIsExistingCustomer(true);
      setEmailChecked(true);
      setCheckoutStep('checkout');
    } catch (err) {
      setRegError(err.message || 'Error al crear la cuenta de cliente.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (total < 30000) {
      alert("El monto mínimo de compra es de $30.000 CLP. Por favor agrega más productos a tu pedido.");
      return;
    }

    // Si es un cliente nuevo que aún no crea su cuenta, abrir el formulario de registro con transición suave
    if (!customer && !isExistingCustomer) {
      handleOpenRegisterStep(formData.customer_email);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const orderData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_password: null,
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
        coupon_code: appliedCoupon || null,
        referral_code: appliedCouponData?.is_referral ? appliedCoupon : (sessionStorage.getItem('origencanino_referral_code') || null),
        use_wallet_balance: useWalletBalance && walletDeduction > 0,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          weight: item.weight || null
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
          markAsPurchased();
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
      markAsPurchased();
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
              <AnimatePresence mode="wait">
                {checkoutStep === 'register' ? (
                  <motion.div
                    key="step-register"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="flex flex-col flex-1"
                  >
                    {/* Header para Registro */}
                    <div className="flex justify-between items-center p-4 border-b bg-bg-cream sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => setCheckoutStep('checkout')} 
                          className="p-2 hover:bg-gray-200 rounded-full transition text-gray-600 flex items-center justify-center cursor-pointer"
                          title="Volver a la compra"
                        >
                          <ArrowLeft size={22} />
                        </button>
                        <div>
                          <h2 className="text-xl font-header text-primary-green-dark">Crear Cuenta de Cliente</h2>
                          <p className="text-[11px] text-gray-500">Paso previo para darte de alta y coordinar tu despacho</p>
                        </div>
                      </div>
                      <button type="button" onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition cursor-pointer">
                        <X size={22} />
                      </button>
                    </div>

                    {/* Formulario Dedicado de Registro */}
                    <form onSubmit={handleRegisterSubmit} className="p-6 space-y-5 flex-1">
                      {/* Mensaje de Bienvenida Amistoso */}
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                          <Sparkles size={20} className="text-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-amber-900">¡Te damos la bienvenida a Origen Canino!</h4>
                          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                            Crea tu usuario una sola vez. Con tu cuenta podrás revisar tus despachos congelados, registrar a tus mascotas y repetir tus pedidos en 1 clic.
                          </p>
                        </div>
                      </div>

                      {regError && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-semibold">
                          {regError}
                        </div>
                      )}

                      {/* 1. Datos Personales */}
                      <div>
                        <h3 className="font-bold text-sm text-secondary-brown mb-2.5 flex items-center gap-2">
                          <span className="w-5 h-5 bg-primary-green text-white text-[11px] rounded-full flex items-center justify-center font-bold">1</span>
                          Tus Datos de Contacto
                        </h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <User size={13} className="text-primary-green" /> Tu Nombre Completo *
                              </label>
                              <input
                                required
                                type="text"
                                value={regForm.name}
                                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                                placeholder="Ej. Juan Pérez"
                                className="w-full border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary-green outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Phone size={13} className="text-primary-green" /> WhatsApp / Teléfono *
                              </label>
                              <input
                                required
                                type="tel"
                                value={regForm.phone}
                                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                placeholder="+56 9 1234 5678"
                                className="w-full border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary-green outline-none bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Mail size={13} className="text-primary-green" /> Correo Electrónico *
                              </label>
                              <input
                                required
                                type="email"
                                value={regForm.email}
                                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                placeholder="tu@email.com"
                                className="w-full border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary-green outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Lock size={13} className="text-primary-green" /> Crea tu Contraseña *
                              </label>
                              <div className="relative">
                                <input
                                  required
                                  minLength={6}
                                  type={showRegPassword ? "text" : "password"}
                                  value={regForm.password}
                                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                  placeholder="Mínimo 6 caracteres"
                                  className="w-full border p-2.5 pr-8 rounded-xl text-xs focus:ring-2 focus:ring-primary-green outline-none bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowRegPassword(!showRegPassword)}
                                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                  {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Dirección de Despacho */}
                      <div>
                        <h3 className="font-bold text-sm text-secondary-brown mb-2.5 flex items-center gap-2">
                          <span className="w-5 h-5 bg-primary-green text-white text-[11px] rounded-full flex items-center justify-center font-bold">2</span>
                          Dirección de Despacho
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                              <MapPin size={13} className="text-primary-green" /> Calle, Número, Depto/Torre *
                            </label>
                            <input
                              required
                              type="text"
                              value={regForm.address}
                              onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                              placeholder="Av. Las Condes 1234, Depto 502"
                              className="w-full border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary-green outline-none bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Comuna / Ciudad *</label>
                              <input
                                required
                                type="text"
                                value={regForm.city}
                                onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                                placeholder="Las Condes, Santiago"
                                className="w-full border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary-green outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Región</label>
                              <select
                                value={regForm.region}
                                onChange={(e) => setRegForm({ ...regForm, region: e.target.value })}
                                className="w-full border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary-green outline-none bg-white"
                              >
                                <option value="Región Metropolitana">Región Metropolitana</option>
                                <option value="Región de Valparaíso">Región de Valparaíso</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Ficha de tu Perrito */}
                      <div>
                        <h3 className="font-bold text-sm text-secondary-brown mb-2.5 flex items-center gap-2">
                          <span className="w-5 h-5 bg-primary-green text-white text-[11px] rounded-full flex items-center justify-center font-bold">3</span>
                          Ficha de tu Mascota (Para cálculo nutricional y porción)
                        </h3>
                        <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[11px] text-gray-700 font-bold mb-1">Nombre Perrito *</label>
                              <input
                                required
                                type="text"
                                value={regForm.dog_name}
                                onChange={(e) => setRegForm({ ...regForm, dog_name: e.target.value })}
                                placeholder="Ej. Max"
                                className="w-full border border-amber-200 bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary-green"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-700 font-bold mb-1">Peso en Kg *</label>
                              <input
                                required
                                type="number"
                                step="0.1"
                                value={regForm.dog_weight}
                                onChange={(e) => setRegForm({ ...regForm, dog_weight: e.target.value })}
                                placeholder="Ej. 18.5"
                                className="w-full border border-amber-200 bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary-green"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-700 font-bold mb-1">Etapa / Actividad</label>
                              <select
                                value={regForm.dog_age}
                                onChange={(e) => setRegForm({ ...regForm, dog_age: e.target.value })}
                                className="w-full border border-amber-200 bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary-green"
                              >
                                <option value="puppy_small">Cachorro (2 a 6 meses)</option>
                                <option value="puppy_large">Cachorro (6 a 12 meses)</option>
                                <option value="adult_low">Adulto (Baja Actividad / Senior)</option>
                                <option value="adult_normal">Adulto (Actividad Normal)</option>
                                <option value="adult_high">Adulto (Alta Actividad / Deporte)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botón de Envío de Registro */}
                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-base cursor-pointer mt-4"
                      >
                        {regLoading ? "Creando tu cuenta..." : "Crear mi Cuenta y Continuar al Pago"}
                        <ArrowRight size={18} />
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('checkout')}
                          className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                        >
                          Volver al resumen de compra
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-checkout"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="flex flex-col flex-1"
                  >
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
                  {/* Banner de Bienvenida si ya está logueado */}
                  {customer && (
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {customer.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary-green-dark flex items-center gap-1.5">
                            <UserCheck size={14} className="text-emerald-600" /> ¡Hola, {customer.name}!
                          </p>
                          <p className="text-[11px] text-gray-600">
                            Reconocimos tu cuenta. Tus datos de contacto, despacho y mascota están precargados.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary-green bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs hidden sm:inline-block">
                        Cliente Registrado
                      </span>
                    </div>
                  )}

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

                  {/* 1. Datos de Contacto y Reconocimiento de Usuario */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-secondary-brown flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-green text-white text-xs rounded-full flex items-center justify-center">1</span>
                      Datos de Contacto
                    </h3>

                    <div className="space-y-4">
                      {/* Correo Electrónico (Identificador Principal) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Mail size={15} className="text-primary-green" /> Correo Electrónico *
                          </label>
                          {isCheckingEmail && (
                            <span className="text-[11px] text-primary-green font-semibold animate-pulse flex items-center gap-1">
                              <RefreshCw size={11} className="animate-spin" /> Verificando...
                            </span>
                          )}
                        </div>
                        <input 
                          required 
                          type="email" 
                          name="customer_email" 
                          value={formData.customer_email} 
                          onChange={(e) => handleEmailChange(e.target.value)}
                          onBlur={(e) => {
                            const clean = e.target.value.trim().toLowerCase();
                            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                            if (emailRegex.test(clean)) {
                              checkEmail(clean);
                            } else {
                              setEmailChecked(false);
                              setIsExistingCustomer(false);
                            }
                          }}
                          className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none bg-white" 
                          placeholder="tu@email.com" 
                        />
                      </div>

                      {/* CASO A: Reconocido como cliente existente (sin sesión activa) */}
                      {emailChecked && isExistingCustomer && !customer && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.customer_email?.trim() || '') && (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-2xs">
                          <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <UserCheck size={16} className="text-emerald-700" />
                            ¡Reconocimos tu correo, {existingCustomerName || 'amigo'}! Ya tienes una cuenta registrada.
                          </p>
                          <p className="text-[11px] text-emerald-800 mt-1">
                            Ingresa tu contraseña para autocompletar tus datos de despacho y la ficha de tu perrito:
                          </p>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2.5">
                            <input 
                              type="password"
                              placeholder="Tu contraseña"
                              value={loginPasswordInput}
                              onChange={(e) => setLoginPasswordInput(e.target.value)}
                              className="border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-emerald-600 flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleQuickLogin}
                              disabled={isLoggingIn}
                              className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition shadow-xs cursor-pointer whitespace-nowrap"
                            >
                              {isLoggingIn ? 'Iniciando...' : 'Iniciar Sesión'}
                            </button>
                          </div>
                          {loginError && <p className="text-[11px] text-red-600 mt-1 font-semibold">{loginError}</p>}
                        </div>
                      )}

                      {/* CASO B: Cliente NUEVO detectado (correo no existe en la base de datos) */}
                      {emailChecked && !isExistingCustomer && !customer && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.customer_email?.trim() || '') && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 shadow-2xs">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                              <Sparkles size={18} className="text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xs font-bold text-amber-900">
                                ¡Bienvenido a Origen Canino! Este correo no tiene cuenta previa.
                              </h4>
                              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                                Para coordinar tu despacho congelado y guardar la ficha nutricional de tu perrito, crearemos tu cuenta de cliente en unos segundos.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenRegisterStep(formData.customer_email)}
                                className="mt-2.5 inline-flex items-center gap-1.5 bg-primary-green hover:bg-primary-green-dark text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
                              >
                                <span>Crear mi Cuenta de Cliente</span>
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nombre Completo *</label>
                          <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none bg-white" placeholder="Ej. Juan Pérez" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Teléfono (WhatsApp) *</label>
                          <input required type="text" name="customer_phone" value={formData.customer_phone} onChange={handleChange} className="w-full border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none bg-white" placeholder="+56 9 1234 5678" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Datos del Perro */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg text-secondary-brown flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary-green text-white text-xs rounded-full flex items-center justify-center">2</span>
                        Datos de tu Mascota
                      </h3>
                    </div>

                    {/* Selector rápido de mascotas guardadas si está logueado */}
                    {customer && dogs && dogs.length > 0 && (
                      <div className="mb-4 bg-gray-50/80 border border-gray-200/80 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold mb-2">
                          <Dog size={14} className="text-primary-green" /> Seleccionar una de tus mascotas guardadas:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dogs.map((dog) => {
                            const isSelected = formData.dog_name?.trim().toLowerCase() === dog.name?.trim().toLowerCase();
                            return (
                              <button
                                key={dog.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    dog_name: dog.name,
                                    dog_weight: dog.weight ? String(dog.weight) : '',
                                    dog_age: dog.age_stage || 'adult_normal'
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition border ${
                                  isSelected
                                    ? 'bg-primary-green text-white border-primary-green shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-green'
                                }`}
                              >
                                <span>🐾 {dog.name}</span>
                                {dog.weight && <span className="opacity-80 text-[10px]">({dog.weight} kg)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

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

                  {/* Banner de Suscripción Mensual si está activa */}
                  {isSubscription && (
                    <div className="bg-emerald-50 border border-primary-green/30 rounded-2xl p-4 text-xs text-primary-green-dark">
                      <div className="flex items-center gap-2 font-bold text-sm mb-1">
                        <RefreshCw size={16} className="text-primary-green" />
                        <span>Suscripción Mensual Automática</span>
                        <span className="bg-primary-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                          10% OFF + Envío Gratis
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        Este pedido quedará registrado para despacho mensual programado. Antes de cada envío te contactaremos por WhatsApp para coordinar la fecha de entrega y procesar el cobro correspondiente.
                      </p>
                    </div>
                  )}

                  {/* Resumen Financiero */}
                  <div className="bg-gray-50 p-4 rounded-2xl border space-y-2">
                    {/* Lista resumida de productos */}
                    <div className="bg-white rounded-xl p-3 border border-gray-200/60 mb-3 space-y-1.5 text-xs">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-gray-700">
                          <span className="truncate pr-2">
                            <strong>{item.quantity}x</strong> {item.name} {item.weight ? <span className="text-gray-500 font-normal">({item.weight})</span> : ''}
                          </span>
                          <span className="font-semibold whitespace-nowrap">${(item.price * item.quantity).toLocaleString('es-CL')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Caja de Ingreso y Aplicación de Cupón */}
                    {!isSubscription && appliedNfcDiscount === 0 && (
                      <div className="bg-white border border-stone-200/90 rounded-2xl p-3 mb-3 shadow-xs">
                        <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                          <Tag size={13} className="text-[#db994b]" /> ¿Tienes un código de descuento?
                        </label>
                        
                        {appliedCoupon && appliedPromoDiscount > 0 ? (
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Check size={16} className="text-emerald-600 shrink-0" />
                              <div>
                                <span className="font-mono font-bold text-xs text-emerald-800">{appliedCoupon.toUpperCase()}</span>
                                <span className="text-[11px] text-emerald-700 block">
                                  {appliedCouponData?.description || '¡Descuento aplicado a tu pedido!'} (-${appliedPromoDiscount.toLocaleString('es-CL')})
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-xs text-red-500 hover:text-red-700 font-bold underline p-1 cursor-pointer"
                            >
                              Quitar
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => {
                                  setCouponInput(e.target.value.toUpperCase());
                                  setCouponError('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    validateAndApplyCoupon();
                                  }
                                }}
                                placeholder="Ingresa tu código aquí"
                                className="flex-1 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider focus:ring-2 focus:ring-[#db994b] outline-none bg-white uppercase"
                              />
                              <button
                                type="button"
                                disabled={validatingCoupon}
                                onClick={() => validateAndApplyCoupon()}
                                className="bg-[#db994b] hover:bg-[#c58235] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {validatingCoupon ? '...' : 'Aplicar'}
                              </button>
                            </div>
                            {couponError && <p className="text-[11px] text-red-500 font-bold mt-1.5">{couponError}</p>}
                            {couponSuccess && !appliedCoupon && <p className="text-[11px] text-emerald-600 font-bold mt-1.5">{couponSuccess}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} unidades)</span>
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

                    {appliedPromoDiscount > 0 && (
                      <div className="flex justify-between text-sm text-[#677333] font-bold bg-[#677333]/10 p-2 rounded-xl">
                        <span className="flex items-center gap-1.5">
                          <Gift size={16} /> {promoDiscountLabel}
                        </span>
                        <span>-${appliedPromoDiscount.toLocaleString('es-CL')}</span>
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

                    {availableWallet > 0 && (
                      <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl space-y-1.5">
                        <label className="flex items-center justify-between text-xs font-bold text-amber-900 cursor-pointer">
                          <span className="flex items-center gap-1.5">
                            <Wallet size={15} className="text-amber-700" />
                            Pagar con Saldo Billetera (${availableWallet.toLocaleString('es-CL')} disp.)
                          </span>
                          <input
                            type="checkbox"
                            checked={useWalletBalance}
                            onChange={(e) => setUseWalletBalance(e.target.checked)}
                            className="w-4 h-4 text-primary-green rounded cursor-pointer"
                          />
                        </label>
                        {useWalletBalance && walletDeduction > 0 && (
                          <div className="flex justify-between text-xs text-amber-800 font-bold pt-1 border-t border-amber-200/60">
                            <span>Descuento de Billetera Aplicado</span>
                            <span>-${walletDeduction.toLocaleString('es-CL')}</span>
                          </div>
                        )}
                      </div>
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
                    className="w-full bg-secondary-orange text-white font-bold py-3.5 rounded-xl hover:bg-[#d65d21] transition shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 text-base cursor-pointer"
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
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
