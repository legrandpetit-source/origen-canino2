import React from 'react';
import { ArrowRight, CheckCircle2, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

const Especialidades = () => {
  const scrollToTienda = (filterType) => {
    const tienda = document.getElementById('tienda');
    if (tienda) {
      tienda.scrollIntoView({ behavior: 'smooth' });
      window.dispatchEvent(new CustomEvent('filter-catalog', { detail: filterType }));
    }
  };

  return (
    <section id="especialidades" className="py-10 md:py-16 bg-white scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        {/* Encabezado de Sección */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-3 shadow-sm">
            Alta Cocina Canina
          </span>
          <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-extrabold text-secondary-brown tracking-tight mb-3">
            Nuestras Especialidades – Dos Formas de Nutrir con Amor
          </h2>
          <p className="text-sm sm:text-base text-secondary-brown-light/80 leading-relaxed font-sans">
            Formuladas por nutricionistas caninos certificados en Chile para garantizar máxima bio-disponibilidad y felicidad en cada comida.
          </p>
        </div>

        {/* Tarjetas Comparativas (Stitch Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* Card BARF (Cruda) */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E1D5] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Badges superiores */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="bg-primary-green text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                  Biológicamente Apropiada
                </span>
                <span className="bg-[#FAF0E6] text-[#A65B2A] text-[11px] font-bold px-3 py-1 rounded-full">
                  Congelado a -18°C
                </span>
              </div>

              {/* Título y Descripción */}
              <h3 className="font-header text-2xl sm:text-3xl font-bold text-secondary-brown mb-3 flex items-center gap-2">
                <span>Dieta BARF (Cruda)</span>
                <span className="text-2xl">🥩</span>
              </h3>
              <p className="text-xs sm:text-sm text-secondary-brown-light/90 leading-relaxed mb-6 font-sans">
                Alimento crudo bio-nutritivo que respeta la anatomía carnívora del perro. Mantiene enzimas activas, probióticos naturales y vitaminas intactas para una regeneración celular profunda.
              </p>

              {/* Caja de Composición Estándar SAG */}
              <div className="bg-[#FDF3EE] rounded-2xl p-4 sm:p-5 border border-[#F8E3D8] mb-6">
                <span className="text-[11px] font-extrabold text-[#754E38] tracking-wider uppercase mb-2.5 block">
                  Composición Estándar SAG:
                </span>
                <ul className="space-y-2 text-xs sm:text-sm text-secondary-brown font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-green font-bold text-base leading-none">•</span>
                    <span><strong>60% Huesos carnosos triturados</strong> (Calcio & Fósforo natural)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-green font-bold text-base leading-none">•</span>
                    <span><strong>30% Carne magra de primera calidad</strong> (Proteína pura de pastoreo)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-green font-bold text-base leading-none">•</span>
                    <span><strong>10% Vísceras y órganos ricos en hierro</strong> (Supernutrientes esenciales)</span>
                  </li>
                  <li className="flex items-start gap-2 pt-1 border-t border-[#F2D7C7]/60 text-secondary-brown-light">
                    <Leaf size={14} className="text-primary-green shrink-0 mt-0.5" />
                    <span><strong>Suplementos verdes y frutas:</strong> arándanos chilenos, zapallo, espinaca y cúrcuma.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enlace Inferior */}
            <button 
              onClick={() => scrollToTienda('barf')}
              className="text-primary-green hover:text-primary-green-dark font-header font-bold text-sm flex items-center gap-2 group transition-all pt-2"
            >
              <span>Explorar recetas BARF</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Card Comida Cocinada al Vapor */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E1D5] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Badges superiores */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="bg-[#FAF0E6] text-[#A65B2A] text-[11px] font-bold px-3 py-1 rounded-full">
                  Digestión Ultra Suave
                </span>
                <span className="bg-[#FAF0E6] text-[#A65B2A] text-[11px] font-bold px-3 py-1 rounded-full">
                  Cocción lenta a 85°C
                </span>
              </div>

              {/* Título y Descripción */}
              <h3 className="font-header text-2xl sm:text-3xl font-bold text-secondary-brown mb-3 flex items-center gap-2">
                <span>Comida Cocinada al Vapor</span>
                <span className="text-2xl">🍲</span>
              </h3>
              <p className="text-xs sm:text-sm text-secondary-brown-light/90 leading-relaxed mb-6 font-sans">
                Elaborada a baja temperatura para conservar nutrientes, ideal para digestión sensible, perritos senior o en transición suave.
              </p>

              {/* Grilla de Características Nutricionales */}
              <div className="bg-[#FDF3EE] rounded-2xl p-5 border border-[#F8E3D8] mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm text-secondary-brown font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-primary-green shrink-0" />
                    <span>Suave con el estómago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-primary-green shrink-0" />
                    <span>100% grado humano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-primary-green shrink-0" />
                    <span>Alta palatabilidad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-primary-green shrink-0" />
                    <span>Sin conservantes ni harinas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enlace Inferior */}
            <button 
              onClick={() => scrollToTienda('cocinada')}
              className="text-primary-green hover:text-primary-green-dark font-header font-bold text-sm flex items-center gap-2 group transition-all pt-2"
            >
              <span>Explorar recetas al vapor</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Especialidades;
