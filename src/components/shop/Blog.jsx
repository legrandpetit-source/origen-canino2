import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Blog = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog')
      .then(res => { if (!res.ok) throw new Error("HTTP error " + res.status); return res.json(); })
      .then(data => {
        setArticles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching blog posts", err);
        setLoading(false);
      });
  }, []);

  return (
    <section id="blog" className="py-6 md:py-8 bg-bg-cream relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-5">
          <p className="text-primary-green font-bold tracking-widest text-sm md:text-base uppercase mb-3 flex items-center justify-center gap-2">
            <BookOpen size={18} /> Origen Blog
          </p>
          <h2 className="font-header text-4xl md:text-5xl text-secondary-brown">Aprende con Nosotros</h2>
        </div>

        {loading ? (
          <div className="text-center py-10 text-secondary-brown">Cargando artículos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {articles.map((article) => (
              <motion.div 
                key={article.id}
                whileHover={{ y: -6 }}
                className="bg-white rounded-3xl shadow-lg shadow-stone-900/5 border border-stone-200/80 hover:border-[#db994b]/40 overflow-hidden flex flex-col h-full group transition-all"
              >
                <Link to={`/blog/${article.slug}`} className="flex flex-col h-full">
                  <div className="aspect-[16/10] overflow-hidden bg-stone-100 relative">
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/logo.webp';
                      }}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-[#4E5824] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                      Nutrición & Salud
                    </div>
                  </div>
                  <div className="p-6 sm:p-7 flex flex-col flex-grow">
                    <h3 className="font-header font-bold text-xl text-[#3C2716] group-hover:text-[#677333] transition-colors mb-3 leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-stone-600 font-body text-sm mb-6 flex-grow line-clamp-3 leading-relaxed">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center text-[#677333] font-bold text-sm mt-auto pt-4 border-t border-stone-100 group-hover:text-[#db994b] transition-colors">
                      Leer artículo completo <ArrowRight size={15} className="ml-1.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Blog;
