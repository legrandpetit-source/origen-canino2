import React from 'react';
import { motion } from 'framer-motion';

const TransitionGuide = () => {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="text-center max-w-xl mx-auto mb-8 md:mb-10">
          <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-2">
            Transición Suave
          </span>
          <h2 className="font-header text-3xl sm:text-4xl font-extrabold text-secondary-brown tracking-tight">
            Deja el Pellet sin Molestia Estomacal
          </h2>
          <p className="text-xs sm:text-sm text-secondary-brown-light/80 mt-1.5 font-sans">
            Cambiar la alimentación de tu perro es fácil si lo haces progresivamente. Su estómago se adapta en pocos días a su flora natural.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {/* Card 1 */}
          <motion.div 
            whileHover={{ y: -3 }}
            className="bg-[#FAF7F2] rounded-3xl p-5 border border-[#EBE4DA] shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-header font-bold text-base text-secondary-brown">Días 1 a 3</span>
                <span className="bg-white text-[11px] font-bold px-2.5 py-0.5 rounded-full text-secondary-orange border border-[#E5DACD]">Fase 1</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3 font-sans">Adaptación inicial suave</p>
              
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between text-gray-600">
                  <span>Pellet actual:</span>
                  <strong>75%</strong>
                </div>
                <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full w-3/4"></div>
                </div>

                <div className="flex justify-between text-primary-green pt-1">
                  <span>Origen Canino:</span>
                  <strong>25%</strong>
                </div>
                <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-green h-full w-1/4"></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            whileHover={{ y: -3 }}
            className="bg-[#FAF7F2] rounded-3xl p-5 border border-[#EBE4DA] shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-header font-bold text-base text-secondary-brown">Días 4 a 6</span>
                <span className="bg-white text-[11px] font-bold px-2.5 py-0.5 rounded-full text-secondary-orange border border-[#E5DACD]">Fase 2</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3 font-sans">Balance medio</p>
              
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between text-gray-600">
                  <span>Pellet actual:</span>
                  <strong>50%</strong>
                </div>
                <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full w-1/2"></div>
                </div>

                <div className="flex justify-between text-primary-green pt-1">
                  <span>Origen Canino:</span>
                  <strong>50%</strong>
                </div>
                <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-green h-full w-1/2"></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            whileHover={{ y: -3 }}
            className="bg-[#FAF7F2] rounded-3xl p-5 border border-[#EBE4DA] shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-header font-bold text-base text-secondary-brown">Días 7 a 9</span>
                <span className="bg-white text-[11px] font-bold px-2.5 py-0.5 rounded-full text-secondary-orange border border-[#E5DACD]">Fase 3</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3 font-sans">Mayoría comida real</p>
              
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between text-gray-600">
                  <span>Pellet actual:</span>
                  <strong>25%</strong>
                </div>
                <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full w-1/4"></div>
                </div>

                <div className="flex justify-between text-primary-green pt-1">
                  <span>Origen Canino:</span>
                  <strong>75%</strong>
                </div>
                <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-green h-full w-3/4"></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4 */}
          <motion.div 
            whileHover={{ y: -3 }}
            className="bg-primary-green/10 rounded-3xl p-5 border-2 border-primary-green shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-header font-bold text-base text-secondary-brown">Día 10 en adelante</span>
                <span className="bg-primary-green text-white text-[11px] font-bold px-2 py-0.5 rounded-full">¡Éxito! 🎉</span>
              </div>
              <p className="text-[11px] text-primary-green-dark font-medium mb-3 font-sans">100% Nutrición Natural</p>
              
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between text-primary-green-dark font-bold pt-1">
                  <span>Origen Canino:</span>
                  <strong>100%</strong>
                </div>
                <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-green h-full w-full"></div>
                </div>
                <p className="text-[10px] text-gray-500 pt-1">Digestión óptima y heces compactas.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TransitionGuide;
