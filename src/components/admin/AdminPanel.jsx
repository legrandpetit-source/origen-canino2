import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, BookOpen, Edit2, Plus, Trash2, X, Save, ShoppingCart, 
  MessageSquareHeart, Check, XCircle, LogOut, Key, ChefHat, BarChart, 
  Building2, CreditCard, Calculator, Send, Gift, UploadCloud, Upload,
  Image as ImageIcon, Loader2, Sparkles, CheckCircle2, ExternalLink, Menu,
  Stethoscope, Video, FileText, CheckCheck
} from 'lucide-react';
import AdminLogin from './AdminLogin';
import IngredientsManager from './IngredientsManager';
import ProductRecipeManager from './ProductRecipeManager';
import DispatchManager from './DispatchManager';
import FinanceManager from './FinanceManager';
import RetentionManager from './RetentionManager';
import NfcManager from './NfcManager';
import PaymentSettingsManager from './PaymentSettingsManager';
import SecurityManager from './SecurityManager';
import CalculatorSettingsManager from './CalculatorSettingsManager';
import TelegramSettingsManager from './TelegramSettingsManager';
import PromotionsManager from './PromotionsManager';
import KitchenProductionManager from './KitchenProductionManager';
import PartnersManager from './PartnersManager';

// Comprime y convierte una imagen a WebP en el navegador antes de enviarla
const compressImageToWebP = (file, maxDim = 1200, quality = 0.82) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const webpFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') + '.webp',
              { type: 'image/webp', lastModified: Date.now() }
            );
            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const NAV_TABS = [
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'kitchen', label: 'Cocina & Lotes', icon: ChefHat },
  { id: 'ingredients', label: 'Ingredientes', icon: Package },
  { id: 'partners', label: 'Alianzas Vet & Pet', icon: Stethoscope },
  { id: 'blog', label: 'Blog SEO IA', icon: BookOpen },
  { id: 'testimonials', label: 'Testimonios', icon: MessageSquareHeart },
  { id: 'finance', label: 'Finanzas', icon: BarChart },
  { id: 'retention', label: 'Retención', icon: MessageSquareHeart },
  { id: 'nfc', label: 'Puntos NFC (Edificios)', icon: Building2 },
  { id: 'promotions', label: 'Promociones & 1ra Compra', icon: Gift },
  { id: 'calculator', label: 'Calculadora de Raciones', icon: Calculator },
  { id: 'payments', label: 'Pagos & Mercado Pago', icon: CreditCard },
  { id: 'telegram', label: 'Bot Telegram', icon: Send },
  { id: 'settings', label: 'Seguridad', icon: Key },
];

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'));
  const [activeTab, setActiveTab] = useState('orders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState(null);
  const fileInputRef = useRef(null);
  const newFileInputRef = useRef(null);
  const [recipeProduct, setRecipeProduct] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [uploadingBlogImage, setUploadingBlogImage] = useState(false);
  const [blogUploadInfo, setBlogUploadInfo] = useState(null);
  const blogFileInputRef = useRef(null);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [uploadingTestimonialPhoto, setUploadingTestimonialPhoto] = useState(false);
  const testimonialFileInputRef = useRef(null);

  // Estados Agente 2 SEO Engine
  const [showAiBlogModal, setShowAiBlogModal] = useState(false);
  const [generatingAiBlog, setGeneratingAiBlog] = useState(false);
  const [viewingSocialScript, setViewingSocialScript] = useState(null);
  const [aiBlogForm, setAiBlogForm] = useState({
    topic: '',
    target_keyword: '',
    breed_focus: ''
  });
  const [generatedAiResult, setGeneratedAiResult] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData(true);
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

  // Refrescar sólo ingredientes sin desmontar ni disparar loading global
  const refreshIngredients = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/ingredients');
      if (res.ok) {
        const ingData = await res.json();
        setIngredients(ingData);
      }
    } catch (err) {
      console.error('Error refreshing ingredients:', err);
    }
  };

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [prodRes, blogRes, orderRes, testRes, ingRes] = await Promise.all([
        fetch(`/api/products`), // public
        fetch(`/api/blog?include_drafts=true`), // admin con borradores
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
      if (showLoading) setLoading(false);
    }
  };

  // --- Products Logic ---
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        setNewProduct(null);
        setUploadSuccessInfo(null);
        fetchData();
        alert('¡Producto creado exitosamente!');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Error al crear el producto');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al crear el producto');
    }
  };

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

  const handleBulkDeleteOrders = async (orderIds) => {
    if (!orderIds || orderIds.length === 0) return false;
    const count = orderIds.length;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente ${count} pedido(s) seleccionado(s)? Esta acción no se puede deshacer.`)) {
      return false;
    }
    try {
      const res = await fetchWithAuth('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: orderIds })
      });
      if (res.ok) {
        fetchData();
        return true;
      } else {
        alert('Error al eliminar los pedidos seleccionados');
        return false;
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar pedidos');
      return false;
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

  const handleSaveTestimonial = async (e) => {
    e.preventDefault();
    if (!editingTestimonial) return;
    try {
      const isNew = !editingTestimonial.id;
      const url = isNew ? '/api/admin/testimonials' : `/api/admin/testimonials/${editingTestimonial.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_name: editingTestimonial.owner_name,
          dog_name: editingTestimonial.dog_name,
          content: editingTestimonial.content,
          rating: parseInt(editingTestimonial.rating || 5),
          status: editingTestimonial.status || 'approved',
          image_path: editingTestimonial.image_path || null,
          diet_tag: editingTestimonial.diet_tag || '🌿 Nutrición 100% Real',
          location: editingTestimonial.location || 'Santiago, CL'
        })
      });
      if (res.ok) {
        setEditingTestimonial(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al guardar testimonio");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
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

  const handleGenerateAiBlog = async (e) => {
    e.preventDefault();
    if (!aiBlogForm.topic.trim()) return;
    setGeneratingAiBlog(true);
    setGeneratedAiResult(null);
    try {
      const res = await fetchWithAuth('/api/admin/blog/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiBlogForm)
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedAiResult(data);
        fetchData();
      } else {
        alert(data.detail || 'Error al generar artículo con IA');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al generar artículo');
    } finally {
      setGeneratingAiBlog(false);
    }
  };

  const handlePublishDraft = async (post) => {
    try {
      const res = await fetchWithAuth(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...post, status: 'publicado' })
      });
      if (res.ok) {
        alert('¡Artículo aprobado y publicado exitosamente en origencanino.cl!');
        fetchData();
      } else {
        alert('Error al publicar artículo');
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

  const currentTabObj = NAV_TABS.find(t => t.id === activeTab) || NAV_TABS[0];
  const CurrentTabIcon = currentTabObj.icon;

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-gray-50">
      
      {/* Top Navbar Sticky solo para Móvil y Tablet */}
      <header className="md:hidden sticky top-0 z-30 bg-primary-green-dark text-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-md flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src="/logo.webp" 
            alt="Logo" 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm shrink-0" 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#db994b] font-body block leading-tight">ORIGEN CANINO</span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-header text-sm font-bold leading-tight">Admin</span>
              <span className="text-white/40 text-xs">/</span>
              <span className="bg-white/15 text-[#db994b] px-2 py-0.5 rounded-md font-bold text-xs truncate flex items-center gap-1">
                <CurrentTabIcon size={12} className="shrink-0" />
                <span className="truncate">{currentTabObj.label}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a 
            href="/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition"
            title="Abrir tienda en nueva pestaña"
          >
            <ExternalLink size={18} />
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="bg-white/15 active:bg-white/25 text-white p-2 rounded-xl transition flex items-center justify-center border border-white/20 cursor-pointer"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Backdrop para cerrar el Drawer en Móvil */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar: Drawer en Móvil, Barra Lateral Fija en Desktop */}
      <aside className={`
        fixed md:static top-0 left-0 bottom-0 z-50 md:z-10
        w-72 md:w-64 bg-primary-green-dark text-white flex flex-col shadow-2xl md:shadow-xl shrink-0
        transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Cabecera del Sidebar */}
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.webp" 
              alt="Logo" 
              className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm shrink-0" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#db994b] font-body block leading-tight">ORIGEN CANINO</span>
              <h2 className="font-header text-xl font-bold leading-tight">Panel Admin</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:flex text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-xl transition text-xs items-center gap-1 font-body"
              title="Abrir tienda en nueva pestaña"
            >
              <ExternalLink size={17} />
            </a>
            {/* Botón cerrar en móvil dentro del drawer */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Cerrar menú"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Opciones del Menú */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
          {NAV_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false); // Cierra automáticamente el drawer en móvil
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl font-bold text-sm md:text-base transition text-left cursor-pointer ${
                  isActive 
                    ? 'bg-white text-primary-green-dark shadow-sm' 
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                <TabIcon size={19} className="shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer Sidebar con botón Salir */}
        <div className="p-3 md:p-4 border-t border-white/10">
          <button 
            onClick={() => {
              localStorage.removeItem('admin_token');
              setIsAuthenticated(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 md:py-3 rounded-xl font-bold transition shadow-sm text-sm md:text-base cursor-pointer"
          >
            <LogOut size={18} /> Salir
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 flex flex-col min-w-0">
        <main className="p-3 sm:p-5 md:p-8 lg:p-10 flex-1 overflow-x-hidden">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando datos...</div>
          ) : (
            <>
              {activeTab === 'ingredients' && (
                <IngredientsManager 
                  ingredients={ingredients} 
                  fetchIngredients={refreshIngredients} 
                  fetchWithAuth={fetchWithAuth} 
                />
              )}

              {/* --- KITCHEN TAB (CALCULADORAS INDUSTRIALES: BARF COGOTE & COCINADA CERDO) --- */}
              {activeTab === 'kitchen' && (
                <KitchenProductionManager 
                  fetchWithAuth={fetchWithAuth} 
                  ingredients={ingredients} 
                  fetchIngredients={refreshIngredients}
                  products={products}
                />
              )}

              {/* --- PARTNERS TAB (AGENTE 1: ALIANZAS VET & PET B2B) --- */}
              {activeTab === 'partners' && (
                <PartnersManager fetchWithAuth={fetchWithAuth} />
              )}
              {/* --- ORDERS TAB --- */}
              {activeTab === 'orders' && (
                <DispatchManager 
                  orders={orders} 
                  handleUpdateOrderStatus={handleUpdateOrderStatus} 
                  handleDeleteOrder={handleDeleteOrder} 
                  handleBulkDeleteOrders={handleBulkDeleteOrders}
                />
              )}

              {/* --- PRODUCTS TAB --- */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                    <div>
                      <h3 className="font-header text-2xl text-secondary-brown font-bold">
                        Tus Productos ({products.length})
                      </h3>
                      <p className="text-xs text-gray-500 font-body">
                        Gestiona recetas, precios, inventario y catálogo de la tienda.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setNewProduct({
                          name: '',
                          type: 'barf',
                          price: 5000,
                          weight: '1 Kg',
                          description: '',
                          ingredients: [],
                          benefits: [],
                          isNew: true,
                          image: '',
                          fixed_cost: 0
                        });
                        setUploadSuccessInfo(null);
                      }}
                      className="bg-primary-green hover:bg-primary-green-dark text-white px-4 py-2.5 rounded-xl font-bold font-body text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Plus size={18} /> Agregar Nuevo Producto
                    </button>
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                    <div>
                      <h3 className="font-header text-2xl text-secondary-brown font-bold">
                        Artículos del Blog ({blogPosts.length})
                      </h3>
                      <p className="text-xs text-gray-500 font-body">
                        Estrategia de contenidos SEO long-tail, Schema.org FAQ y guiones para redes sociales.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setAiBlogForm({ topic: '', target_keyword: '', breed_focus: '' });
                          setGeneratedAiResult(null);
                          setShowAiBlogModal(true);
                        }}
                        className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl font-bold transition shadow-xs text-xs cursor-pointer"
                      >
                        <Sparkles size={15} className="text-amber-400" />
                        Generar con IA (Agente SEO)
                      </button>

                      <button 
                        onClick={() => {
                          setEditingPost({ title: '', excerpt: '', content: '', image: '', slug: '', status: 'publicado' });
                          setIsAddingPost(true);
                        }}
                        className="flex items-center gap-2 bg-primary-green text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-green-dark transition shadow-xs text-xs cursor-pointer"
                      >
                        <Plus size={15} /> Redactar Manual
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden divide-y divide-gray-100">
                    {blogPosts.map((post) => {
                      const isDraft = post.status === 'borrador';

                      return (
                        <div key={post.id} className="p-4 hover:bg-gray-50/70 transition flex flex-col md:flex-row justify-between md:items-center gap-4">
                          <div className="flex items-start sm:items-center gap-4">
                            <img src={post.image} alt={post.title} className="w-20 h-16 rounded-xl object-cover shrink-0 border border-gray-100" />
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-sm text-secondary-brown">{post.title}</h4>
                                {isDraft && (
                                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                    <Sparkles size={11} /> Borrador IA (Auditoría Pendiente)
                                  </span>
                                )}
                                {post.target_keyword && (
                                  <span className="bg-stone-100 text-stone-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    KW: {post.target_keyword}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1">{post.excerpt}</p>
                              
                              <div className="flex items-center gap-3 pt-0.5">
                                <a 
                                  href={`/blog/${post.slug}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-xs text-primary-green font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                  Ver post en vivo ↗
                                </a>

                                {post.social_script && (
                                  <button
                                    onClick={() => setViewingSocialScript(post.social_script)}
                                    className="text-xs text-stone-600 hover:text-stone-900 font-semibold inline-flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Video size={12} className="text-red-500" />
                                    Ver Guion TikTok/Reels
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            {isDraft && (
                              <button
                                onClick={() => handlePublishDraft(post)}
                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer"
                                title="Aprobar y publicar en el blog"
                              >
                                <CheckCheck size={14} />
                                Aprobar & Publicar
                              </button>
                            )}

                            <button 
                              onClick={() => {
                                setEditingPost(post);
                                setIsAddingPost(false);
                              }}
                              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl font-semibold transition cursor-pointer"
                              title="Editar artículo"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl font-semibold transition cursor-pointer"
                              title="Eliminar artículo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {blogPosts.length === 0 && <p className="text-center text-gray-500 py-10 text-xs">Aún no hay artículos en el blog.</p>}
                  </div>
                </div>
              )}

              {/* --- TESTIMONIALS TAB --- */}
              {activeTab === 'testimonials' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="font-header text-2xl text-secondary-brown font-bold">Testimonios ({testimonials.length})</h3>
                      <p className="text-xs text-stone-500 font-body">Administra las opiniones, fotos, dietas consumidas y comunas de tus clientes.</p>
                    </div>
                    <button
                      onClick={() => setEditingTestimonial({
                        id: null,
                        owner_name: '',
                        dog_name: '',
                        rating: 5,
                        status: 'approved',
                        content: '',
                        diet_tag: '🌿 Nutrición 100% Real',
                        location: 'Santiago, CL',
                        image_path: null
                      })}
                      className="bg-[#677333] hover:bg-[#56602b] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm cursor-pointer"
                    >
                      <Plus size={16} /> Registrar Nuevo Testimonio
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                    {testimonials.map((test) => (
                      <div key={test.id} className="p-4 hover:bg-gray-50/80 transition flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="flex items-start sm:items-center gap-3.5 flex-grow">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xs border-2 border-white ring-2 ring-[#677333]/20 shrink-0 bg-stone-100 flex items-center justify-center">
                            {test.image_path ? (
                              <img src={test.image_path} alt={test.dog_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[#677333] font-bold text-lg uppercase font-header">
                                {test.dog_name ? test.dog_name.charAt(0) : 'P'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-bold text-base text-secondary-brown">"{test.dog_name}" <span className="text-xs font-normal text-stone-500 font-body">(de {test.owner_name})</span></h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                test.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                test.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {test.status === 'approved' ? 'Aprobado' : test.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-[#db994b] font-medium">
                              {'★'.repeat(test.rating || 5)}{'☆'.repeat(5 - (test.rating || 5))}
                              <span className="text-stone-400 ml-1">({test.rating || 5} estrellas)</span>
                            </div>
                            <p className="text-sm text-gray-700 italic mt-1 line-clamp-2 max-w-2xl">"{test.content}"</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setEditingTestimonial(test)}
                            className="flex items-center justify-center gap-1.5 bg-[#677333]/10 hover:bg-[#677333] text-[#677333] hover:text-white px-3.5 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer shadow-xs"
                          >
                            <Edit2 size={14} /> Editar
                          </button>
                          {test.status !== 'approved' && (
                            <button 
                              onClick={() => handleUpdateTestimonialStatus(test.id, 'approved')}
                              className="flex items-center justify-center gap-1 text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-xl font-semibold transition text-xs cursor-pointer"
                            >
                              <Check size={14} /> Aprobar
                            </button>
                          )}
                          {test.status !== 'rejected' && (
                            <button 
                              onClick={() => handleUpdateTestimonialStatus(test.id, 'rejected')}
                              className="flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl font-semibold transition text-xs cursor-pointer"
                            >
                              <XCircle size={14} /> Rechazar
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

              {/* --- NFC BUILDINGS TAB --- */}
              {activeTab === 'nfc' && (
                <NfcManager fetchWithAuth={fetchWithAuth} />
              )}

              {/* --- PROMOTIONS TAB --- */}
              {activeTab === 'promotions' && (
                <PromotionsManager fetchWithAuth={fetchWithAuth} />
              )}

              {/* --- CALCULATOR SETTINGS TAB --- */}
              {activeTab === 'calculator' && (
                <CalculatorSettingsManager fetchWithAuth={fetchWithAuth} />
              )}

              {/* --- PAYMENTS & MERCADO PAGO TAB --- */}
              {activeTab === 'payments' && (
                <PaymentSettingsManager fetchWithAuth={fetchWithAuth} />
              )}

              {/* --- TELEGRAM SETTINGS TAB --- */}
              {activeTab === 'telegram' && (
                <TelegramSettingsManager fetchWithAuth={fetchWithAuth} />
              )}

              {/* --- SETTINGS / SECURITY TAB --- */}
              {activeTab === 'settings' && (
                <SecurityManager fetchWithAuth={fetchWithAuth} />
              )}
            </>
          )}
        </main>
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
              <button onClick={() => { setEditingProduct(null); setUploadSuccessInfo(null); }} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
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
                  <label className="block text-sm font-bold text-gray-700 mb-1">Categoría / Tipo</label>
                  <select
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body bg-white"
                    value={editingProduct.type || 'barf'}
                    onChange={e => setEditingProduct({...editingProduct, type: e.target.value})}
                  >
                    <option value="barf">🥩 Dieta BARF (Cruda)</option>
                    <option value="cocinada">🍲 Comida Cocinada al Vapor</option>
                    <option value="snack">🦴 Snack Natural Deshidratado</option>
                  </select>
                </div>
                <div className="md:col-span-2 bg-[#FAF7F2] p-4 rounded-2xl border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-[#3c2716] font-display">
                      Imagen del Producto (Compresión WebP Automática)
                    </label>
                    {uploadSuccessInfo && (
                      <span className="text-xs font-bold text-[#677333] bg-[#677333]/15 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={13} /> WebP Optimizado ({Math.round(uploadSuccessInfo.final_size / 1024)} KB)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Thumbnail Preview */}
                    <div className="w-20 h-20 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative group">
                      {editingProduct.image ? (
                        <img 
                          src={editingProduct.image} 
                          alt="Vista previa" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <ImageIcon size={28} className="text-stone-300" />
                      )}
                    </div>

                    {/* Action Area */}
                    <div className="flex-1 space-y-2">
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImage(true);
                          setUploadSuccessInfo(null);
                          try {
                            // 1. Optimizar y comprimir en WebP en el navegador
                            const compressedBlob = await compressImageToWebP(file);
                            const formData = new FormData();
                            formData.append('file', compressedBlob);

                            // 2. Subir al servidor para almacenamiento y verificación
                            const res = await fetchWithAuth('/api/admin/products/upload-image', {
                              method: 'POST',
                              body: formData
                            });

                            if (res.ok) {
                              const data = await res.json();
                              setEditingProduct(prev => ({ ...prev, image: data.url }));
                              setUploadSuccessInfo(data);
                            } else {
                              const errData = await res.json().catch(() => ({}));
                              alert(errData.detail || "Error al subir la imagen");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("Error de red al procesar la imagen");
                          } finally {
                            setUploadingImage(false);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }
                        }}
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-[#677333] hover:bg-[#56602b] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm disabled:opacity-50"
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Comprimiendo y guardando en WebP...
                            </>
                          ) : (
                            <>
                              <UploadCloud size={15} />
                              Seleccionar y Comprimir Imagen (.webp)
                            </>
                          )}
                        </button>

                        <span className="text-[11px] text-stone-500">
                          Formatos aceptados: JPG, PNG, WEBP (se autocomprime a WebP óptimo)
                        </span>
                      </div>

                      {/* URL o ruta manual */}
                      <input 
                        type="text" 
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#677333] outline-none text-xs text-stone-700 font-mono" 
                        required
                        placeholder="/images/products/ejemplo.webp"
                        value={editingProduct.image} 
                        onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} 
                      />
                    </div>
                  </div>
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
                <button type="button" onClick={() => { setEditingProduct(null); setUploadSuccessInfo(null); }} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-primary-green text-white font-bold rounded-lg hover:bg-primary-green-dark flex items-center gap-2"><Save size={18}/> Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE PRODUCT --- */}
      {newProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 relative shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-header text-2xl text-secondary-brown font-bold">Agregar Nuevo Producto</h3>
                <p className="text-xs text-gray-500 font-body">Ingresa los datos del nuevo producto para el catálogo.</p>
              </div>
              <button 
                onClick={() => { setNewProduct(null); setUploadSuccessInfo(null); }} 
                className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition cursor-pointer"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Producto *</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body" 
                    required
                    placeholder="Ej: Dieta Pavo Silvestre & Calabaza"
                    value={newProduct.name} 
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  />
                </div>

                {/* Tipo de Producto */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Categoría / Tipo *</label>
                  <select
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body bg-white"
                    value={newProduct.type}
                    onChange={e => setNewProduct({...newProduct, type: e.target.value})}
                    required
                  >
                    <option value="barf">🥩 Dieta BARF (Cruda)</option>
                    <option value="cocinada">🍲 Comida Cocinada al Vapor</option>
                    <option value="snack">🦴 Snack Natural Deshidratado</option>
                  </select>
                </div>

                {/* Precio */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Precio CLP ($) *</label>
                  <input 
                    type="number" 
                    min="100"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body font-bold" 
                    required
                    placeholder="5990"
                    value={newProduct.price} 
                    onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value) || 0})} 
                  />
                </div>

                {/* Peso */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Peso / Formato (Ej: 1 Kg, 500g, 120g) *</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body" 
                    required
                    placeholder="Pouch 500g"
                    value={newProduct.weight} 
                    onChange={e => setNewProduct({...newProduct, weight: e.target.value})} 
                  />
                </div>

                {/* Imagen del Producto con Compresión WebP */}
                <div className="md:col-span-2 bg-[#FAF7F2] p-4 rounded-2xl border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-[#3c2716] font-display">
                      Imagen del Producto (Compresión WebP Automática)
                    </label>
                    {uploadSuccessInfo && (
                      <span className="text-xs font-bold text-[#677333] bg-[#677333]/15 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={13} /> WebP Optimizado ({Math.round(uploadSuccessInfo.final_size / 1024)} KB)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Thumbnail Preview */}
                    <div className="w-20 h-20 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative">
                      {newProduct.image ? (
                        <img 
                          src={newProduct.image} 
                          alt="Vista previa" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <ImageIcon size={28} className="text-stone-300" />
                      )}
                    </div>

                    {/* Action Area */}
                    <div className="flex-1 space-y-2">
                      <input 
                        ref={newFileInputRef}
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImage(true);
                          setUploadSuccessInfo(null);
                          try {
                            // 1. Comprimir a WebP en el navegador
                            const compressedBlob = await compressImageToWebP(file);
                            const formData = new FormData();
                            formData.append('file', compressedBlob);

                            // 2. Subir al servidor
                            const res = await fetchWithAuth('/api/admin/products/upload-image', {
                              method: 'POST',
                              body: formData
                            });

                            if (res.ok) {
                              const data = await res.json();
                              setNewProduct(prev => ({ ...prev, image: data.url }));
                              setUploadSuccessInfo(data);
                            } else {
                              const errData = await res.json().catch(() => ({}));
                              alert(errData.detail || "Error al subir la imagen");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("Error de red al procesar la imagen");
                          } finally {
                            setUploadingImage(false);
                            if (newFileInputRef.current) newFileInputRef.current.value = '';
                          }
                        }}
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => newFileInputRef.current?.click()}
                          className="px-4 py-2 bg-[#677333] hover:bg-[#56602b] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Comprimiendo y guardando en WebP...
                            </>
                          ) : (
                            <>
                              <UploadCloud size={15} />
                              Seleccionar y Comprimir Imagen (.webp)
                            </>
                          )}
                        </button>
                        <span className="text-[11px] text-stone-500">
                          Formatos: JPG, PNG, WEBP (se autocomprime a WebP óptimo)
                        </span>
                      </div>

                      <input 
                        type="text" 
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#677333] outline-none text-xs text-stone-700 font-mono" 
                        placeholder="/images/products/ejemplo.webp"
                        value={newProduct.image} 
                        onChange={e => setNewProduct({...newProduct, image: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción Corta *</label>
                <textarea 
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none h-20 text-sm font-body" 
                  required
                  placeholder="Descripción atractiva del producto para el catálogo..."
                  value={newProduct.description} 
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ingredientes (Separados por coma)</label>
                <textarea 
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none h-20 text-sm font-body" 
                  placeholder="Carne de vacuno de libre pastoreo, Corazón bovino, Calabaza dulce, Semillas de chía..."
                  value={newProduct.ingredients.join(', ')} 
                  onChange={e => setNewProduct({...newProduct, ingredients: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Beneficios (Separados por coma)</label>
                <textarea 
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none h-20 text-sm font-body" 
                  placeholder="Pelaje ultra brillante, Digestión suave sin gases, Mayor energía y vitalidad..."
                  value={newProduct.benefits.join(', ')} 
                  onChange={e => setNewProduct({...newProduct, benefits: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} 
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => { setNewProduct(null); setUploadSuccessInfo(null); }} 
                  className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition font-body text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-primary-green text-white font-bold rounded-xl hover:bg-primary-green-dark flex items-center gap-2 shadow-sm transition font-body text-sm cursor-pointer"
                >
                  <Save size={18}/> Crear Producto
                </button>
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Fotografía de Cabecera (Editorial)</label>
                
                {/* Previsualización en vivo */}
                {editingPost.image && (
                  <div className="relative mb-3 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-[16/9] max-h-56 flex items-center justify-center">
                    <img
                      src={editingPost.image}
                      alt="Vista previa artículo"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-lg">
                      {editingPost.image.startsWith('/uploads') ? '✓ Alojada localmente en WebP' : 'Enlace externo'}
                    </div>
                  </div>
                )}

                <input 
                  ref={blogFileInputRef}
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingBlogImage(true);
                    setBlogUploadInfo(null);
                    try {
                      let blobToSend = file;
                      try {
                        blobToSend = await compressImageToWebP(file, 1400, 0.85);
                      } catch (cErr) {
                        console.warn("Compresión cliente opcional falló, usando archivo original:", cErr);
                      }
                      const formData = new FormData();
                      formData.append('file', blobToSend, file.name.replace(/\.[^.]+$/, '.webp'));

                      const res = await fetchWithAuth('/api/admin/blog/upload-image', {
                        method: 'POST',
                        body: formData
                      });

                      if (res.ok) {
                        const data = await res.json();
                        setEditingPost(prev => ({ ...prev, image: data.url }));
                        setBlogUploadInfo(data);
                      } else {
                        const errData = await res.json().catch(() => ({}));
                        alert(errData.detail || "Error al subir la imagen del blog");
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Error de conexión al subir la imagen");
                    } finally {
                      setUploadingBlogImage(false);
                      if (blogFileInputRef.current) blogFileInputRef.current.value = '';
                    }
                  }}
                />

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    disabled={uploadingBlogImage}
                    onClick={() => blogFileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-[#677333] hover:bg-[#56602b] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingBlogImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Comprimiendo y guardando en WebP...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Subir Fotografía (Convierte a WebP local)
                      </>
                    )}
                  </button>
                  <span className="text-xs text-stone-400">o ingresa una URL:</span>
                </div>

                {blogUploadInfo && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 flex items-center gap-1.5 font-medium">
                    ✓ Imagen optimizada y convertida a WebP exitosamente ({Math.round(blogUploadInfo.final_size / 1024)} KB).
                  </p>
                )}

                <input type="text" className="w-full border rounded-lg p-2 text-xs text-stone-600 focus:ring-2 focus:ring-primary-green outline-none" required
                  value={editingPost.image} onChange={e => setEditingPost({...editingPost, image: e.target.value})} 
                  placeholder="https://... o ruta /uploads/blog/..."/>
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

      {/* --- MODAL: EDIT TESTIMONIAL --- */}
      {editingTestimonial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl my-8 relative shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-header text-2xl text-secondary-brown font-bold">Editar Testimonio</h3>
                <p className="text-xs text-gray-500 font-body">Modifica el texto, calificación y fotografía de la mascota.</p>
              </div>
              <button 
                onClick={() => setEditingTestimonial(null)} 
                className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition cursor-pointer"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSaveTestimonial} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Tutor *</label>
                  <input 
                    type="text" 
                    required
                    value={editingTestimonial.owner_name}
                    onChange={e => setEditingTestimonial({ ...editingTestimonial, owner_name: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body"
                    placeholder="Ej. Valentina"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Perrito *</label>
                  <input 
                    type="text" 
                    required
                    value={editingTestimonial.dog_name}
                    onChange={e => setEditingTestimonial({ ...editingTestimonial, dog_name: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body"
                    placeholder="Ej. Max"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Calificación</label>
                  <select
                    value={editingTestimonial.rating || 5}
                    onChange={e => setEditingTestimonial({ ...editingTestimonial, rating: parseInt(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5 Estrellas</option>
                    <option value={4}>⭐⭐⭐⭐ 4 Estrellas</option>
                    <option value={3}>⭐⭐⭐ 3 Estrellas</option>
                    <option value={2}>⭐⭐ 2 Estrellas</option>
                    <option value={1}>⭐ 1 Estrella</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Estado de Publicación</label>
                  <select
                    value={editingTestimonial.status || 'approved'}
                    onChange={e => setEditingTestimonial({ ...editingTestimonial, status: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body"
                  >
                    <option value="approved">✅ Aprobado (Visible en tienda)</option>
                    <option value="pending">⏳ Pendiente de revisión</option>
                    <option value="rejected">❌ Rechazado (Oculto)</option>
                  </select>
                </div>
              </div>

              {/* Etiqueta de Dieta y Ubicación (Marcados en captura) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Etiqueta de Dieta / Menú *</label>
                  <input 
                    type="text" 
                    required
                    value={editingTestimonial.diet_tag || ''}
                    onChange={e => setEditingTestimonial({ ...editingTestimonial, diet_tag: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body"
                    placeholder="Ej. 🥩 Menú Cocinado al Vapor"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['🥩 Menú Cocinado al Vapor', '🥘 Dieta Cerdo Cocinada', '🐾 Dieta BARF Equilibrada', '🌿 Nutrición 100% Real'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditingTestimonial({ ...editingTestimonial, diet_tag: preset })}
                        className="text-[10px] bg-stone-100 hover:bg-[#677333]/15 text-stone-700 hover:text-[#4E5824] px-2 py-0.5 rounded-md font-medium transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Comuna / Ciudad *</label>
                  <input 
                    type="text" 
                    required
                    value={editingTestimonial.location || ''}
                    onChange={e => setEditingTestimonial({ ...editingTestimonial, location: e.target.value })}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body"
                    placeholder="Ej. Santiago, CL o Las Condes"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Santiago, CL', 'Las Condes', 'Vitacura', 'Providencia', 'Ñuñoa', 'Lo Barnechea'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditingTestimonial({ ...editingTestimonial, location: preset })}
                        className="text-[10px] bg-stone-100 hover:bg-[#677333]/15 text-stone-700 hover:text-[#4E5824] px-2 py-0.5 rounded-md font-medium transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fotografía del Perrito</label>
                <div className="flex items-center gap-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-xs border-2 border-white ring-2 ring-[#677333]/20 shrink-0 bg-stone-200 flex items-center justify-center">
                    {editingTestimonial.image_path ? (
                      <img src={editingTestimonial.image_path} alt="Perrito" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-stone-400 font-bold text-xs">Sin foto</span>
                    )}
                  </div>

                  <div className="flex-grow">
                    <input
                      ref={testimonialFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingTestimonialPhoto(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const uploadUrl = editingTestimonial.id 
                            ? `/api/admin/testimonials/${editingTestimonial.id}/upload-photo`
                            : `/api/admin/products/upload-image`;
                          const res = await fetchWithAuth(uploadUrl, {
                            method: 'POST',
                            body: formData
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setEditingTestimonial(prev => ({ ...prev, image_path: data.url }));
                          } else {
                            const err = await res.json().catch(() => ({}));
                            alert(err.detail || "Error subiendo la foto");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Error de conexión");
                        } finally {
                          setUploadingTestimonialPhoto(false);
                          if (testimonialFileInputRef.current) testimonialFileInputRef.current.value = '';
                        }
                      }}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={uploadingTestimonialPhoto}
                        onClick={() => testimonialFileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-[#677333] hover:bg-[#56602b] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {uploadingTestimonialPhoto ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Comprimiendo a WebP...
                          </>
                        ) : (
                          <>
                            <Upload size={13} />
                            Subir/Cambiar Foto
                          </>
                        )}
                      </button>

                      {editingTestimonial.image_path && (
                        <button
                          type="button"
                          onClick={() => setEditingTestimonial(prev => ({ ...prev, image_path: null }))}
                          className="px-3 py-2 text-stone-500 hover:text-red-600 text-xs font-semibold hover:bg-stone-100 rounded-xl transition cursor-pointer"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 font-body">Se recorta cuadrada y se comprime automáticamente en WebP.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Texto del Testimonio *</label>
                <textarea 
                  required
                  rows={4}
                  value={editingTestimonial.content}
                  onChange={e => setEditingTestimonial({ ...editingTestimonial, content: e.target.value })}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm font-body leading-relaxed"
                  placeholder="Escribe la experiencia del cliente..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setEditingTestimonial(null)} 
                  className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-primary-green hover:bg-primary-green-dark text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Save size={16}/> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: AGENTE 2 - GENERADOR DE ARTÍCULOS SEO CON IA --- */}
      {showAiBlogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Sparkles size={20} className="text-amber-600" />
                </span>
                <div>
                  <h3 className="text-xl font-black font-header text-stone-800">
                    Generador de Artículos Médicos & SEO (IA)
                  </h3>
                  <p className="text-xs text-stone-500 font-sans">
                    Redacción clínica veterinaria, Schema.org FAQ y guion para redes sociales.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAiBlogModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Presets de Temas de Alto Tráfico */}
            {!generatedAiResult && (
              <div className="my-4">
                <label className="block text-[11px] font-black uppercase text-stone-500 mb-2">
                  Temas sugeridos de alta conversión & búsqueda:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { topic: "Alergias en la piel y dermatitis: Cómo el cerdo cocinado desinflama", kw: "alergias caninas comida natural" },
                    { topic: "Guía médica de transición: De pellets a BARF crudo sin diarreas", kw: "transición dieta barf perro" },
                    { topic: "Cálculos renales y oxalatos: Por qué cuidar el uso de betarraga", kw: "calculos oxalato perro dieta" },
                    { topic: "Digestión y pH estomacal canino: La verdad sobre las bacterias y carne cruda", kw: "ph estomago perro barf" },
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAiBlogForm({ ...aiBlogForm, topic: preset.topic, target_keyword: preset.kw })}
                      className="text-left text-xs bg-stone-50 hover:bg-amber-50 hover:border-amber-300 border border-stone-200 p-2.5 rounded-xl transition-all text-stone-700 font-medium"
                    >
                      {preset.topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario */}
            {!generatedAiResult ? (
              <form onSubmit={handleGenerateAiBlog} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tema / Patología Canina *</label>
                  <input
                    type="text"
                    required
                    value={aiBlogForm.topic}
                    onChange={(e) => setAiBlogForm({ ...aiBlogForm, topic: e.target.value })}
                    placeholder="Ej: Gastritis crónica en Bulldogs y dieta cocinada"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Keyword Principal SEO</label>
                    <input
                      type="text"
                      value={aiBlogForm.target_keyword}
                      onChange={(e) => setAiBlogForm({ ...aiBlogForm, target_keyword: e.target.value })}
                      placeholder="Ej: dieta blanda para perros con gastritis"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Foco en Raza (Opcional)</label>
                    <input
                      type="text"
                      value={aiBlogForm.breed_focus}
                      onChange={(e) => setAiBlogForm({ ...aiBlogForm, breed_focus: e.target.value })}
                      placeholder="Ej: Bulldog Francés, Golden Retriever"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={14} className="text-amber-700" /> Human-in-the-Loop Garantizado:
                  </div>
                  <p className="text-[11px] text-amber-800">
                    El artículo se guardará automáticamente como <strong>Borrador</strong> para que puedas revisarlo, editarlo y aprobarlo antes de que sea visible públicamente en el sitio.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAiBlogModal(false)}
                    className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={generatingAiBlog}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {generatingAiBlog ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-amber-400" />
                        Redactando con LLaMA 3.3 70B...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} className="text-amber-400" />
                        Generar Artículo Médico & Guion
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Vista de Éxito y Resumen del Borrador Creado */
              <div className="space-y-4 py-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900">
                  <div className="flex items-center gap-2 font-black text-sm mb-1">
                    <CheckCircle2 size={18} className="text-emerald-700" />
                    ¡Borrador de Artículo Creado con Éxito!
                  </div>
                  <p className="text-xs text-emerald-800">
                    El artículo se encuentra listo en tu lista de blogs en estado <strong>Borrador</strong>.
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-stone-700">Título H1:</span>
                    <p className="font-bold text-stone-900 text-sm mt-0.5">{generatedAiResult.title}</p>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Meta Descripción SEO:</span>
                    <p className="text-stone-600 italic mt-0.5">{generatedAiResult.meta_description}</p>
                  </div>
                  {generatedAiResult.schema_faq && generatedAiResult.schema_faq.length > 0 && (
                    <div>
                      <span className="font-bold text-stone-700">FAQs Estructuradas (Schema.org):</span>
                      <ul className="list-disc list-inside mt-1 text-stone-600 space-y-0.5">
                        {generatedAiResult.schema_faq.map((faq, idx) => (
                          <li key={idx}><strong className="text-stone-800">{faq.question}</strong></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  {generatedAiResult.social_script && (
                    <button
                      onClick={() => setViewingSocialScript(generatedAiResult.social_script)}
                      className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Video size={14} className="text-red-500" />
                      Ver Guion Social TikTok/Reels
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setGeneratedAiResult(null);
                      setShowAiBlogModal(false);
                    }}
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer ml-auto"
                  >
                    Cerrar y Ver en Lista
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* --- MODAL: VISOR DE GUION SOCIAL (TIKTOK / REELS) --- */}
      {viewingSocialScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-red-500" />
                <h3 className="text-lg font-black font-header text-stone-800">
                  Guion para Video Social (45 Segundos)
                </h3>
              </div>
              <button 
                onClick={() => setViewingSocialScript(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-stone-900 text-amber-300 font-mono text-xs p-4 rounded-2xl whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed border border-stone-800">
              {viewingSocialScript}
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-[11px] text-stone-400">
                Optimizado para enganchar en los primeros 3 segundos.
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingSocialScript);
                  alert('¡Guion copiado al portapapeles!');
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Copiar Guion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
