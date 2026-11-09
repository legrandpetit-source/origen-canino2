import React from 'react';
import { MapPin, Truck, ShieldCheck, Clock } from 'lucide-react';

const DeliveryArea = () => {
  return (
    <section id="despacho" className="py-6 md:py-8 bg-[#FAF7F2] scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        
        {/* Encabezado Compacto */}
        <div className="text-center max-w-xl mx-auto mb-5">
          <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2">
            Cobertura Logística
          </span>
          <h2 className="font-header text-3xl sm:text-4xl font-extrabold text-secondary-brown tracking-tight">
            Zonas de Despacho
          </h2>
          <p className="text-xs sm:text-sm text-secondary-brown-light/80 mt-1.5 font-sans">
            Llegamos con alimento 100% fresco y congelado directo a la puerta de tu casa.
          </p>
        </div>

        {/* Tarjeta Principal Compacta */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#EBE4DA] overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
          
          {/* Lado Mapa */}
          <div className="md:col-span-5 bg-[#F6F2EA] relative flex items-center justify-center p-4 min-h-[220px] md:min-h-full">
            <img 
              src="/delivery_map.webp" 
              alt="Mapa de Zonas de Despacho" 
              className="w-full max-h-[300px] object-contain rounded-2xl drop-shadow-sm"
            />
          </div>

          {/* Lado Información de Regiones */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center gap-5">
            
            {/* Región Metropolitana */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE8DE] flex gap-3.5 items-start">
              <div className="bg-secondary-orange/15 p-2.5 rounded-xl text-secondary-orange shrink-0 mt-0.5">
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="font-header text-lg font-bold text-secondary-brown mb-0.5">
                  Región Metropolitana
                </h3>
                <p className="text-xs text-secondary-brown-light/90 mb-2 leading-relaxed">
                  Despachamos a <strong>todas las comunas</strong> de la Provincia de Santiago.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-white text-[#935223] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#ECDCC9] shadow-2xs">
                  <Truck size={13} className="text-secondary-orange" />
                  <span>Entregas Lunes, Miércoles y Viernes</span>
                </div>
              </div>
            </div>

            {/* V Región */}
            <div className="p-4 rounded-2xl bg-[#F4F7EE] border border-[#E2EBD5] flex gap-3.5 items-start">
              <div className="bg-primary-green/15 p-2.5 rounded-xl text-primary-green shrink-0 mt-0.5">
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="font-header text-lg font-bold text-secondary-brown mb-0.5">
                  V Región de Valparaíso
                </h3>
                <p className="text-xs text-secondary-brown-light/90 mb-2 leading-relaxed">
                  Llegamos a Viña del Mar, Valparaíso, Concón, Quilpué y Villa Alemana.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-white text-[#4A5D23] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#D5E2C4] shadow-2xs">
                  <Clock size={13} className="text-primary-green" />
                  <span>Entregas todos los Martes y Jueves</span>
                </div>
              </div>
            </div>

            {/* Garantía de Cadena de Frío */}
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 font-medium">
              <ShieldCheck size={16} className="text-primary-green shrink-0" />
              <span>Cadena de frío 100% garantizada en cajas isotérmicas con gel refrigerante.</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default DeliveryArea;
