import React from 'react';
import { CheckCircle2, Beef, Soup } from 'lucide-react';
import { motion } from 'framer-motion';

const Especialidades = () => {
  return (
    <section id="especialidades" className="py-6 md:py-10 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-secondary-brown font-bold tracking-widest text-sm md:text-base uppercase mb-3">Nuestras Especialidades</p>
          <h2 className="font-header text-4xl md:text-5xl text-secondary-brown">Dos Formas de Nutrir con Amor</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card BARF */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-bg-cream rounded-3xl p-8 md:p-10 border-l-8 border-primary-green shadow-sm relative overflow-hidden"
          >
            <div className="bg-white p-3 rounded-full inline-block mb-6 shadow-sm">
              <Beef className="text-primary-green" size={32} />
            </div>
            
            <h3 className="font-header text-3xl text-secondary-brown mb-4">Dieta BARF (Cruda)</h3>
            <p className="text-secondary-brown-light mb-8 leading-relaxed">
              Alimentación biológicamente apropiada basada en ingredientes crudos. Respeta el diseño biológico del perro, aportando vitalidad máxima y enzimas digestivas intactas.
            </p>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-primary-green shrink-0 mt-0.5" size={20} />
                <span className="text-secondary-brown font-medium">60% Huesos carnosos triturados</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-primary-green shrink-0 mt-0.5" size={20} />
                <span className="text-secondary-brown font-medium">30% Carne magra de primera calidad</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-primary-green shrink-0 mt-0.5" size={20} />
                <span className="text-secondary-brown font-medium">10% Vísceras y órganos ricos en hierro</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-primary-green shrink-0 mt-0.5" size={20} />
                <span className="text-secondary-brown font-medium">Suplementos verdes y frutas</span>
              </li>
            </ul>
          </motion.div>

          {/* Card Cocinada */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-bg-cream rounded-3xl p-8 md:p-10 border-l-8 border-primary-green shadow-sm relative overflow-hidden"
          >
            <div className="bg-white p-3 rounded-full inline-block mb-6 shadow-sm">
              <Soup className="text-primary-green" size={32} />
            </div>
            
            <h3 className="font-header text-3xl text-secondary-brown mb-4">Comida Cocinada al Vapor</h3>
            <p className="text-secondary-brown-light mb-8 leading-relaxed">
              Elaborada a baja temperatura para conservar nutrientes. Ideal para perros con digestión sensible, de edad avanzada o cuyos dueños prefieren no ofrecer alimentos crudos.
            </p>
            
            {/* Lista tachada omitida según las instrucciones del usuario */}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Especialidades;
