import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator } from 'lucide-react';

const CalculatorModal = ({ isOpen, onClose }) => {
  const [dietType, setDietType] = useState('barf');
  const [weight, setWeight] = useState('');
  const [lifeStage, setLifeStage] = useState('adult_normal');
  const [result, setResult] = useState(null);

  const calculateRation = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;

    let percentage = 0.025; // default 2.5%

    switch (lifeStage) {
      case 'puppy_small': // 2-6 months
        percentage = 0.08;
        break;
      case 'puppy_large': // 6-12 months
        percentage = 0.05;
        break;
      case 'adult_low': // Senior or low activity
        percentage = 0.02;
        break;
      case 'adult_normal': // Adult normal activity
        percentage = 0.025;
        break;
      case 'adult_high': // Adult high activity / Sport
        percentage = 0.035;
        break;
      default:
        percentage = 0.025;
    }
    
    const dailyGrams = Math.round((w * 1000) * percentage);
    setResult(dailyGrams);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-secondary-brown text-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden border-2 border-primary-green/30"
          >
            <div className="p-6 md:p-8">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition bg-transparent"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary-green p-2 rounded-lg">
                  <Calculator size={24} className="text-white" />
                </div>
                <h2 className="font-header text-2xl md:text-3xl text-white m-0 leading-none">Calculadora</h2>
              </div>
              <p className="text-white/80 text-sm mb-6 font-sans">
                Descubre la ración diaria ideal para tu mascota basada en su peso y estilo de vida.
              </p>

              <div className="space-y-4 font-sans">
                <div>
                  <label className="block text-sm font-bold text-white/90 mb-1">Tipo de Alimentación</label>
                  <select 
                    value={dietType}
                    onChange={(e) => setDietType(e.target.value)}
                    className="w-full bg-white text-secondary-brown rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-green border-0"
                  >
                    <option value="barf">Dieta BARF (Cruda)</option>
                    <option value="cocinada">Dieta Cocinada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white/90 mb-1">Peso de la Mascota (kg)</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 15"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-white text-secondary-brown rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-green border-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white/90 mb-1">Etapa de Vida y Actividad</label>
                  <select 
                    value={lifeStage}
                    onChange={(e) => setLifeStage(e.target.value)}
                    className="w-full bg-white text-secondary-brown rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-green border-0"
                  >
                    <option value="puppy_small">Cachorro (2 a 6 meses)</option>
                    <option value="puppy_large">Cachorro (6 a 12 meses)</option>
                    <option value="adult_low">Adulto (Baja Actividad / Senior)</option>
                    <option value="adult_normal">Adulto (Actividad Normal)</option>
                    <option value="adult_high">Adulto (Alta Actividad / Deporte)</option>
                  </select>
                </div>

                <button 
                  onClick={calculateRation}
                  className="w-full bg-secondary-orange text-white font-bold text-lg py-3 rounded-xl hover:bg-[#d65d21] transition mt-2 shadow-lg border-0"
                >
                  Calcular Ración
                </button>

                <AnimatePresence>
                  {result && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-white/10 rounded-xl p-6 mt-4 text-center border border-white/20"
                    >
                      <p className="text-white/80 text-sm mb-1">Ración diaria recomendada:</p>
                      <p className="font-header text-4xl text-primary-green">{result} <span className="text-xl">gramos</span></p>
                      <p className="text-white/70 text-xs mt-3">
                        * Esta es una guía referencial. Te recomendamos dividir esta cantidad en 2 o 3 tomas al día.
                      </p>
                      <p className="text-white/70 text-xs mt-2 italic">
                        Nota: El porcentaje de ración diaria (en peso) es prácticamente idéntico para dietas BARF y cocinadas, ya que ambas mantienen una densidad calórica y nivel de humedad similares al basarse en ingredientes frescos.
                      </p>
                      <button 
                        onClick={() => {
                          onClose();
                          const tienda = document.getElementById('tienda');
                          if (tienda) tienda.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full bg-white text-secondary-brown font-bold text-sm py-2 rounded-xl hover:bg-gray-100 transition mt-4"
                      >
                        Ver dietas recomendadas
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CalculatorModal;
