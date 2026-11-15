import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, Bell, Clock } from 'lucide-react';
import { parseWeightGrams } from '../../context/CartContext';

const ProductCard = ({ product, addItem }) => {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistSent, setWaitlistSent] = useState(false);

  const unitGrams = parseWeightGrams(product.weight);
  const hasBatchControl = Boolean(product.has_batches);
  const liveGrams = product.stock_disponible_gramos ?? 0;
  const isSoldOut = hasBatchControl && liveGrams < unitGrams;
  const isLowStock = hasBatchControl && !isSoldOut && liveGrams <= 3000;

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!waitlistPhone.trim()) return;
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: product.id, contact_phone: waitlistPhone.trim() })
      });
      if (res.ok) {
        setWaitlistSent(true);
        setShowWaitlist(false);
      }
    } catch (err) {
      console.error('Error registrando lista de espera:', err);
    }
  };
  // Determinar badge según el tipo o nombre
  const getBadge = () => {
    const nameLower = (product.name || '').toLowerCase();
    const typeLower = (product.type || '').toLowerCase();

    if (nameLower.includes('cordero') || nameLower.includes('patagón')) {
      return { text: 'PREMIUM PATAGÓNICO', bg: 'bg-secondary-orange text-white' };
    }
    if (nameLower.includes('salmón') || nameLower.includes('hipoaler')) {
      return { text: 'HIPOALERGÉNICO', bg: 'bg-accent-red text-white' };
    }
    if (nameLower.includes('caluga') || nameLower.includes('colágeno') || nameLower.includes('colageno')) {
      return { text: 'COLÁGENO ARTICULAR', bg: 'bg-[#677333] text-white' };
    }
    if (typeLower === 'snack') {
      return { text: 'SNACK 100% NATURAL', bg: 'bg-[#855026] text-white' };
    }
    if (typeLower === 'cocinada') {
      return { text: 'COCINADA AL VAPOR', bg: 'bg-secondary-orange text-white' };
    }
    return { text: 'BARF FRESCA', bg: 'bg-primary-green text-white' };
  };

  const getBenefit = () => {
    if (product.benefits && product.benefits.length > 0) {
      return product.benefits[0];
    }
    const nameLower = (product.name || '').toLowerCase();
    if (nameLower.includes('vacuno')) return 'Rico en Vitamina A y Omega-3';
    if (nameLower.includes('pollo')) return 'Pelaje ultra brillante y sedoso';
    if (nameLower.includes('cordero')) return 'Ideal para estómagos reactivos';
    if (nameLower.includes('snack') || nameLower.includes('tráquea')) return 'Limpia sarro y fortalece mandíbula';
    return '100% Grado Humano sin aditivos';
  };

  const badge = getBadge();
  const benefit = getBenefit();

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EBE4DA] shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
    >
      <div>
        {/* Contenedor de Imagen con Badges Sobrepuestos */}
        <div className="h-48 sm:h-52 w-full rounded-2xl overflow-hidden relative mb-3.5 bg-[#FAF7F2]">
          <img 
            src={product.image || '/logo.webp'} 
            alt={product.name} 
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.webp';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Badge Superior Izquierdo */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
            <span className={`${isSoldOut ? 'bg-stone-800 text-amber-200' : badge.bg} text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm`}>
              {isSoldOut ? 'Lote semanal agotado' : badge.text}
            </span>
            {isLowStock && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Clock size={10} /> Quedan {(liveGrams / 1000).toFixed(1)} kg
              </span>
            )}
          </div>

          {/* Badge Inferior Derecho (Peso) */}
          <div className="absolute bottom-2.5 right-2.5">
            <span className="bg-white/95 backdrop-blur-xs text-secondary-brown font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg shadow-sm">
              {product.weight || '500g'}
            </span>
          </div>
        </div>

        {/* Título de Producto */}
        <h3 className="font-header text-lg font-bold text-secondary-brown mb-1.5 leading-snug line-clamp-1 group-hover:text-primary-green transition-colors">
          {product.name}
        </h3>

        {/* Descripción */}
        <p className="text-xs text-secondary-brown-light/80 mb-3 line-clamp-2 min-h-[32px] leading-relaxed font-sans">
          {product.description}
        </p>

        {/* Beneficio Destacado con Check */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 mb-4 bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl border border-[#F0EBE3]">
          <Check size={14} className="text-primary-green shrink-0 font-bold" />
          <span className="truncate">{benefit}</span>
        </div>
      </div>

      {/* Fila Inferior de Precio y Agregar al Carrito */}
      <div className="pt-3 border-t border-[#F0EBE3]">
        {isSoldOut ? (
          <div className="space-y-2">
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 leading-snug">
              Procuramos máxima frescura en cada lote semanal. Pronto tendremos nueva producción disponible.
            </p>
            {waitlistSent ? (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                ¡Anotado! Te avisaremos por WhatsApp apenas salga el próximo lote.
              </div>
            ) : showWaitlist ? (
              <form onSubmit={handleWaitlistSubmit} className="flex gap-1.5">
                <input
                  type="tel"
                  required
                  placeholder="Tu WhatsApp +569..."
                  value={waitlistPhone}
                  onChange={(e) => setWaitlistPhone(e.target.value)}
                  className="flex-1 min-w-0 text-xs px-2.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-primary-green"
                />
                <button type="submit" className="bg-primary-green text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0">
                  Avisar
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="font-header text-lg font-extrabold text-stone-400">
                  ${product.price ? product.price.toLocaleString('es-CL') : '0'} <span className="text-xs">CLP</span>
                </span>
                <button
                  onClick={() => setShowWaitlist(true)}
                  className="bg-stone-800 hover:bg-stone-900 text-white font-header font-bold text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Bell size={14} />
                  <span>Avísame próximo lote</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider leading-none mb-1">
                Precio Unidad
              </span>
              <span className="font-header text-xl font-extrabold text-secondary-brown leading-none">
                ${product.price ? product.price.toLocaleString('es-CL') : '0'} <span className="text-xs font-semibold text-gray-500">CLP</span>
              </span>
            </div>

            <button 
              onClick={() => addItem(product)}
              className="bg-primary-green hover:bg-primary-green-dark text-white font-header font-bold text-xs sm:text-sm py-2.5 px-3.5 sm:px-4 rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <ShoppingCart size={15} />
              <span>Agregar</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;
