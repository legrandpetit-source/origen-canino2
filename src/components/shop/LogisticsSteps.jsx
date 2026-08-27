import React from 'react';
import { motion } from 'framer-motion';
import { Snowflake, MessageCircle, Truck } from 'lucide-react';

const LogisticsSteps = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-header text-4xl text-secondary-brown mb-4">¿Cómo llega a tu perro?</h2>
          <p className="text-lg text-secondary-brown-light max-w-2xl mx-auto">
            Mantenemos la cadena de frío en todo momento para que la comida llegue fresca y en perfectas condiciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          
          {/* Step 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center p-6"
          >
            <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <Snowflake size={40} />
            </div>
            <h3 className="font-header text-2xl text-secondary-brown mb-2">1. Sale en frío</h3>
            <p className="text-gray-600">Porcionamos, sellamos al vacío y congelamos el alimento inmediatamente para preservar sus nutrientes de forma 100% natural.</p>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center text-center p-6 relative"
          >
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <MessageCircle size={40} />
            </div>
            <h3 className="font-header text-2xl text-secondary-brown mb-2">2. Te avisamos por WhatsApp</h3>
            <p className="text-gray-600">Cuando tu pedido esté listo para salir, te contactaremos directamente para coordinar la entrega y asegurarnos de que estés en casa.</p>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center text-center p-6"
          >
            <div className="w-20 h-20 bg-primary-green/20 text-primary-green rounded-full flex items-center justify-center mb-6 shadow-lg">
              <Truck size={40} />
            </div>
            <h3 className="font-header text-2xl text-secondary-brown mb-2">3. Llega a tu puerta</h3>
            <p className="text-gray-600">Enviamos el mismo día mediante despacho exprés. Tu perro recibirá su alimento sin romper la cadena de frío.</p>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default LogisticsSteps;
