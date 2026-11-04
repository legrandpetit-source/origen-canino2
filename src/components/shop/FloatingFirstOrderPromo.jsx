import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Gift, ArrowRight, Tag, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCustomer } from '../../context/CustomerContext';

export default function FloatingFirstOrderPromo() {
  const { customer, orders } = useCustomer();
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Si ya compró según localStorage, no mostrar
    const hasPurchased = localStorage.getItem('origencanino_has_purchased');
    if (hasPurchased === 'true') {
      setLoading(false);
      return;
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

  // Animación de confeti llamativo por 12 segundos detrás del recuadro
  useEffect(() => {
    if (loading || !promo || !promo.enabled || isDismissed || isMinimized) return;

    const duration = 12 * 1000; // 12 segundos
    const animationEnd = Date.now() + duration;

    // Disparo inicial de celebración
    try {
      confetti({
        particleCount: 45,
        angle: 125,
        spread: 65,
        origin: { x: 0.88, y: 0.88 },
        colors: ['#db994b', '#f4a261', '#e9c46a', '#677333', '#ffffff'],
        zIndex: 38,
        disableForReducedMotion: true
      });
    } catch (e) {
      console.warn("Confetti init error:", e);
    }

    // Ráfagas suaves intermitentes durante los 12 segundos
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      try {
        confetti({
          particleCount: 20,
          angle: 110 + Math.random() * 35,
          spread: 55,
          origin: { x: 0.88, y: 0.88 },
          colors: ['#db994b', '#f4a261', '#e9c46a', '#677333', '#ffffff'],
          zIndex: 38,
          disableForReducedMotion: true,
          scalar: 0.85
        });
      } catch {
        clearInterval(interval);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [loading, promo, isDismissed, isMinimized]);

  // Si el cliente está logueado y ya tiene órdenes registradas, ocultar
  if (customer && orders && orders.length > 0) {
    return null;
  }

  // Si no está habilitado o no ha cargado o fue cerrado por completo en esta vista
  if (loading || !promo || !promo.enabled || isDismissed) {
    return null;
  }

  const codeToUse = promo.code || 'BIENVENIDO10';

  const handleCopyCode = (e) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(codeToUse);
      localStorage.setItem('origencanino_coupon_code', codeToUse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Error al copiar cupón:", err);
    }
  };

  const handleScrollToCatalog = () => {
    // También guardamos el cupón para que se aplique en el checkout automáticamente
    localStorage.setItem('origencanino_coupon_code', codeToUse);
    const catalogElement = document.getElementById('catalogo') || document.getElementById('productos');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 900, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed bottom-5 right-4 md:right-6 z-40 max-w-sm">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Chip Naranjo */
          <motion.button
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 bg-[#db994b] hover:bg-[#c58235] text-white px-4 py-2.5 rounded-full shadow-2xl border-2 border-white transition transform hover:scale-105 font-body cursor-pointer"
            title="Ver descuento de bienvenida"
          >
            <Sparkles size={16} className="text-white animate-spin-slow" />
            <span className="font-extrabold text-xs tracking-wider">
              {promo.percent}% OFF 1RA COMPRA
            </span>
          </motion.button>
        ) : (
          /* Full Floating Card Naranja / Honey */
          <motion.div
            key="expanded"
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-[#db994b]/30 overflow-hidden"
          >
            {/* Glow decorativo de fondo en tono naranjo */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#db994b]/15 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

            {/* Botones de Minimizar y Cerrar (Cerrar minimiza para que el usuario no pierda su cupón) */}
            <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
              <button
                onClick={() => setIsMinimized(true)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition text-xs font-bold leading-none cursor-pointer"
                title="Minimizar a botón flotante"
              >
                _
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                title="Minimizar cupón"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-start gap-3.5 pr-8 relative z-10">
              {/* Badge Naranjo Miel con % */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#db994b] to-[#c58235] text-white flex flex-col items-center justify-center font-display font-extrabold shadow-md shrink-0 border border-white/40">
                <span className="text-[9px] leading-tight text-white/90 font-bold uppercase tracking-wide">REGALO</span>
                <span className="text-base leading-none font-black">%{promo.percent}</span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#db994b]/15 text-[#b87528] text-[10px] font-extrabold uppercase tracking-wider mb-1 font-body">
                  <Gift size={11} /> Nuevo Cliente
                </div>
                <h4 className="font-extrabold text-[#3c2716] text-sm md:text-base font-display leading-snug">
                  {promo.title || `¡${promo.percent}% OFF en tu primera compra!`}
                </h4>
                <p className="text-stone-500 text-xs font-body mt-1 leading-relaxed">
                  {promo.description || 'Descuento automático o con cupón al pagar tu pedido.'}
                </p>
              </div>
            </div>

            {/* CTA Action con Botón Copiar */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 relative z-10">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#b87528] bg-[#db994b]/10 hover:bg-[#db994b]/20 border border-[#db994b]/30 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                title="Hacer clic para copiar el código"
              >
                <Tag size={12} className="text-[#db994b]" />
                <span>{codeToUse}</span>
                {copied ? (
                  <span className="text-emerald-600 font-sans text-[11px] font-bold flex items-center gap-0.5 ml-1">
                    <Check size={13} /> ¡Copiado!
                  </span>
                ) : (
                  <span className="text-stone-400 hover:text-stone-600 ml-1 flex items-center gap-0.5 text-[10px] font-sans font-semibold">
                    <Copy size={11} /> Copiar
                  </span>
                )}
              </button>

              <button
                onClick={handleScrollToCatalog}
                className="bg-[#db994b] hover:bg-[#c58235] active:scale-95 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs font-body transition flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
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
