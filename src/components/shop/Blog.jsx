import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Blog = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog')
      .then(res => res.json())
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
    <section id="blog" className="py-10 md:py-16 bg-bg-cream relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
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
                whileHover={{ y: -10 }}
                className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col h-full"
              >
                <Link to={`/blog/${article.slug}`} className="flex flex-col h-full">
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="font-header text-xl text-secondary-brown mb-3">{article.title}</h3>
                    <p className="text-secondary-brown-light text-sm mb-6 flex-grow line-clamp-3">{article.excerpt}</p>
                    <div className="flex items-center text-primary-green font-bold text-sm mt-auto">
                      Leer artículo completo <ArrowRight size={16} className="ml-2" />
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
