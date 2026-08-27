import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-primary-green-dark text-bg-cream py-8 mt-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-header text-2xl mb-4">Origen Canino</h3>
          <p className="text-secondary-orange max-w-sm">
            Alimentación natural biológicamente apropiada. Hecho con amor en Chile para el bienestar integral de tu fiel compañero.
          </p>
        </div>
        <div>
          <h4 className="font-header text-lg mb-4">Contacto</h4>
          <ul className="space-y-2 font-sans text-sm opacity-80">
            <li><i className="fa-solid fa-envelope mr-2"></i> hola@origencanino.cl</li>
            <li><i className="fa-brands fa-instagram mr-2"></i> @origencanino.cl</li>
          </ul>
        </div>
        <div>
          <h4 className="font-header text-lg mb-4">Enlaces Rápidos</h4>
          <ul className="space-y-2 font-sans text-sm opacity-80">
            <li><a href="/" className="hover:underline">Inicio</a></li>
            <li><a href="/admin" className="hover:underline">Acceso Admin</a></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-8 pt-4 border-t border-primary-green text-center font-sans text-xs opacity-60">
        <p className="mb-1">&copy; {new Date().getFullYear()} Origen Canino. Todos los derechos reservados.</p>
        <p>
          Desarrollado con <i className="fa-solid fa-paw text-secondary-orange mx-1"></i> por{' '}
          <a 
            href="https://ppvsoluciones.cl" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold hover:text-secondary-orange transition-colors"
          >
            PPV Soluciones
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
