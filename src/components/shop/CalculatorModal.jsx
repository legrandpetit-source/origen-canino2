import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, CheckCircle2, Sparkles, ShieldCheck, Heart, Beef, Soup, ArrowRight, Info, Flame, Smile } from 'lucide-react';
import { useCart } from '../../context/CartContext';

// Valores por defecto de la Tabla Médica Oficial (Captura 2)
const DEFAULT_PERCENTAGES = {
  // BARF
  barf_puppy_2_4: 10.0,
  barf_puppy_4_6: 8.0,
  barf_puppy_6_8: 6.0,
  barf_puppy_8_10: 4.0,
  barf_puppy_10_12: 3.0,
  barf_adult_normal: 3.0,
  barf_adult_medium: 2.5,
  barf_adult_low: 2.0,
  // Cocinada
  cooked_puppy_small: 8.0,
  cooked_puppy_large: 5.0,
  cooked_adult_low: 2.0,
  cooked_adult_normal: 2.5,
  cooked_adult_high: 3.5,
};

const CalculatorModal = ({ isOpen, onClose }) => {
  const { dogData, setDogData } = useCart();
  
  // Estado local
  const [dietType, setDietType] = useState('barf'); // 'barf' o 'cocinada'
  const [weight, setWeight] = useState(14); // Peso en kg (default 14kg como en Captura 1)
  const [lifeStage, setLifeStage] = useState('barf_adult_normal');
  const [percentages, setPercentages] = useState(DEFAULT_PERCENTAGES);
  const [isEditingWeight, setIsEditingWeight] = useState(false);

  // Cargar porcentajes actualizados desde el backend
  useEffect(() => {
    fetch('/api/calculator/settings')
      .then(res => {
        if (!res.ok) throw new Error('Error status ' + res.status);
        return res.json();
      })
      .then(data => {
        if (data && typeof data === 'object') {
          setPercentages(prev => ({ ...prev, ...data }));
        }
      })
      .catch(err => console.log('Usando porcentajes médicos locales:', err));
  }, []);

  // Sincronizar etapa al cambiar de dieta
  const handleDietChange = (newDiet) => {
    setDietType(newDiet);
    if (newDiet === 'barf') {
      if (!lifeStage.startsWith('barf_')) {
        setLifeStage('barf_adult_normal');
      }
    } else {
      if (!lifeStage.startsWith('cooked_')) {
        setLifeStage('cooked_adult_normal');
      }
    }
  };

  // Manejar cambio manual o por slider del peso (rango 1 a 60 kg)
  const handleWeightChange = (newVal) => {
    let parsed = parseFloat(newVal);
    if (isNaN(parsed)) {
      setWeight('');
      return;
    }
    if (parsed < 0) parsed = 0;
    if (parsed > 90) parsed = 90;
    setWeight(parsed);
  };

  // Descriptores de categoría de peso
  const weightCategory = useMemo(() => {
    const w = parseFloat(weight) || 0;
    if (w <= 4) return { name: 'Toy', label: 'Toy Dulce', icon: '🐾' };
    if (w <= 10) return { name: 'Pequeño', label: 'Pequeño Aventurero', icon: '🐶' };
    if (w <= 25) return { name: 'Mediano', label: 'Mediano Juguetón', icon: '🐕' };
    if (w <= 45) return { name: 'Grande', label: 'Grande Bondadoso', icon: '🦮' };
    return { name: 'Gigante', label: 'Gigante Noble', icon: '🦁' };
  }, [weight]);

  // Cálculo en tiempo real de la ración diaria (gramos)
  const currentPercentage = percentages[lifeStage] || (dietType === 'barf' ? 3.0 : 2.5);
  const validWeight = parseFloat(weight) || 0;
  const dailyGrams = Math.round((validWeight * 1000) * (currentPercentage / 100));
  const gramsPerMeal = Math.round(dailyGrams / 2);

  // Estimación mensual para 28 días (packs de 500g)
  const monthlyGrams = dailyGrams * 28;
  const pouchesNeeded = Math.max(1, Math.ceil(monthlyGrams / 500));
  const estimatedCostPerPouch = 3600; // Valor de referencia promedio
  const rawTotal = pouchesNeeded * estimatedCostPerPouch;
  const discountedTotal = Math.round(rawTotal * 0.85); // 15% OFF primera suscripción

  // Guardar en el contexto y continuar a la tienda
  const handleApplyAndShop = () => {
    setDogData(prev => ({
      ...prev,
      weight: validWeight,
      dietType: dietType,
      age: lifeStage,
      dailyGrams: dailyGrams,
      pouchesNeeded: pouchesNeeded
    }));
    onClose();
    const tienda = document.getElementById('tienda');
    if (tienda) {
      tienda.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop con desenfoque suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-secondary-brown/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 25 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#FFFDF9] rounded-3xl sm:rounded-[2rem] shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden border border-[#EFE3D5] my-auto"
          >
            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-secondary-brown p-2 rounded-full hover:bg-gray-100 transition z-20"
              title="Cerrar calculadora"
            >
              <X size={22} />
            </button>

            {/* Header del Modal */}
            <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-3">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="bg-primary-green/10 text-primary-green font-bold text-xs px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                  <Calculator size={14} /> Calculadora de Ración Canina
                </span>
                <span className="bg-amber-100/70 text-amber-900 font-semibold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck size={13} className="text-secondary-orange" /> Referencia Médica Veterinaria
                </span>
              </div>
              <h2 className="font-header text-2xl sm:text-3xl text-secondary-brown m-0 leading-tight">
                Diseña la Porción Diaria Perfecta para tu Perro
              </h2>
            </div>

            {/* Selector de Tipo de Alimentación (Pills Superiores) */}
            <div className="px-6 sm:px-8 pt-2 pb-4">
              <div className="inline-flex p-1.5 bg-[#F6EFE6] rounded-2xl w-full sm:w-auto gap-1 border border-[#E9DEC6]">
                <button
                  type="button"
                  onClick={() => handleDietChange('barf')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    dietType === 'barf'
                      ? 'bg-primary-green text-white shadow-md'
                      : 'text-secondary-brown hover:text-primary-green font-medium'
                  }`}
                >
                  <Beef size={18} />
                  Dieta BARF (Cruda)
                </button>
                <button
                  type="button"
                  onClick={() => handleDietChange('cocinada')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    dietType === 'cocinada'
                      ? 'bg-secondary-brown text-white shadow-md'
                      : 'text-secondary-brown hover:text-secondary-brown-light font-medium'
                  }`}
                >
                  <Soup size={18} />
                  Comida Cocinada al Vapor
                </button>
              </div>
            </div>

            {/* Layout Principal 2 Columnas (Inspirado en Captura 1) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 pt-0">
              
              {/* Columna Izquierda: Parámetros del perro (7 columnas) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Peso actual de tu peludo */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EFE3D5] shadow-sm">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-secondary-orange/15 text-secondary-orange font-bold text-sm flex items-center justify-center">
                        1
                      </span>
                      <label className="font-header text-lg text-secondary-brown font-bold">
                        Peso actual de tu peludo
                      </label>
                    </div>

                    {/* Badge / Input manual editable (Sincronizado) */}
                    <div className="flex items-center gap-1.5 bg-[#FAF4EB] border border-[#E9DEC6] px-3 py-1.5 rounded-xl shadow-inner">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="90"
                        value={weight}
                        onChange={(e) => handleWeightChange(e.target.value)}
                        className="w-14 text-right font-header text-lg font-bold text-secondary-brown bg-transparent outline-none border-b border-primary-green focus:border-secondary-orange"
                        placeholder="14"
                        title="Puedes escribir el peso exacto manualmente aquí"
                      />
                      <span className="font-bold text-sm text-secondary-brown">kg</span>
                      <span className="text-xs text-secondary-brown-light/80 hidden sm:inline border-l border-gray-300 pl-1.5">
                        {weightCategory.label}
                      </span>
                    </div>
                  </div>

                  {/* Slider Interactivo (Con puntito verde que se mueve proporcionalmente) */}
                  <div className="py-2">
                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="0.5"
                      value={validWeight || 1}
                      onChange={(e) => handleWeightChange(e.target.value)}
                      className="w-full h-2.5 bg-[#F4E9DC] rounded-lg appearance-none cursor-pointer accent-primary-green"
                    />
                  </div>

                  {/* Referencias visuales debajo del slider (como en Captura 1) */}
                  <div className="flex justify-between text-[11px] sm:text-xs text-gray-500 font-medium pt-1 px-1">
                    <button type="button" onClick={() => handleWeightChange(2)} className="hover:text-primary-green transition">
                      Toy (2 kg)
                    </button>
                    <button type="button" onClick={() => handleWeightChange(8)} className="hover:text-primary-green transition">
                      Pequeño (8 kg)
                    </button>
                    <button type="button" onClick={() => handleWeightChange(15)} className="hover:text-primary-green transition">
                      Mediano (15 kg)
                    </button>
                    <button type="button" onClick={() => handleWeightChange(30)} className="hover:text-primary-green transition">
                      Grande (30 kg)
                    </button>
                    <button type="button" onClick={() => handleWeightChange(50)} className="hover:text-primary-green transition">
                      Gigante (50+ kg)
                    </button>
                  </div>
                </div>

                {/* 2. Etapa de Vida y Estilo (Dividido según Captura 2) */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EFE3D5] shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="w-7 h-7 rounded-full bg-secondary-orange/15 text-secondary-orange font-bold text-sm flex items-center justify-center">
                      2
                    </span>
                    <label className="font-header text-lg text-secondary-brown font-bold">
                      Etapa de vida y estilo de vida
                    </label>
                  </div>

                  {dietType === 'barf' ? (
                    /* Opciones Médicas Oficiales para Dieta BARF (Captura 2) */
                    <div className="space-y-4">
                      {/* Cachorros BARF */}
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                          Cachorros en Crecimiento (2 a 12 Meses)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'barf_puppy_2_4', label: '2 a 4 Meses', pctKey: 'barf_puppy_2_4', desc: 'Destete & Crecimiento veloz' },
                            { id: 'barf_puppy_4_6', label: '4 a 6 Meses', pctKey: 'barf_puppy_4_6', desc: 'Desarrollo muscular' },
                            { id: 'barf_puppy_6_8', label: '6 a 8 Meses', pctKey: 'barf_puppy_6_8', desc: 'Fase juvenil activa' },
                            { id: 'barf_puppy_8_10', label: '8 a 10 Meses', pctKey: 'barf_puppy_8_10', desc: 'Consolidación ósea' },
                            { id: 'barf_puppy_10_12', label: '10 a 12 Meses', pctKey: 'barf_puppy_10_12', desc: 'Casi adulto' }
                          ].map((stage) => {
                            const isSelected = lifeStage === stage.id;
                            const pct = percentages[stage.pctKey] || 0;
                            return (
                              <button
                                key={stage.id}
                                type="button"
                                onClick={() => setLifeStage(stage.id)}
                                className={`p-3 rounded-xl border text-left transition-all relative ${
                                  isSelected
                                    ? 'border-primary-green bg-primary-green/10 shadow-sm ring-2 ring-primary-green/30'
                                    : 'border-gray-200 hover:border-primary-green/40 bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs sm:text-sm text-secondary-brown">
                                    {stage.label}
                                  </span>
                                  <span className="text-[11px] font-bold text-primary-green bg-white px-1.5 py-0.5 rounded shadow-sm">
                                    {pct}%
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 block mt-1 leading-tight">
                                  {stage.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Adultos BARF */}
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                          Adultos & Senior (1+ Años)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {[
                            {
                              id: 'barf_adult_normal',
                              title: 'Actividad Normal',
                              pctKey: 'barf_adult_normal',
                              desc: 'Paseos diarios activos (3%)',
                              icon: '⚡'
                            },
                            {
                              id: 'barf_adult_medium',
                              title: 'Actividad Media',
                              pctKey: 'barf_adult_medium',
                              desc: 'Vida en casa / paseo moderado (2.5%)',
                              icon: '🏡'
                            },
                            {
                              id: 'barf_adult_low',
                              title: 'Actividad Baja',
                              pctKey: 'barf_adult_low',
                              desc: 'Senior (+7 años) o sedentario (2%)',
                              icon: '🛋️'
                            }
                          ].map((stage) => {
                            const isSelected = lifeStage === stage.id;
                            const pct = percentages[stage.pctKey] || 0;
                            return (
                              <button
                                key={stage.id}
                                type="button"
                                onClick={() => setLifeStage(stage.id)}
                                className={`p-3.5 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? 'border-primary-green bg-primary-green/10 shadow-sm ring-2 ring-primary-green/30'
                                    : 'border-gray-200 hover:border-primary-green/40 bg-white'
                                }`}
                              >
                                <div className="text-xl mb-1">{stage.icon}</div>
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm text-secondary-brown">
                                    {stage.title}
                                  </span>
                                  <span className="text-xs font-bold text-primary-green">
                                    {pct}%
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 block mt-0.5">
                                  {stage.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Opciones para Comida Cocinada al Vapor */
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                          Cachorros Cocinada
                        </span>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_puppy_small')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_puppy_small'
                                ? 'border-primary-green bg-primary-green/10 ring-2 ring-primary-green/30'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-secondary-brown">Cachorro Pequeño</span>
                              <span className="text-xs font-bold text-primary-green">{percentages.cooked_puppy_small}%</span>
                            </div>
                            <span className="text-xs text-gray-500">2 a 6 meses</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_puppy_large')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_puppy_large'
                                ? 'border-primary-green bg-primary-green/10 ring-2 ring-primary-green/30'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-secondary-brown">Cachorro Grande</span>
                              <span className="text-xs font-bold text-primary-green">{percentages.cooked_puppy_large}%</span>
                            </div>
                            <span className="text-xs text-gray-500">6 a 12 meses</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                          Adultos & Senior Cocinada
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_adult_low')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_adult_low'
                                ? 'border-primary-green bg-primary-green/10 ring-2 ring-primary-green/30'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-secondary-brown">Baja / Senior</span>
                              <span className="text-xs font-bold text-primary-green">{percentages.cooked_adult_low}%</span>
                            </div>
                            <span className="text-xs text-gray-500">Paseos cortos / +7 años</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_adult_normal')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_adult_normal'
                                ? 'border-primary-green bg-primary-green/10 ring-2 ring-primary-green/30'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-secondary-brown">Actividad Normal</span>
                              <span className="text-xs font-bold text-primary-green">{percentages.cooked_adult_normal}%</span>
                            </div>
                            <span className="text-xs text-gray-500">Paseos diarios</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_adult_high')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_adult_high'
                                ? 'border-primary-green bg-primary-green/10 ring-2 ring-primary-green/30'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-secondary-brown">Alta Actividad</span>
                              <span className="text-xs font-bold text-primary-green">{percentages.cooked_adult_high}%</span>
                            </div>
                            <span className="text-xs text-gray-500">Perros deportistas</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Tarjeta de Ración Óptima (Inspirada en Captura 1) (5 columnas) */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-[#FBF5EC] rounded-3xl p-6 sm:p-7 border border-[#ECDCC9] shadow-md relative">
                
                <div>
                  {/* Badges superiores */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="bg-primary-green text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      RECOMENDACIÓN MÉDICA
                    </span>
                    <span className="bg-secondary-orange text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      15% OFF en 1ra Suscripción
                    </span>
                  </div>

                  {/* Ración Diaria Óptima */}
                  <p className="text-secondary-brown/80 font-medium text-sm mb-1">
                    Tu Ración Diaria Óptima:
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <motion.span
                      key={dailyGrams}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="font-header text-5xl sm:text-6xl font-extrabold text-primary-green tracking-tight"
                    >
                      {dailyGrams}
                    </motion.span>
                    <span className="text-xl sm:text-2xl font-bold text-secondary-brown font-header">
                      g / día
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-secondary-brown-light font-medium mb-6">
                    (Servir en <strong className="text-secondary-brown">2 tomas de {gramsPerMeal}g</strong> {dietType === 'barf' ? 'directamente descongelado' : 'a temperatura ambiente'})
                  </p>

                  {/* Checklist de Valor (Captura 1) */}
                  <div className="space-y-3 pt-2 border-t border-[#ECDCC9]/70 mb-6 text-xs sm:text-sm text-secondary-brown">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={18} className="text-primary-green shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-bold">{pouchesNeeded} pouches</strong> al vacío de 500g dosificados ({Math.round(monthlyGrams / 1000)} kg/mes).
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={18} className="text-primary-green shrink-0 mt-0.5" />
                      <span>Entrega en caja isotérmica biodegradable con hielo seco.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={18} className="text-primary-green shrink-0 mt-0.5" />
                      <span>Seguimiento y asistencia vet por WhatsApp gratis.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={18} className="text-primary-green shrink-0 mt-0.5" />
                      <span>Transición guiada paso a paso sin malestar estomacal.</span>
                    </div>
                  </div>
                </div>

                {/* Precios y Botón CTA Final */}
                <div className="pt-4 border-t border-[#ECDCC9]">
                  <div className="flex items-baseline gap-2.5 mb-1">
                    <span className="text-xs text-gray-400 line-through">
                      ${rawTotal.toLocaleString('es-CL')} CLP
                    </span>
                    <span className="font-header text-3xl font-extrabold text-secondary-brown">
                      ${discountedTotal.toLocaleString('es-CL')} CLP
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4">
                    Plan mensual sugerido (entrega programada cada 28 días)
                  </p>

                  <button
                    onClick={handleApplyAndShop}
                    className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold text-base py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 group"
                  >
                    <span>Personalizar Plan de mi Perro 🐾</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
                  </button>

                  <p className="text-[11px] text-center text-gray-500 mt-2.5">
                    Cancela o pausa cuando quieras con un solo clic.
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CalculatorModal;
