import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CheckoutModal from './CheckoutModal';

const CartDrawer = () => {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, total } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);

  const totalKilos = items.reduce((sum, item) => sum + item.quantity, 0);

  React.useEffect(() => {
    if (totalKilos < 10 && isSubscription) {
      setIsSubscription(false);
    }
  }, [totalKilos, isSubscription]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsCheckoutOpen(true);
    setIsCartOpen(false);
  };

  return (
    <>
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black z-50 cursor-pointer"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-full md:w-96 bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b flex justify-between items-center bg-bg-cream">
              <h2 className="font-header text-2xl text-primary-green-dark">Tu Pedido</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <p>Tu carrito está vacío.</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 text-primary-green underline"
                  >
                    Volver a los productos
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-4 border-b pb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                        <p className="text-gray-500 text-sm">${item.price.toLocaleString('es-CL')} / kg</p>
                        
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center border rounded-lg">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-gray-100 rounded-l-lg"><Minus size={16} /></button>
                            <span className="px-3 font-semibold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-gray-100 rounded-r-lg"><Plus size={16} /></button>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="font-bold">
                        ${(item.price * item.quantity).toLocaleString('es-CL')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {items.length > 0 && (
              <div className="border-t p-4 bg-gray-50">
                {totalKilos >= 10 ? (
                  <div className="bg-primary-cream/30 p-3 rounded-lg mb-4 border border-primary-green/20">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-5 h-5 accent-primary-green"
                        checked={isSubscription}
                        onChange={(e) => setIsSubscription(e.target.checked)}
                      />
                      <div className="flex-1">
                        <span className="font-bold text-primary-green-dark">Suscribirme a este pedido</span>
                        <p className="text-xs text-gray-600 mt-1">
                          Obtén un <span className="font-bold text-green-600">10% de descuento</span> y <span className="font-bold text-green-600">despacho gratis</span> en todos tus envíos mensuales.
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-3 rounded-lg mb-4 border border-gray-200">
                    <div className="flex-1">
                      <span className="font-bold text-gray-500">Suscripción Mensual</span>
                      <p className="text-xs text-gray-500 mt-1">
                        Agrega al menos 10kg a tu carrito para habilitar la suscripción con un 10% de descuento y despacho gratis.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>Total estimado:</span>
                  <div className="text-right">
                    {isSubscription ? (
                      <>
                        <span className="line-through text-gray-400 text-sm mr-2">${total.toLocaleString('es-CL')}</span>
                        <span className="text-primary-green-dark">${(total * 0.9).toLocaleString('es-CL')}</span>
                      </>
                    ) : (
                      <span>${total.toLocaleString('es-CL')}</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-secondary-orange text-white font-bold py-3 rounded-xl hover:bg-[#d65d21] transition shadow-md"
                >
                  Ir al Pago
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} isSubscription={isSubscription} />
    </>
  );
};

export default CartDrawer;
