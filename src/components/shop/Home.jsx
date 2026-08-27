import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Info, HeartPulse, Bone } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Especialidades from './Especialidades';
import Blog from './Blog';
import CalculatorModal from './CalculatorModal';
import ComparisonTable from './ComparisonTable';
import LogisticsSteps from './LogisticsSteps';
import TransitionGuide from './TransitionGuide';
import BenefitsMarquee from './BenefitsMarquee';
import SuggestedPlans from './SuggestedPlans';
import DeliveryArea from './DeliveryArea';
import Testimonials from './Testimonials';

// Products will be fetched from API

const Home = () => {
  const { addItem } = useCart();
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        // Asignamos colores estáticos por ahora basados en el index o tipo
        const productsWithColors = data.map(p => {
          let colorClass = 'bg-primary-green';
          if (p.type === 'cocinada') colorClass = 'bg-secondary-brown';
          if (p.type === 'snack') colorClass = 'bg-secondary-brown-light'; // Color distintivo para snacks
          
          return {
            ...p,
            color: colorClass,
            textColor: 'text-white'
          };
        });
        setProducts(productsWithColors);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full overflow-hidden">
      {/* Hero Section */}
      <section id="inicio" className="container mx-auto px-4 py-8 md:py-12 flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-script text-4xl md:text-5xl text-primary-green mb-2"
          >
            Alimentación Natural Premium
          </motion.h2>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-header text-5xl md:text-6xl text-secondary-brown mb-6 leading-tight"
          >
            Nutrición Evolutiva para su Bienestar
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl opacity-80 mb-8 max-w-xl text-secondary-brown-light"
          >
            Ofrecemos dietas BARF crudas y recetas cocinadas al vapor con ingredientes 100% naturales de grado humano. Diseñamos la porción diaria perfecta según las características únicas de tu perro.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setIsCalculatorOpen(true)}
            className="bg-secondary-orange text-white px-6 py-3 rounded-xl font-bold hover:bg-[#d65d21] transition shadow-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-calculator"></i> Calculadora de Raciones
          </motion.button>
        </div>

        <div className="md:w-1/2 relative flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 1 }}
            className="relative"
          >
            {/* Main Logo Image with slight rotation */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-xl transform rotate-3">
              <img src="/logo.jpg" alt="Origen Canino Logo" className="w-56 sm:w-72 md:w-96 rounded-2xl" />
            </div>

            {/* Floating Badge 1 - Top Left */}
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute -top-6 -left-12 md:-left-24 z-10"
            >
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="bg-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 transform -rotate-3"
              >
                <div className="bg-red-50 text-red-500 p-2 rounded-full">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <p className="font-bold text-secondary-brown text-sm">100% Digestible</p>
                  <p className="text-xs text-gray-500">Adiós a las alergias de piel</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Floating Badge 2 - Bottom Right */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7, type: 'spring' }}
              className="absolute -bottom-6 -right-6 md:-right-12 z-10"
            >
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="bg-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 transform rotate-3"
              >
                <div className="bg-red-50 text-red-700 p-2 rounded-full">
                  <Bone size={24} />
                </div>
                <div>
                  <p className="font-bold text-secondary-brown text-sm">Dientes Sanos</p>
                  <p className="text-xs text-gray-500">Adiós al sarro canino</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Marquee just below Hero */}
      <BenefitsMarquee />

      {/* Especialidades Section */}
      <Especialidades />

      {/* Why Choose Us / Comparison */}
      <ComparisonTable />
      
      {/* Testimonials */}
      <Testimonials />

      {/* Logistics Transparency */}
      <LogisticsSteps />

      {/* Delivery Area Map */}
      <DeliveryArea />

      {/* Suggested Plans (Buyer's Guide) */}
      <SuggestedPlans />

      {/* Dietas Section */}
      <section id="tienda" className="py-10 bg-bg-cream scroll-mt-24">
        <div id="shop-section" className="container mx-auto px-4">
          <h2 className="font-header text-4xl text-center text-secondary-brown mb-8">Nuestras Dietas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {loading ? (
              <div className="col-span-1 md:col-span-2 text-center text-secondary-brown-light py-10">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-4 text-primary-green"></i>
                <p>Cargando deliciosas recetas...</p>
              </div>
            ) : products.filter(p => p.type !== 'snack').map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -5 }}
                className={`rounded-3xl p-8 shadow-lg ${product.color} ${product.textColor} relative overflow-hidden flex flex-col`}
              >
                <div className="absolute -right-4 -top-4 opacity-10">
                  <Leaf size={120} />
                </div>
                <h3 className="font-header text-2xl mb-2">{product.name}</h3>
                <p className="text-3xl font-bold mb-4 font-sans">${product.price.toLocaleString('es-CL')} <span className="text-sm font-normal opacity-80">/ {product.weight}</span></p>
                <p className="mb-4 opacity-90">{product.description}</p>
                
                {product.ingredients && product.ingredients.length > 0 && (
                  <div className="bg-black/20 rounded-xl p-4 mb-6">
                    <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Info size={16}/> Ingredientes:</p>
                    <p className="text-sm opacity-90">{product.ingredients.join(', ')}</p>
                  </div>
                )}
                
                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => addItem(product)}
                    className="w-full bg-white text-secondary-brown font-bold py-3 rounded-xl hover:bg-gray-100 transition shadow-md"
                  >
                    Agregar al Carrito
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Snacks Section */}
      <section id="snacks" className="py-10 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="font-header text-4xl text-center text-secondary-brown mb-8">Snacks Naturales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {loading ? (
              <div className="col-span-1 md:col-span-2 text-center text-secondary-brown-light py-10">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-4 text-primary-green"></i>
                <p>Cargando snacks...</p>
              </div>
            ) : products.filter(p => p.type === 'snack').map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -5 }}
                className={`rounded-3xl p-8 shadow-lg ${product.color} ${product.textColor} relative overflow-hidden flex flex-col`}
              >
                <div className="absolute -right-4 -top-4 opacity-10">
                  <Bone size={120} />
                </div>
                <h3 className="font-header text-2xl mb-2">{product.name}</h3>
                <p className="text-3xl font-bold mb-4 font-sans">${product.price.toLocaleString('es-CL')} <span className="text-sm font-normal opacity-80">/ {product.weight}</span></p>
                <p className="mb-4 opacity-90">{product.description}</p>
                
                {product.ingredients && product.ingredients.length > 0 && (
                  <div className="bg-black/20 rounded-xl p-4 mb-6">
                    <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Info size={16}/> Ingredientes:</p>
                    <p className="text-sm opacity-90">{product.ingredients.join(', ')}</p>
                  </div>
                )}
                
                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => addItem(product)}
                    className="w-full bg-white text-secondary-brown font-bold py-3 rounded-xl hover:bg-gray-100 transition shadow-md"
                  >
                    Agregar al Carrito
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Transition Guide */}
      <TransitionGuide />

      {/* Blog Section */}
      <Blog />
      
      <CalculatorModal 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />
    </div>
  );
};

export default Home;

