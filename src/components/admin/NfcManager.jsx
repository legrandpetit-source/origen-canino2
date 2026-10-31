import React, { useState, useEffect } from 'react';
import { Building2, Plus, Copy, Check, Edit2, Trash2, MapPin, Sparkles, Navigation, Phone, ExternalLink } from 'lucide-react';

const NfcManager = ({ fetchWithAuth }) => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    street_references: '',
    discount_percent: 15,
    contact_info: '',
    active: 1
  });

  const loadBuildings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/nfc-buildings');
      const data = await res.json();
      setBuildings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando edificios NFC:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const openCreateModal = () => {
    setEditingBuilding(null);
    setFormData({
      name: '',
      slug: '',
      address: '',
      street_references: '',
      discount_percent: 15,
      contact_info: '',
      active: 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      slug: building.slug,
      address: building.address,
      street_references: building.street_references,
      discount_percent: building.discount_percent,
      contact_info: building.contact_info || '',
      active: building.active
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    // Autogenerar slug si es nuevo
    if (!editingBuilding) {
      const autoSlug = val
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, name: val, slug: autoSlug }));
    } else {
      setFormData(prev => ({ ...prev, name: val }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingBuilding) {
        await fetchWithAuth(`/api/admin/nfc-buildings/${editingBuilding.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetchWithAuth(`/api/admin/nfc-buildings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      loadBuildings();
    } catch (err) {
      alert("Error guardando edificio NFC: " + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar el punto NFC "${name}"?`)) {
      try {
        await fetchWithAuth(`/api/admin/nfc-buildings/${id}`, {
          method: 'DELETE'
        });
        loadBuildings();
      } catch (err) {
        alert("Error eliminando edificio: " + err.message);
      }
    }
  };

  const copyNfcUrl = (slug, id) => {
    const url = `https://origencanino.cl/?nfc=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const totalVisits = buildings.reduce((sum, b) => sum + (b.visits_count || 0), 0);
  const totalOrders = buildings.reduce((sum, b) => sum + (parseInt(b.orders_count) || 0), 0);
  const totalRevenue = buildings.reduce((sum, b) => sum + (parseInt(b.total_revenue) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border border-gray-200 gap-4 shadow-sm">
        <div>
          <h3 className="font-header text-2xl text-secondary-brown flex items-center gap-2">
            <Building2 className="text-primary-green" /> 
            Red de Puntos NFC (Condominios y Edificios)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Administra los chips NFC instalados en conserjerías, georreferencias de calle y enlaces de captación.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary-green hover:bg-primary-green-dark text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm text-sm"
        >
          <Plus size={18} /> Registrar Nuevo Edificio
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-semibold uppercase">Puntos Instalados</span>
          <p className="text-2xl font-bold text-secondary-brown mt-1">{buildings.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-semibold uppercase">Lecturas / Visitas NFC</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalVisits}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-semibold uppercase">Pedidos Captados</span>
          <p className="text-2xl font-bold text-primary-green mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-semibold uppercase">Ventas por NFC</span>
          <p className="text-2xl font-bold text-primary-green-dark mt-1">${totalRevenue.toLocaleString('es-CL')}</p>
        </div>
      </div>

      {/* Listado de Edificios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {buildings.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:border-primary-green/50 transition">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-header text-xl font-bold text-secondary-brown flex items-center gap-1.5">
                    {b.name}
                  </h4>
                  <span className="text-xs text-primary-green font-mono bg-green-50 px-2 py-0.5 rounded-md font-semibold">
                    slug: ?nfc={b.slug}
                  </span>
                </div>
                <span className="bg-primary-green text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles size={12} /> {b.discount_percent}% OFF
                </span>
              </div>

              {/* Dirección y Referencias de Calle */}
              <div className="space-y-2 mt-3 text-xs">
                <div className="flex items-start gap-2 text-gray-700">
                  <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <span><strong>Dirección:</strong> {b.address}</span>
                </div>

                <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl text-amber-900">
                  <Navigation size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[11px] uppercase tracking-wider text-amber-800">Referencias de Calle para Terreno:</strong>
                    <span>{b.street_references || 'Sin referencias'}</span>
                  </div>
                </div>

                {b.contact_info && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone size={14} className="text-gray-400" />
                    <span>{b.contact_info}</span>
                  </div>
                )}
              </div>

              {/* Estadísticas del Edificio */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center text-xs">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Visitas</span>
                  <strong className="text-gray-800 text-sm">{b.visits_count || 0}</strong>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Pedidos</span>
                  <strong className="text-gray-800 text-sm">{b.orders_count || 0}</strong>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Facturado</span>
                  <strong className="text-primary-green text-sm">${(parseInt(b.total_revenue) || 0).toLocaleString('es-CL')}</strong>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t">
              <button
                type="button"
                onClick={() => copyNfcUrl(b.slug, b.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs ${
                  copiedId === b.id 
                    ? 'bg-green-600 text-white' 
                    : 'bg-primary-green/10 text-primary-green hover:bg-primary-green hover:text-white'
                }`}
                title="Copiar URL para programar el chip NFC con tu teléfono"
              >
                {copiedId === b.id ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === b.id ? '¡Enlace NFC Copiado!' : 'Copiar Link para Chip NFC'}
              </button>

              <button
                type="button"
                onClick={() => openEditModal(b)}
                className="p-2 text-gray-500 hover:text-primary-green hover:bg-gray-100 rounded-lg transition"
                title="Editar"
              >
                <Edit2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(b.id, b.name)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {buildings.length === 0 && !loading && (
          <div className="col-span-2 text-center p-8 bg-gray-50 rounded-2xl border border-gray-200">
            <Building2 className="mx-auto text-gray-300 mb-2" size={40} />
            <p className="text-gray-600 font-semibold">No hay edificios ni puntos NFC registrados todavía.</p>
            <p className="text-xs text-gray-400 mt-1">Haz clic en "Registrar Nuevo Edificio" para crear el primero.</p>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="font-header text-2xl text-secondary-brown mb-1">
              {editingBuilding ? 'Editar Punto NFC' : 'Registrar Nuevo Edificio'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Ingresa los datos para identificar el edificio y generar el enlace de captación.
            </p>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Nombre del Edificio / Condominio *</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="Ej. Edificio Los Alerces"
                  className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Código / Slug en URL (?nfc=...) *</label>
                <input 
                  required
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="ej. los-alerces"
                  className="w-full border p-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-primary-green"
                />
                <span className="text-[11px] text-gray-400">
                  URL generada: https://origencanino.cl/?nfc={formData.slug || 'codigo'}
                </span>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Dirección Exacta *</label>
                <input 
                  required
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej. Av. Las Condes 1234, Torre A"
                  className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Referencias de Calle (Cruces, esquina, ubicación física del chip) *
                </label>
                <textarea 
                  required
                  rows={2}
                  value={formData.street_references}
                  onChange={(e) => setFormData({ ...formData, street_references: e.target.value })}
                  placeholder="Ej. Esquina con San Damián, frente a plaza canina. Chip instalado en el mesón de conserjería."
                  className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">% Descuento Exclusivo</label>
                  <input 
                    type="number"
                    min="1"
                    max="50"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 15 })}
                    className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Contacto Conserjería / Admin</label>
                  <input 
                    type="text"
                    value={formData.contact_info}
                    onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                    placeholder="Ej. Don Juan (+569...)"
                    className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary-green hover:bg-primary-green-dark text-white font-bold px-6 py-2 rounded-xl transition shadow-sm text-sm"
                >
                  Guardar Edificio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NfcManager;
