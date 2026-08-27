import React from 'react';
import { Leaf, ShieldCheck, HeartPulse, Sparkles, Scale } from 'lucide-react';

const benefits = [
  { icon: <ShieldCheck size={20} />, text: 'Fortalece el sistema inmune' },
  { icon: <HeartPulse size={20} />, text: 'Mejor digestión y absorción' },
  { icon: <Sparkles size={20} />, text: 'Más energía y vitalidad' },
  { icon: <Scale size={20} />, text: 'Peso saludable y controlado' },
  { icon: <Leaf size={20} />, text: 'Menos alergias e intolerancias' },
];

const BenefitsMarquee = () => {
  return (
    <div className="bg-primary-green-light text-white py-3 overflow-hidden relative border-y-4 border-white/20">
      {/* Gradients for fading effect at edges */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-primary-green-light to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-primary-green-light to-transparent z-10 pointer-events-none" />
      
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Double the list for seamless looping */}
        {[...benefits, ...benefits, ...benefits].map((benefit, index) => (
          <div key={index} className="flex items-center gap-3 mx-8">
            <div className="text-white">
              {benefit.icon}
            </div>
            <span className="font-bold text-sm md:text-base tracking-wide">
              {benefit.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BenefitsMarquee;
