import React, { useState, useEffect } from 'react';
import { 
  User, 
  PawPrint, 
  ShoppingBag, 
  MapPin, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  RotateCcw, 
  Calendar, 
  ChevronRight,
  ShieldCheck,
  Scale,
  Sparkles,
  Truck,
  Phone,
  Mail,
  Building2,
  ShoppingCart,
  Heart,
  Camera
} from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const CustomerPortal = () => {
  const { customer, dogs, logout, updateProfile, addDog, updateDog, deleteDog, uploadDogPhoto, fetchOrders } = useCustomer();
  const { addItem, setIsCartOpen, setDogData } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dogs'); // 'orders', 'dogs', 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Profile edit
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    region: 'Región Metropolitana'
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Dog modal
  const [isDogModalOpen, setIsDogModalOpen] = useState(false);
  const [editingDog, setEditingDog] = useState(null);
  const [uploadingPhotoForDogId, setUploadingPhotoForDogId] = useState(null);
  const [dogForm, setDogForm] = useState({
    name: '',
    weight: '',
    age_stage: 'adulto',
    notes: '',
    photo_url: ''
  });
  const [savingDog, setSavingDog] = useState(false);

  // Feedback notification
  const [feedback, setFeedback] = useState(null);

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Direct photo upload with WebP conversion in backend
  const handleDirectPhotoUpload = async (dogId, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('error', 'Por favor selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify('error', 'La foto no debe superar los 8 MB.');
      return;
    }

    setUploadingPhotoForDogId(dogId);
    try {
      await uploadDogPhoto(dogId, file);
      notify('success', '¡Foto guardada y optimizada en WebP!');
    } catch (err) {
      notify('error', err.message || 'Error al subir foto de la mascota');
    } finally {
      setUploadingPhotoForDogId(null);
    }
  };

  useEffect(() => {
    if (customer) {
      setProfileForm({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || 'Santiago',
        region: customer.region || 'Región Metropolitana'
      });
      loadCustomerOrders();
    }
  }, [customer]);

  const loadCustomerOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (!customer) {
    return (
      <div className="bg-bg-cream min-h-screen py-16 flex items-center justify-center">
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-[#EBE4DA] shadow-lg text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-primary-green/10 text-primary-green rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xs border border-primary-green/20">
            <PawPrint size={40} />
          </div>
          <h2 className="font-header text-3xl text-secondary-brown mb-2 font-bold">Portal de Clientes</h2>
          <p className="text-stone-600 mb-8 text-sm leading-relaxed">
            Inicia sesión con tu correo y contraseña para revisar tus perritos, tus direcciones de entrega y repetir tus pedidos con un solo clic.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary-green text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-primary-green-dark transition shadow-md cursor-pointer"
          >
            Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  // Handle Repeat Order
  const handleRepeatOrder = (order) => {
    if (!order.items || order.items.length === 0) {
      notify('error', 'Este pedido no contiene productos disponibles para repetir.');
      return;
    }

    if (order.dog_name && order.dog_weight) {
      setDogData({
        name: order.dog_name,
        weight: order.dog_weight,
        stage: order.dog_age || 'adulto'
      });
    }

    order.items.forEach(item => {
      addItem({
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        weight: item.weight
      }, item.quantity);
    });

    notify('success', `¡Productos del Pedido #${order.id} añadidos al carrito!`);
    setIsCartOpen(true);
  };

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileForm);
      notify('success', '¡Tus datos de despacho fueron actualizados exitosamente!');
    } catch (err) {
      notify('error', err.message || 'Error al actualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  // Open dog modal for create or edit
  const handleOpenDogModal = (dog = null) => {
    if (dog) {
      setEditingDog(dog);
      setDogForm({
        name: dog.name,
        weight: dog.weight,
        age_stage: dog.age_stage || 'adulto',
        notes: dog.notes || '',
        photo_url: dog.photo_url || ''
      });
    } else {
      setEditingDog(null);
      setDogForm({
        name: '',
        weight: '',
        age_stage: 'adulto',
        notes: '',
        photo_url: ''
      });
    }
    setIsDogModalOpen(true);
  };

  // Save dog
  const handleSaveDog = async (e) => {
    e.preventDefault();
    setSavingDog(true);
    try {
      if (editingDog) {
        await updateDog(editingDog.id, {
          ...dogForm,
          weight: parseFloat(dogForm.weight)
        });
        notify('success', `Datos de ${dogForm.name} actualizados.`);
      } else {
        await addDog({
          ...dogForm,
          weight: parseFloat(dogForm.weight)
        });
        notify('success', `¡${dogForm.name} registrado con éxito!`);
      }
      setIsDogModalOpen(false);
    } catch (err) {
      notify('error', err.message || 'Error al guardar mascota');
    } finally {
      setSavingDog(false);
    }
  };

  // Delete dog
  const handleDeleteDog = async (dog) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${dog.name}?`)) return;
    try {
      await deleteDog(dog.id);
      notify('success', `${dog.name} fue eliminado.`);
    } catch (err) {
      notify('error', 'Error al eliminar mascota');
    }
  };

  return (
    <div className="bg-bg-cream min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-5xl space-y-8">
        
        {/* HERO CARD PRINCIPAL DEL CLIENTE */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EBE4DA] shadow-xs relative overflow-hidden">
          {/* Fondo sutil orgánico */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-green/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-secondary-orange/5 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              {/* Avatar Oficial con Logo Origen Canino */}
              <div className="w-18 h-18 md:w-20 md:h-20 rounded-3xl bg-[#FAF7F2] p-2 border-2 border-primary-green/25 shadow-xs flex items-center justify-center shrink-0">
                <img 
                  src="/logo.webp" 
                  alt="Origen Canino" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <PawPrint size={32} className="text-primary-green hidden only:block" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-header text-2xl md:text-3xl text-secondary-brown font-extrabold tracking-tight">
                    ¡Hola, {customer.name}!
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#db994b]/15 text-[#9e6320] text-xs font-bold rounded-full border border-[#db994b]/30">
                    <Sparkles size={13} className="text-[#db994b]" />
                    Cliente Nutrición Real
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs md:text-sm text-stone-500 mt-1.5">
                  <span className="flex items-center gap-1 text-stone-700 font-medium">
                    <Mail size={13} className="text-primary-green" />
                    {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1 text-stone-600">
                      • <Phone size={13} className="text-primary-green" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.city && (
                    <span className="flex items-center gap-1 text-stone-600">
                      • <MapPin size={13} className="text-primary-green" />
                      {customer.city} ({customer.region || 'Región Metropolitana'})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                onClick={() => {
                  navigate('/#tienda');
                  setTimeout(() => {
                    const el = document.getElementById('catalogo') || document.getElementById('tienda');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-green hover:bg-primary-green-dark text-white rounded-2xl text-xs md:text-sm font-bold shadow-xs transition cursor-pointer"
              >
                <ShoppingCart size={15} />
                <span>Ir a la Tienda</span>
              </button>

              <button
                onClick={() => { logout(); navigate('/'); }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-stone-200 text-stone-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 rounded-2xl text-xs md:text-sm font-semibold transition cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut size={15} />
                <span>Salir</span>
              </button>
            </div>
          </div>

          {/* Mini-Indicadores Informativos */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-[#EBE4DA]/80">
            <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EBE4DA]">
              <div className="w-10 h-10 rounded-xl bg-primary-green/10 text-primary-green flex items-center justify-center shrink-0">
                <PawPrint size={20} />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500 block">Tus Mascotas</span>
                <span className="text-sm font-bold text-secondary-brown">{dogs.length} perrito(s) registrado(s)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EBE4DA]">
              <div className="w-10 h-10 rounded-xl bg-[#db994b]/15 text-[#db994b] flex items-center justify-center shrink-0">
                <Truck size={20} />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500 block">Despacho en</span>
                <span className="text-sm font-bold text-secondary-brown">{customer.city || 'Algarrobo'} ({customer.region ? customer.region.replace('Región de ', '').replace('Región ', '') : 'RM'})</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EBE4DA]">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500 block">Seguridad Cadena de Frío</span>
                <span className="text-sm font-bold text-secondary-brown">-18°C Ultra-congelado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Feedback */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold transition-all shadow-sm ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* SEGMENTED CONTROL TABS */}
        <div className="bg-[#EDE8DF] p-1.5 rounded-2xl border border-[#EBE4DA] flex gap-2 shadow-2xs">
          <button
            onClick={() => setActiveTab('dogs')}
            className={`flex-1 py-3 px-4 font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'dogs' 
                ? 'bg-primary-green text-white shadow-md' 
                : 'text-secondary-brown hover:text-primary-green hover:bg-white/60'
            }`}
          >
            <PawPrint size={17} />
            <span>Mis Mascotas ({dogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-primary-green text-white shadow-md' 
                : 'text-secondary-brown hover:text-primary-green hover:bg-white/60'
            }`}
          >
            <MapPin size={17} />
            <span>Datos de Despacho</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 px-4 font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'orders' 
                ? 'bg-primary-green text-white shadow-md' 
                : 'text-secondary-brown hover:text-primary-green hover:bg-white/60'
            }`}
          >
            <ShoppingBag size={17} />
            <span>Historial de Pedidos ({orders.length})</span>
          </button>
        </div>

        {/* --- TAB 1: MIS MASCOTAS --- */}
        {activeTab === 'dogs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-[#EBE4DA]">
              <div>
                <h2 className="font-header text-2xl text-secondary-brown font-bold">Fichas Nutricionales de tus Perritos</h2>
                <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                  Mantén el peso al día para que el sistema calcule automáticamente los gramos diarios y porciones de cada menú.
                </p>
              </div>
              <button
                onClick={() => handleOpenDogModal()}
                className="bg-primary-green hover:bg-primary-green-dark text-white font-bold px-5 py-3 rounded-2xl shadow-sm text-xs md:text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                <Plus size={18} />
                <span>Registrar Nueva Mascota</span>
              </button>
            </div>

            {dogs.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-[#EBE4DA] shadow-xs space-y-4">
                <div className="p-4 bg-amber-50 text-amber-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center border border-amber-200">
                  <PawPrint size={32} />
                </div>
                <h3 className="font-header text-xl text-secondary-brown font-bold">Aún no registras a tu mascota</h3>
                <p className="text-stone-500 text-sm max-w-sm mx-auto">
                  Agrega a tu perrito con su peso corporal para calcular su porción diaria recomendada en cada pedido.
                </p>
                <button
                  onClick={() => handleOpenDogModal()}
                  className="bg-primary-green text-white font-bold px-6 py-3 rounded-2xl hover:bg-primary-green-dark transition shadow-sm text-sm cursor-pointer"
                >
                  Registrar mi primer perrito
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dogs.map((dog) => {
                  const dailyGrams = Math.round(dog.weight * 1000 * 0.025); // 2.5% de peso corporal
                  const monthlyKilos = ((dailyGrams * 30) / 1000).toFixed(1);

                  return (
                    <div 
                      key={dog.id} 
                      className="bg-white rounded-3xl p-6 border border-[#EBE4DA] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Cabecera de la Mascota */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3.5">
                            {/* Avatar con foto o ícono + upload directo WebP */}
                            <div className="relative group/avatar w-14 h-14 rounded-2xl overflow-hidden bg-[#faf7f2] border-2 border-primary-green/25 shadow-2xs shrink-0 flex items-center justify-center">
                              {dog.photo_url ? (
                                <img 
                                  src={dog.photo_url} 
                                  alt={dog.name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary-green p-2.5">
                                  <PawPrint size={26} />
                                </div>
                              )}

                              {/* Botón flotante para subir/cambiar foto */}
                              <label 
                                className={`absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition ${
                                  uploadingPhotoForDogId === dog.id ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100'
                                }`}
                                title="Subir o cambiar foto de tu perrito (se optimiza a WebP)"
                              >
                                {uploadingPhotoForDogId === dog.id ? (
                                  <RefreshCw size={16} className="animate-spin text-white" />
                                ) : (
                                  <>
                                    <Camera size={16} />
                                    <span className="text-[9px] font-bold">Foto</span>
                                  </>
                                )}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  disabled={uploadingPhotoForDogId === dog.id}
                                  className="hidden" 
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleDirectPhotoUpload(dog.id, e.target.files[0]);
                                    }
                                  }} 
                                />
                              </label>
                            </div>

                            <div>
                              <h3 className="font-header text-2xl text-secondary-brown font-bold tracking-tight">
                                {dog.name}
                              </h3>
                              <span className="text-xs font-bold px-2.5 py-0.5 bg-primary-green/10 text-primary-green-dark rounded-full capitalize border border-primary-green/20">
                                {dog.age_stage === 'adult_low' ? 'Adulto / Senior' : dog.age_stage || 'Adulto'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenDogModal(dog)}
                              className="p-2 text-stone-400 hover:text-primary-green rounded-xl hover:bg-[#faf7f2] transition cursor-pointer"
                              title="Editar datos o peso"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteDog(dog)}
                              className="p-2 text-stone-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                              title="Eliminar ficha"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Bloque de Cálculo Nutricional Biológico */}
                        <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#EBE4DA] grid grid-cols-2 gap-3 text-center my-3">
                          <div className="border-r border-[#EBE4DA] pr-2">
                            <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Peso Registrado</p>
                            <p className="text-2xl font-extrabold text-secondary-brown mt-0.5">{dog.weight} Kg</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">Peso en balanza</p>
                          </div>
                          <div className="pl-2">
                            <p className="text-[11px] text-primary-green font-bold uppercase tracking-wider">Porción Diaria</p>
                            <p className="text-2xl font-extrabold text-primary-green mt-0.5">~{dailyGrams} g</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">2.5% diario (~{monthlyKilos} kg/mes)</p>
                          </div>
                        </div>

                        <div className="text-[11px] text-stone-500 flex items-center justify-center gap-1.5 py-1">
                          <ShieldCheck size={14} className="text-primary-green" />
                          <span>Formato recomendado: paquetes de 1 Kg al vacío</span>
                        </div>

                        {dog.notes && (
                          <div className="mt-2 px-3 py-1.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-amber-700 shrink-0" />
                            <span className="truncate"><strong>Salud / Alergias:</strong> {dog.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Botón de Compra Personalizada */}
                      <button
                        onClick={() => {
                          setDogData({ name: dog.name, weight: dog.weight, stage: dog.age_stage });
                          navigate('/#tienda');
                          setTimeout(() => {
                            const el = document.getElementById('catalogo') || document.getElementById('tienda');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }, 150);
                        }}
                        className="mt-4 w-full bg-secondary-orange hover:bg-[#c58235] text-white font-bold py-3.5 rounded-2xl transition shadow-xs text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingCart size={16} />
                        <span>Comprar Menú para {dog.name}</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: DATOS DE DESPACHO (DIRECCIÓN Y REGIÓN) --- */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-[#EBE4DA] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EBE4DA]">
              <div className="w-12 h-12 rounded-2xl bg-primary-green/10 text-primary-green flex items-center justify-center shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <h2 className="font-header text-2xl text-secondary-brown font-bold">Mis Datos de Despacho Habitual</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Estos datos se usarán por defecto para coordinar tus despachos congelados con cadena de frío (-18°C).
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <User size={13} className="text-primary-green" /> Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Ej. Patricio Padilla"
                  className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Phone size={13} className="text-primary-green" /> Teléfono / WhatsApp de Contacto *
                </label>
                <input
                  type="tel"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+56 9 5704 0679"
                  className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary-green" /> Dirección de Entrega (Calle, Número, Depto/Torre) *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="Séptima Oriente Playa 312"
                  className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-primary-green" /> Comuna / Ciudad *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    placeholder="Ej. Algarrobo, Viña del Mar, Las Condes"
                    className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Building2 size={13} className="text-primary-green" /> Región de Despacho *
                  </label>
                  <select
                    value={profileForm.region}
                    onChange={(e) => setProfileForm({ ...profileForm, region: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white cursor-pointer font-medium"
                  >
                    <option value="Región Metropolitana">Región Metropolitana (Santiago)</option>
                    <option value="Región de Valparaíso">Región de Valparaíso (Litoral y Costa)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-base"
                >
                  {savingProfile ? "Guardando datos..." : "Guardar Dirección de Despacho"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 3: HISTORIAL DE PEDIDOS --- */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-[#EBE4DA] text-stone-500 shadow-xs">
                <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-primary-green" />
                <p>Cargando tus pedidos anteriores...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-[#EBE4DA] shadow-xs space-y-4">
                <div className="p-4 bg-amber-50 text-amber-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center border border-amber-200">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="font-header text-2xl text-secondary-brown font-bold">Aún no registras pedidos anteriores</h3>
                <p className="text-stone-500 text-sm max-w-sm mx-auto">
                  Elige la dieta BARF o cocinada que mejor se adapte a tu perrito en nuestra tienda.
                </p>
                <button
                  onClick={() => navigate('/#tienda')}
                  className="bg-primary-green text-white font-bold px-6 py-3 rounded-2xl hover:bg-primary-green-dark transition shadow-sm cursor-pointer"
                >
                  Explorar Dietas & Menús
                </button>
              </div>
            ) : (
              orders.map((o) => (
                <div 
                  key={o.id} 
                  className="bg-white p-6 rounded-3xl border border-[#EBE4DA] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-primary-green/40 transition"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-header text-xl text-secondary-brown font-bold">
                        Pedido #{o.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        o.payment_status?.toLowerCase().includes('pagado') 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {o.payment_status || 'Pendiente'}
                      </span>
                      {o.is_subscription === 1 && (
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                          Plan Mensual
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-primary-green" />
                        {new Date(o.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <span>Estado: <strong className="text-secondary-brown">{o.delivery_status || 'Preparación'}</strong></span>
                      {o.dog_name && <span>• Perro: <strong>{o.dog_name}</strong></span>}
                    </div>

                    {/* Resumen de Productos */}
                    {o.items && o.items.length > 0 && (
                      <div className="pt-2 text-xs text-stone-600">
                        <ul className="list-disc list-inside space-y-0.5">
                          {o.items.map((it, idx) => (
                            <li key={idx}>
                              <strong>{it.quantity}x</strong> {it.product_name} {it.weight ? `(${it.weight})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                    <p className="font-sans text-2xl font-extrabold text-secondary-brown">
                      ${o.total?.toLocaleString('es-CL')}
                    </p>
                    
                    <button
                      onClick={() => handleRepeatOrder(o)}
                      className="w-full md:w-auto bg-primary-green text-white font-bold px-5 py-2.5 rounded-2xl hover:bg-primary-green-dark transition shadow-xs flex items-center justify-center gap-2 text-xs md:text-sm cursor-pointer"
                    >
                      <RotateCcw size={15} />
                      Repetir este Pedido
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- MODAL PARA REGISTRAR O EDITAR PERRO --- */}
        {isDogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 relative shadow-2xl border border-[#EBE4DA]">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#EBE4DA]">
                <div className="w-11 h-11 rounded-2xl bg-[#faf7f2] border border-[#EBE4DA] text-primary-green flex items-center justify-center">
                  <PawPrint size={22} />
                </div>
                <div>
                  <h4 className="font-header text-2xl text-secondary-brown font-bold">
                    {editingDog ? `Editar a ${editingDog.name}` : 'Registrar Nueva Mascota'}
                  </h4>
                  <p className="text-xs text-stone-500">
                    Para calcular porción y requerimiento calórico.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveDog} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Nombre del Perrito *</label>
                  <input
                    type="text"
                    required
                    value={dogForm.name}
                    onChange={(e) => setDogForm({ ...dogForm, name: e.target.value })}
                    placeholder="Ej. Canelo, Morocha"
                    className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Peso en Kg *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={dogForm.weight}
                      onChange={(e) => setDogForm({ ...dogForm, weight: e.target.value })}
                      placeholder="Ej. 14.5"
                      className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Etapa de Vida</label>
                    <select
                      value={dogForm.age_stage}
                      onChange={(e) => setDogForm({ ...dogForm, age_stage: e.target.value })}
                      className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white cursor-pointer"
                    >
                      <option value="adulto">Adulto</option>
                      <option value="cachorro">Cachorro</option>
                      <option value="adult_low">Adulto / Senior</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Notas de Salud / Alergias (Opcional)</label>
                  <input
                    type="text"
                    value={dogForm.notes}
                    onChange={(e) => setDogForm({ ...dogForm, notes: e.target.value })}
                    placeholder="Ej. Sensible al pollo, alérgico a granos"
                    className="w-full border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm bg-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#EBE4DA]">
                  <button
                    type="button"
                    onClick={() => setIsDogModalOpen(false)}
                    className="px-4 py-2.5 border border-stone-300 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingDog}
                    className="px-5 py-2.5 bg-primary-green text-white rounded-xl text-xs font-bold hover:bg-primary-green-dark transition shadow cursor-pointer disabled:opacity-50"
                  >
                    {savingDog ? "Guardando..." : "Guardar Mascota"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CustomerPortal;