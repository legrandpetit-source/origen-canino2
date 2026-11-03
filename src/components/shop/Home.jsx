import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Sparkles, X, Calculator, ArrowRight, HeartPulse, Bone } from 'lucide-react';
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

const Home = () => {
  const { addItem, nfcCommunity, setNfcCommunity } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [nfcBannerOpen, setNfcBannerOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'barf', 'cocinada', 'snack'

  useEffect(() => {
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

    // Escuchar eventos de filtro desde otras secciones (e.g. Especialidades)
    const handleFilterEvent = (e) => {
      if (e.detail) {
        setSelectedCategory(e.detail);
      }
    };
    window.addEventListener('filter-catalog', handleFilterEvent);
    return () => window.removeEventListener('filter-catalog', handleFilterEvent);
  }, []);

  useEffect(() => {
    fetch('/api/products')
      .then(res => { 
        if (!res.ok) throw new Error("HTTP error " + res.status); 
        return res.json(); 
      })
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, []);

  // Filtrado de productos
  const filteredProducts = products.filter(p => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'barf') return p.type === 'barf' || !p.type;
    if (selectedCategory === 'cocinada') return p.type === 'cocinada';
    if (selectedCategory === 'snack') return p.type === 'snack';
    return true;
  });

  return (
    <div className="w-full overflow-x-hidden bg-[#FAF7F2]">
      
      {/* Banner de Bienvenida NFC para Condominios */}
      <AnimatePresence>
        {nfcCommunity && nfcBannerOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary-green text-white px-4 py-3 shadow-md border-b border-white/20 relative z-30"
          >
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3 max-w-6xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full text-white backdrop-blur-xs">
                  <Building2 size={22} />
                </div>
                <div>
                  <p className="font-header font-bold text-base flex items-center gap-2">
                    ¡Hola vecino de <span className="underline decoration-secondary-orange underline-offset-4">{nfcCommunity.name}</span>! 🐾
                  </p>
                  <p className="text-xs text-white/90">
                    {nfcCommunity.address} {nfcCommunity.street_references && `(${nfcCommunity.street_references})`}
                    {" • "}
                    <strong className="text-secondary-orange font-bold text-xs bg-white/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Sparkles size={11} /> {nfcCommunity.discount_percent}% de Descuento Exclusivo
                    </strong> aplicado automáticamente a tu compra.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a 
                  href="#tienda" 
                  className="bg-white text-primary-green font-header font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl hover:bg-[#FAF7F2] transition shadow-xs"
                >
                  Ver Menú con Descuento
                </a>
                <button 
                  onClick={() => setNfcBannerOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
                  title="Cerrar aviso"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="inicio" className="container mx-auto px-4 sm:px-6 py-8 md:py-14 flex flex-col md:flex-row items-center gap-8 md:gap-12 max-w-6xl">
        <div className="md:w-1/2 text-center md:text-left">
          
          <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-3 shadow-xs">
            Comida Real • Vida Saludable
          </span>

          <motion.h1 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-header text-4xl sm:text-5xl lg:text-6xl font-extrabold text-secondary-brown mb-4 leading-tight tracking-tight"
          >
            Nutrición Evolutiva para su Bienestar
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm sm:text-base md:text-lg text-secondary-brown-light/85 mb-6 max-w-lg leading-relaxed font-sans"
          >
            Ofrecemos dietas BARF crudas y recetas cocinadas al vapor con ingredientes 100% naturales de grado humano. Diseñamos la porción diaria perfecta según las características únicas de tu perro.
          </motion.p>

          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCalculatorOpen(true)}
              className="w-full sm:w-auto bg-secondary-orange hover:bg-[#c98336] text-white px-6 py-3.5 rounded-2xl font-header font-bold text-sm shadow-md transition flex items-center justify-center gap-2 group"
            >
              <Calculator size={18} />
              <span>Calculadora de Raciones</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <a
              href="#tienda"
              className="w-full sm:w-auto bg-white hover:bg-[#F2ECE1] text-secondary-brown border border-[#E0D5C3] px-6 py-3.5 rounded-2xl font-header font-bold text-sm transition text-center shadow-xs"
            >
              Ver Menú Completo
            </a>
          </div>
        </div>

        {/* Lado Imagen Hero */}
        <div className="md:w-1/2 relative flex justify-center mt-6 md:mt-0">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Logo en tarjeta blanca limpia */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-[#EBE4DA] max-w-[320px] sm:max-w-[380px]">
              <img 
                src="/logo.jpg" 
                alt="Origen Canino Logo Oficial" 
                className="w-full h-auto object-contain rounded-2xl" 
              />
            </div>

            {/* Badge Flotante 1 - Digestibilidad */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-4 -left-4 sm:-left-8 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl shadow-lg border border-[#EBE4DA] flex items-center gap-2.5 z-10"
            >
              <div className="bg-red-50 text-accent-red p-2 rounded-xl">
                <HeartPulse size={20} />
              </div>
              <div className="text-left">
                <p className="font-header font-bold text-secondary-brown text-xs sm:text-sm leading-tight">100% Digestible</p>
                <p className="text-[10px] text-gray-500 font-sans">Adiós a las alergias de piel</p>
              </div>
            </motion.div>

            {/* Badge Flotante 2 - Salud Dental */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-4 -right-4 sm:-right-6 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl shadow-lg border border-[#EBE4DA] flex items-center gap-2.5 z-10"
            >
              <div className="bg-emerald-50 text-primary-green p-2 rounded-xl">
                <Bone size={20} />
              </div>
              <div className="text-left">
                <p className="font-header font-bold text-secondary-brown text-xs sm:text-sm leading-tight">Dientes Sanos</p>
                <p className="text-[10px] text-gray-500 font-sans">Acción enzimática natural</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Marquee de Beneficios */}
      <BenefitsMarquee />

      {/* Especialidades (BARF vs Cocinada al vapor - Stitch Style) */}
      <Especialidades />

      {/* Catálogo Fresco Unificado (Stitch Style) */}
      <section id="tienda" className="py-10 md:py-16 bg-[#FAF7F2] scroll-mt-20">
        <div id="shop-section" className="container mx-auto px-4 sm:px-6 max-w-6xl">
          
          {/* Encabezado y Selector de Filtros */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-[#EBE4DA]">
            <div>
              <span className="inline-block bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-2.5 shadow-2xs">
                Catálogo Fresco
              </span>
              <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-extrabold text-secondary-brown tracking-tight">
                Nuestras Dietas & Snacks Naturales
              </h2>
              <p className="text-xs sm:text-sm text-secondary-brown-light/80 mt-1.5 font-sans">
                Recetas empacadas al vacío listas para descongelar y servir.
              </p>
            </div>

            {/* Píldoras de Filtro (Stitch Style) */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'Todas las Dietas' },
                { id: 'barf', label: 'BARF Cruda' },
                { id: 'cocinada', label: 'Cocinada al Vapor' },
                { id: 'snack', label: 'Snacks Deshidratados' }
              ].map((tab) => {
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`text-xs sm:text-sm font-header font-bold px-4 py-2 rounded-full transition-all shadow-2xs ${
                      isActive
                        ? 'bg-primary-green text-white shadow-sm'
                        : 'bg-white hover:bg-[#F2ECE1] text-secondary-brown border border-[#E5DACD]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Productos */}
          {loading ? (
            <div className="text-center py-16 text-secondary-brown-light">
              <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-primary-green"></i>
              <p className="font-header font-bold text-sm">Cargando menú fresco...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  addItem={addItem} 
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tabla Comparativa (Pellet vs Cocinada vs BARF - Stitch Style) */}
      <ComparisonTable />
      
      {/* Testimonios */}
      <Testimonials />

      {/* Planes Sugeridos (Guía de Compra Mensual - Stitch Style) */}
      <SuggestedPlans />

      {/* Pasos Logísticos */}
      <LogisticsSteps />

      {/* Zonas de Despacho (Layout Compacto y Proporcionado) */}
      <DeliveryArea />

      {/* Guía de Transición */}
      <TransitionGuide />

      {/* Blog */}
      <Blog />
      
      {/* Modal de Calculadora de Raciones */}
      <CalculatorModal 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />
    </div>
  );
};

export default Home;
