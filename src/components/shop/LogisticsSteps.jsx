import React from 'react';
import { motion } from 'framer-motion';
import { Snowflake, MessageCircle, Truck } from 'lucide-react';

const LogisticsSteps = () => {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="text-center max-w-xl mx-auto mb-8 md:mb-10">
          <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-2">
            Proceso & Despacho
          </span>
          <h2 className="font-header text-3xl sm:text-4xl font-extrabold text-secondary-brown tracking-tight">
            ¿Cómo Llega a Tu Perro?
          </h2>
          <p className="text-xs sm:text-sm text-secondary-brown-light/80 mt-1.5 font-sans">
            Mantenemos la cadena de frío en todo momento para que la comida llegue fresca y en perfectas condiciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Step 1 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="flex flex-col items-center text-center p-6 bg-[#FAF7F2] rounded-3xl border border-[#EBE4DA] shadow-2xs"
          >
            <div className="w-14 h-14 bg-primary-green/10 text-primary-green rounded-2xl flex items-center justify-center mb-4 shadow-xs">
              <Snowflake size={28} />
            </div>
            <h3 className="font-header font-bold text-lg text-secondary-brown mb-2">1. Congelado a -18°C</h3>
            <p className="text-xs text-secondary-brown-light/80 leading-relaxed font-sans">
              Porcionamos, sellamos al vacío y congelamos el alimento inmediatamente para preservar sus nutrientes de forma 100% natural.
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="flex flex-col items-center text-center p-6 bg-[#FAF7F2] rounded-3xl border border-[#EBE4DA] shadow-2xs"
          >
            <div className="w-14 h-14 bg-secondary-orange/15 text-secondary-orange rounded-2xl flex items-center justify-center mb-4 shadow-xs">
              <MessageCircle size={28} />
            </div>
            <h3 className="font-header font-bold text-lg text-secondary-brown mb-2">2. Coordinación WhatsApp</h3>
            <p className="text-xs text-secondary-brown-light/80 leading-relaxed font-sans">
              Cuando tu pedido esté listo para salir, te contactaremos directamente para coordinar la entrega y asegurarnos de que estés en casa.
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="flex flex-col items-center text-center p-6 bg-[#FAF7F2] rounded-3xl border border-[#EBE4DA] shadow-2xs"
          >
            <div className="w-14 h-14 bg-primary-green/10 text-primary-green rounded-2xl flex items-center justify-center mb-4 shadow-xs">
              <Truck size={28} />
            </div>
            <h3 className="font-header font-bold text-lg text-secondary-brown mb-2">3. Despacho en Caja Isotérmica</h3>
            <p className="text-xs text-secondary-brown-light/80 leading-relaxed font-sans">
              Enviamos en caja térmica hermética con gel refrigerante. Tu perro recibirá su alimento sin romper la cadena de frío jamás.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LogisticsSteps;
