import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, Beef, Soup, ArrowRight } from 'lucide-react';
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
  const [weight, setWeight] = useState(14); // Peso en kg
  const [lifeStage, setLifeStage] = useState('barf_adult_normal');
  const [percentages, setPercentages] = useState(DEFAULT_PERCENTAGES);

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

  // Manejar cambio manual del peso (rango 1 a 90 kg)
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

  // Mapeo proporcional exacto entre Peso y Posición del Slider (0% a 100%)
  // Garantiza que 2kg esté en 0%, 8kg en 25%, 15kg en 50%, 30kg en 75% y 50kg en 100%
  const sliderPercent = useMemo(() => {
    const w = parseFloat(weight) || 0;
    if (w <= 2) return 0;
    if (w <= 8) return ((w - 2) / (8 - 2)) * 25;
    if (w <= 15) return 25 + ((w - 8) / (15 - 8)) * 25;
    if (w <= 30) return 50 + ((w - 15) / (30 - 15)) * 25;
    if (w <= 50) return 75 + ((w - 30) / (50 - 30)) * 25;
    return 100;
  }, [weight]);

  const handleSliderDrag = (pctValue) => {
    const p = Math.max(0, Math.min(100, parseFloat(pctValue) || 0));
    let w;
    if (p <= 25) {
      w = 2 + (p / 25) * 6;
    } else if (p <= 50) {
      w = 8 + ((p - 25) / 25) * 7;
    } else if (p <= 75) {
      w = 15 + ((p - 50) / 25) * 15;
    } else {
      w = 30 + ((p - 75) / 25) * 20;
    }
    setWeight(Math.round(w * 10) / 10);
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
  const estimatedCostPerPouch = 3600;
  const rawTotal = pouchesNeeded * estimatedCostPerPouch;
  const discountedTotal = Math.round(rawTotal * 0.85);

  const isPuppySelected = lifeStage.includes('puppy');

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

            {/* Layout Principal 2 Columnas */}
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

                  {/* Slider Interactivo con alineación matemática exacta a las etiquetas */}
                  <div className="relative py-4 select-none">
                    {/* Track de fondo */}
                    <div className="relative w-full h-3 bg-[#F4E9DC] rounded-full overflow-hidden">
                      {/* Barra de progreso verde */}
                      <div 
                        className="h-full bg-primary-green rounded-full transition-all duration-75"
                        style={{ width: `calc(12px + (100% - 24px) * ${(sliderPercent / 100).toFixed(4)})` }}
                      />
                    </div>

                    {/* Thumb indicador verde con borde blanco - alineado al milímetro con las etiquetas */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary-green border-[3.5px] border-white shadow-md pointer-events-none transition-all duration-75 z-10"
                      style={{ left: `calc(12px + (100% - 24px) * ${(sliderPercent / 100).toFixed(4)})` }}
                    />

                    {/* Input range nativo sobrepuesto para arrastre táctil y con mouse */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={sliderPercent}
                      onChange={(e) => handleSliderDrag(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                  </div>

                  {/* Referencias visuales directamente alineadas debajo del slider */}
                  <div className="relative w-full h-6 text-[11px] sm:text-xs font-semibold text-gray-500 pt-1">
                    <button 
                      type="button" 
                      onClick={() => handleWeightChange(2)}
                      className={`absolute left-0 transition hover:text-primary-green ${validWeight <= 4 ? 'text-primary-green font-bold' : ''}`}
                    >
                      Toy (2 kg)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleWeightChange(8)}
                      style={{ left: 'calc(12px + (100% - 24px) * 0.25)' }}
                      className={`absolute -translate-x-1/2 transition hover:text-primary-green whitespace-nowrap ${validWeight > 4 && validWeight <= 10 ? 'text-primary-green font-bold' : ''}`}
                    >
                      Pequeño (8 kg)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleWeightChange(15)}
                      className={`absolute left-1/2 -translate-x-1/2 transition hover:text-primary-green whitespace-nowrap ${validWeight > 10 && validWeight <= 25 ? 'text-primary-green font-bold' : ''}`}
                    >
                      Mediano (15 kg)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleWeightChange(30)}
                      style={{ left: 'calc(12px + (100% - 24px) * 0.75)' }}
                      className={`absolute -translate-x-1/2 transition hover:text-primary-green whitespace-nowrap ${validWeight > 25 && validWeight <= 45 ? 'text-primary-green font-bold' : ''}`}
                    >
                      Grande (30 kg)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleWeightChange(50)}
                      className={`absolute right-0 transition hover:text-primary-green whitespace-nowrap ${validWeight > 45 ? 'text-primary-green font-bold' : ''}`}
                    >
                      Gigante (50+ kg)
                    </button>
                  </div>
                </div>

                {/* 2. Etapa de Vida y Estilo */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EFE3D5] shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="w-7 h-7 rounded-full bg-secondary-orange/15 text-secondary-orange font-bold text-sm flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <label className="font-header text-lg text-secondary-brown font-bold block">
                        Etapa de vida y estilo de vida
                      </label>
                      <span className="text-xs text-gray-500 font-medium">
                        Selecciona solo una opción (Cachorros por edad o Adultos por actividad)
                      </span>
                    </div>
                  </div>

                  {dietType === 'barf' ? (
                    <div className="space-y-5">
                      {/* Sección 1: Cachorros BARF (Título en Negro, Destacado) */}
                      <div className={`p-4 rounded-2xl border-2 transition-all ${
                        isPuppySelected 
                          ? 'bg-[#FAF7F2] border-primary-green shadow-sm' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🍼</span>
                            <h4 className="text-sm sm:text-base font-black text-black uppercase tracking-wide">
                              Cachorros en Crecimiento (2 a 12 Meses)
                            </h4>
                          </div>
                          {isPuppySelected && (
                            <span className="text-[11px] font-extrabold bg-primary-green text-white px-2.5 py-0.5 rounded-full shadow-sm">
                              ✓ Seleccionado
                            </span>
                          )}
                        </div>

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
                                    ? 'border-primary-green bg-primary-green/15 shadow-sm ring-2 ring-primary-green font-bold'
                                    : 'border-gray-200 hover:border-primary-green/40 bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-black font-extrabold' : 'text-secondary-brown'}`}>
                                    {stage.label}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-primary-green bg-white px-1.5 py-0.5 rounded shadow-sm">
                                    {pct}%
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1 leading-tight">
                                  {stage.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sección 2: Adultos BARF (Título en Negro, Destacado) */}
                      <div className={`p-4 rounded-2xl border-2 transition-all ${
                        !isPuppySelected 
                          ? 'bg-[#FAF7F2] border-primary-green shadow-sm' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🐕</span>
                            <h4 className="text-sm sm:text-base font-black text-black uppercase tracking-wide">
                              Adultos & Senior (Más de 1 Año)
                            </h4>
                          </div>
                          {!isPuppySelected && (
                            <span className="text-[11px] font-extrabold bg-primary-green text-white px-2.5 py-0.5 rounded-full shadow-sm">
                              ✓ Seleccionado
                            </span>
                          )}
                        </div>

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
                                    ? 'border-primary-green bg-primary-green/15 shadow-sm ring-2 ring-primary-green font-bold'
                                    : 'border-gray-200 hover:border-primary-green/40 bg-white'
                                }`}
                              >
                                <div className="text-xl mb-1">{stage.icon}</div>
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-bold ${isSelected ? 'text-black font-extrabold' : 'text-secondary-brown'}`}>
                                    {stage.title}
                                  </span>
                                  <span className="text-xs font-extrabold text-primary-green">
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
                    /* Comida Cocinada al Vapor */
                    <div className="space-y-5">
                      <div className={`p-4 rounded-2xl border-2 transition-all ${
                        isPuppySelected 
                          ? 'bg-[#FAF7F2] border-primary-green shadow-sm' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🍼</span>
                            <h4 className="text-sm sm:text-base font-black text-black uppercase tracking-wide">
                              Cachorros Cocinada (2 a 12 Meses)
                            </h4>
                          </div>
                          {isPuppySelected && (
                            <span className="text-[11px] font-extrabold bg-primary-green text-white px-2.5 py-0.5 rounded-full shadow-sm">
                              ✓ Seleccionado
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_puppy_small')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_puppy_small'
                                ? 'border-primary-green bg-primary-green/15 ring-2 ring-primary-green font-bold'
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
                                ? 'border-primary-green bg-primary-green/15 ring-2 ring-primary-green font-bold'
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

                      <div className={`p-4 rounded-2xl border-2 transition-all ${
                        !isPuppySelected 
                          ? 'bg-[#FAF7F2] border-primary-green shadow-sm' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🐕</span>
                            <h4 className="text-sm sm:text-base font-black text-black uppercase tracking-wide">
                              Adultos & Senior Cocinada (Más de 1 Año)
                            </h4>
                          </div>
                          {!isPuppySelected && (
                            <span className="text-[11px] font-extrabold bg-primary-green text-white px-2.5 py-0.5 rounded-full shadow-sm">
                              ✓ Seleccionado
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_adult_low')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_adult_low'
                                ? 'border-primary-green bg-primary-green/15 ring-2 ring-primary-green font-bold'
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
                                ? 'border-primary-green bg-primary-green/15 ring-2 ring-primary-green font-bold'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-secondary-brown">Actividad Normal</span>
                              <span className="text-xs font-bold text-primary-green">{percentages.cooked_adult_normal}%</span>
                            </div>
                            <span className="text-xs text-gray-500">Paseos diarios (2.5%)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLifeStage('cooked_adult_high')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              lifeStage === 'cooked_adult_high'
                                ? 'border-primary-green bg-primary-green/15 ring-2 ring-primary-green font-bold'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-secondary-brown">Actividad Alta</span>
                              <span className="text-xs font-bold text-primary-green">{percentages.cooked_adult_high}%</span>
                            </div>
                            <span className="text-xs text-gray-500">Perros deportistas (3.5%)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Tarjeta de Ración Óptima Limpia y Enfocada (5 columnas) */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-[#FBF5EC] rounded-3xl p-6 sm:p-7 border border-[#ECDCC9] shadow-md relative">
                
                <div>
                  {/* Título de la tarjeta */}
                  <p className="text-secondary-brown/70 font-semibold text-sm mb-1 uppercase tracking-wider">
                    Tu Ración Diaria Óptima:
                  </p>

                  {/* Ración Diaria Óptima en grande */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <motion.span
                      key={dailyGrams}
                      initial={{ scale: 0.95, opacity: 0 }}
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
                    (Servir en <strong className="text-secondary-brown font-bold">2 tomas de {gramsPerMeal}g</strong> {dietType === 'barf' ? 'directamente descongelado' : 'a temperatura ambiente'})
                  </p>
                </div>

                {/* Precios y Botón CTA Final */}
                <div className="pt-6 border-t border-[#ECDCC9]">
                  <div className="flex items-baseline gap-2.5 mb-1">
                    <span className="font-header text-3xl sm:text-4xl font-extrabold text-secondary-brown">
                      ${discountedTotal.toLocaleString('es-CL')} CLP
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-6">
                    Plan mensual sugerido ({pouchesNeeded} pouches al vacío de 500g • entrega cada 28 días)
                  </p>

                  <button
                    onClick={handleApplyAndShop}
                    className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold text-base py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 group"
                  >
                    <span>Personalizar Plan de mi Perro 🐾</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
                  </button>

                  <p className="text-[11px] text-center text-gray-500 mt-3">
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