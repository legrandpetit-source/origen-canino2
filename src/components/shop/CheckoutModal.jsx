import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const CheckoutModal = ({ isOpen, onClose, isSubscription = false }) => {
  const { items, total, clearCart } = useCart();
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_city: '',
    customer_region: 'Región Metropolitana',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const discount = isSubscription ? Math.round(total * 0.1) : 0;
  const subtotalAfterDiscount = total - discount;
  const shippingCost = isSubscription ? 0 : (subtotalAfterDiscount < 100000 ? 5000 : 0);
  const finalTotal = subtotalAfterDiscount + shippingCost;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const orderData = {
        ...formData,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        is_subscription: isSubscription
      };

      const res = await fetch(`/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const data = await res.json();
      if (data.success) {
        setOrderSuccess(data.order_id);
        clearCart();
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Hubo un error al procesar tu pedido. Intenta nuevamente.");
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[600px] max-h-[90vh] bg-white md:rounded-2xl shadow-2xl z-[70] overflow-y-auto flex flex-col"
          >
            {orderSuccess ? (
              <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                <CheckCircle size={64} className="text-primary-green mb-4" />
                <h2 className="text-3xl font-header text-primary-green-dark mb-2">¡Pedido Confirmado!</h2>
                <p className="text-gray-600 mb-6">
                  Tu número de orden es el <strong>#{orderSuccess}</strong>.<br/>
                  Te contactaremos pronto para coordinar el pago vía transferencia y el despacho.
                </p>
                <button 
                  onClick={handleFinish}
                  className="bg-primary-green text-white font-bold py-3 px-8 rounded-full hover:bg-primary-green-dark transition"
                >
                  Volver a la tienda
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center p-4 border-b bg-bg-cream sticky top-0 z-10">
                  <h2 className="text-2xl font-header text-primary-green-dark">Finalizar Compra</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
                  <div>
                    <h3 className="font-bold text-lg mb-3">Datos de Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Nombre Completo</label>
                        <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className="w-full border p-2 rounded-lg" placeholder="Ej. Juan Pérez" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Teléfono (WhatsApp)</label>
                        <input required type="text" name="customer_phone" value={formData.customer_phone} onChange={handleChange} className="w-full border p-2 rounded-lg" placeholder="+56 9..." />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Correo Electrónico</label>
                        <input required type="email" name="customer_email" value={formData.customer_email} onChange={handleChange} className="w-full border p-2 rounded-lg" placeholder="juan@ejemplo.com" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-3">Datos de Despacho</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Dirección (Calle y Número)</label>
                        <input required type="text" name="customer_address" value={formData.customer_address} onChange={handleChange} className="w-full border p-2 rounded-lg" placeholder="Av. Siempre Viva 123" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Comuna / Ciudad</label>
                        <input required type="text" name="customer_city" value={formData.customer_city} onChange={handleChange} className="w-full border p-2 rounded-lg" placeholder="Santiago" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Región</label>
                        <select name="customer_region" value={formData.customer_region} onChange={handleChange} className="w-full border p-2 rounded-lg">
                          <option value="Región Metropolitana">Región Metropolitana</option>
                          <option value="Región de Valparaíso">Región de Valparaíso</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({items.length} prod.)</span>
                      <span>${total.toLocaleString('es-CL')}</span>
                    </div>
                    {isSubscription && (
                      <div className="flex justify-between text-green-600 font-bold">
                        <span>Descuento Suscripción (10%)</span>
                        <span>-${discount.toLocaleString('es-CL')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Despacho</span>
                      <span>{shippingCost === 0 ? '¡GRATIS!' : `$${shippingCost.toLocaleString('es-CL')}`}</span>
                    </div>
                    {shippingCost > 0 && !isSubscription && (
                      <p className="text-xs text-primary-green">¡Agrega ${(100000 - subtotalAfterDiscount).toLocaleString('es-CL')} más para despacho gratis!</p>
                    )}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-xl">
                      <span>Total a Pagar</span>
                      <span className="text-primary-green-dark">${finalTotal.toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-secondary-orange text-white font-bold py-3 rounded-xl hover:bg-[#d65d21] transition shadow-md flex justify-center items-center disabled:opacity-50"
                  >
                    {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                  </button>
                  <p className="text-xs text-center text-gray-500">
                    Al confirmar, tu pedido quedará registrado. El pago se coordina vía transferencia una vez confirmado.
                  </p>
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
