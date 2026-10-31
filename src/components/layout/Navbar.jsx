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
    <nav className={`bg-bg-cream text-primary-green-dark sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'shadow-md py-2' : 'shadow-sm py-3'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        
        <a href="#inicio" onClick={(e) => scrollTo(e, 'inicio')} className="flex items-center gap-3 md:gap-4">
          {/* Circular logo badge */}
          <div className="h-14 w-14 md:h-20 md:w-20 rounded-full bg-white flex items-center justify-center overflow-hidden">
            <img src="/logo.jpg" alt="Origen Canino Logo" className="w-full h-full object-contain" />
          </div>
          
          {/* Text Logo */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5">
              <span className="font-script text-3xl md:text-5xl text-primary-green leading-none transform -translate-y-1">Origen</span>
              <i className="fa-solid fa-paw text-primary-green text-lg md:text-2xl"></i>
              <span className="font-header text-3xl md:text-5xl font-bold text-secondary-brown tracking-wide leading-none uppercase">Canino</span>
            </div>
            <div className="border-t border-gray-300 w-full pt-1">
              <span className="font-sans text-[9px] md:text-xs font-bold tracking-[0.15em] md:tracking-[0.25em] text-primary-green uppercase block w-full text-center">
                Comida Real, Vida Saludable
              </span>
            </div>
          </div>
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6 font-header text-lg text-secondary-brown">
          <a href="#planes" onClick={(e) => scrollTo(e, 'planes')} className="hover:text-primary-green transition">Planes Mensuales</a>
          <a href="#despacho" onClick={(e) => scrollTo(e, 'despacho')} className="hover:text-primary-green transition">Despacho</a>
          <a href="#tienda" onClick={(e) => scrollTo(e, 'tienda')} className="hover:text-primary-green transition">Tienda</a>
          
          {/* Customer Account Button */}
          {customer ? (
            <Link 
              to="/mi-cuenta" 
              className="flex items-center gap-2 bg-primary-green/10 text-primary-green px-3.5 py-1.5 rounded-full hover:bg-primary-green hover:text-white transition text-sm font-sans font-bold shadow-sm"
              title="Ir a mi portal de cliente"
            >
              <PawPrint size={16} />
              <span>Hola, {customer.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <button 
              onClick={() => openAuthModal('login')} 
              className="flex items-center gap-1.5 text-secondary-brown hover:text-primary-green transition text-sm font-sans font-bold px-3 py-1.5 rounded-xl hover:bg-gray-100"
            >
              <User size={18} />
              <span>Mi Cuenta</span>
            </button>
          )}

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-primary-green hover:bg-primary-green/10 rounded-full transition"
          >
            <ShoppingBag size={28} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-3">
          {customer ? (
            <Link 
              to="/mi-cuenta" 
              className="p-2 text-primary-green bg-primary-green/10 rounded-full"
              title="Mi Cuenta"
            >
              <PawPrint size={20} />
            </Link>
          ) : (
            <button 
              onClick={() => openAuthModal('login')} 
              className="p-2 text-secondary-brown"
              title="Iniciar Sesión"
            >
              <User size={22} />
            </button>
          )}

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-primary-green"
          >
            <ShoppingBag size={24} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-secondary-brown">
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-xl border-t border-gray-100 flex flex-col py-4 px-6 font-header text-xl text-secondary-brown z-50">
          <a href="#planes" onClick={(e) => scrollTo(e, 'planes')} className="py-3 border-b border-gray-100 hover:text-primary-green">Planes Mensuales</a>
          <a href="#despacho" onClick={(e) => scrollTo(e, 'despacho')} className="py-3 border-b border-gray-100 hover:text-primary-green">Despacho</a>
          <a href="#tienda" onClick={(e) => scrollTo(e, 'tienda')} className="py-3 border-b border-gray-100 hover:text-primary-green">Tienda</a>
          
          {customer ? (
            <Link 
              to="/mi-cuenta" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 hover:text-primary-green flex items-center gap-2 text-primary-green"
            >
              <PawPrint size={20} />
              Mi Cuenta ({customer.name.split(' ')[0]})
            </Link>
          ) : (
            <button 
              onClick={() => { setMobileMenuOpen(false); openAuthModal('login'); }}
              className="py-3 hover:text-primary-green text-left flex items-center gap-2"
            >
              <User size={20} />
              Ingresar a Mi Cuenta
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
