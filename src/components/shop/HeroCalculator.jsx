import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Sparkles, Send, CheckCircle2, ArrowRight, ShieldCheck, HeartPulse, Bone, PhoneCall, RefreshCw } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const DEFAULT_PERCENTAGES = {
  puppy: 6.0,
  adult_low: 2.0,
  adult_normal: 2.5,
  adult_high: 3.2,
  senior: 2.0
};

const COMMON_BREEDS = [
  'Mestizo / Quiltro',
  'Bulldog Francés',
  'Poodle / Caniche',
  'Golden Retriever',
  'Pastor Alemán',
  'Dachshund / Salchicha',
  'Labrador',
  'Pug / Carlino',
  'Beagle',
  'Schnauzer'
];

const HEALTH_CONDITIONS = [
  { id: 'ninguna', label: '100% Sano', icon: '✨' },
  { id: 'alergias', label: 'Alergia de piel / Picazón', icon: '🐾' },
  { id: 'digestiva', label: 'Digestión sensible / Heces blandas', icon: '🌱' },
  { id: 'sobrepeso', label: 'Sobrepeso / Sedentario', icon: '⚖️' }
];

const HeroCalculator = () => {
  const { setDogData } = useCart();

  // Form State
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('Mestizo / Quiltro');
  const [stage, setStage] = useState('adult'); // puppy, adult, senior
  const [weight, setWeight] = useState(12);
  const [activity, setActivity] = useState('normal'); // low, normal, high
  const [dietType, setDietType] = useState('barf'); // barf, cocinada
  const [healthCondition, setHealthCondition] = useState('ninguna');

  // Contact capture state
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Cálculos en tiempo real
  const currentPercentage = useMemo(() => {
    if (stage === 'puppy') return DEFAULT_PERCENTAGES.puppy;
    if (stage === 'senior') return DEFAULT_PERCENTAGES.senior;
    if (activity === 'low') return DEFAULT_PERCENTAGES.adult_low;
    if (activity === 'high') return DEFAULT_PERCENTAGES.adult_high;
    return DEFAULT_PERCENTAGES.adult_normal;
  }, [stage, activity]);

  const validWeight = Math.max(1, parseFloat(weight) || 1);
  const dailyGrams = Math.round((validWeight * 1000) * (currentPercentage / 100));
  const gramsPerMeal = Math.round(dailyGrams / 2);
  const monthlyGrams = dailyGrams * 28;
  const monthlyKilos = (monthlyGrams / 1000).toFixed(1);
  const pouchesNeeded = Math.max(1, Math.ceil(monthlyGrams / 500));
  const estimatedCostPerPouch = dietType === 'barf' ? 3600 : 4200;
  const rawTotal = pouchesNeeded * estimatedCostPerPouch;
  const discountedTotal = Math.round(rawTotal * 0.90); // 10% OFF primer pedido
  const transitionPackPrice = 14900;

  // Extraer parámetros UTM de la URL
  const getUtmParams = () => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || ''
    };
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = ownerPhone.replace(/[^\d+]/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Por favor ingresa un número de WhatsApp válido (+569...)');
      return;
    }

    setSubmitting(true);

    const utm = getUtmParams();
    const payload = {
      customer_name: ownerName.trim() || 'Tutor de ' + (dogName || 'perrito'),
      phone: cleanPhone,
      email: ownerEmail.trim() || null,
      dog_name: dogName.trim() || 'Perrito',
      dog_breed: breed,
      dog_age: stage === 'puppy' ? 'Cachorro (<12m)' : stage === 'senior' ? 'Senior (+7a)' : 'Adulto',
      dog_weight: validWeight,
      activity_level: activity,
      diet_type: dietType,
      daily_grams: dailyGrams,
      monthly_kilos: parseFloat(monthlyKilos),
      estimated_monthly_cost: discountedTotal,
      health_notes: healthCondition !== 'ninguna' ? healthCondition : null,
      ...utm
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error registrando tus datos.');
      }

      // Guardar perrito en el contexto del carrito para checkout futuro
      if (setDogData) {
        setDogData({
          name: dogName || 'Perrito',
          breed: breed,
          weight: validWeight,
          dietType: dietType,
          dailyGrams: dailyGrams,
          monthlyKilos: parseFloat(monthlyKilos),
          pouchesNeeded: pouchesNeeded
        });
      }

      setWhatsappUrl(data.whatsapp_url || '');
      setSubmitted(true);
    } catch (err) {
      console.error('Error enviando lead:', err);
      setErrorMessage(err.message || 'Hubo un error al procesar tu solicitud. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="calculadora" className="w-full bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#E8DFC8] relative overflow-hidden">
      {/* Glow decorativo de fondo */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-secondary-orange/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-primary-green/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 mb-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="bg-[#EBF2DA] text-[#4E5824] text-[11px] font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1.5 tracking-wider">
            <Calculator size={13} className="text-primary-green" />
            Calculadora Médica de Raciones
          </span>
          <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-600" /> 10% OFF
          </span>
        </div>
        <h3 className="font-header text-xl sm:text-2xl font-black text-secondary-brown tracking-tight leading-snug">
          ¿Cuánta comida real necesita tu perro?
        </h3>
        <p className="text-xs text-gray-500 font-sans mt-0.5">
          Calcula la porción exacta según peso, actividad y salud. ¡Sin compromiso!
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.form 
            key="calculator-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmitLead} 
            className="space-y-4 relative z-10"
          >
            {/* Fila 1: Nombre y Raza */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-brown mb-1">
                  Nombre de tu perro
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rocky, Luna, Milo..."
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-green/40 transition font-sans text-secondary-brown"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-brown mb-1">
                  Raza o tipo
                </label>
                <select
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-green/40 transition font-sans text-secondary-brown"
                >
                  {COMMON_BREEDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila 2: Peso con selector y presets */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-secondary-brown">
                  Peso corporal: <strong className="text-primary-green text-sm">{validWeight} Kg</strong>
                </label>
                <span className="text-[10px] text-gray-400">Rango: 1 a 80 Kg</span>
              </div>

              {/* Presets rápidos */}
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {[4, 10, 15, 25, 35].map((w) => (
                  <button
                    type="button"
                    key={w}
                    onClick={() => setWeight(w)}
                    className={`text-xs py-1.5 rounded-lg font-bold transition border ${
                      validWeight === w
                        ? 'bg-secondary-orange text-white border-secondary-orange shadow-xs'
                        : 'bg-[#FAF7F2] text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {w} kg
                  </button>
                ))}
              </div>

              {/* Slider de peso */}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="70"
                  step="0.5"
                  value={validWeight}
                  onChange={(e) => setWeight(parseFloat(e.target.value))}
                  className="w-full accent-primary-green cursor-pointer h-2 bg-gray-200 rounded-lg"
                />
                <input
                  type="number"
                  min="1"
                  max="90"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-gray-200 bg-[#FAF7F2] text-secondary-brown"
                />
              </div>
            </div>

            {/* Fila 3: Dieta & Etapa */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-brown mb-1">
                  Tipo de Dieta
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDietType('barf')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      dietType === 'barf'
                        ? 'bg-primary-green text-white border-primary-green shadow-xs'
                        : 'bg-[#FAF7F2] text-gray-600 border-gray-200'
                    }`}
                  >
                    🥩 BARF
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietType('cocinada')}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      dietType === 'cocinada'
                        ? 'bg-primary-green text-white border-primary-green shadow-xs'
                        : 'bg-[#FAF7F2] text-gray-600 border-gray-200'
                    }`}
                  >
                    🍲 Cocinada
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-brown mb-1">
                  Etapa de Vida
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'puppy', label: 'Cachorro' },
                    { id: 'adult', label: 'Adulto' },
                    { id: 'senior', label: 'Senior' }
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setStage(s.id)}
                      className={`py-2 text-center rounded-xl text-[11px] font-bold border transition ${
                        stage === s.id
                          ? 'bg-secondary-brown text-white border-secondary-brown shadow-xs'
                          : 'bg-[#FAF7F2] text-gray-600 border-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fila 4: Condición especial / Alergia */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-brown mb-1">
                ¿Tiene alguna condición o sensibilidad?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {HEALTH_CONDITIONS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setHealthCondition(c.id)}
                    className={`text-left p-2 rounded-xl text-[11px] border transition flex flex-col justify-between ${
                      healthCondition === c.id
                        ? 'bg-amber-50 text-amber-900 border-secondary-orange font-bold shadow-2xs'
                        : 'bg-[#FAF7F2] text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-sm mb-0.5">{c.icon}</span>
                    <span className="leading-tight line-clamp-2">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tarjeta de Resultados en Tiempo Real */}
            <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F3EDE2] rounded-2xl p-4 border border-[#E5DACD] shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center sm:text-left items-center">
                
                {/* Ración Diaria */}
                <div className="col-span-1 border-r border-[#E0D5C3] pr-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Ración Diaria:
                  </span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="font-header text-2xl sm:text-3xl font-black text-primary-green">
                      {dailyGrams}
                    </span>
                    <span className="text-xs font-bold text-gray-600">g/día</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    (2 tomas de {gramsPerMeal}g)
                  </span>
                </div>

                {/* Consumo Mensual */}
                <div className="col-span-1 border-r border-[#E0D5C3] pr-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Consumo 28 días:
                  </span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="font-header text-2xl sm:text-3xl font-black text-secondary-brown">
                      {monthlyKilos}
                    </span>
                    <span className="text-xs font-bold text-gray-600">Kg/mes</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    ~{pouchesNeeded} packs al vacío
                  </span>
                </div>

                {/* Inversión Mensual Estimada */}
                <div className="col-span-2 sm:col-span-1 text-center sm:text-left pt-2 sm:pt-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Plan Mensual:
                  </span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="font-header text-xl sm:text-2xl font-black text-secondary-orange">
                      ${discountedTotal.toLocaleString('es-CL')}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">CLP</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    ✨ Incluye 10% OFF 1ra compra
                  </span>
                </div>

              </div>

              {/* Callout Pack de Transición (Bajo Riesgo) */}
              <div className="mt-3 pt-3 border-t border-[#E0D5C3] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-primary-green/10 text-primary-green p-1 rounded-lg">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-secondary-brown leading-tight">
                      ¿Primera vez? Prueba el <strong className="text-primary-green font-black">Pack de Transición (7-10 días)</strong>
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Adapta su flora sin diarreas por solo <strong className="text-secondary-brown">${transitionPackPrice.toLocaleString('es-CL')} CLP</strong>
                    </p>
                  </div>
                </div>
                <a
                  href="#tienda"
                  className="text-[10px] font-bold text-primary-green hover:underline shrink-0"
                >
                  Ver Menú →
                </a>
              </div>
            </div>

            {/* Captura de Lead CRO */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-secondary-brown mb-2 flex items-center gap-1.5">
                <Send size={13} className="text-secondary-orange" />
                Recibe su Pauta Nutricional personalizada en tu WhatsApp:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre (Tutor) *"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary-orange/40 transition text-secondary-brown font-medium"
                />
                <input
                  type="tel"
                  required
                  placeholder="WhatsApp (+569...) *"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary-orange/40 transition text-secondary-brown font-medium"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-red-600 mb-2 font-medium">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-secondary-orange hover:bg-[#c98336] text-white font-header font-bold text-sm py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 group disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Calculando pauta médica...</span>
                  </>
                ) : (
                  <>
                    <span>Obtener Pauta Nutricional & 10% OFF</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-gray-400 mt-2 font-sans">
                🔒 Sin spam. Tu número solo se usará para enviarte la pauta y el cupón de descuento.
              </p>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="calculator-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-4 text-center space-y-4 relative z-10"
          >
            <div className="w-16 h-16 bg-emerald-100 text-primary-green rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h4 className="font-header text-2xl font-black text-secondary-brown">
                ¡Pauta Lista para {dogName || 'tu Perrito'}! 🐾
              </h4>
              <p className="text-xs text-gray-600 max-w-md mx-auto mt-1 font-sans">
                Hemos registrado los datos de {dogName || 'tu perro'} ({validWeight} kg, {dailyGrams}g diarios de {dietType.toUpperCase()}).
                Nuestro bot de Telegram ya notificó al equipo de nutricionistas de Origen Canino.
              </p>
            </div>

            {/* Resumen del plan */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFC8] text-left max-w-md mx-auto text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Ración diaria recomendada:</span>
                <strong className="text-primary-green font-black">{dailyGrams} gramos / día</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dieta seleccionada:</span>
                <strong className="text-secondary-brown font-bold">{dietType === 'barf' ? 'BARF Cruda' : 'Cocinada al Vapor'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Inversión mensual estimada:</span>
                <strong className="text-secondary-orange font-bold">${discountedTotal.toLocaleString('es-CL')} CLP (10% OFF)</strong>
              </div>
              {healthCondition !== 'ninguna' && (
                <div className="flex justify-between text-amber-800">
                  <span>Enfoque especial:</span>
                  <strong>{HEALTH_CONDITIONS.find(c => c.id === healthCondition)?.label}</strong>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="space-y-2 pt-2 max-w-md mx-auto">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-header font-bold text-sm py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <PhoneCall size={18} />
                  <span>Hablar con Nutricionista por WhatsApp</span>
                </a>
              )}

              <a
                href="#tienda"
                className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-header font-bold text-sm py-3 px-6 rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <span>Ver Menú & Comprar Pack de Prueba</span>
                <ArrowRight size={16} />
              </a>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs text-gray-500 hover:text-secondary-brown underline pt-2"
              >
                ← Calcular para otro perrito
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroCalculator;
