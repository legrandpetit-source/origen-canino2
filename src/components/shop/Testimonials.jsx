import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import TestimonialFormModal from './TestimonialFormModal';
import AllTestimonialsModal from './AllTestimonialsModal';

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAllOpen, setIsAllOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/testimonials`)
      .then(res => res.json())
      .then(data => {
        // Seleccionar 3 al azar
        const shuffled = data.sort(() => 0.5 - Math.random());
        setTestimonials(shuffled.slice(0, 3));
      })
      .catch(err => console.error("Error fetching testimonials:", err));
  }, []);

  return (
    <section className="py-16 bg-bg-cream relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary-brown/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-header text-3xl md:text-4xl text-secondary-brown mb-4">
            Experiencias que inspiran confianza
          </h2>
          <p className="text-secondary-brown-light/80 text-lg">
            La felicidad se nota en cada mordida. Mira lo que dicen nuestros clientes y sus perritos sobre Origen Canino.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-primary-green-dark/5 flex flex-col h-full transform transition hover:-translate-y-2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-secondary-brown rounded-full flex items-center justify-center overflow-hidden shadow-inner border-2 border-primary-green-light shrink-0">
                  {testimonial.image_path ? (
                    <img src={testimonial.image_path} alt={testimonial.dog_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-2xl uppercase">
                      {testimonial.owner_name.charAt(0)}{testimonial.dog_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-header text-xl text-secondary-brown">{testimonial.owner_name} & "{testimonial.dog_name}"</h3>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className={i < testimonial.rating ? "fill-current" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-secondary-brown-light italic flex-grow">
                "{testimonial.content}"
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-xl mx-auto">
          <button 
            onClick={() => setIsAllOpen(true)}
            className="bg-white text-secondary-brown font-bold py-3 px-8 rounded-xl border-2 border-secondary-brown hover:bg-secondary-brown hover:text-white transition shadow-sm flex-1"
          >
            Ver más testimonios
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-secondary-orange text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition shadow-lg flex-1"
          >
            Dejar mi experiencia
          </button>
        </div>
      </div>

      <TestimonialFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
      <AllTestimonialsModal 
        isOpen={isAllOpen} 
        onClose={() => setIsAllOpen(false)} 
        openSubmitModal={() => setIsFormOpen(true)}
      />
    </section>
  );
};

export default Testimonials;
