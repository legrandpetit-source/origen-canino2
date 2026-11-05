import React from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const plans = [
  {
    id: 1,
    tag: 'Toy & Pequeño',
    icon: '🐶',
    title: 'Perro Pequeño',
    breeds: 'Chihuahua, Poodle Toy, Dachshund, Schnauzer mini',
    weightRange: '1 a 10 kg',
    monthlyKilos: '3 a 6 kg/mes',
    estimatedPrice: 'Desde $30.000',
    bullets: [
      'Formatos de 1 Kg sellados al vacío',
      'A elección: Dieta BARF Cruda o Cocinada al Vapor',
      'Despacho programado quincenal o mensual',
      'Alimento 100% natural ultracongelado a -18°C'
    ],
    buttonText: 'Elegir Plan Pequeño',
    isPopular: false
  },
  {
    id: 2,
    tag: 'Mediano Activo',
    icon: '🐶',
    title: 'Perro Mediano',
    breeds: 'Bulldog Francés, Border Collie, Beagle, Cocker',
    weightRange: '11 a 25 kg',
    monthlyKilos: '9 a 15 kg/mes',
    estimatedPrice: 'Desde $45.000',
    bullets: [
      'Formatos de 1 Kg sellados al vacío',
      'A elección: Dieta BARF Cruda o Cocinada al Vapor',
      'Despacho programado quincenal o mensual',
      'Alimento 100% natural ultracongelado a -18°C'
    ],
    buttonText: 'Elegir Plan Mediano',
    isPopular: true
  },
  {
    id: 3,
    tag: 'Grande & Gigante',
    icon: '🐕',
    title: 'Perro Grande',
    breeds: 'Golden Retriever, Pastor Alemán, Labrador, Bernés',
    weightRange: '26+ kg',
    monthlyKilos: '18+ kg/mes',
    estimatedPrice: 'Desde $90.000',
    bullets: [
      'Formatos de 1 Kg sellados al vacío',
      'A elección: Dieta BARF Cruda o Cocinada al Vapor',
      'Despacho programado quincenal o mensual',
      'Alimento 100% natural ultracongelado a -18°C'
    ],
    buttonText: 'Elegir Plan Grande',
    isPopular: false
  }
];

const SuggestedPlans = () => {
  const scrollToShop = () => {
    const shopSection = document.getElementById('tienda');
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="planes" className="py-10 md:py-16 bg-white scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        
        {/* Encabezado */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-2.5">
            Planes Sugeridos
          </span>
          <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-extrabold text-secondary-brown tracking-tight mb-3">
            Planes Sugeridos – Guía de Compra Mensual
          </h2>
          <p className="text-xs sm:text-sm text-secondary-brown-light/80 font-sans max-w-xl mx-auto">
            Porciones calculadas para cubrir la nutrición de 30 días con despacho programado. Pedido mínimo: $30.000 CLP para asegurar la cadena de frío.
          </p>
        </div>

        {/* 3 Tarjetas (Stitch Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch pt-4">
          {plans.map((plan) => {
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className={`bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                  plan.isPopular 
                    ? 'border-2 border-secondary-orange shadow-xl md:-translate-y-2' 
                    : 'border border-[#EBE4DA] shadow-sm hover:shadow-md'
                }`}
              >
                {/* Badge Flotante "MÁS COMÚN" */}
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-secondary-orange text-white text-[11px] font-extrabold uppercase px-4 py-1 rounded-full shadow-md tracking-wider">
                    Más Común
                  </div>
                )}

                <div>
                  {/* Etiqueta de Categoría */}
                  <div className="flex items-center justify-between mb-3 pt-1">
                    <span className="bg-[#FAF3E8] text-[#935223] text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
                      {plan.tag}
                    </span>
                    <span className="text-xl">{plan.icon}</span>
                  </div>

                  {/* Título de Raza / Tamaño */}
                  <h3 className="font-header text-2xl font-bold text-secondary-brown mb-1">
                    {plan.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-5 leading-relaxed min-h-[32px]">
                    {plan.breeds}
                  </p>

                  {/* Métricas de Peso y Kilos */}
                  <div className="bg-[#FAF7F2] rounded-2xl p-3.5 mb-5 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-gray-500 font-medium">
                      <span>Rango de peso:</span>
                      <strong className="text-secondary-brown">{plan.weightRange}</strong>
                    </div>
                    <div className="flex justify-between items-center text-gray-500 font-medium">
                      <span>Cantidad estimada:</span>
                      <strong className="text-secondary-brown">{plan.monthlyKilos}</strong>
                    </div>
                  </div>

                  {/* Inversión Mensual */}
                  <div className="mb-5 pb-5 border-b border-[#F0EBE3]">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block mb-0.5">
                      Inversión Mensual:
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-header text-3xl font-extrabold text-secondary-brown">
                        {plan.estimatedPrice}
                      </span>
                      <span className="text-xs font-bold text-gray-500">CLP</span>
                    </div>
                  </div>

                  {/* Lista de Beneficios */}
                  <ul className="space-y-2.5 text-xs text-secondary-brown mb-6 font-medium">
                    {plan.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-primary-green shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón CTA */}
                <button
                  onClick={scrollToShop}
                  className={`w-full py-3.5 px-4 rounded-2xl font-header font-bold text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2 group ${
                    plan.isPopular
                      ? 'bg-secondary-orange hover:bg-[#c98336] text-white'
                      : 'bg-white hover:bg-[#FAF7F2] text-primary-green border-2 border-primary-green'
                  }`}
                >
                  <span>{plan.buttonText}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default SuggestedPlans;
