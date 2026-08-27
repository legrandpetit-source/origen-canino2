import React from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

const ComparisonTable = () => {
  return (
    <section className="py-6 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-header text-4xl text-secondary-brown mb-4">¿Por qué elegir Origen Canino?</h2>
          <p className="text-lg text-secondary-brown-light max-w-2xl mx-auto">
            Descubre por qué miles de dueños están dejando el alimento ultraprocesado y cambiándose a la alimentación natural evolutiva.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-bg-cream rounded-3xl p-6 md:p-10 shadow-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 font-header text-xl text-secondary-brown">Característica</th>
                <th className="text-center py-4 px-4 font-header text-xl text-gray-500">Pellet Comercial</th>
                <th className="text-center py-4 px-4 font-header text-xl text-primary-green">Origen Canino (Cocinada)</th>
                <th className="text-center py-4 px-4 font-header text-xl text-secondary-brown">Origen Canino (BARF)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-white/50 transition">
                <td className="py-4 px-4 font-bold text-secondary-brown">Humedad Natural (Hidratación)</td>
                <td className="py-4 px-4 text-center"><X className="inline text-red-500" size={24} /> <span className="text-sm block text-gray-500">Seco (10%)</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-gray-700">Alta (70%)</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-gray-700">Muy Alta (75%)</span></td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-white/50 transition">
                <td className="py-4 px-4 font-bold text-secondary-brown">Digestibilidad</td>
                <td className="py-4 px-4 text-center"><span className="text-sm text-gray-500">Baja (Heces grandes)</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-gray-700">Excelente (Muy suave)</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-gray-700">Excelente</span></td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-white/50 transition">
                <td className="py-4 px-4 font-bold text-secondary-brown">Ingredientes Grado Humano</td>
                <td className="py-4 px-4 text-center"><X className="inline text-red-500" size={24} /></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /></td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-white/50 transition">
                <td className="py-4 px-4 font-bold text-secondary-brown">Conservantes Artificiales</td>
                <td className="py-4 px-4 text-center"><span className="text-sm text-red-500 font-bold">Sí</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-gray-700">100% Natural</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-gray-700">100% Natural</span></td>
              </tr>
              <tr className="hover:bg-white/50 transition">
                <td className="py-4 px-4 font-bold text-secondary-brown">Salud Dental</td>
                <td className="py-4 px-4 text-center"><span className="text-sm text-gray-500">Acumula Sarro</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-gray-700">No ensucia</span></td>
                <td className="py-4 px-4 text-center"><Check className="inline text-green-500" size={24} /> <span className="text-sm block text-primary-green font-bold">Limpia el sarro</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
