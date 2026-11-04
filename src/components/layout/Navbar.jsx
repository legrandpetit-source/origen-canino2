import React, { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X, User, PawPrint } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { isCartOpen, setIsCartOpen, itemCount } = useCart();
  const { customer, openAuthModal } = useCustomer();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else if (window.location.pathname !== '/') {
      window.location.href = `/#${id}`;
    }
  };

  return (
    <nav className={`bg-[#FAF7F2] text-secondary-brown sticky top-0 z-40 transition-all duration-300 border-b border-[#EBE4DA] ${isScrolled ? 'shadow-md py-2.5' : 'py-3.5'}`}>
      <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center max-w-6xl">
        
        {/* Logo de Marca */}
        <a href="#inicio" onClick={(e) => scrollTo(e, 'inicio')} className="flex items-center gap-2.5 sm:gap-3 group">
          {/* Logo Badge Circular */}
          <div className="h-11 w-11 sm:h-13 sm:w-13 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-[#E5DACD] shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
            <img src="/logo.webp" alt="Origen Canino Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          
          {/* Logotipo Tipográfico */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 leading-none mb-0.5">
              <span className="font-header text-xl sm:text-2xl font-black text-primary-green tracking-tight">Origen</span>
              <span className="font-header text-xl sm:text-2xl font-black text-secondary-brown uppercase tracking-wider">Canino</span>
            </div>
            <span className="font-sans text-[8px] sm:text-[9.5px] font-bold tracking-[0.2em] text-[#7C8B3E] uppercase block">
              Comida Real • Vida Saludable
            </span>
          </div>
        </a>

        {/* Menú Desktop */}
        <div className="hidden md:flex items-center gap-6 font-header text-sm font-bold text-secondary-brown">
          <a href="#planes" onClick={(e) => scrollTo(e, 'planes')} className="hover:text-primary-green transition">Planes Mensuales</a>
          <a href="#despacho" onClick={(e) => scrollTo(e, 'despacho')} className="hover:text-primary-green transition">Despacho</a>
          <a href="#tienda" onClick={(e) => scrollTo(e, 'tienda')} className="hover:text-primary-green transition">Tienda</a>
          
          {/* Botón Mi Cuenta */}
          {customer ? (
            <Link 
              to="/mi-cuenta" 
              className="flex items-center gap-2 bg-primary-green/10 text-primary-green px-3.5 py-1.5 rounded-full hover:bg-primary-green hover:text-white transition text-xs font-sans font-bold shadow-2xs"
              title="Ir a mi portal de cliente"
            >
              <PawPrint size={15} />
              <span>Hola, {customer.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <button 
              onClick={() => openAuthModal('login')} 
              className="flex items-center gap-1.5 text-secondary-brown hover:text-primary-green transition text-xs font-sans font-bold px-3 py-1.5 rounded-xl hover:bg-white"
            >
              <User size={16} />
              <span>Mi Cuenta</span>
            </button>
          )}

          {/* Botón Carrito */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 text-primary-green hover:bg-primary-green/10 rounded-2xl transition bg-white border border-[#E5DACD] shadow-2xs"
            title="Ver carrito de compras"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-accent-red text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-xs">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Controles Móviles (Motorola / Smartphones / Tablets) */}
        <div className="md:hidden flex items-center gap-2">
          {customer ? (
            <Link 
              to="/mi-cuenta" 
              className="p-2 text-primary-green bg-primary-green/10 rounded-xl"
              title="Mi Cuenta"
            >
              <PawPrint size={18} />
            </Link>
          ) : (
            <button 
              onClick={() => openAuthModal('login')} 
              className="p-2 text-secondary-brown"
              title="Iniciar Sesión"
            >
              <User size={20} />
            </button>
          )}

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-primary-green bg-white rounded-xl border border-[#E5DACD]"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-accent-red text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 text-secondary-brown hover:text-primary-green transition rounded-xl"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#EBE4DA] shadow-xl flex flex-col py-3 px-6 font-header text-base text-secondary-brown animate-fadeIn">
          <a href="#planes" onClick={(e) => scrollTo(e, 'planes')} className="py-3 border-b border-[#F0EBE3] hover:text-primary-green">Planes Mensuales</a>
          <a href="#despacho" onClick={(e) => scrollTo(e, 'despacho')} className="py-3 border-b border-[#F0EBE3] hover:text-primary-green">Despacho</a>
          <a href="#tienda" onClick={(e) => scrollTo(e, 'tienda')} className="py-3 border-b border-[#F0EBE3] hover:text-primary-green">Tienda</a>
          
          {customer ? (
            <Link 
              to="/mi-cuenta" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 hover:text-primary-green flex items-center gap-2 text-primary-green font-bold"
            >
              <PawPrint size={18} />
              <span>Mi Cuenta ({customer.name.split(' ')[0]})</span>
            </Link>
          ) : (
            <button 
              onClick={() => { setMobileMenuOpen(false); openAuthModal('login'); }}
              className="py-3 hover:text-primary-green text-left flex items-center gap-2"
            >
              <User size={18} />
              <span>Ingresar a Mi Cuenta</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
