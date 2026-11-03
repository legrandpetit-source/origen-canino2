import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Gift, ArrowRight, Tag } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';

export default function FloatingFirstOrderPromo() {
  const { customer, orders } = useCustomer();
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Si ya compró según localStorage, no mostrar
    const hasPurchased = localStorage.getItem('origencanino_has_purchased');
    if (hasPurchased === 'true') {
      setLoading(false);
      return;
    }

    // Si ya lo cerró en esta sesión, recordar
    const sessionDismissed = sessionStorage.getItem('origencanino_promo_closed');
    if (sessionDismissed === 'true') {
      setIsDismissed(true);
    }

    // Consultar configuración pública de la promoción
    fetch('/api/promotions/first-order')
      .then(res => res.json())
      .then(data => {
        if (data && data.enabled) {
          setPromo(data);
        }
      })
      .catch(err => console.error('Error cargando promo 1ra compra:', err))
      .finally(() => setLoading(false));
  }, []);

  // Si el cliente está logueado y ya tiene órdenes registradas, ocultar
  if (customer && orders && orders.length > 0) {
    return null;
  }

  // Si no está habilitado o no ha cargado o fue cerrado por completo
  if (loading || !promo || !promo.enabled || isDismissed) {
    return null;
  }

  const handleScrollToCatalog = () => {
    const catalogElement = document.getElementById('catalogo') || document.getElementById('productos');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 900, behavior: 'smooth' });
    }
  };

  const handleClose = () => {
    setIsDismissed(true);
    sessionStorage.setItem('origencanino_promo_closed', 'true');
  };

  return (
    <div className="fixed bottom-5 left-4 md:left-6 z-40 max-w-sm">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Chip */
          <motion.button
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 bg-[#677333] hover:bg-[#56602b] text-white px-4 py-2.5 rounded-full shadow-xl border-2 border-white transition transform hover:scale-105 font-body"
            title="Ver descuento de bienvenida"
          >
            <Sparkles size={16} className="text-[#db994b] animate-spin-slow" />
            <span className="font-extrabold text-xs tracking-wider">
              {promo.percent}% OFF 1RA COMPRA
            </span>
          </motion.button>
        ) : (
          /* Full Floating Card */
          <motion.div
            key="expanded"
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-[#677333]/25 overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#677333]/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

            {/* Close / Minimize buttons */}
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition text-xs font-bold"
                title="Minimizar"
              >
                _
              </button>
              <button
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition"
                title="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-[#677333] text-white flex flex-col items-center justify-center font-display font-extrabold shadow-md shrink-0">
                <span className="text-[10px] leading-tight text-[#db994b] font-bold">REGALO</span>
                <span className="text-base leading-none">%{promo.percent}</span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#677333]/10 text-[#677333] text-[10px] font-extrabold uppercase tracking-wider mb-1 font-body">
                  <Gift size={11} /> Nuevo Cliente
                </div>
                <h4 className="font-extrabold text-[#3c2716] text-sm md:text-base font-display leading-snug">
                  {promo.title || `¡${promo.percent}% OFF en tu primera compra!`}
                </h4>
                <p className="text-stone-500 text-xs font-body mt-1 leading-relaxed">
                  {promo.description || 'Descuento automático aplicado al armar tu pedido.'}
                </p>
              </div>
            </div>

            {/* CTA Action */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#677333] bg-[#677333]/10 px-2.5 py-1 rounded-lg">
                <Tag size={12} /> {promo.code || 'BIENVENIDO10'}
              </div>
              <button
                onClick={handleScrollToCatalog}
                className="bg-[#677333] hover:bg-[#56602b] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs font-body transition flex items-center gap-1.5 shadow-sm hover:shadow"
              >
                Ver Catálogo <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
