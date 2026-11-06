import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Copy, Check, Edit2, Trash2, MapPin, Sparkles, Navigation, 
  Phone, ExternalLink, Shield, ShieldCheck, ShieldAlert, Key, Lock, Unlock, 
  Eye, EyeOff, Radio, Smartphone, AlertTriangle, RefreshCw, X 
} from 'lucide-react';

const NfcManager = ({ fetchWithAuth }) => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Modal Crear / Editar Edificio
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

  // Modal Programador y Blindaje NFC
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [securityMode, setSecurityMode] = useState('burn'); // 'burn' (quemar permanente) o 'password' (modo prueba)
  const [customPassword, setCustomPassword] = useState('ORIGEN2026');
  const [showPassword, setShowPassword] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('idle'); // 'idle' | 'scanning' | 'writing' | 'success' | 'error'
  const [nfcError, setNfcError] = useState(null);
  const [copiedModalUrl, setCopiedModalUrl] = useState(false);
  const [copiedModalPwd, setCopiedModalPwd] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSavedNotice, setPasswordSavedNotice] = useState(false);

  // Modal Configuración de Seguridad NFC Global
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [globalMasterPassword, setGlobalMasterPassword] = useState('ORIGEN2026');
  const [globalDefaultMode, setGlobalDefaultMode] = useState('burn');

  // Detectar soporte de Web NFC
  const isWebNfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

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

  const loadNfcSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/nfc-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.nfc_master_password) {
          setCustomPassword(data.nfc_master_password);
          setGlobalMasterPassword(data.nfc_master_password);
        }
        if (data.nfc_default_mode) {
          setSecurityMode(data.nfc_default_mode);
          setGlobalDefaultMode(data.nfc_default_mode);
        }
      }
    } catch (err) {
      console.error("Error cargando configuración NFC:", err);
    }
  };

  useEffect(() => {
    loadBuildings();
    loadNfcSettings();
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

  const openProgramModal = (building) => {
    setSelectedBuilding(building);
    setNfcStatus('idle');
    setNfcError(null);
    setCopiedModalUrl(false);
    setCopiedModalPwd(false);
    setPasswordSavedNotice(false);
    setIsProgramModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
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

  const handleSaveBuilding = async (e) => {
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

  const handleDeleteBuilding = async (id, name) => {
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

  const saveNfcPasswordSetting = async (newPassword, newMode) => {
    setSavingPassword(true);
    try {
      await fetchWithAuth('/api/admin/nfc-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nfc_master_password: newPassword,
          nfc_default_mode: newMode || securityMode
        })
      });
      setGlobalMasterPassword(newPassword);
      setPasswordSavedNotice(true);
      setTimeout(() => setPasswordSavedNotice(false), 3000);
    } catch (err) {
      alert("Error guardando clave de seguridad: " + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Grabación Web NFC Directa ---
  const handleStartNfcWrite = async () => {
    if (!isWebNfcSupported) {
      setNfcError('Web NFC no está disponible en este dispositivo. Abre este panel desde Chrome en un teléfono Android con NFC.');
      setNfcStatus('error');
      return;
    }

    if (!selectedBuilding) return;

    const targetUrl = `https://origencanino.cl/?nfc=${selectedBuilding.slug}`;
    setNfcStatus('scanning');
    setNfcError(null);

    try {
      const ndef = new window.NDEFReader();
      
      // Escribir el registro URL en el chip
      await ndef.write({
        records: [
          {
            recordType: "url",
            data: targetUrl
          }
        ]
      });

      // Si se seleccionó blindaje total / quemado permanente
      if (securityMode === 'burn') {
        setNfcStatus('writing');
        if (typeof ndef.makeReadOnly === 'function') {
          await ndef.makeReadOnly();
        }
      }

      // Vibración de éxito si el teléfono la soporta
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }

      setNfcStatus('success');
    } catch (err) {
      console.error("Error al escribir chip NFC:", err);
      let msg = err.message || "Error al escribir en la etiqueta NFC";
      if (err.name === 'NotAllowedError') {
        msg = "Permiso NFC no otorgado. Asegúrate de permitir el acceso a NFC en el navegador.";
      } else if (err.name === 'NotSupportedError') {
        msg = "El chip NFC no es compatible con este registro o formato.";
      } else if (err.name === 'AbortError') {
        msg = "La grabación fue cancelada o el chip se retiró antes de tiempo.";
      }
      setNfcError(msg);
      setNfcStatus('error');
    }
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
            Administra los chips NFC de conserjería, georreferencias de calle y enlaces con blindaje anti-manipulación.
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold px-3 py-2.5 rounded-xl flex items-center gap-2 transition border border-gray-200 text-sm shadow-xs"
            title="Configurar clave de seguridad NFC personalizable"
          >
            <ShieldCheck size={17} className="text-primary-green" /> Seguridad NFC
          </button>

          <button
            onClick={openCreateModal}
            className="bg-primary-green hover:bg-primary-green-dark text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm text-sm"
          >
            <Plus size={18} /> Registrar Nuevo Edificio
          </button>
        </div>
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

            {/* Acciones del Edificio */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t">
              <button
                type="button"
                onClick={() => openProgramModal(b)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs bg-primary-green text-white hover:bg-primary-green-dark"
                title="Programar y blindar chip NFC para este edificio"
              >
                <Radio size={14} className="animate-pulse" />
                Programar Chip NFC
              </button>

              <button
                type="button"
                onClick={() => copyNfcUrl(b.slug, b.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs ${
                  copiedId === b.id 
                    ? 'bg-green-600 text-white' 
                    : 'bg-primary-green/10 text-primary-green hover:bg-primary-green/20'
                }`}
                title="Copiar URL para el chip"
              >
                {copiedId === b.id ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === b.id ? 'Copiado' : 'Link'}
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
                onClick={() => handleDeleteBuilding(b.id, b.name)}
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

      {/* ============================================================== */}
      {/* MODAL: PROGRAMAR Y BLINDAR CHIP NFC                          */}
      {/* ============================================================== */}
      {isProgramModalOpen && selectedBuilding && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl space-y-4">
            
            {/* Cabecera del Modal */}
            <div className="flex justify-between items-start pb-3 border-b">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-green bg-green-50 px-2.5 py-0.5 rounded-full">
                  Grabador de Hardware NFC
                </span>
                <h3 className="font-header text-2xl text-secondary-brown mt-1">
                  Programar Chip para {selectedBuilding.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedBuilding.address}
                </p>
              </div>
              <button 
                onClick={() => setIsProgramModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* URL Destino que se grabará en el chip */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
              <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Dirección Web del Chip (URL Fija en Chip):
              </span>
              <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border font-mono text-gray-800 text-[11px] break-all">
                <span>https://origencanino.cl/?nfc={selectedBuilding.slug}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://origencanino.cl/?nfc=${selectedBuilding.slug}`);
                    setCopiedModalUrl(true);
                    setTimeout(() => setCopiedModalUrl(false), 2000);
                  }}
                  className="shrink-0 p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition"
                  title="Copiar URL"
                >
                  {copiedModalUrl ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Selector de Modo de Seguridad */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                Selecciona el Nivel de Candado / Seguridad:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {/* Opción A: Quemar / Solo Lectura Permanente */}
                <button
                  type="button"
                  onClick={() => setSecurityMode('burn')}
                  className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    securityMode === 'burn'
                      ? 'border-primary-green bg-green-50/50 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={16} className={securityMode === 'burn' ? 'text-primary-green' : 'text-gray-400'} />
                    <strong className="text-sm">Blindado Total</strong>
                  </div>
                  <span className="text-[10px] font-bold text-primary-green uppercase mb-1">
                    Solo Lectura Permanente (Recomendado)
                  </span>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Quema los bits físicos del chip. <strong>Nadie con NFC Tools</strong> podrá cambiar la URL por una maliciosa.
                  </p>
                </button>

                {/* Opción B: Modo Prueba con Contraseña */}
                <button
                  type="button"
                  onClick={() => setSecurityMode('password')}
                  className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    securityMode === 'password'
                      ? 'border-amber-500 bg-amber-50/40 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Key size={16} className={securityMode === 'password' ? 'text-amber-600' : 'text-gray-400'} />
                    <strong className="text-sm">Modo Prueba</strong>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                    Protección por Clave
                  </span>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Para chips de taller/desarrollo que quieras regrabar o modificar más adelante mediante tu contraseña.
                  </p>
                </button>
              </div>
            </div>

            {/* Campo de Contraseña Personalizable (Editable en formulario, NO en código) */}
            {securityMode === 'password' && (
              <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Lock size={13} /> Contraseña de Seguridad NFC (Personalizable):
                  </label>
                  {passwordSavedNotice && (
                    <span className="text-[10px] text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">
                      ¡Clave guardada!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Ej. ORIGEN2026"
                      className="w-full border border-amber-300 p-2 pr-16 rounded-lg text-sm bg-white font-mono outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:text-gray-700 p-1"
                        title={showPassword ? "Ocultar" : "Mostrar"}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(customPassword);
                          setCopiedModalPwd(true);
                          setTimeout(() => setCopiedModalPwd(false), 2000);
                        }}
                        className="hover:text-gray-700 p-1"
                        title="Copiar Clave"
                      >
                        {copiedModalPwd ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => saveNfcPasswordSetting(customPassword, securityMode)}
                    disabled={savingPassword}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-lg transition shrink-0"
                  >
                    {savingPassword ? 'Guardando...' : 'Guardar Clave'}
                  </button>
                </div>
                <p className="text-[10px] text-amber-700">
                  Esta contraseña se almacena de forma segura en la base de datos de tu servidor. Nunca queda expuesta fija en el código fuente.
                </p>
              </div>
            )}

            {/* Panel de Grabación */}
            <div className="border-t pt-3 space-y-3">
              {isWebNfcSupported ? (
                // Modo Directo Web NFC (Teléfono Android con Chrome)
                <div className="text-center space-y-3">
                  {nfcStatus === 'idle' && (
                    <button
                      type="button"
                      onClick={handleStartNfcWrite}
                      className="w-full py-3.5 px-4 bg-primary-green hover:bg-primary-green-dark text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <Radio size={18} className="animate-pulse" />
                      Tocar Teléfono al Chip para Grabar {securityMode === 'burn' ? 'y Blindar' : ''}
                    </button>
                  )}

                  {nfcStatus === 'scanning' && (
                    <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-3 animate-pulse">
                      <Radio size={36} className="mx-auto text-blue-600 animate-spin" />
                      <div>
                        <strong className="block text-sm text-blue-900 font-bold">
                          Esperando contacto con el Chip NFC...
                        </strong>
                        <p className="text-xs text-blue-700 mt-1">
                          Acerca el sticker o tarjeta NFC a la antena trasera de tu teléfono móvil.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNfcStatus('idle')}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {nfcStatus === 'writing' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1">
                      <Lock size={28} className="mx-auto text-amber-600 animate-bounce" />
                      <strong className="block text-sm text-amber-900">Aplicando blindaje por hardware...</strong>
                      <p className="text-xs text-amber-700">Sellando bits de memoria permanente en el chip.</p>
                    </div>
                  )}

                  {nfcStatus === 'success' && (
                    <div className="p-5 bg-green-50 border border-green-200 rounded-xl space-y-2 text-center">
                      <ShieldCheck size={40} className="mx-auto text-green-600" />
                      <strong className="block text-base text-green-900 font-bold">
                        ¡Chip {securityMode === 'burn' ? 'Grabado y Blindado' : 'Grabado'} con Éxito!
                      </strong>
                      <p className="text-xs text-green-700 max-w-sm mx-auto">
                        {securityMode === 'burn'
                          ? 'El chip ahora es de Solo Lectura Permanente. Ninguna persona ni app podrá sobrescribirlo jamás.'
                          : 'El chip fue configurado para pruebas. Puedes volver a escribirlo cuando lo requieras.'}
                      </p>
                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNfcStatus('idle')}
                          className="px-4 py-2 bg-primary-green text-white text-xs font-bold rounded-lg hover:bg-primary-green-dark transition"
                        >
                          Grabar Otro Chip
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsProgramModalOpen(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition"
                        >
                          Listo / Cerrar
                        </button>
                      </div>
                    </div>
                  )}

                  {nfcStatus === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-center">
                      <AlertTriangle size={28} className="mx-auto text-red-600" />
                      <strong className="block text-sm text-red-900 font-bold">No se pudo grabar el chip</strong>
                      <p className="text-xs text-red-700">{nfcError}</p>
                      <button
                        type="button"
                        onClick={handleStartNfcWrite}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition"
                      >
                        Reintentar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Dispositivo sin Web NFC (PC de escritorio, Laptop o iPhone)
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Smartphone size={20} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-900 font-bold">
                        Grabación Directa desde el Teléfono
                      </strong>
                      <p className="text-amber-800 text-[11px] mt-0.5">
                        Para grabar y blindar tocando el chip con tu celular, abre este mismo panel administrativo desde <strong>Google Chrome en tu teléfono Android con NFC</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-200/80 space-y-2 text-[11px]">
                    <strong className="block text-gray-700 uppercase tracking-wider text-[10px]">
                      Si grabas con una app externa (ej: NFC Tools o TagWriter by NXP):
                    </strong>
                    <ol className="list-decimal pl-4 space-y-1 text-gray-600">
                      <li>Agrega un registro tipo <strong>URL / URI</strong> y pega: 
                        <code className="text-primary-green font-mono ml-1 break-all">https://origencanino.cl/?nfc={selectedBuilding.slug}</code>
                      </li>
                      <li>
                        En opciones de protección:
                        {securityMode === 'burn' ? (
                          <span className="font-bold text-gray-800 ml-1">
                            Elige "Bloquear / Read-Only permanente" (quema el chip).
                          </span>
                        ) : (
                          <span className="font-bold text-gray-800 ml-1">
                            Elige "Proteger con Contraseña" y usa la clave: <code className="font-mono text-amber-700">{customPassword}</code>
                          </span>
                        )}
                      </li>
                      <li>Toca el chip con el teléfono y quedará listo.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsProgramModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIGURACIÓN GLOBAL DE SEGURIDAD NFC                   */}
      {/* ============================================================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-start pb-3 border-b">
              <div>
                <h3 className="font-header text-xl text-secondary-brown flex items-center gap-2">
                  <ShieldCheck className="text-primary-green" size={20} />
                  Configuración de Seguridad NFC
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Gestiona la clave maestra y los parámetros de blindaje de chips.
                </p>
              </div>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await saveNfcPasswordSetting(globalMasterPassword, globalDefaultMode);
                setIsSettingsModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Clave Maestra para Chips de Prueba (PIN de desbloqueo):
                </label>
                <input
                  type="text"
                  required
                  value={globalMasterPassword}
                  onChange={(e) => setGlobalMasterPassword(e.target.value)}
                  placeholder="Ej. ORIGEN2026"
                  className="w-full border p-2.5 rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-primary-green"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Esta clave se guarda en la base de datos de Origen Canino, nunca fija en el código fuente.
                </span>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Modo Predeterminado al Programar:
                </label>
                <select
                  value={globalDefaultMode}
                  onChange={(e) => setGlobalDefaultMode(e.target.value)}
                  className="w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-green bg-white"
                >
                  <option value="burn">🔒 Blindado Total (Solo Lectura Permanente - Recomendado)</option>
                  <option value="password">🔑 Modo Prueba (Protegido por Clave)</option>
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-600 text-[11px] space-y-1">
                <strong className="block text-gray-800">Nota de Buenas Prácticas:</strong>
                <p>
                  Para los acrílicos públicos en conserjerías de condominios, usa siempre <strong>Blindado Total</strong>. Así aseguras que ningún usuario pueda alterar el destino del enlace con apps externas.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-primary-green hover:bg-primary-green-dark text-white font-bold px-5 py-2 rounded-xl transition shadow-sm text-xs"
                >
                  {savingPassword ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRAR / EDITAR EDIFICIO                             */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="font-header text-2xl text-secondary-brown mb-1">
              {editingBuilding ? 'Editar Punto NFC' : 'Registrar Nuevo Edificio'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Ingresa los datos para identificar el edificio y generar el enlace de captación.
            </p>

            <form onSubmit={handleSaveBuilding} className="space-y-4 text-xs">
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
