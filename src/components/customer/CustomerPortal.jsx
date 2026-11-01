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
  Scale
} from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const CustomerPortal = () => {
  const { customer, dogs, logout, updateProfile, addDog, updateDog, deleteDog, fetchOrders } = useCustomer();
  const { addItem, setIsCartOpen, setDogData } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'dogs', 'profile'
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
  const [dogForm, setDogForm] = useState({
    name: '',
    weight: '',
    age_stage: 'adulto',
    notes: ''
  });
  const [savingDog, setSavingDog] = useState(false);

  // Feedback notification
  const [feedback, setFeedback] = useState(null);

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
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
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <div className="p-4 bg-primary-green/10 text-primary-green rounded-3xl w-20 h-20 mx-auto flex items-center justify-center mb-6">
          <PawPrint size={40} />
        </div>
        <h2 className="font-header text-3xl text-secondary-brown mb-3">Portal de Clientes Origen Canino</h2>
        <p className="text-gray-600 mb-8 text-sm">
          Inicia sesión para revisar tus perritos, tus direcciones y repetir tus pedidos con un solo clic.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary-green text-white font-bold px-6 py-3 rounded-xl hover:bg-primary-green-dark transition shadow-md"
        >
          Volver a la Tienda
        </button>
      </div>
    );
  }

  // Handle Repeat Order
  const handleRepeatOrder = (order) => {
    if (!order.items || order.items.length === 0) {
      notify('error', 'Este pedido no contiene productos disponibles para repetir.');
      return;
    }

    // Si la orden tenía datos del perrito, cargarlos en CartContext
    if (order.dog_name && order.dog_weight) {
      setDogData({
        name: order.dog_name,
        weight: order.dog_weight,
        stage: order.dog_age || 'adulto'
      });
    }

    // Agregar items al carrito
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
      notify('success', 'Tus datos de despacho fueron actualizados.');
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
        notes: dog.notes || ''
      });
    } else {
      setEditingDog(null);
      setDogForm({
        name: '',
        weight: '',
        age_stage: 'adulto',
        notes: ''
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
    <div className="bg-bg-cream/40 min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        
        {/* Customer Header Banner */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-green/10 text-primary-green flex items-center justify-center font-bold text-2xl font-header">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-header text-2xl md:text-3xl text-secondary-brown">
                  ¡Hola, {customer.name}!
                </h2>
                <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                  Cliente Frecuente
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                <span>{customer.email}</span>
                {customer.phone && <span>• {customer.phone}</span>}
                {customer.city && <span>• {customer.city}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition w-full md:w-auto"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Global Feedback */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold transition-all shadow-sm ${
            feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle size={20} className="text-green-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 px-4 font-bold text-sm md:text-base rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'orders' 
                ? 'bg-primary-green text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag size={18} />
            Mis Pedidos ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('dogs')}
            className={`flex-1 py-3 px-4 font-bold text-sm md:text-base rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'dogs' 
                ? 'bg-primary-green text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <PawPrint size={18} />
            Mis Mascotas ({dogs.length})
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 font-bold text-sm md:text-base rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'profile' 
                ? 'bg-primary-green text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MapPin size={18} />
            Datos de Despacho
          </button>
        </div>

        {/* --- TAB 1: ORDERS & REPEAT ORDER --- */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 text-gray-500">
                <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-primary-green" />
                <p>Cargando tus pedidos anteriores...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="p-4 bg-amber-50 text-amber-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="font-header text-2xl text-secondary-brown">Aún no has realizado pedidos</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  Elige la dieta BARF o cocinada que mejor se adapte a tu perrito en nuestra tienda.
                </p>
                <button
                  onClick={() => navigate('/#tienda')}
                  className="bg-primary-green text-white font-bold px-6 py-3 rounded-xl hover:bg-primary-green-dark transition shadow"
                >
                  Ver Menú de Dietas
                </button>
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-primary-green/30 transition">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-header text-xl text-secondary-brown font-bold">
                        Pedido #{o.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        o.payment_status?.toLowerCase().includes('pagado') 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.payment_status || 'Pendiente'}
                      </span>
                      {o.is_subscription === 1 && (
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                          Plan Mensual
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-4">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {o.created_at}</span>
                      {o.dog_name && <span>• Para: <strong>{o.dog_name}</strong> ({o.dog_weight} kg)</span>}
                    </div>

                    {/* Items list */}
                    {o.items && o.items.length > 0 && (
                      <div className="pt-2 text-sm text-gray-700">
                        <ul className="list-disc list-inside space-y-0.5">
                          {o.items.map((item, idx) => (
                            <li key={idx}>
                              <span className="font-semibold">{item.quantity}x</span> {item.product_name} {item.weight ? <span className="text-gray-500 text-xs font-normal">({item.weight})</span> : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                    <p className="font-sans text-2xl font-bold text-secondary-brown">
                      ${o.total?.toLocaleString('es-CL')}
                    </p>
                    
                    <button
                      onClick={() => handleRepeatOrder(o)}
                      className="w-full md:w-auto bg-primary-green text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary-green-dark transition shadow flex items-center justify-center gap-2 text-sm"
                    >
                      <RotateCcw size={16} />
                      Repetir este Pedido
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- TAB 2: MY DOGS --- */}
        {activeTab === 'dogs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-header text-2xl text-secondary-brown">Mis Mascotas Registradas</h3>
                <p className="text-sm text-gray-500">Mantén actualizado el peso de tus perritos para recibir la porción nutricional exacta.</p>
              </div>
              <button
                onClick={() => handleOpenDogModal()}
                className="bg-primary-green text-white font-bold px-4 py-2.5 rounded-xl hover:bg-primary-green-dark transition shadow text-sm flex items-center gap-2"
              >
                <Plus size={18} />
                Agregar Mascota
              </button>
            </div>

            {dogs.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="p-4 bg-amber-50 text-amber-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <PawPrint size={32} />
                </div>
                <h4 className="font-header text-xl text-secondary-brown">No tienes mascotas registradas</h4>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  Agrega a tu perrito para que sus porciones queden pre-calculadas en cada compra.
                </p>
                <button
                  onClick={() => handleOpenDogModal()}
                  className="bg-primary-green text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary-green-dark transition shadow text-sm"
                >
                  Registrar mi primer perrito
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dogs.map((dog) => {
                  const dailyGrams = Math.round(dog.weight * 1000 * 0.025); // 2.5% del peso corporal
                  return (
                    <div key={dog.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 hover:border-primary-green/30 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-amber-100/70 text-amber-800 rounded-2xl">
                            <PawPrint size={24} />
                          </div>
                          <div>
                            <h4 className="font-header text-2xl text-secondary-brown">{dog.name}</h4>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full capitalize">
                              {dog.age_stage || 'Adulto'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenDogModal(dog)}
                            className="p-2 text-gray-400 hover:text-primary-green rounded-lg hover:bg-gray-50 transition"
                            title="Editar datos o peso"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDog(dog)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Eliminar mascota"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl text-center">
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase">Peso Actual</p>
                          <p className="text-xl font-bold text-secondary-brown">{dog.weight} Kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase">Porción Diaria Sugerida</p>
                          <p className="text-xl font-bold text-primary-green">~{dailyGrams} g/día</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDogData({ name: dog.name, weight: dog.weight, stage: dog.age_stage });
                          navigate('/#tienda');
                        }}
                        className="w-full bg-primary-green/10 text-primary-green font-bold py-2.5 rounded-xl hover:bg-primary-green hover:text-white transition text-sm flex items-center justify-center gap-2"
                      >
                        Comprar Menú para {dog.name}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: PROFILE & DISPATCH --- */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="font-header text-2xl text-secondary-brown">Mis Datos de Entrega Habitual</h3>
              <p className="text-sm text-gray-500">Estos datos se usarán por defecto cada vez que compres en la tienda.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono (WhatsApp de contacto)</label>
                <input
                  type="tel"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Dirección de Despacho (Calle, Número, Depto)</label>
                <input
                  type="text"
                  required
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Comuna (Santiago)</label>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Región</label>
                  <input
                    type="text"
                    disabled
                    value={profileForm.region}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-primary-green text-white font-bold py-3.5 rounded-xl hover:bg-primary-green-dark transition shadow-md flex items-center justify-center gap-2"
                >
                  {savingProfile ? "Guardando..." : "Guardar Datos de Despacho"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- MODAL: AGREGAR O EDITAR PERRO --- */}
        {isDogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-gray-100">
              <h4 className="font-header text-2xl text-secondary-brown mb-2">
                {editingDog ? `Editar a ${editingDog.name}` : 'Registrar Nueva Mascota'}
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Ingresa los datos para adaptar la porción diaria recomendada.
              </p>

              <form onSubmit={handleSaveDog} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Perrito</label>
                  <input
                    type="text"
                    required
                    value={dogForm.name}
                    onChange={(e) => setDogForm({ ...dogForm, name: e.target.value })}
                    placeholder="Ej. Rocky"
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Peso (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={dogForm.weight}
                      onChange={(e) => setDogForm({ ...dogForm, weight: e.target.value })}
                      placeholder="Ej. 14.5"
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Etapa de Vida</label>
                    <select
                      value={dogForm.age_stage}
                      onChange={(e) => setDogForm({ ...dogForm, age_stage: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                    >
                      <option value="adulto">Adulto</option>
                      <option value="cachorro">Cachorro</option>
                      <option value="senior">Senior (+7 años)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDogModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingDog}
                    className="px-5 py-2.5 bg-primary-green text-white rounded-xl text-sm font-bold hover:bg-primary-green-dark transition shadow"
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

