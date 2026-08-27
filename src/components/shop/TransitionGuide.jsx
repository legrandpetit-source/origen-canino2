import React from 'react';
import { motion } from 'framer-motion';

const TransitionGuide = () => {
  return (
    <section className="py-16 bg-bg-cream">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-header text-4xl text-secondary-brown mb-4">Deja el pellet sin que le caiga mal</h2>
          <p className="text-lg text-secondary-brown-light max-w-2xl mx-auto">
            Cambiar la alimentación de tu perro es fácil si lo haces progresivamente. 
            Su estómago necesita unos días para volver a un nivel de acidez óptimo y natural.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-red-300"
            >
              <h3 className="font-bold text-xl text-secondary-brown mb-1">Días 1 a 3</h3>
              <p className="text-sm text-gray-500 mb-4">Adaptación inicial</p>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-400">75%</span>
                <span className="font-bold text-primary-green">25%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-gray-400 h-2.5 w-3/4"></div>
                <div className="bg-primary-green h-2.5 w-1/4"></div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">Pellet vs Origen Canino</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-orange-300"
            >
              <h3 className="font-bold text-xl text-secondary-brown mb-1">Días 4 a 6</h3>
              <p className="text-sm text-gray-500 mb-4">Mitad y mitad</p>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-400">50%</span>
                <span className="font-bold text-primary-green">50%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-gray-400 h-2.5 w-2/4"></div>
                <div className="bg-primary-green h-2.5 w-2/4"></div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">Pellet vs Origen Canino</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-yellow-400"
            >
              <h3 className="font-bold text-xl text-secondary-brown mb-1">Días 7 a 9</h3>
              <p className="text-sm text-gray-500 mb-4">Casi listos</p>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-400">25%</span>
                <span className="font-bold text-primary-green">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-gray-400 h-2.5 w-1/4"></div>
                <div className="bg-primary-green h-2.5 w-3/4"></div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">Pellet vs Origen Canino</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-green-500"
            >
              <h3 className="font-bold text-xl text-secondary-brown mb-1">Día 10+</h3>
              <p className="text-sm text-gray-500 mb-4">Transición exitosa</p>
              <div className="flex justify-end items-center mb-2">
                <span className="font-bold text-primary-green">100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                <div className="bg-primary-green h-2.5 w-full"></div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">¡Solo Origen Canino!</p>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default TransitionGuide;
