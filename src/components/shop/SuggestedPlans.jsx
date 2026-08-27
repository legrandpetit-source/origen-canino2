import React from 'react';
import { ShoppingCart } from 'lucide-react';

const plans = [
  {
    id: 1,
    title: 'Perro Pequeño',
    weightRange: '1 a 10 kg',
    monthlyKilos: '3 a 6 kg / mes',
    estimatedPrice: 'Desde $24.000',
    description: 'Perfecto para razas pequeñas que necesitan porciones concentradas en nutrientes.',
    recommendation: 'Agrega 3 a 6 packs al carrito.'
  },
  {
    id: 2,
    title: 'Perro Mediano',
    weightRange: '11 a 25 kg',
    monthlyKilos: '9 a 15 kg / mes',
    estimatedPrice: 'Desde $72.000',
    description: 'La energía exacta que necesita un perro activo de tamaño medio para todo el mes.',
    recommendation: 'Agrega 9 a 15 packs al carrito.',
    isPopular: true
  },
  {
    id: 3,
    title: 'Perro Grande',
    weightRange: '26+ kg',
    monthlyKilos: '18+ kg / mes',
    estimatedPrice: 'Desde $144.000',
    description: 'Porciones abundantes para mantener la masa muscular y vitalidad de razas grandes.',
    recommendation: 'Agrega 18+ packs al carrito.'
  }
];

const SuggestedPlans = () => {
  const scrollToShop = () => {
    const shopSection = document.getElementById('shop-section');
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="planes" className="py-16 bg-white relative scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-header text-3xl md:text-4xl text-secondary-brown mb-4">
            Guía de Compra Mensual
          </h2>
          <p className="text-secondary-brown-light/80 text-lg">
            Nuestros packs son de 1 Kg. Compra exactamente lo que necesitas. 
            <br className="hidden md:block"/> 
            Revisa esta guía para saber cuántos kilos requiere tu perrito en un mes completo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-bg-cream rounded-3xl p-8 border-2 flex flex-col h-full relative ${
                plan.isPopular ? 'border-secondary-orange shadow-xl shadow-secondary-orange/10 transform md:-translate-y-4' : 'border-transparent shadow-lg shadow-primary-green-dark/5'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-secondary-orange text-white px-4 py-1 rounded-full font-bold text-sm tracking-wide shadow-md">
                  MÁS COMÚN
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="font-header text-2xl text-secondary-brown mb-2">{plan.title}</h3>
                <div className="inline-block bg-white px-4 py-1 rounded-full text-sm font-medium text-primary-green-dark border border-primary-green-light/30">
                  {plan.weightRange}
                </div>
              </div>

              <div className="text-center mb-6 border-b border-secondary-brown/10 pb-6">
                <div className="text-4xl font-header text-secondary-brown mb-2">{plan.estimatedPrice}</div>
                <div className="text-primary-green font-bold text-lg">{plan.monthlyKilos}</div>
              </div>

              <p className="text-secondary-brown-light mb-6 flex-grow text-center">
                {plan.description}
              </p>

              <div className="mt-auto">
                <div className="text-sm font-medium text-center text-secondary-brown mb-4">
                  💡 {plan.recommendation}
                </div>
                <button 
                  onClick={scrollToShop}
                  className={`w-full py-3 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
                    plan.isPopular 
                      ? 'bg-secondary-orange text-white hover:bg-[#d65d21] hover:shadow-lg' 
                      : 'bg-primary-green text-white hover:bg-primary-green-dark hover:shadow-lg'
                  }`}
                >
                  <ShoppingCart size={20} />
                  Ir a comprar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuggestedPlans;
