import React, { useState } from 'react';
import { X, Star, Upload, Image as ImageIcon } from 'lucide-react';

const TestimonialFormModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    owner_name: '',
    dog_name: '',
    content: '',
    rating: 5
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('owner_name', formData.owner_name);
      data.append('dog_name', formData.dog_name);
      data.append('content', formData.content);
      data.append('rating', formData.rating);
      if (imageFile) {
        data.append('image', imageFile);
      }

      const response = await fetch(`/api/testimonials`, {
        method: 'POST',
        // No Content-Type header when using FormData; the browser sets it automatically with the boundary
        body: data
      });

      if (!response.ok) {
        throw new Error('Error al enviar el testimonio');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({ owner_name: '', dog_name: '', content: '', rating: 5 });
        setImageFile(null);
        setImagePreview(null);
      }, 3000);
    } catch (err) {
      setError('Hubo un problema al enviar tu experiencia. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-bg-cream w-full max-w-lg rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary-brown hover:text-secondary-orange transition z-10 bg-white/50 rounded-full p-1"
        >
          <X size={24} />
        </button>

        <div className="p-6 md:p-8 overflow-y-auto">
          <h2 className="font-header text-3xl text-secondary-brown mb-2 text-center">
            ¡Comparte tu experiencia!
          </h2>
          <p className="text-secondary-brown-light text-center mb-6">
            Nos encanta saber cómo Origen Canino ha ayudado a tu perrito.
          </p>

          {isSuccess ? (
            <div className="bg-green-100 text-green-800 p-6 rounded-2xl text-center">
              <Star className="text-green-500 mx-auto mb-2" size={48} fill="currentColor" />
              <h3 className="font-header text-2xl mb-2">¡Muchas gracias!</h3>
              <p>Hemos recibido tu experiencia. Será publicada pronto luego de una breve revisión.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-secondary-brown mb-1">Tu Nombre</label>
                  <input 
                    type="text" 
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent"
                    placeholder="Ej. Camila"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary-brown mb-1">Nombre de tu perrito</label>
                  <input 
                    type="text" 
                    required
                    value={formData.dog_name}
                    onChange={(e) => setFormData({...formData, dog_name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent"
                    placeholder="Ej. Pipo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary-brown mb-2">Foto de tu perrito (Opcional)</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-gray-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 text-secondary-brown py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition w-full">
                      <Upload size={18} />
                      <span className="text-sm font-medium">{imageFile ? 'Cambiar foto' : 'Subir foto'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1 text-center">Se recortará en forma circular.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary-brown mb-2">Calificación</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({...formData, rating: star})}
                      className={`transition-transform hover:scale-110 ${formData.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      <Star size={32} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary-brown mb-1">¿Qué tal su experiencia?</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-transparent resize-none"
                  placeholder="Cuéntanos sobre sus cambios en energía, digestión, pelaje..."
                ></textarea>
              </div>

              {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-secondary-orange text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition shadow-lg disabled:opacity-50 mt-4"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Experiencia'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimonialFormModal;
