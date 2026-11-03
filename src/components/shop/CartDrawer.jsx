import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { X, Plus, Minus, Trash2, Info, RefreshCw, CheckCircle2, Sparkles, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CheckoutModal from './CheckoutModal';

const CartDrawer = () => {
  const { 
    items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, total, addItem,
    firstOrderPromo, firstOrderDiscount, isFirstPurchaseEligible, nfcDiscount, nfcCommunity
  } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);

  const [suggestedProducts, setSuggestedProducts] = useState([]);

  React.useEffect(() => {
    if (isCartOpen && suggestedProducts.length === 0) {
      fetch('/api/products')
        .then(res => { if (!res.ok) throw new Error("HTTP error " + res.status); return res.json(); })
        .then(data => setSuggestedProducts(data))
        .catch(err => console.error(err));
    }
  }, [isCartOpen, suggestedProducts.length]);

  const productsToSuggest = suggestedProducts
    .filter(p => !items.some(i => i.id === p.id) && !p.name.toLowerCase().includes("pack inicial"))
    .slice(0, 3);

  // Helper para convertir peso a kilos numéricos
  const parseWeightToKg = (weightStr) => {
    if (!weightStr) return 1;
    const str = String(weightStr).toLowerCase().trim();
    const numMatch = str.match(/([0-9]+(?:[\.,][0-9]+)?)/);
    if (!numMatch) return 1;
    const num = parseFloat(numMatch[1].replace(',', '.'));
    if (str.includes('kg') || str.includes('kilo')) return num;
    if (str.includes('g') || str.includes('gr') || str.includes('ml')) return num / 1000;
    return num;
  };

  // Kilos reales de dietas para la meta de 10 kg de suscripción
  const totalDietKilos = items
    .filter(item => item.type !== 'snack')
    .reduce((sum, item) => sum + (parseWeightToKg(item.weight) * item.quantity), 0);

  const totalKilos = totalDietKilos;

  const MIN_PURCHASE = 30000;
  const isMinMet = total >= MIN_PURCHASE;
  const missingForMin = Math.max(0, MIN_PURCHASE - total);

  React.useEffect(() => {
    if (totalKilos < 10 && isSubscription) {
      setIsSubscription(false);
    }
  }, [totalKilos, isSubscription]);

  const handleCheckout = () => {
    if (items.length === 0 || !isMinMet) return;
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
                        <p className="text-gray-500 text-sm">
                          ${item.price.toLocaleString('es-CL')} {item.weight ? `/ ${item.weight}` : ''}
                        </p>
                        
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

                  {productsToSuggest.length > 0 && (
                    <div className="mt-8 pt-6 border-t">
                      <h3 className="font-bold text-gray-800 mb-4">¿Te gustaría agregar algo más?</h3>
                      <div className="space-y-3">
                        {productsToSuggest.map(product => (
                          <div key={product.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                            <div>
                              <h5 className="font-bold text-sm text-secondary-brown">{product.name}</h5>
                              <p className="text-xs text-gray-500">
                                ${product.price.toLocaleString('es-CL')} {product.weight ? `· ${product.weight}` : ''}
                              </p>
                            </div>
                            <button 
                              onClick={() => addItem(product)} 
                              className="bg-primary-green text-white px-3 py-1 text-sm rounded hover:bg-primary-green-dark transition"
                            >
                              Agregar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {items.length > 0 && (
              <div className="border-t p-4 bg-gray-50">
                {totalKilos >= 10 ? (
                  <div className={`p-3.5 rounded-2xl mb-4 border transition-all ${
                    isSubscription 
                      ? 'bg-emerald-50/90 border-primary-green shadow-xs' 
                      : 'bg-primary-cream/40 border-primary-green/30 hover:border-primary-green/50'
                  }`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-5 h-5 accent-primary-green cursor-pointer rounded"
                        checked={isSubscription}
                        onChange={(e) => setIsSubscription(e.target.checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-sm text-primary-green-dark flex items-center gap-1.5">
                            <RefreshCw size={15} className={`text-primary-green ${isSubscription ? 'animate-spin-slow' : ''}`} />
                            Suscribirme a entrega mensual con este pedido
                          </span>
                          <span className="bg-primary-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                            10% OFF + Envío Gratis
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 font-medium">
                          Recibe este mismo pedido automáticamente cada 30 días sin preocuparte de volver a comprar.
                        </p>
                      </div>
                    </label>

                    {/* Explicación transparente de la mensualidad */}
                    <div className="mt-3 pt-2.5 border-t border-primary-green/20 text-xs text-gray-700 bg-white/70 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 font-bold text-primary-green-dark mb-1">
                        <Info size={14} className="text-primary-green shrink-0" />
                        <span>¿Cómo funciona tu suscripción mensual?</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-gray-600">
                        Usted se está suscribiendo a una mensualidad donde se le avisará previamente por WhatsApp para coordinar el despacho del pedido y se generará el cobro correspondiente con su 10% de descuento y despacho gratis garantizados.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 pt-1.5 border-t border-gray-100 mt-1.5">
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 size={12} className="text-primary-green" /> Sin contratos ni ataduras
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 size={12} className="text-primary-green" /> Pausa o cancela cuando quieras
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100/90 p-3.5 rounded-2xl mb-4 border border-gray-200">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-gray-700 flex items-center gap-1.5">
                        <RefreshCw size={14} className="text-gray-400" /> Suscripción Mensual Recurrente
                      </span>
                      <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Desde 10 kg
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Agrega al menos <strong>10 kg</strong> de comida a tu carrito (actualmente tienes <strong>{totalKilos % 1 === 0 ? totalKilos : totalKilos.toFixed(1)} kg</strong>) para activar despachos automáticos cada mes con <strong>10% de descuento y despacho gratis</strong>.
                    </p>
                  </div>
                )}
                
                {/* Desglose de Descuentos (NFC o 1ra Compra) */}
                {!isSubscription && (nfcDiscount > 0 || firstOrderDiscount > 0) && (
                  <div className="mb-3 space-y-1.5 text-xs font-body">
                    {nfcDiscount > 0 ? (
                      <div className="flex justify-between font-bold text-[#677333] bg-[#677333]/10 px-2.5 py-1.5 rounded-xl">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={13} /> Descuento Comunidad ({nfcCommunity?.discount_percent}%):
                        </span>
                        <span>-${nfcDiscount.toLocaleString('es-CL')}</span>
                      </div>
                    ) : firstOrderDiscount > 0 ? (
                      <div className="flex justify-between font-bold text-[#677333] bg-[#677333]/10 px-2.5 py-1.5 rounded-xl">
                        <span className="flex items-center gap-1.5">
                          <Gift size={13} /> Descuento 1ra Compra ({firstOrderPromo?.percent}%):
                        </span>
                        <span>-${firstOrderDiscount.toLocaleString('es-CL')}</span>
                      </div>
                    ) : null}
                  </div>
                )}
                
                {/* Barra y Alerta de Compra Mínima ($30.000) */}
                {!isMinMet && (
                  <div className="mb-3.5 p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1.5 font-body">
                      <span>Mínimo de compra: $30.000</span>
                      <span className="text-[#c64a4c]">Faltan ${missingForMin.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="w-full bg-amber-200/50 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#db994b] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((total / MIN_PURCHASE) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1.5 font-body leading-tight">
                      Para asegurar una entrega óptima y mantener la cadena de frío, el pedido mínimo es de $30.000 CLP.
                    </p>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg mb-4 font-display">
                  <span>Total estimado:</span>
                  <div className="text-right">
                    {isSubscription ? (
                      <>
                        <span className="line-through text-gray-400 text-sm mr-2">${total.toLocaleString('es-CL')}</span>
                        <span className="text-[#677333]">${Math.round(total * 0.9).toLocaleString('es-CL')}</span>
                      </>
                    ) : (nfcDiscount > 0 || firstOrderDiscount > 0) ? (
                      <>
                        <span className="line-through text-gray-400 text-sm mr-2">${total.toLocaleString('es-CL')}</span>
                        <span className="text-[#677333]">${Math.max(0, total - (nfcDiscount > 0 ? nfcDiscount : firstOrderDiscount)).toLocaleString('es-CL')}</span>
                      </>
                    ) : (
                      <span>${total.toLocaleString('es-CL')}</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={!isMinMet}
                  className={`w-full font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 font-body text-base ${
                    isMinMet 
                      ? 'bg-secondary-orange text-white hover:bg-[#d65d21] shadow-md hover:shadow-lg cursor-pointer' 
                      : 'bg-stone-200 text-stone-500 cursor-not-allowed opacity-80'
                  }`}
                >
                  {isMinMet ? (
                    'Ir al Pago'
                  ) : (
                    `Mínimo $30.000 (Faltan $${missingForMin.toLocaleString('es-CL')})`
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <CheckoutModal 
      isOpen={isCheckoutOpen} 
      onClose={() => setIsCheckoutOpen(false)} 
      onBack={() => {
        setIsCheckoutOpen(false);
        setIsCartOpen(true);
      }}
      isSubscription={isSubscription} 
    />
    </>
  );
};

export default CartDrawer;
