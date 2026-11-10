import React, { useState, useEffect, useRef } from 'react';
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
  const canvasRef = useRef(null);
  const confettiInstanceRef = useRef(null);

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

  // Animación de confeti llamativo por 12 segundos estrictamente DETRÁS de la tarjeta
  useEffect(() => {
    if (loading || !promo || !promo.enabled || isDismissed || isMinimized) return;
    if (!canvasRef.current) return;

    let myConfetti = null;
    try {
      myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: false
      });
      confettiInstanceRef.current = myConfetti;
    } catch (e) {
      console.warn("Error creando instancia de canvas-confetti:", e);
      return;
    }

    const duration = 12 * 1000; // 12 segundos
    const animationEnd = Date.now() + duration;

    // Disparo inicial de celebración desde detrás de la tarjeta hacia arriba y a la izquierda
    try {
      myConfetti({
        particleCount: 50,
        angle: 125,
        spread: 75,
        origin: { x: 0.90, y: 0.90 },
        colors: ['#db994b', '#f4a261', '#e9c46a', '#677333', '#ffffff'],
        disableForReducedMotion: true
      });
    } catch (e) {
      console.warn("Confetti init error:", e);
    }

    // Ráfagas continuas suaves durante los 12 segundos
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      try {
        myConfetti({
          particleCount: 22,
          angle: 110 + Math.random() * 35,
          spread: 60,
          origin: { x: 0.90, y: 0.90 },
          colors: ['#db994b', '#f4a261', '#e9c46a', '#677333', '#ffffff'],
          disableForReducedMotion: true,
          scalar: 0.85
        });
      } catch {
        clearInterval(interval);
      }
    }, 1800);

    return () => {
      clearInterval(interval);
      if (myConfetti) {
        try {
          myConfetti.reset();
        } catch {}
      }
    };
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
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error copiando cupón:', err);
    }
  };

  const handleScrollToCatalog = () => {
    localStorage.setItem('origencanino_coupon_code', codeToUse);
    const catalogElement = document.getElementById('catalogo') || document.getElementById('productos');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 900, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Canvas dedicado de confeti: z-30 (físicamente DETRÁS de la tarjeta z-40) */}
      {!isMinimized && !isDismissed && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-30 w-full h-full"
          style={{ width: '100vw', height: '100vh' }}
        />
      )}

      <div className="fixed bottom-5 right-4 md:right-6 z-40 max-w-sm pointer-events-auto">
        <AnimatePresence mode="wait">
          {isMinimized ? (
            /* Minimized Chip Naranjo (Arrastrable con dedo o mouse) */
            <motion.button
              key="minimized"
              drag
              dragMomentum={false}
              dragElastic={0.08}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-2 bg-[#db994b] hover:bg-[#c58235] text-white px-4 py-2.5 rounded-full shadow-2xl border-2 border-white transition transform font-body cursor-grab active:cursor-grabbing select-none touch-none"
              title="Toca para abrir o arrastra con el dedo para mover de lugar"
            >
              <Sparkles size={16} className="text-white animate-spin-slow pointer-events-none shrink-0" />
              <span className="font-extrabold text-xs tracking-wider pointer-events-none whitespace-nowrap">
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

              {/* Botones de Minimizar y Cerrar */}
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
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition text-xs leading-none cursor-pointer"
                  title="Minimizar"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Header con Badge de Descuento Naranja y Título */}
              <div className="flex items-start gap-3 mb-2.5 pr-10">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#db994b] to-[#c58235] text-white flex flex-col items-center justify-center shadow-md shrink-0 border border-white/40">
                  <span className="text-[9px] font-extrabold leading-none opacity-90 uppercase">Regalo</span>
                  <span className="text-sm font-black leading-none mt-0.5">%{promo.percent}</span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#b87624] bg-[#db994b]/10 px-2 py-0.5 rounded-full mb-1">
                    <Sparkles size={10} className="text-[#db994b]" /> Nuevo Cliente
                  </span>
                  <h4 className="font-header font-bold text-base text-stone-800 leading-snug">
                    {promo.title || `¡${promo.percent}% OFF en tu primera compra!`}
                  </h4>
                </div>
              </div>

              {/* Descripción */}
              <p className="text-stone-600 text-xs font-body mb-3 leading-relaxed">
                {promo.description || 'Descuento automático exclusivo para nuevos clientes en su primer pedido.'}
              </p>

              {/* Cupón + Botón Ver Catálogo */}
              <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 bg-stone-50 hover:bg-[#db994b]/10 border border-stone-200 hover:border-[#db994b]/50 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-xs font-mono font-bold text-stone-700 transition group cursor-pointer"
                  title="Copiar código de cupón"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Tag size={12} className="text-[#db994b] shrink-0" />
                    <span className="tracking-wide text-[11px]">{codeToUse}</span>
                  </span>
                  {copied ? (
                    <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-sans font-bold">
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
    </>
  );
}
