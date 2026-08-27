import React from 'react';
import { MapPin, Truck } from 'lucide-react';

const DeliveryArea = () => {
  return (
    <section id="despacho" className="py-16 bg-bg-cream scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-header text-3xl md:text-4xl text-secondary-brown mb-4">
            Zonas de Despacho
          </h2>
          <p className="text-secondary-brown-light/80 text-lg">
            Llegamos con alimento 100% fresco y congelado directo a la puerta de tu casa.
          </p>
        </div>

        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row items-stretch border border-primary-green-light/20">
          
          {/* Map Image Side */}
          <div className="w-full md:w-1/2 bg-gray-100 h-64 md:h-auto relative">
            <img 
              src="/delivery_map.jpg" 
              alt="Mapa de entregas en Santiago y Valparaíso" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details Side */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col gap-8">
            
            <div className="flex gap-4 items-start">
              <div className="bg-secondary-orange/10 p-3 rounded-2xl text-secondary-orange">
                <MapPin size={32} />
              </div>
              <div>
                <h3 className="font-header text-2xl text-secondary-brown mb-2">Región Metropolitana</h3>
                <p className="text-secondary-brown-light">
                  Despachamos a <strong>todas las comunas</strong> de la Provincia de Santiago. <br/>
                  <span className="inline-flex items-center gap-1 text-sm mt-2 text-primary-green font-medium">
                    <Truck size={14} /> Entregas Lunes, Miércoles y Viernes.
                  </span>
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-gray-100"></div>

            <div className="flex gap-4 items-start">
              <div className="bg-primary-green/10 p-3 rounded-2xl text-primary-green-dark">
                <MapPin size={32} />
              </div>
              <div>
                <h3 className="font-header text-2xl text-secondary-brown mb-2">V Región</h3>
                <p className="text-secondary-brown-light">
                  Llegamos a Viña del Mar, Valparaíso, Concón, Quilpué y Villa Alemana. <br/>
                  <span className="inline-flex items-center gap-1 text-sm mt-2 text-primary-green font-medium">
                    <Truck size={14} /> Entregas todos los Martes y Jueves.
                  </span>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default DeliveryArea;
