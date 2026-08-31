import React from 'react';
import { X, Printer } from 'lucide-react';

const NutritionLabel = ({ product, nutritionData, onClose }) => {
  if (!nutritionData) return null;

  const { per_100g } = nutritionData;

  const printLabel = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto print:shadow-none print:w-auto print:max-w-none">
        {/* Header no imprimible */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h3 className="font-bold text-gray-800">Etiqueta Nutricional</h3>
          <div className="flex gap-2">
            <button onClick={printLabel} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition">
              <Printer size={18} />
            </button>
            <button onClick={onClose} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Etiqueta tipo FDA / Análisis Garantizado */}
        <div className="p-6 bg-white flex justify-center">
          <div className="border-[4px] border-black p-2 w-[300px] bg-white font-sans text-black">
            <h1 className="text-3xl font-black tracking-tighter leading-none m-0 border-b-[8px] border-black pb-1 mb-1">
              Nutrition Facts
            </h1>
            
            <p className="font-bold text-sm m-0">Producto: {product.name}</p>
            <p className="font-bold text-sm m-0 border-b-[4px] border-black pb-1 mb-1">
              Porción: 100g
            </p>

            <div className="flex justify-between items-end border-b-[4px] border-black pb-1 mb-1">
              <div>
                <p className="font-bold text-sm m-0">Amount per 100g</p>
                <p className="text-3xl font-black m-0 leading-none">Calories</p>
              </div>
              <h2 className="text-4xl font-black m-0 leading-none">{Math.round(per_100g.kcal)}</h2>
            </div>

            <div className="border-b-[4px] border-black pb-1 mb-1">
              <p className="text-right font-bold text-xs m-0">% Daily Value*</p>
              
              <div className="flex justify-between border-b border-black py-1">
                <p className="m-0 text-sm">
                  <span className="font-bold">Proteína Bruta</span> (Min)
                </p>
                <p className="m-0 font-bold text-sm">{per_100g.protein.toFixed(1)}g</p>
              </div>

              <div className="flex justify-between border-b border-black py-1">
                <p className="m-0 text-sm">
                  <span className="font-bold">Grasa Total</span> (Min)
                </p>
                <p className="m-0 font-bold text-sm">{per_100g.fat.toFixed(1)}g</p>
              </div>
              
              <div className="flex justify-between border-b border-black py-1">
                <p className="m-0 text-sm">
                  <span className="font-bold">Carbohidratos</span>
                </p>
                <p className="m-0 font-bold text-sm">{per_100g.carbs.toFixed(1)}g</p>
              </div>

              <div className="flex justify-between border-b border-black py-1">
                <p className="m-0 text-sm">
                  <span className="font-bold">Fibra Cruda</span> (Max)
                </p>
                <p className="m-0 font-bold text-sm">{per_100g.fiber.toFixed(1)}g</p>
              </div>

              <div className="flex justify-between border-b border-black py-1">
                <p className="m-0 text-sm">
                  <span className="font-bold">Humedad</span> (Max)
                </p>
                <p className="m-0 font-bold text-sm">{per_100g.moisture.toFixed(1)}g</p>
              </div>

              <div className="flex justify-between py-1">
                <p className="m-0 text-sm">
                  <span className="font-bold">Cenizas / Minerales</span>
                </p>
                <p className="m-0 font-bold text-sm">{per_100g.ash.toFixed(1)}g</p>
              </div>
            </div>

            <p className="text-[10px] leading-tight m-0 text-gray-600">
              * El Análisis Garantizado es una estimación matemática basada en los ingredientes crudos de la receta.
            </p>
          </div>
        </div>
        
        {/* Helper print styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .bg-white.flex.justify-center * { visibility: visible; }
            .bg-white.flex.justify-center { position: absolute; left: 0; top: 0; padding: 0; }
          }
        `}} />
      </div>
    </div>
  );
};

export default NutritionLabel;
