import React, { useState, useEffect } from 'react';
import { X, Star, Loader } from 'lucide-react';

const AllTestimonialsModal = ({ isOpen, onClose, openSubmitModal }) => {
  const [testimonials, setTestimonials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch(`/api/testimonials`)
        .then(res => res.json())
        .then(data => {
          setTestimonials(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error cargando testimonios:", err);
          setError("No se pudieron cargar los testimonios.");
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-bg-cream w-full max-w-4xl rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 md:p-8 border-b border-gray-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="font-header text-3xl text-secondary-brown">
              Experiencias de nuestros clientes
            </h2>
            <p className="text-secondary-brown-light mt-1">
              Descubre cómo Origen Canino ha cambiado la vida de otras mascotas.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-secondary-brown hover:text-secondary-orange transition bg-gray-100 rounded-full p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-grow bg-gray-50/50">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="animate-spin text-secondary-orange" size={48} />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-10">{error}</div>
          ) : testimonials.length === 0 ? (
            <div className="text-center text-secondary-brown py-10">Aún no hay testimonios aprobados. ¡Sé el primero!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((t) => (
                <div key={t.id} className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-secondary-brown rounded-full flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                      {t.image_path ? (
                        <img src={t.image_path} alt={t.dog_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-xl uppercase">
                          {t.owner_name.charAt(0)}{t.dog_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-secondary-brown text-lg">{t.owner_name} & {t.dog_name}</h4>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} className={i < t.rating ? "text-yellow-400 fill-current" : "text-gray-300"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-secondary-brown-light italic leading-relaxed text-sm md:text-base">
                    "{t.content}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-white text-center">
          <button 
            onClick={() => {
              onClose();
              setTimeout(() => {
                openSubmitModal();
              }, 100); // Pequeño retraso para evitar problemas de scroll
            }}
            className="bg-secondary-orange text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition shadow-lg"
          >
            Escribir mi propia experiencia
          </button>
        </div>

      </div>
    </div>
  );
};

export default AllTestimonialsModal;
