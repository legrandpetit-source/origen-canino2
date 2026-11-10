import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Sparkles, Loader, History, TrendingUp, TrendingDown, Clock, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const IngredientsManager = ({ ingredients, fetchIngredients, fetchWithAuth }) => {
  const nameInputRef = useRef(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedMsg, setLastSavedMsg] = useState(null);

  // --- HISTORIAL DE PRECIOS ---
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedIngredientForHistory, setSelectedIngredientForHistory] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchPriceHistory = async (ingredientId = null) => {
    setLoadingHistory(true);
    try {
      const url = ingredientId 
        ? `/api/admin/ingredients/history?ingredient_id=${ingredientId}`
        : `/api/admin/ingredients/history`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setPriceHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistoryForIngredient = (ing) => {
    setSelectedIngredientForHistory(ing);
    setShowHistoryModal(true);
    fetchPriceHistory(ing ? ing.id : null);
  };

  const [formData, setFormData] = useState({ 
    name: '', cost_per_unit: 0, unit: 'kg',
    kcal_per_100g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, moisture_g: 0, ash_g: 0, carbs_g: 0
  });

  const handleSave = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert("Por favor ingresa el nombre del insumo.");
      return;
    }
    setSaving(true);
    setLastSavedMsg(null);
    try {
      const url = isAdding ? '/api/admin/ingredients' : `/api/admin/ingredients/${editingIngredient.id}`;
      const method = isAdding ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const savedName = formData.name;
        const savedCost = formData.cost_per_unit;
        const savedUnit = formData.unit;
        if (fetchIngredients) {
          await fetchIngredients();
        }

        if (keepOpen && isAdding) {
          // Mantener el formulario abierto para ingresar el siguiente insumo sin interrupción
          setFormData({ 
            name: '', cost_per_unit: 0, unit: 'kg',
            kcal_per_100g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, moisture_g: 0, ash_g: 0, carbs_g: 0
          });
          setLastSavedMsg(`✓ Insumo "${savedName}" ($${Number(savedCost).toLocaleString()}/${savedUnit}) guardado correctamente. Puedes ingresar el siguiente ahora:`);
          setTimeout(() => {
            nameInputRef.current?.focus();
          }, 100);
        } else {
          setIsAdding(false);
          setEditingIngredient(null);
        }
      } else {
        alert('Error al guardar ingrediente');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar ingrediente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('¿Seguro de eliminar este ingrediente?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/ingredients/${id}`, { method: 'DELETE' });
      if(res.ok) fetchIngredients();
    } catch (error) {
      console.error(error);
      alert("Error eliminando ingrediente");
    }
  };

  const handleGenerateNutrition = async () => {
    if (!formData.name) {
      alert("Por favor, ingresa el nombre del ingrediente primero para poder buscarlo.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetchWithAuth(`/api/ingredients/estimate-nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_name: formData.name })
      });
      
      if (!res.ok) {
        throw new Error('Error al consultar la IA');
      }
      
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        kcal_per_100g: data.kcal_per_100g || 0,
        protein_g: data.protein_g || 0,
        fat_g: data.fat_g || 0,
        fiber_g: data.fiber_g || 0,
        moisture_g: data.moisture_g || 0,
        ash_g: data.ash_g || 0,
        carbs_g: data.carbs_g || 0
      }));
    } catch (error) {
      console.error(error);
      alert("Hubo un error al autocompletar con IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const openAdd = () => {
    setFormData({ 
      name: '', cost_per_unit: 0, unit: 'kg',
      kcal_per_100g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, moisture_g: 0, ash_g: 0, carbs_g: 0
    });
    setLastSavedMsg(null);
    setIsAdding(true);
    setEditingIngredient(null);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const openEdit = (ing) => {
    setLastSavedMsg(null);
    setFormData({ 
      name: ing.name, cost_per_unit: ing.cost_per_unit, unit: ing.unit,
      kcal_per_100g: ing.kcal_per_100g || 0,
      protein_g: ing.protein_g || 0,
      fat_g: ing.fat_g || 0,
      fiber_g: ing.fiber_g || 0,
      moisture_g: ing.moisture_g || 0,
      ash_g: ing.ash_g || 0,
      carbs_g: ing.carbs_g || 0
    });
    setEditingIngredient(ing);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <div>
          <h3 className="font-header text-2xl text-secondary-brown">Materia Prima e Ingredientes</h3>
          <p className="text-xs text-gray-500">Maestro único de insumos: costos, valores nutricionales y registro histórico de precios.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setSelectedIngredientForHistory(null); setShowHistoryModal(true); fetchPriceHistory(null); }}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm text-xs font-bold"
          >
            <History size={15} /> Historial de Precios
          </button>
          <button onClick={openAdd} className="bg-primary-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-green-dark transition shadow-sm text-xs font-bold">
            <Plus size={16} /> Agregar Insumo
          </button>
        </div>
      </div>

      {(isAdding || editingIngredient) && (
        <form onSubmit={(e) => handleSave(e, isAdding)} className="bg-gray-50 p-6 rounded-2xl border-2 border-stone-200 mb-8 shadow-xs">
          {/* Cabecera del Formulario con Botón Volver */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingIngredient(null); setLastSavedMsg(null); }}
                className="p-1.5 hover:bg-gray-200 rounded-xl text-gray-600 transition cursor-pointer"
                title="Volver a la lista de ingredientes"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h4 className="font-header text-lg font-bold text-stone-800">
                  {isAdding ? 'Ingreso Continuo de Insumos' : `Editando: ${editingIngredient.name}`}
                </h4>
                <p className="text-xs text-gray-500">
                  {isAdding 
                    ? 'Guarda cada insumo y el formulario se mantendrá abierto para ingresar el siguiente sin salir.'
                    : 'Modifica los valores nutricionales o el costo unitario.'}
                </p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setEditingIngredient(null); setLastSavedMsg(null); }}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 transition cursor-pointer"
              title="Cerrar y volver"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensaje de Confirmación al Guardar en Modo Continuo */}
          {lastSavedMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{lastSavedMsg}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setLastSavedMsg(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Insumo</label>
              <input 
                ref={nameInputRef}
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-green-dark outline-none bg-white text-sm font-semibold" 
                placeholder="Ej: Frutilla, Zapallo Italiano, Contre..."
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Costo Unitario ($)</label>
              <input 
                type="number" 
                value={formData.cost_per_unit} 
                onChange={e => setFormData({...formData, cost_per_unit: Number(e.target.value)})} 
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-green-dark outline-none bg-white text-sm font-semibold" 
                required 
                min="0" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Unidad de medida</label>
              <select 
                value={formData.unit} 
                onChange={e => setFormData({...formData, unit: e.target.value})} 
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-green-dark outline-none bg-white text-sm font-semibold"
              >
                <option value="kg">Kilo (Kg)</option>
                <option value="litro">Litro (L)</option>
                <option value="unidad">Unidad</option>
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-3 border-t pt-4 mt-2">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Valores Nutricionales (Por cada 100g / 100ml)</h4>
                <button 
                  type="button" 
                  onClick={handleGenerateNutrition}
                  disabled={isGenerating}
                  className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                  {isGenerating ? "Consultando IA..." : "Autocompletar con IA"}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kcal</label>
                  <input type="number" step="any" value={formData.kcal_per_100g} onChange={e => setFormData({...formData, kcal_per_100g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white font-mono" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Proteína (g)</label>
                  <input type="number" step="any" value={formData.protein_g} onChange={e => setFormData({...formData, protein_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white font-mono" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Grasa (g)</label>
                  <input type="number" step="any" value={formData.fat_g} onChange={e => setFormData({...formData, fat_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white font-mono" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Carbs (g)</label>
                  <input type="number" step="any" value={formData.carbs_g} onChange={e => setFormData({...formData, carbs_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white font-mono" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fibra (g)</label>
                  <input type="number" step="any" value={formData.fiber_g} onChange={e => setFormData({...formData, fiber_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white font-mono" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Humedad (g)</label>
                  <input type="number" step="any" value={formData.moisture_g} onChange={e => setFormData({...formData, moisture_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white font-mono" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cenizas (g)</label>
                  <input type="number" step="any" value={formData.ash_g} onChange={e => setFormData({...formData, ash_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white font-mono" min="0" />
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción: Modo Continuo vs Salir */}
          <div className="flex flex-wrap justify-between items-center gap-3 mt-6 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setEditingIngredient(null); setLastSavedMsg(null); }} 
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Volver a la Lista
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {isAdding ? (
                <>
                  <button 
                    type="button" 
                    onClick={(e) => handleSave(e, false)} 
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {saving ? 'Guardando...' : 'Guardar y Salir'}
                  </button>

                  <button 
                    type="button" 
                    onClick={(e) => handleSave(e, true)} 
                    disabled={saving}
                    className="bg-primary-green-dark hover:bg-opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Plus size={16} /> {saving ? 'Guardando...' : 'Guardar y Seguir Agregando'}
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={(e) => handleSave(e, false)} 
                  disabled={saving}
                  className="bg-primary-green-dark hover:bg-opacity-90 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo por unidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kcal/100g</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proteína/100g</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingredients.map(ing => (
                <tr key={ing.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">{ing.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${ing.cost_per_unit.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{ing.unit}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{ing.kcal_per_100g || 0}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{ing.protein_g || 0}g</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openHistoryForIngredient(ing)} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded mr-1 transition" title="Ver historial de precios"><History size={16} /></button>
                    <button onClick={() => openEdit(ing)} className="text-primary-green hover:bg-green-50 p-1.5 rounded mr-1 transition" title="Editar insumo"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(ing.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Eliminar insumo"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {ingredients.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">No hay ingredientes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: HISTORIAL DE PRECIOS DE INSUMOS --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 relative flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <History size={20} />
                </span>
                <div>
                  <h3 className="font-header text-xl text-stone-800">
                    Historial de Precios de Insumos
                    {selectedIngredientForHistory && (
                      <span className="text-amber-700 font-bold ml-2">({selectedIngredientForHistory.name})</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Registro de variaciones de costos de compra (feria, mayoristas) para trazabilidad financiera.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedIngredientForHistory && (
                  <button
                    onClick={() => { setSelectedIngredientForHistory(null); fetchPriceHistory(null); }}
                    className="text-xs text-amber-700 hover:underline font-semibold mr-2"
                  >
                    Ver todos los insumos
                  </button>
                )}
                <button 
                  onClick={() => setShowHistoryModal(false)} 
                  className="text-gray-400 hover:text-gray-700 bg-white p-1.5 rounded-full border border-gray-200"
                >
                  <X size={18}/>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  <Loader className="animate-spin inline-block mr-2" size={18} /> Cargando variaciones de precios...
                </div>
              ) : priceHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  <p className="font-semibold text-gray-700">No hay registros de cambios de precio aún.</p>
                  <p className="text-xs text-gray-400 mt-1">Cada vez que edites o agregues un insumo con un nuevo precio, quedará registrado automáticamente aquí con fecha y hora.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Insumo</th>
                        <th className="px-4 py-3">Precio Anterior</th>
                        <th className="px-4 py-3">Precio Nuevo</th>
                        <th className="px-4 py-3">Variación</th>
                        <th className="px-4 py-3">Notas / Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {priceHistory.map((item, idx) => {
                        const prev = item.previous_price ? Number(item.previous_price) : null;
                        const curr = Number(item.price);
                        const diff = prev !== null ? curr - prev : 0;
                        const pct = prev && prev > 0 ? ((diff / prev) * 100).toFixed(1) : null;
                        const isIncrease = diff > 0;
                        const isDecrease = diff < 0;

                        return (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock size={13} className="text-gray-400" />
                              {item.created_at ? new Date(item.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-800">
                              {item.ingredient_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                              {prev !== null ? `$${prev.toLocaleString()} / ${item.unit || 'kg'}` : <span className="text-xs text-gray-400 italic">Inicial</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900">
                              ${curr.toLocaleString()} / {item.unit || 'kg'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {prev === null ? (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">Alta Catálogo</span>
                              ) : isIncrease ? (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                  <TrendingUp size={12} /> +${diff.toLocaleString()} (+{pct}%)
                                </span>
                              ) : isDecrease ? (
                                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                  <TrendingDown size={12} /> -${Math.abs(diff).toLocaleString()} ({pct}%)
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Sin cambio</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                              {item.notes || 'Actualización de costo'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientsManager;
