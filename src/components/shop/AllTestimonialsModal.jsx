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
        .then(res => { if (!res.ok) throw new Error("HTTP error " + res.status); return res.json(); })
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
                <div key={t.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200/80 hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3.5 mb-3.5">
                      <div className="w-14 h-14 bg-stone-100 rounded-2xl overflow-hidden shadow-xs border-2 border-white ring-2 ring-[#677333]/25 shrink-0">
                        {t.image_path ? (
                          <img src={t.image_path} alt={t.dog_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#677333] flex items-center justify-center text-white font-bold text-lg uppercase">
                            {t.dog_name ? t.dog_name.charAt(0) : 'P'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-header font-bold text-base text-[#3C2716]">"{t.dog_name}" <span className="text-xs font-normal text-stone-500 font-body">de {t.owner_name}</span></h4>
                        <div className="flex gap-0.5 mt-0.5 text-[#db994b]">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={13} className={i < t.rating ? "fill-current" : "text-stone-200"} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-stone-700 font-body italic leading-relaxed text-sm">
                      "{t.content}"
                    </p>
                  </div>
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
