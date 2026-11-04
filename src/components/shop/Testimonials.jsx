import React, { useState, useEffect } from 'react';
import { Star, Quote, Heart, Sparkles, CheckCircle2, MessageSquareHeart, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import TestimonialFormModal from './TestimonialFormModal';
import AllTestimonialsModal from './AllTestimonialsModal';

const getDietTag = (dogName, content = '') => {
  const text = (dogName + ' ' + content).toLowerCase();
  if (text.includes('cerdo') || text.includes('alergia')) {
    return { label: '🥘 Dieta Cerdo Cocinada', tagBg: 'bg-[#FAF2E8] text-[#8C5E35] border-[#EAD5C3]' };
  }
  if (text.includes('congelador') || text.includes('vapor') || text.includes('caliento')) {
    return { label: '🥩 Menú Cocinado al Vapor', tagBg: 'bg-[#EBF2DA] text-[#4E5824] border-[#D4E4B5]' };
  }
  if (text.includes('barf') || text.includes('digestión') || text.includes('estómago') || text.includes('energía')) {
    return { label: '🐾 Dieta BARF Equilibrada', tagBg: 'bg-[#F0F5E4] text-[#556328] border-[#DCE7C5]' };
  }
  return { label: '🌿 Nutrición 100% Real', tagBg: 'bg-[#EBF2DA] text-[#4E5824] border-[#D4E4B5]' };
};

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAllOpen, setIsAllOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/testimonials`)
      .then(res => { if (!res.ok) throw new Error("HTTP error " + res.status); return res.json(); })
      .then(data => {
        // Ordenar con preferencia a los que tienen fotos o destacar Luna, Max y Pipo
        const prioritized = [...data].sort((a, b) => {
          if (a.image_path && !b.image_path) return -1;
          if (!a.image_path && b.image_path) return 1;
          return 0;
        });
        setTestimonials(prioritized.slice(0, 3));
      })
      .catch(err => console.error("Error fetching testimonials:", err));
  }, []);

  return (
    <section id="testimonios" className="py-16 md:py-24 bg-[#FAF7F2] relative overflow-hidden">
      {/* Glows decorativos de fondo acordes a la paleta oficial */}
      <div className="absolute top-10 right-0 w-96 h-96 bg-[#677333]/5 rounded-full blur-3xl pointer-events-none -mr-20" />
      <div className="absolute bottom-10 left-0 w-96 h-96 bg-[#db994b]/10 rounded-full blur-3xl pointer-events-none -ml-20" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
        
        {/* Cabecera con Chip y Tipografía Oficial */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <span className="inline-flex items-center gap-1.5 bg-[#EBF2DA] text-[#4E5824] text-[11px] sm:text-xs font-bold tracking-widest uppercase px-3.5 py-1 rounded-full mb-3 shadow-xs">
            <Heart size={13} className="text-[#677333] fill-[#677333]" /> Experiencias Reales
          </span>
          <h2 className="font-header text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#3C2716] mb-3.5 tracking-tight leading-tight">
            Experiencias que inspiran confianza
          </h2>
          <p className="text-stone-600 text-sm sm:text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto">
            La felicidad se nota en su pelaje, su vitalidad y cada mordida. Historias de tutores que eligieron nutrición natural de grado humano en Santiago.
          </p>

          {/* Badge de Confianza Rápida */}
          <div className="mt-4 inline-flex items-center gap-2 bg-white/80 border border-stone-200/60 rounded-full px-4 py-1.5 shadow-xs text-xs text-stone-600 font-medium">
            <span className="flex text-[#db994b]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} className="fill-current" />
              ))}
            </span>
            <span className="font-bold text-[#3C2716]">5.0 de Calificación</span>
            <span className="text-stone-300">•</span>
            <span>+150 perritos felices</span>
          </div>
        </div>

        {/* Grilla de Testimonios Rediseñada */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {testimonials.map((testimonial, idx) => {
            const diet = getDietTag(testimonial.dog_name, testimonial.content);
            return (
              <motion.div 
                key={testimonial.id || idx}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-[#3C2716]/5 border border-stone-200/70 hover:border-[#db994b]/40 hover:shadow-xl transition-all flex flex-col justify-between relative group overflow-hidden"
              >
                {/* Marca de agua de comilla suave */}
                <Quote size={42} className="absolute top-5 right-5 text-stone-100 group-hover:text-[#db994b]/15 transition-colors pointer-events-none" />

                <div>
                  {/* Perfil del Perro y Tutor */}
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-2 ring-[#677333]/25 shrink-0 bg-stone-100">
                      {testimonial.image_path ? (
                        <img 
                          src={testimonial.image_path} 
                          alt={testimonial.dog_name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#677333] to-[#4E5824] flex items-center justify-center text-white font-header font-bold text-xl uppercase">
                          {testimonial.dog_name ? testimonial.dog_name.charAt(0) : 'P'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-header font-extrabold text-lg text-[#3C2716] truncate">
                          "{testimonial.dog_name}"
                        </h3>
                        <span className="text-xs text-stone-500 font-body">
                          de {testimonial.owner_name}
                        </span>
                      </div>

                      {/* Estrellas doradas cálidas */}
                      <div className="flex items-center gap-1 mt-1 text-[#db994b]">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < (testimonial.rating || 5) ? "fill-current text-[#db994b]" : "text-stone-200"} 
                          />
                        ))}
                      </div>

                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#677333] bg-[#EBF2DA] px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Compra Verificada
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo del Testimonio */}
                  <p className="text-stone-700 font-body text-sm sm:text-[14.5px] leading-relaxed italic mb-5">
                    "{testimonial.content}"
                  </p>
                </div>

                {/* Footer de la tarjeta con tag del producto y comuna/ciudad */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${diet.tagBg}`}>
                    {testimonial.diet_tag || diet.label}
                  </span>
                  <span className="text-[11px] font-medium text-stone-400">
                    {testimonial.location || 'Santiago, CL'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Botones de Acción Estilizados */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 max-w-md mx-auto">
          <button 
            onClick={() => setIsAllOpen(true)}
            className="w-full sm:w-auto flex-1 bg-white hover:bg-stone-50 text-[#3C2716] font-header font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl border-2 border-[#3C2716]/20 hover:border-[#3C2716] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users size={16} /> Ver más testimonios
          </button>
          
          <button 
            onClick={() => setIsFormOpen(true)}
            className="w-full sm:w-auto flex-1 bg-gradient-to-r from-[#db994b] to-[#c58235] hover:from-[#c58235] hover:to-[#b06f23] text-white font-header font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl shadow-lg shadow-[#db994b]/20 hover:shadow-xl transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={16} /> Dejar mi experiencia
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
