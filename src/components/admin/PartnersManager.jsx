import React, { useState, useEffect } from 'react';
import { 
  Building2, Stethoscope, Search, Filter, Sparkles, Send, 
  ExternalLink, CheckCircle2, AlertCircle, Award, Star, 
  Phone, Mail, MapPin, Plus, Trash2, Edit2, RefreshCw,
  TrendingUp, Users, MessageSquare, Copy, Check
} from 'lucide-react';

const CATEGORIES = [
  { id: 'todas', label: 'Todas las categorías' },
  { id: 'veterinaria', label: 'Veterinarias' },
  { id: 'clinica', label: 'Clínicas / Hospitales' },
  { id: 'petshop', label: 'Pet Shops / Boutiques' },
  { id: 'adiestrador', label: 'Paseadores & Entrenadores' },
  { id: 'peluqueria', label: 'Peluquerías Caninas' },
];

const COMMUNES = [
  'Todas', 'Las Condes', 'Vitacura', 'Lo Barnechea', 
  'Providencia', 'Ñuñoa', 'La Reina', 'Santiago Centro', 'Peñalolén'
];

const PartnersManager = ({ fetchWithAuth }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [communeFilter, setCommuneFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Modal para agregar/editar
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'veterinaria',
    commune: 'Las Condes',
    phone: '',
    email: '',
    address: '',
    google_rating: 4.8,
    reviews_count: 50,
    instagram: '',
    website: '',
    lead_score: 80,
    partnership_status: 'prospecto',
    commission_rate: 0.10,
    notes: ''
  });

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/partners');
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch (err) {
      console.error('Error cargando partners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleTriggerScraper = async () => {
    setScraping(true);
    try {
      const res = await fetchWithAuth('/api/admin/partners/scrape', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Radar de alianzas completado.');
        loadPartners();
      } else {
        alert(data.detail || 'Error al ejecutar scraper');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al ejecutar el scraper.');
    } finally {
      setScraping(false);
    }
  };

  const handleAssignCode = async (partnerId) => {
    try {
      const res = await fetchWithAuth(`/api/admin/partners/${partnerId}/assign-code`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`¡Código de embajador asignado con éxito: ${data.ambassador_code}!`);
        loadPartners();
      } else {
        alert(data.detail || 'Error al asignar código');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este prospecto?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/partners/${partnerId}`, { method: 'DELETE' });
      if (res.ok) {
        loadPartners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePartner = async (e) => {
    e.preventDefault();
    try {
      const url = editingPartner 
        ? `/api/admin/partners/${editingPartner.id}` 
        : '/api/admin/partners';
      const method = editingPartner ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingPartner(null);
        loadPartners();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Error al guardar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      category: partner.category,
      commune: partner.commune,
      phone: partner.phone || '',
      email: partner.email || '',
      address: partner.address || '',
      google_rating: partner.google_rating || 4.5,
      reviews_count: partner.reviews_count || 10,
      instagram: partner.instagram || '',
      website: partner.website || '',
      lead_score: partner.lead_score || 50,
      partnership_status: partner.partnership_status || 'prospecto',
      commission_rate: partner.commission_rate || 0.10,
      notes: partner.notes || ''
    });
    setShowAddModal(true);
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Generador de mensaje de WhatsApp persuasivo y profesional
  const generateWhatsAppUrl = (partner) => {
    const rawPhone = (partner.phone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) return '#';

    let message = '';
    if (partner.category === 'veterinaria' || partner.category === 'clinica') {
      message = `Hola equipo de ${partner.name}, les saluda Patricio Padilla de Origen Canino (origencanino.cl).\n\nLes escribo porque vemos su excelente reputación médica en ${partner.commune} y queremos presentarles nuestro programa de recomendación clínica en Nutrición Biológica Real (Dieta BARF Cruda y Cocinada al Vapor para estómagos sensibles).\n\nNos gustaría enviarles muestras para sus pacientes alérgicos o con intolerancia a pellets y dejarles un código con 10% de beneficio para sus tutores. ¿Con quién podríamos conversar unos minutos?`;
    } else {
      message = `Hola ${partner.name}, les saluda Patricio de Origen Canino (origencanino.cl).\n\nVemos su gran trabajo con perritos en ${partner.commune} y queremos invitarlos a ser embajadores oficiales de nuestra comida natural y snacks de carne 100% deshidratada (ideales para paseos y adiestramiento).\n\nEntregamos 10% de comisión por cada tutor que empiece con su código. ¿Podemos enviarles un pack de degustación para sus perros?`;
    }

    if (partner.ambassador_code) {
      message += `\n\n(Su código exclusivo reservado es: ${partner.ambassador_code})`;
    }

    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
  };

  // Filtrado
  const filteredPartners = partners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.commune.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchCategory = categoryFilter === 'todas' || p.category === categoryFilter;
    const matchCommune = communeFilter === 'Todas' || p.commune.toLowerCase() === communeFilter.toLowerCase();
    const matchStatus = statusFilter === 'todos' || p.partnership_status === statusFilter;

    return matchSearch && matchCategory && matchCommune && matchStatus;
  });

  // Métricas
  const totalProspects = partners.length;
  const activeAmbassadors = partners.filter(p => p.partnership_status === 'activo_embajador').length;
  const contactedCount = partners.filter(p => p.partnership_status === 'contactado').length;
  const avgScore = totalProspects > 0 ? Math.round(partners.reduce((acc, p) => acc + (p.lead_score || 0), 0) / totalProspects) : 0;

  return (
    <div className="space-y-6">
      
      {/* Header y Acciones */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Stethoscope size={13} /> Agente 1: Crecimiento B2B & Alianzas
            </span>
          </div>
          <h2 className="text-2xl font-black font-header text-stone-800">
            Radar de Veterinarias & Embajadores Pet
          </h2>
          <p className="text-xs text-stone-500 font-sans mt-0.5">
            Prospección con Lead Scoring, envío de WhatsApp pre-redactado y asignación de comisiones con 1 clic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerScraper}
            disabled={scraping}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            <Sparkles size={15} className={`text-amber-400 ${scraping ? 'animate-spin' : ''}`} />
            {scraping ? 'Escaneando Sector Oriente...' : 'Ejecutar Radar Scraper'}
          </button>

          <button
            onClick={() => {
              setEditingPartner(null);
              setFormData({
                name: '',
                category: 'veterinaria',
                commune: 'Las Condes',
                phone: '',
                email: '',
                address: '',
                google_rating: 4.8,
                reviews_count: 50,
                instagram: '',
                website: '',
                lead_score: 80,
                partnership_status: 'prospecto',
                commission_rate: 0.10,
                notes: ''
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <Plus size={15} />
            Nuevo Partner
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Total Prospectos</span>
            <Building2 size={16} className="text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-800">{totalProspects}</div>
          <div className="text-[11px] text-stone-500 mt-1">Clínicas y pet shops en radar</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Embajadores Activos</span>
            <Award size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{activeAmbassadors}</div>
          <div className="text-[11px] text-stone-500 mt-1">Con código activo (10% com)</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Contactados</span>
            <MessageSquare size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{contactedCount}</div>
          <div className="text-[11px] text-stone-500 mt-1">Con pitch enviado</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Lead Score Promedio</span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">{avgScore} / 100</div>
          <div className="text-[11px] text-stone-500 mt-1">Calidad comercial estimada</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, comuna o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700"
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <select
            value={communeFilter}
            onChange={(e) => setCommuneFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700"
          >
            {COMMUNES.map(c => (
              <option key={c} value={c}>Comuna: {c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700"
          >
            <option value="todos">Todos los estados</option>
            <option value="prospecto">Prospectos Nuevos</option>
            <option value="contactado">Contactados</option>
            <option value="activo_embajador">Embajadores Activos</option>
          </select>
        </div>
      </div>

      {/* Lista / Grid de Partners */}
      {loading ? (
        <div className="text-center py-12 text-stone-500 text-xs">Cargando base de alianzas...</div>
      ) : filteredPartners.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-8">
          <Stethoscope size={36} className="mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-bold text-stone-700">No hay prospectos con estos filtros</p>
          <p className="text-xs text-stone-500 mt-1">Haz clic en "Ejecutar Radar Scraper" para descubrir nuevas clínicas en Santiago Oriente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => {
            const waUrl = generateWhatsAppUrl(partner);
            const isAmbassador = partner.partnership_status === 'activo_embajador';

            return (
              <div 
                key={partner.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${
                  isAmbassador ? 'border-amber-300 ring-2 ring-amber-100' : 'border-stone-200'
                }`}
              >
                <div>
                  {/* Encabezado Tarjeta */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        {partner.category}
                      </span>
                      <h3 className="font-bold text-stone-900 text-base mt-1 leading-snug">
                        {partner.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                        <MapPin size={12} className="text-stone-400 shrink-0" />
                        <span>{partner.commune}</span>
                      </div>
                    </div>

                    {/* Badge Score */}
                    <div className="text-right shrink-0">
                      <div className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-xl text-xs font-black ${
                        partner.lead_score >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        partner.lead_score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                      }`}>
                        <Star size={11} className="fill-current" />
                        <span>{partner.lead_score}</span>
                      </div>
                      <div className="text-[9px] text-stone-400 uppercase font-bold mt-0.5">Score</div>
                    </div>
                  </div>

                  {/* Reseñas Google & Dirección */}
                  <div className="flex items-center gap-3 text-xs text-stone-600 my-2.5 pb-2.5 border-b border-stone-100">
                    <span className="font-bold text-amber-600 flex items-center gap-1">
                      ★ {partner.google_rating || '5.0'}
                    </span>
                    <span className="text-stone-400">•</span>
                    <span>{partner.reviews_count || 0} reseñas</span>
                    {partner.address && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="truncate max-w-[120px] text-[11px] text-stone-500" title={partner.address}>
                          {partner.address}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Notas Veterinarias / Biológicas */}
                  {partner.notes && (
                    <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 mb-3 italic">
                      "{partner.notes}"
                    </p>
                  )}

                  {/* Código de Embajador */}
                  {partner.ambassador_code && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-amber-800">Código Embajador:</div>
                        <div className="font-mono font-black text-amber-900 text-sm tracking-wider">
                          {partner.ambassador_code}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCode(partner.ambassador_code, partner.id)}
                        className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors"
                        title="Copiar código"
                      >
                        {copiedCodeId === partner.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Acciones Inferiores */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    {/* Botón WhatsApp */}
                    {partner.phone ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors shadow-2xs"
                      >
                        <MessageSquare size={14} />
                        WhatsApp Pitch
                      </a>
                    ) : (
                      <span className="flex-1 text-center text-[11px] text-stone-400 py-2 bg-stone-100 rounded-xl font-medium">
                        Sin teléfono registrado
                      </span>
                    )}

                    {/* Botón Asignar Código si no tiene */}
                    {!partner.ambassador_code && (
                      <button
                        onClick={() => handleAssignCode(partner.id)}
                        className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs py-2 px-3 rounded-xl transition-colors flex items-center gap-1"
                        title="Asignar código único de embajador"
                      >
                        <Award size={14} />
                        Crear Código
                      </button>
                    )}

                    {/* Botón Editar */}
                    <button
                      onClick={() => handleOpenEdit(partner)}
                      className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Botón Eliminar */}
                    <button
                      onClick={() => handleDeletePartner(partner.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Agregar / Editar */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-xl font-black font-header text-stone-800 mb-4">
              {editingPartner ? 'Editar Prospecto / Partner' : 'Registrar Nuevo Partner B2B'}
            </h3>

            <form onSubmit={handleSavePartner} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Clínica Veterinaria Las Condes"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                  >
                    <option value="veterinaria">Veterinaria</option>
                    <option value="clinica">Clínica / Hospital</option>
                    <option value="petshop">Pet Shop / Boutique</option>
                    <option value="adiestrador">Paseador / Entrenador</option>
                    <option value="peluqueria">Peluquería Canina</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Comuna</label>
                  <select
                    value={formData.commune}
                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                  >
                    {COMMUNES.filter(c => c !== 'Todas').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp / Fono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+56912345678"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contacto@vet.cl"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Dirección Física</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Av. Apoquindo 1234"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Notas Médicas / Oportunidad</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ej: Tratan muchos perros con alergias crónicas. Interesados en dieta de descarte con cerdo cocinado."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Guardar Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PartnersManager;

