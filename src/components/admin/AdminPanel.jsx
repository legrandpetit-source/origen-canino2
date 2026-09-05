import React, { useState, useEffect } from 'react';
import { Package, BookOpen, Edit2, Plus, Trash2, X, Save, ShoppingCart, MessageSquareHeart, Check, XCircle, LogOut, Key, ChefHat, BarChart } from 'lucide-react';
import AdminLogin from './AdminLogin';
import IngredientsManager from './IngredientsManager';
import ProductRecipeManager from './ProductRecipeManager';
import DispatchManager from './DispatchManager';
import FinanceManager from './FinanceManager';
import RetentionManager from './RetentionManager';

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'));
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingProduct, setEditingProduct] = useState(null);
  const [recipeProduct, setRecipeProduct] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [isAddingPost, setIsAddingPost] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('admin_token');
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      setIsAuthenticated(false);
      throw new Error('No autorizado');
    }
    return res;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, blogRes, orderRes, testRes, ingRes] = await Promise.all([
        fetch(`/api/products`), // public
        fetch(`/api/blog`), // public
        fetchWithAuth(`/api/admin/orders`),
        fetchWithAuth(`/api/admin/testimonials`),
        fetchWithAuth(`/api/admin/ingredients`)
      ]);
      const prodData = await prodRes.json();
      const blogData = await blogRes.json();
      const orderData = await orderRes.json();
      const testData = await testRes.json();
      const ingData = await ingRes.json();
      
      setProducts(prodData);
      setBlogPosts(blogData);
      setOrders(orderData);
      setTestimonials(testData);
      setIngredients(ingData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Products Logic ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct)
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchData();
        alert('Producto actualizado exitosamente');
      } else {
        alert('Error al actualizar el producto');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      const res = await fetchWithAuth(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        alert('Producto eliminado exitosamente');
      } else {
        alert('Error al eliminar el producto');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Orders Logic ---
  const handleUpdateOrderStatus = async (orderId, updates) => {
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este pedido permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        alert('Pedido eliminado exitosamente');
      } else {
        alert('Error al eliminar el pedido');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Testimonial Logic ---
  const handleUpdateTestimonialStatus = async (id, status) => {
    try {
      const res = await fetchWithAuth(`/api/admin/testimonials/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Blog Logic ---
  const handleSavePost = async (e) => {
    e.preventDefault();
    
    // Auto-generate slug if new post
    let postToSave = { ...editingPost };
    if (!postToSave.slug) {
      postToSave.slug = postToSave.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    try {
      const url = isAddingPost ? '/api/blog' : `/api/blog/${postToSave.id}`;
      const method = isAddingPost ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postToSave)
      });

      if (res.ok) {
        setEditingPost(null);
        setIsAddingPost(false);
        fetchData();
        alert(isAddingPost ? 'Artículo creado exitosamente' : 'Artículo actualizado exitosamente');
      } else {
        alert('Error al guardar el artículo');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este artículo?')) return;
    try {
      const res = await fetchWithAuth(`/api/blog/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Error al eliminar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [passwords, setPasswords] = useState({ old: '', new: '' });
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: passwords.old, new_password: passwords.new })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Contraseña actualizada correctamente.');
        setPasswords({ old: '', new: '' });
      } else {
        alert(data.detail || 'Error al cambiar contraseña');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-160px)] w-full bg-gray-50 border-t border-gray-200">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-primary-green-dark text-white flex flex-col shadow-xl z-10 shrink-0">
        <div className="p-6 border-b border-white/10">
          <h2 className="font-header text-3xl">Admin</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'orders' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <ShoppingCart size={20} /> Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'products' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <Package size={20} /> Productos
          </button>
          <button 
            onClick={() => setActiveTab('ingredients')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'ingredients' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <ChefHat size={20} /> Ingredientes
          </button>
          <button 
            onClick={() => setActiveTab('blog')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'blog' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <BookOpen size={20} /> Blog SEO
          </button>
          <button 
            onClick={() => setActiveTab('testimonials')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'testimonials' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <MessageSquareHeart size={20} /> Testimonios
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'finance' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <BarChart size={20} /> Finanzas
          </button>
          <button 
            onClick={() => setActiveTab('retention')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'retention' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <MessageSquareHeart size={20} /> Retención
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'settings' ? 'bg-white text-primary-green-dark shadow-sm' : 'hover:bg-white/10'}`}
          >
            <Key size={20} /> Ajustes
          </button>
        </div>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => {
              localStorage.removeItem('admin_token');
              setIsAuthenticated(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold transition shadow-sm"
          >
            <LogOut size={18} /> Salir
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 flex flex-col min-w-0">
        <div className="p-6 md:p-8 lg:p-10 flex-1 overflow-x-hidden">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando datos...</div>
          ) : (
            <>
              {activeTab === 'ingredients' && (
                <IngredientsManager 
                  ingredients={ingredients} 
                  fetchIngredients={fetchData} 
                  fetchWithAuth={fetchWithAuth} 
                />
              )}
              {/* --- ORDERS TAB --- */}
              {activeTab === 'orders' && (
                <DispatchManager 
                  orders={orders} 
                  handleUpdateOrderStatus={handleUpdateOrderStatus} 
                  handleDeleteOrder={handleDeleteOrder} 
                />
              )}

              {/* --- PRODUCTS TAB --- */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-header text-2xl text-secondary-brown">Tus Productos ({products.length})</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {products.map((product) => (
                      <div key={product.id} className="py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition flex flex-col md:flex-row justify-between md:items-center gap-4 last:border-0">
                        <div className="flex items-center gap-4">
                          <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                          <div>
                            <h4 className="font-bold text-sm text-secondary-brown">{product.name}</h4>
                            <p className="text-xs text-gray-500">Precio: ${product.price.toLocaleString('es-CL')} | Peso: {product.weight} | Tipo: {product.type}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingProduct(product)}
                            className="flex items-center justify-center gap-1 text-primary-green hover:bg-green-50 px-3 py-1.5 rounded-lg font-semibold transition text-sm"
                          >
                            <Edit2 size={14} /> Editar
                          </button>
                          <button 
                            onClick={() => setRecipeProduct(product)}
                            className="flex items-center justify-center gap-1 text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg font-semibold transition text-sm"
                            title="Receta y Costos"
                          >
                            <ChefHat size={14} /> Receta
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-semibold transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- BLOG TAB --- */}
              {activeTab === 'blog' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-header text-2xl text-secondary-brown">Artículos del Blog ({blogPosts.length})</h3>
                    <button 
                      onClick={() => {
                        setEditingPost({ title: '', excerpt: '', content: '', image: '', slug: '' });
                        setIsAddingPost(true);
                      }}
                      className="flex items-center gap-2 bg-primary-green text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-green-dark transition shadow-sm text-sm"
                    >
                      <Plus size={16} /> Nuevo
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {blogPosts.map((post) => (
                      <div key={post.id} className="py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition flex flex-col md:flex-row justify-between md:items-center gap-4 last:border-0">
                        <div className="flex items-center gap-4">
                          <img src={post.image} alt={post.title} className="w-16 h-12 rounded-lg object-cover" />
                          <div>
                            <h4 className="font-bold text-sm text-secondary-brown">{post.title}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1">{post.excerpt}</p>
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="text-xs text-primary-green hover:underline mt-1 inline-block">Ver post ↗</a>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingPost(post);
                              setIsAddingPost(false);
                            }}
                            className="flex items-center justify-center gap-1 text-primary-green hover:bg-green-50 px-3 py-1.5 rounded-lg font-semibold transition"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-semibold transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {blogPosts.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">Aún no hay artículos en el blog.</p>}
                  </div>
                </div>
              )}

              {/* --- TESTIMONIALS TAB --- */}
              {activeTab === 'testimonials' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-header text-2xl text-secondary-brown">Testimonios ({testimonials.length})</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {testimonials.map((test) => (
                      <div key={test.id} className="py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition flex flex-col md:flex-row justify-between md:items-center gap-4 last:border-0">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-sm text-secondary-brown">{test.owner_name} & {test.dog_name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              test.status === 'approved' ? 'bg-green-100 text-green-700' : 
                              test.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {test.status === 'approved' ? 'Aprobado' : test.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Calificación: {test.rating} estrellas</p>
                          <p className="text-sm text-gray-700 italic mt-1 line-clamp-2">"{test.content}"</p>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          {test.status !== 'approved' && (
                            <button 
                              onClick={() => handleUpdateTestimonialStatus(test.id, 'approved')}
                              className="flex items-center justify-center gap-1 text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg font-semibold transition text-sm"
                            >
                              <Check size={16} /> Aprobar
                            </button>
                          )}
                          {test.status !== 'rejected' && (
                            <button 
                              onClick={() => handleUpdateTestimonialStatus(test.id, 'rejected')}
                              className="flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-semibold transition text-sm"
                            >
                              <XCircle size={16} /> Rechazar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {testimonials.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">Aún no hay testimonios.</p>}
                  </div>
                </div>
              )}

              {/* --- FINANCE TAB --- */}
              {activeTab === 'finance' && (
                <FinanceManager fetchWithAuth={fetchWithAuth} />
              )}

              {/* --- RETENTION TAB --- */}
              {activeTab === 'retention' && (
                <RetentionManager orders={orders} products={products} />
              )}

              {/* --- SETTINGS TAB --- */}
              {activeTab === 'settings' && (
                <div className="space-y-4 max-w-lg mx-auto">
                  <h3 className="font-header text-2xl text-secondary-brown mb-4">Configuración de Seguridad</h3>
                  <div className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
                    <h4 className="font-bold text-lg text-primary-green-dark mb-4">Cambiar Contraseña</h4>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Actual</label>
                        <input 
                          type="password" 
                          required 
                          value={passwords.old}
                          onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                          className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                        <input 
                          type="password" 
                          required 
                          value={passwords.new}
                          onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                          className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none"
                        />
                      </div>
                      <button type="submit" className="w-full bg-primary-green text-white font-bold py-3 rounded-lg hover:bg-primary-green-dark transition">
                        Actualizar Contraseña
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- MODAL: RECIPE --- */}
      {recipeProduct && (
        <ProductRecipeManager 
          product={recipeProduct} 
          ingredients={ingredients} 
          fetchWithAuth={fetchWithAuth} 
          onClose={() => {
            setRecipeProduct(null);
            fetchData(); // Refrescar los productos (incluyendo fixed_cost)
          }} 
        />
      )}

      {/* --- MODAL: EDIT PRODUCT --- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 relative">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-header text-2xl text-secondary-brown">Editar Producto</h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                  <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none" required
                    value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Precio ($)</label>
                  <input type="number" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none" required
                    value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Peso (Ej: 1 Kg)</label>
                  <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none" required
                    value={editingProduct.weight} onChange={e => setEditingProduct({...editingProduct, weight: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Imagen (Subir o URL)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetchWithAuth('/api/admin/products/upload-image', {
                          method: 'POST',
                          body: formData
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setEditingProduct({...editingProduct, image: data.url});
                        } else {
                          alert("Error al subir la imagen");
                        }
                      } catch (err) {
                        console.error(err);
                        alert("Error de red al subir la imagen");
                      }
                    }}
                    className="w-full border rounded-lg p-1.5 mb-2 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                  />
                  <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none text-sm" required
                    placeholder="URL o ruta de la imagen"
                    value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción corta</label>
                <textarea className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none h-20" required
                  value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ingredientes (Separados por coma)</label>
                <textarea className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none h-20" required
                  value={editingProduct.ingredients.join(', ')} 
                  onChange={e => setEditingProduct({...editingProduct, ingredients: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Beneficios (Separados por coma)</label>
                <textarea className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none h-20" required
                  value={editingProduct.benefits.join(', ')} 
                  onChange={e => setEditingProduct({...editingProduct, benefits: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-primary-green text-white font-bold rounded-lg hover:bg-primary-green-dark flex items-center gap-2"><Save size={18}/> Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT/ADD BLOG POST --- */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 relative">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-header text-2xl text-secondary-brown">{isAddingPost ? 'Crear Nuevo Artículo' : 'Editar Artículo'}</h3>
              <button onClick={() => setEditingPost(null)} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleSavePost} className="p-6 space-y-4">
              
              {!isAddingPost && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label>
                  <input type="text" className="w-full border rounded-lg p-2 bg-gray-50 text-gray-500" readOnly
                    value={editingPost.slug} title="El slug se genera automáticamente al crear el post."/>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Título del Artículo (H1)</label>
                <input type="text" className="w-full border rounded-lg p-3 text-lg font-bold focus:ring-2 focus:ring-primary-green outline-none" required
                  value={editingPost.title} onChange={e => setEditingPost({...editingPost, title: e.target.value})} placeholder="Ej: Los beneficios de la carne cruda" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Resumen SEO (Meta Descripción)</label>
                <textarea className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none h-20" required
                  value={editingPost.excerpt} onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})} 
                  placeholder="Resumen atractivo que aparecerá en Google y en la tarjeta del blog..."/>
                <p className="text-xs text-gray-500 mt-1">Recomendado: 150-160 caracteres.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contenido Completo</label>
                <textarea className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-green outline-none h-64 font-sans" required
                  value={editingPost.content} onChange={e => setEditingPost({...editingPost, content: e.target.value})} 
                  placeholder="Escribe el artículo completo aquí... Puedes usar saltos de línea."/>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">URL Imagen de Cabecera</label>
                <input type="url" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none" required
                  value={editingPost.image} onChange={e => setEditingPost({...editingPost, image: e.target.value})} 
                  placeholder="https://images.unsplash.com/..."/>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingPost(null)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-primary-green text-white font-bold rounded-lg hover:bg-primary-green-dark flex items-center gap-2">
                  <Save size={18}/> {isAddingPost ? 'Publicar Artículo' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
