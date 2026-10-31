import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

const ProductCard = ({ product, Icon, addItem }) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    // Only use IntersectionObserver on mobile devices
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // If the card is at least 60% visible, trigger the hover state
        if (entry.isIntersecting) {
          setIsHovered(true);
        } else {
          setIsHovered(false);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px', // Trigger closer to the center of the viewport
        threshold: 0.6
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  return (
    <motion.div 
      ref={cardRef}
      onMouseEnter={() => window.matchMedia("(min-width: 769px)").matches && setIsHovered(true)}
      onMouseLeave={() => window.matchMedia("(min-width: 769px)").matches && setIsHovered(false)}
      whileHover={{ y: -5 }}
      className={`rounded-3xl p-8 shadow-lg ${product.color} ${product.textColor} relative overflow-hidden flex flex-col transition-colors duration-500`}
    >
      {/* Background Image Layer */}
      {product.image && (
        <div 
          className={`absolute inset-0 z-0 transition-opacity duration-700 ease-in-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: `url(${product.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
      )}

      {/* Content Layer */}
      <div className={`relative z-10 flex flex-col h-full transition-colors duration-500 ${isHovered && product.image ? 'text-white' : ''}`}>
        <div className={`absolute -right-4 -top-4 opacity-10 ${isHovered && product.image ? 'hidden' : ''}`}>
          <Icon size={120} />
        </div>
        <h3 className="font-header text-2xl mb-2">{product.name}</h3>
        <p className="text-3xl font-bold mb-4 font-sans">${product.price.toLocaleString('es-CL')} <span className="text-sm font-normal opacity-80">/ {product.weight}</span></p>
        <p className="mb-4 opacity-90">{product.description}</p>
        
        {product.ingredients && product.ingredients.length > 0 && (
          <div className={`rounded-xl p-4 mb-6 ${isHovered && product.image ? 'bg-black/40' : 'bg-black/20'}`}>
            <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Info size={16}/> Ingredientes:</p>
            <p className="text-sm opacity-90">{product.ingredients.join(', ')}</p>
          </div>
        )}
        
        <div className="mt-auto pt-4">
          <button 
            onClick={() => addItem(product)}
            className={`w-full font-bold py-3 rounded-xl transition shadow-md ${
              isHovered && product.image 
                ? 'bg-primary-green text-white hover:bg-green-700' 
                : 'bg-white text-secondary-brown hover:bg-gray-100'
            }`}
          >
            Agregar al Carrito
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
