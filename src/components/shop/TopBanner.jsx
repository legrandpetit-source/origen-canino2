import React from 'react';
import { Truck, Gift } from 'lucide-react';

const TopBanner = () => {
  return (
    <div className="bg-primary-green-dark text-white py-2 px-4 w-full relative z-50">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Truck size={16} className="text-secondary-brown" />
          <span>Despacho el mismo día en Santiago</span>
        </div>
        <div className="hidden sm:block text-white/40">|</div>
        <div className="flex items-center gap-2 font-medium text-primary-cream">
          <Gift size={16} />
          <span>¡Envío Gratis al suscribirte a un plan mensual!</span>
        </div>
      </div>
    </div>
  );
};

export default TopBanner;
