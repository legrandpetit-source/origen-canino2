import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Sparkles, X, Calculator, ArrowRight, HeartPulse, Bone, Gift } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Especialidades from './Especialidades';
import Blog from './Blog';
import CalculatorModal from './CalculatorModal';
import HeroCalculator from './HeroCalculator';
import ComparisonTable from './ComparisonTable';
import LogisticsSteps from './LogisticsSteps';
import TransitionGuide from './TransitionGuide';
import BenefitsMarquee from './BenefitsMarquee';
import SuggestedPlans from './SuggestedPlans';
import DeliveryArea from './DeliveryArea';
import Testimonials from './Testimonials';
import ProductCard from './ProductCard';
import FloatingFirstOrderPromo from './FloatingFirstOrderPromo';

const Home = () => {
  const { addItem, nfcCommunity, setNfcCommunity } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [nfcBannerOpen, setNfcBannerOpen] = useState(true);
  const [referralBanner, setReferralBanner] = useState(null);
  const [referralBannerOpen, setReferralBannerOpen] = useState(true);
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

    // Detectar si el usuario ingresó por un enlace o QR de referido (?ref=codigo)
    const refParam = params.get('ref');
    if (refParam) {
      fetch(`/api/referral/validate/${encodeURIComponent(refParam)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.valid) {
            setReferralBanner(data);
            setReferralBannerOpen(true);
            sessionStorage.setItem('origencanino_referral_code', data.referral_code);
            localStorage.setItem('origencanino_coupon_code', data.referral_code);
          }
        })
        .catch(err => console.error("Error validando referido:", err));
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

      {/* Banner de Bienvenida Referido (Amigo) */}
      <AnimatePresence>
        {referralBanner && referralBannerOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-700 text-white px-4 py-3 shadow-md border-b border-white/20 relative z-30"
          >
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3 max-w-6xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full text-white backdrop-blur-xs">
                  <Gift size={22} />
                </div>
                <div>
                  <p className="font-header font-bold text-base flex items-center gap-2">
                    ¡Tu amigo {referralBanner.referrer_name}{referralBanner.dog_name ? ` y ${referralBanner.dog_name}` : ''} te regaló un descuento especial! 🐾
                  </p>
                  <p className="text-xs text-white/90">
                    Código: <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded-md">{referralBanner.referral_code}</span>
                    {" • "}
                    <strong className="text-amber-300 font-bold text-xs bg-black/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Sparkles size={11} /> {referralBanner.discount_percent}% de Descuento Exclusivo
                    </strong> para tu primer pedido.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a 
                  href="#tienda" 
                  className="bg-white text-emerald-800 font-header font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl hover:bg-[#FAF7F2] transition shadow-xs"
                >
                  Ver Menús
                </a>
                <button 
                  onClick={() => setReferralBannerOpen(false)}
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

      {/* Hero Section con Calculadora Médica CRO */}
      <section id="inicio" className="container mx-auto px-4 sm:px-6 pt-3 pb-5 md:pt-5 md:pb-7 flex flex-col lg:flex-row items-center gap-6 lg:gap-10 max-w-6xl">
        <div className="lg:w-1/2 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-2.5 shadow-xs">
            <Sparkles size={12} className="text-primary-green" />
            <span>Comida Real • Vida Saludable</span>
          </div>

          <motion.h1 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-header text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary-brown mb-3 leading-tight tracking-tight"
          >
            Nutrición Evolutiva para el Bienestar de tu Perro
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-xs sm:text-sm md:text-base text-secondary-brown-light/85 mb-4 max-w-lg leading-relaxed font-sans"
          >
            Dietas BARF crudas y recetas cocinadas al vapor con ingredientes 100% naturales de grado humano. Olvídate de las alergias de piel, digestión pesada y sarro dental.
          </motion.p>

          {/* Micro-beneficios con checks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5 text-xs text-secondary-brown font-medium max-w-lg mx-auto lg:mx-0">
            <div className="flex items-center gap-2 justify-center lg:justify-start">
              <span className="text-primary-green font-bold text-sm">✓</span>
              <span>100% Grado Humano, sin harinas ni rellenos</span>
            </div>
            <div className="flex items-center gap-2 justify-center lg:justify-start">
              <span className="text-primary-green font-bold text-sm">✓</span>
              <span>Cadena de frío -18°C Santiago & V Región</span>
            </div>
            <div className="flex items-center gap-2 justify-center lg:justify-start">
              <span className="text-primary-green font-bold text-sm">✓</span>
              <span>Pautas por porción médica según peso</span>
            </div>
            <div className="flex items-center gap-2 justify-center lg:justify-start">
              <span className="text-primary-green font-bold text-sm">✓</span>
              <span>Pack de Transición sin suscripción forzada</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
            <a
              href="#calculadora"
              className="w-full sm:w-auto bg-secondary-orange hover:bg-[#c98336] text-white px-5 py-3 rounded-2xl font-header font-bold text-sm shadow-md transition flex items-center justify-center gap-2 group"
            >
              <Calculator size={18} />
              <span>Calcular Ración Diaria</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>

            <a
              href="#tienda"
              className="w-full sm:w-auto bg-white hover:bg-[#F2ECE1] text-secondary-brown border border-[#E0D5C3] px-5 py-3 rounded-2xl font-header font-bold text-sm transition text-center shadow-xs"
            >
              Ver Menú Completo
            </a>
          </div>

          {/* Prueba Social / Métricas */}
          <div className="mt-5 pt-3 border-t border-[#E8DFC8]/60 flex items-center justify-center lg:justify-start gap-6 text-xs text-gray-500 font-sans">
            <div>
              <span className="font-header font-black text-secondary-brown text-base block leading-none">
                +500
              </span>
              <span>Perritos Sanos</span>
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <span className="font-header font-black text-primary-green text-base block leading-none">
                100%
              </span>
              <span>Natural & Crudo</span>
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <span className="font-header font-black text-secondary-orange text-base block leading-none">
                4.9/5 ⭐
              </span>
              <span>Satisfacción</span>
            </div>
          </div>
        </div>

        {/* Lado Calculadora Médica Hero */}
        <div className="lg:w-1/2 w-full mt-2 lg:mt-0">
          <HeroCalculator />
        </div>
      </section>

      {/* Marquee de Beneficios */}
      <BenefitsMarquee />

      {/* Especialidades (BARF vs Cocinada al vapor - Stitch Style) */}
      <Especialidades />

      {/* Catálogo Fresco Unificado (Stitch Style) */}
      <section id="tienda" className="py-6 md:py-8 bg-[#FAF7F2] scroll-mt-20">
        <div id="shop-section" className="container mx-auto px-4 sm:px-6 max-w-6xl">
          
          {/* Encabezado y Selector de Filtros */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-[#EBE4DA]">
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
      
      {/* Widget Flotante de Descuento 1ra Compra */}
      <FloatingFirstOrderPromo />

      {/* Modal de Calculadora de Raciones */}
      <CalculatorModal 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />
    </div>
  );
};

export default Home;
