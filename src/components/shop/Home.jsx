import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Info, HeartPulse, Bone, Building2, Check, Sparkles, X } from 'lucide-react';
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
import ProductCard from './ProductCard';

// Products will be fetched from API

const Home = () => {
  const { addItem, nfcCommunity, setNfcCommunity, clearNfcCommunity } = useCart();
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [nfcBannerOpen, setNfcBannerOpen] = React.useState(true);

  React.useEffect(() => {
    // Detectar si el usuario ingresó por un tag NFC de condominio/edificio (?nfc=slug)
    const params = new URLSearchParams(window.location.search);
    const nfcParam = params.get('nfc');
    if (nfcParam) {
      fetch(`/api/nfc/validate/${encodeURIComponent(nfcParam)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.valid) {
            setNfcCommunity(data);
            setNfcBannerOpen(true);
          }
        })
        .catch(err => console.error("Error validando NFC:", err));
    }
  }, []);

  React.useEffect(() => {
    fetch('/api/products')
      .then(res => { if (!res.ok) throw new Error("HTTP error " + res.status); return res.json(); })
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
      {/* Banner de Bienvenida NFC para Condominios */}
      <AnimatePresence>
        {nfcCommunity && nfcBannerOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-primary-green to-primary-green-dark text-white px-4 py-3 shadow-lg border-b border-white/20 relative z-30"
          >
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full text-white backdrop-blur-sm">
                  <Building2 size={24} />
                </div>
                <div>
                  <p className="font-header font-bold text-lg flex items-center gap-2">
                    ¡Hola vecino de <span className="underline decoration-secondary-orange underline-offset-4">{nfcCommunity.name}</span>! 🐾
                  </p>
                  <p className="text-xs text-white/90">
                    {nfcCommunity.address} {nfcCommunity.street_references && `(${nfcCommunity.street_references})`}
                    {" • "}
                    <strong className="text-secondary-orange font-bold text-sm bg-white/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Sparkles size={12} /> {nfcCommunity.discount_percent}% de Descuento Exclusivo
                    </strong> aplicado automáticamente a tu compra.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a 
                  href="#tienda" 
                  className="bg-white text-primary-green font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-bg-cream transition shadow"
                >
                  Ver Menú con Descuento
                </a>
                <button 
                  onClick={() => setNfcBannerOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
                  title="Cerrar aviso"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <ProductCard 
                key={product.id} 
                product={product} 
                Icon={Leaf} 
                addItem={addItem} 
              />
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
              <ProductCard 
                key={product.id} 
                product={product} 
                Icon={Bone} 
                addItem={addItem} 
              />
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

