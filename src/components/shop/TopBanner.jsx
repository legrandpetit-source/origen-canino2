import React from 'react';
import { Truck, Gift } from 'lucide-react';

const TopBanner = () => {
  return (
    <div className="bg-primary-green-dark text-white py-2 px-4 w-full relative z-50">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-6 text-xs sm:text-sm text-center">
        <div className="flex items-center justify-center gap-2 font-medium text-white/90">
          <Truck size={15} className="text-[#db994b]" />
          <span>Despacho programado con cadena de frío • Pedido mínimo $30.000</span>
        </div>
        <div className="hidden sm:block text-white/40">|</div>
        <div className="flex items-center justify-center gap-2 font-medium text-primary-cream">
          <Gift size={15} className="text-[#db994b]" />
          <span>¡Envío Gratis al suscribirte a un plan mensual!</span>
        </div>
      </div>
    </div>
  );
};

export default TopBanner;
