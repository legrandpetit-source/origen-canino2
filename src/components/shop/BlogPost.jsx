import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top when page loads
    fetch(`/api/blog/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Artículo no encontrado');
        return res.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching blog post:', err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-cream">
        <div className="text-secondary-brown font-header text-xl">Cargando artículo...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-cream px-4">
        <h2 className="font-header text-3xl md:text-4xl text-secondary-brown mb-4 text-center">Artículo no encontrado</h2>
        <Link to="/" className="text-primary-green hover:text-primary-green-dark font-bold underline">
          Volver a Origen Canino
        </Link>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-bg-cream pb-20 pt-24 md:pt-32">
      {/* SEO Helmet Tags */}
      <Helmet>
        <title>{post.title} | Origen Canino Blog</title>
        <meta name="description" content={post.excerpt} />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${post.title} | Origen Canino Blog`} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.image} />
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${post.title} | Origen Canino Blog`} />
        <meta property="twitter:description" content={post.excerpt} />
        <meta property="twitter:image" content={post.image} />
      </Helmet>

      <div className="container mx-auto px-4 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-secondary-brown hover:text-primary-green transition mb-8 font-semibold">
          <ArrowLeft size={20} className="mr-2" /> Volver al Inicio
        </Link>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="h-64 md:h-96 relative">
            <img 
              src={post.image} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6 md:p-10">
              <h1 className="font-header text-3xl md:text-5xl text-white">{post.title}</h1>
            </div>
          </div>
          
          <div className="p-6 md:p-12">
            <p className="text-xl md:text-2xl text-secondary-brown-light font-header mb-8 italic">
              "{post.excerpt}"
            </p>
            
            <div className="prose prose-lg max-w-none text-secondary-brown font-sans whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>

            <div className="mt-16 pt-8 border-t border-gray-100 text-center">
              <p className="font-script text-4xl text-primary-green">La salud empieza en el plato.</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogPost;
