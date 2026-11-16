import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, Sparkles, Loader, History, TrendingUp, TrendingDown,
  Clock, ArrowRight, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Scale, Check,
  Award, Info, Filter, Zap, Search, Layers, AlertCircle
} from 'lucide-react';
import { classifyIngredientBARF } from './BatchProductionManager';

// =========================================================================
// COMPARADOR BROMATOLÓGICO & CALIDAD-PRECIO DE INSUMOS
// =========================================================================
export const computeIngredientComparison = (comparedIngredients = []) => {
  if (!Array.isArray(comparedIngredients) || comparedIngredients.length < 2) return null;

  // 1. Métricas Económicas por Insumo
  const econList = comparedIngredients.map(ing => {
    const cost = Number(ing.cost_per_unit || 0);
    const protG = Number(ing.protein_g || 0);
    const kcal = Number(ing.kcal_per_100g || 0);
    const fatG = Number(ing.fat_g || 0);
    const fiberG = Number(ing.fiber_g || 0);
    const moistureG = Number(ing.moisture_g || 0);
    const ashG = Number(ing.ash_g || 0);
    const carbsG = Number(ing.carbs_g || 0);
    const calG = Number(ing.calcium_g || 0);
    const phosG = Number(ing.phosphorus_g || 0);

    // Costo por gramo de proteína: (costo / 1000g) * (100g / protG) = costo / (protG * 10)
    const costPerGramProt = protG > 0 ? (cost / (protG * 10)) : 0;
    // Kcal entregadas por cada $1.000 gastados
    const kcalPerThousandClp = cost > 0 ? ((kcal * 10 / cost) * 1000) : 0;
    // Ratio Ca:P
    const caPRatio = phosG > 0 ? (calG / phosG).toFixed(2) : (calG > 0 ? 'Solo Ca' : 'N/A');

    return {
      id: ing.id,
      name: ing.name,
      cost,
      unit: ing.unit,
      protG,
      fatG,
      fiberG,
      moistureG,
      ashG,
      carbsG,
      kcal,
      calG,
      phosG,
      costPerGramProt,
      kcalPerThousandClp,
      caPRatio,
      category: classifyIngredientBARF(ing.name, ing)
    };
  });

  // Ganador en costo por gramo de proteína (el menor valor positivo)
  const validProtCosts = econList.filter(e => e.costPerGramProt > 0);
  const bestProteinCostId = validProtCosts.length > 0
    ? validProtCosts.reduce((min, cur) => cur.costPerGramProt < min.costPerGramProt ? cur : min).id
    : null;

  // Ganador en Kcal por $ (el mayor valor positivo)
  const validKcalCosts = econList.filter(e => e.kcalPerThousandClp > 0);
  const bestKcalCostId = validKcalCosts.length > 0
    ? validKcalCosts.reduce((max, cur) => cur.kcalPerThousandClp > max.kcalPerThousandClp ? cur : max).id
    : null;

  // 2. Separar Micronutrientes Compartidos vs Exclusivos
  const allMicros = new Map();
  comparedIngredients.forEach(ing => {
    let list = [];
    if (Array.isArray(ing.micronutrients)) {
      list = ing.micronutrients;
    } else if (typeof ing.micronutrients === 'string' && ing.micronutrients.trim()) {
      try { list = JSON.parse(ing.micronutrients); } catch (e) { list = []; }
    }

    list.forEach(m => {
      if (!m || !m.name) return;
      const norm = m.name.trim().toLowerCase();
      if (!allMicros.has(norm)) {
        allMicros.set(norm, { displayName: m.name.trim(), values: {} });
      }
      allMicros.get(norm).values[ing.id] = {
        amount: m.amount,
        unit: m.unit || '',
        highlight: m.highlight || ''
      };
    });
  });

  const sharedMicros = [];
  const exclusiveMicros = {};
  comparedIngredients.forEach(ing => { exclusiveMicros[ing.id] = []; });

  allMicros.forEach((item) => {
    const presentCount = Object.keys(item.values).length;
    if (presentCount >= 2) {
      sharedMicros.push(item);
    } else {
      const singleId = Object.keys(item.values)[0];
      if (exclusiveMicros[singleId]) {
        exclusiveMicros[singleId].push({
          name: item.displayName,
          ...item.values[singleId]
        });
      }
    }
  });

  // 3. Dictamen Heurístico de Decisión
  const categories = Array.from(new Set(econList.map(e => e.category)));
  let verdictTitle = 'Análisis de Eficiencia & Selección';
  let verdictText = '';

  if (categories.length === 1 && categories[0] === 'animal') {
    const bestP = econList.find(e => e.id === bestProteinCostId);
    const others = econList.filter(e => e.id !== bestProteinCostId);
    verdictTitle = '🥩 Comparativa de Cortes Cárnicos & Rendimiento Proteico';
    if (bestP && others.length > 0) {
      const diffPct = others[0].costPerGramProt > 0
        ? (((others[0].costPerGramProt - bestP.costPerGramProt) / others[0].costPerGramProt) * 100).toFixed(0)
        : '0';
      verdictText = `"${bestP.name}" entrega la mejor rentabilidad biológica de proteína a $${bestP.costPerGramProt.toFixed(1)} CLP/g (un ${diffPct}% más eficiente que "${others[0].name}"). Si buscas maximizar el aporte proteico al menor costo de materia prima, prioriza "${bestP.name}". Sin embargo, evalúa si "${others[0].name}" aporta elementos estructurales como calcio óseo (Ca:P ${others[0].caPRatio}:1) o ácidos grasos necesarios para la saciedad y el pelaje.`;
    } else {
      verdictText = 'Ambos cortes cárnicos presentan perfiles de proteína y costo similares. Puedes alternarlos según las ofertas de mayoristas para diversificar aminoácidos.';
    }
  } else if (categories.length === 1 && categories[0] === 'vegetal') {
    verdictTitle = '🥦 Contraste de Fibra, Humedad & Micronutrientes Vegetales';
    verdictText = 'En frutas y verduras el foco no es el costo por proteína, sino la densidad de fibra prebiótica, carotenoides y flavonoides bioactivos. Alternar o mezclar estos vegetales en la formulación aporta un espectro antioxidante más amplio que utilizar uno solo.';
  } else if (categories.length === 1 && categories[0] === 'suplemento') {
    verdictTitle = '💊 Evaluación Nutracéutica & Concentración de Principios Activos';
    verdictText = 'Los suplementos y nutracéuticos se seleccionan por la especificidad de sus bioactivos diferenciales (revisa la tabla de bioactivos exclusivos más abajo). Generalmente se complementan entre sí en dosis pequeñas (1-3% de la fórmula) para potenciar la microbiota o desinflamar articulaciones.';
  } else {
    verdictTitle = '⚖️ Contraste entre Distintas Familias de Insumos';
    verdictText = 'Estás comparando insumos de distintas familias funcionales (ej. carne vs vegetal o suplemento). Recuerda que en la dieta BARF cumplen roles biológicos complementarios e insustituibles (la carne aporta aminoácidos esenciales y energía, el vegetal aporta fibra y alcalinidad, y los suplementos micronutrientes específicos).';
  }

  return {
    econList,
    bestProteinCostId,
    bestKcalCostId,
    sharedMicros,
    exclusiveMicros,
    verdictTitle,
    verdictText
  };
};

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

  // --- COMPARADOR DE INSUMOS (BROMATOLÓGICO & CALIDAD-PRECIO) ---
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [tableCategoryFilter, setTableCategoryFilter] = useState('all'); // 'all' | 'animal' | 'vegetal' | 'suplemento'
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  const toggleCompareItem = (id) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredIngredients = useMemo(() => {
    if (!Array.isArray(ingredients)) return [];
    return ingredients.filter(ing => {
      const matchesSearch = !tableSearchTerm.trim() || ing.name.toLowerCase().includes(tableSearchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (tableCategoryFilter === 'all') return true;
      const cat = classifyIngredientBARF(ing.name, ing);
      return cat === tableCategoryFilter;
    });
  }, [ingredients, tableCategoryFilter, tableSearchTerm]);

  const comparedIngredients = useMemo(() => {
    if (!Array.isArray(ingredients)) return [];
    return ingredients.filter(i => selectedForCompare.includes(i.id));
  }, [ingredients, selectedForCompare]);

  const comparisonData = useMemo(() => {
    return computeIngredientComparison(comparedIngredients);
  }, [comparedIngredients]);

  const [formData, setFormData] = useState({ 
    name: '', cost_per_unit: 0, unit: 'kg',
    kcal_per_100g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, moisture_g: 0, ash_g: 0, carbs_g: 0
  });

  const handleSave = async (e, keepOpen = false, advanceToNext = false) => {
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
        
        let freshList = [];
        if (fetchIngredients) {
          freshList = await fetchIngredients();
        }

        const list = Array.isArray(freshList) && freshList.length > 0 ? freshList : ingredients;

        if (advanceToNext && editingIngredient) {
          const currIdx = list.findIndex(i => i.id === editingIngredient.id);
          if (currIdx >= 0 && currIdx < list.length - 1) {
            const nextIng = list[currIdx + 1];
            openEdit(nextIng);
            setLastSavedMsg(`✓ Insumo "${savedName}" guardado. Ahora editando "${nextIng.name}":`);
            return;
          }
        }

        if (keepOpen) {
          if (isAdding) {
            // Mantener el formulario abierto para ingresar el siguiente insumo sin interrupción
            setFormData({ 
              name: '', cost_per_unit: 0, unit: 'kg',
              kcal_per_100g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, moisture_g: 0, ash_g: 0, carbs_g: 0,
              calcium_g: 0, phosphorus_g: 0, micronutrients: []
            });
            setLastSavedMsg(`✓ Insumo "${savedName}" ($${Number(savedCost).toLocaleString()}/${savedUnit}) guardado correctamente. Puedes ingresar el siguiente ahora:`);
            setTimeout(() => {
              nameInputRef.current?.focus();
            }, 100);
          } else {
            // Editando: guardar y mantenerse en el formulario
            setLastSavedMsg(`✓ Insumo "${savedName}" guardado correctamente.`);
            setEditingIngredient(prev => ({ ...prev, ...formData }));
          }
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
        carbs_g: data.carbs_g || 0,
        calcium_g: data.calcium_g || 0,
        phosphorus_g: data.phosphorus_g || 0,
        micronutrients: Array.isArray(data.micronutrients) ? data.micronutrients : []
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
      kcal_per_100g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, moisture_g: 0, ash_g: 0, carbs_g: 0,
      calcium_g: 0, phosphorus_g: 0, micronutrients: []
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
      carbs_g: ing.carbs_g || 0,
      calcium_g: ing.calcium_g || 0,
      phosphorus_g: ing.phosphorus_g || 0,
      micronutrients: Array.isArray(ing.micronutrients) ? ing.micronutrients : []
    });
    setEditingIngredient(ing);
    setIsAdding(false);
  };

  const currentIndex = editingIngredient && Array.isArray(ingredients)
    ? ingredients.findIndex((i) => i.id === editingIngredient.id) 
    : -1;
  const prevIngredient = currentIndex > 0 ? ingredients[currentIndex - 1] : null;
  const nextIngredient = currentIndex >= 0 && currentIndex < ingredients.length - 1 ? ingredients[currentIndex + 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <div>
          <h3 className="font-header text-2xl text-secondary-brown">Materia Prima e Ingredientes</h3>
          <p className="text-xs text-gray-500">Maestro único de insumos: costos, valores nutricionales y registro histórico de precios.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowCompareModal(true)}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm text-xs font-bold cursor-pointer ${
              selectedForCompare.length >= 2 
                ? 'bg-secondary-brown text-white hover:bg-stone-800 ring-2 ring-emerald-500/40 shadow-xs' 
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
            }`}
            title="Comparar valores biológicos y calidad-precio de 2 o más insumos"
          >
            <Scale size={15} className={selectedForCompare.length >= 2 ? 'text-emerald-400' : 'text-stone-500'} />
            <span>Comparar Insumos {selectedForCompare.length > 0 && `(${selectedForCompare.length})`}</span>
          </button>
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
          {/* Cabecera del Formulario con Botón Volver y Selector Rápido */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-gray-200">
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
                  {isAdding ? 'Ingreso Continuo de Insumos' : `Editando: ${formData.name || editingIngredient.name}`}
                </h4>
                <p className="text-xs text-gray-500">
                  {isAdding 
                    ? 'Guarda cada insumo y el formulario se mantendrá abierto para ingresar el siguiente sin salir.'
                    : 'Modifica o autocompleta con IA. Guarda y quédate aquí o avanza directo al siguiente.'}
                </p>
              </div>
            </div>

            {editingIngredient && Array.isArray(ingredients) && ingredients.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-500 font-semibold hidden sm:inline">Cambiar insumo:</span>
                <select
                  value={editingIngredient.id}
                  onChange={(e) => {
                    const target = ingredients.find((i) => String(i.id) === e.target.value);
                    if (target) openEdit(target);
                  }}
                  className="text-xs font-semibold bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-stone-800"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (${Number(ing.cost_per_unit).toLocaleString('es-CL')}/{ing.unit})
                    </option>
                  ))}
                </select>

                <div className="inline-flex rounded-xl border border-stone-300 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    disabled={!prevIngredient}
                    onClick={() => prevIngredient && openEdit(prevIngredient)}
                    className="px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-30 rounded-lg transition flex items-center gap-0.5"
                    title={prevIngredient ? `Anterior: ${prevIngredient.name}` : ''}
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <button
                    type="button"
                    disabled={!nextIngredient}
                    onClick={() => nextIngredient && openEdit(nextIngredient)}
                    className="px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-30 rounded-lg transition flex items-center gap-0.5"
                    title={nextIngredient ? `Siguiente: ${nextIngredient.name}` : ''}
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

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
                  <input type="number" step="any" value={formData.ash_g} onChange={e => setFormData({...formData, ash_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white tabular-nums" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Calcio (g)</label>
                  <input type="number" step="any" value={formData.calcium_g || 0} onChange={e => setFormData({...formData, calcium_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white tabular-nums" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fósforo (g)</label>
                  <input type="number" step="any" value={formData.phosphorus_g || 0} onChange={e => setFormData({...formData, phosphorus_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none bg-white tabular-nums" min="0" />
                </div>
              </div>
              {Array.isArray(formData.micronutrients) && formData.micronutrients.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <span className="block text-xs font-bold text-gray-700">
                      Micronutrientes, Vitaminas & Bioactivos (por cada 100g de este insumo)
                    </span>
                    <span className="text-[11px] text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2.5 py-0.5 rounded-md font-semibold">
                      ⚙️ La etiqueta del lote calcula la suma ponderada real según los kilos ingresados
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {formData.micronutrients.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white border border-stone-200 rounded-xl p-2.5 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <strong className="text-xs text-stone-900 block truncate">{m.name}</strong>
                          {m.highlight && (
                            <span className="text-[10px] text-stone-500 block truncate" title={m.highlight}>
                              {m.highlight}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="any"
                            value={m.amount}
                            onChange={(e) => {
                              const updated = [...formData.micronutrients];
                              updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                              setFormData({ ...formData, micronutrients: updated });
                            }}
                            className="w-16 px-1.5 py-1 text-xs border border-stone-300 rounded-lg font-semibold text-right tabular-nums bg-stone-50 text-stone-800"
                          />
                          <span className="text-xs font-bold text-stone-600 min-w-[28px]">{m.unit}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.micronutrients.filter((_, i) => i !== idx);
                              setFormData({ ...formData, micronutrients: updated });
                            }}
                            className="text-stone-300 hover:text-red-500 p-0.5 rounded"
                            title="Eliminar este nutriente"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    onClick={(e) => handleSave(e, true, false)} 
                    disabled={saving}
                    className="bg-primary-green hover:bg-primary-green-dark text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>

                  {nextIngredient && (
                    <button 
                      type="button" 
                      onClick={(e) => handleSave(e, true, true)} 
                      disabled={saving}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <span>Guardar y Siguiente ({nextIngredient.name})</span>
                      <ChevronRight size={15} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Barra de Filtros por Categoría, Buscador y Comparador */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
            <Filter size={13} /> Filtrar:
          </span>
          {[
            { id: 'all', label: 'Todos los Insumos' },
            { id: 'animal', label: '🥩 Cárnicos & Vísceras' },
            { id: 'vegetal', label: '🥦 Frutas & Verduras' },
            { id: 'suplemento', label: '💊 Suplementos & Otros' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTableCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                tableCategoryFilter === cat.id
                  ? 'bg-secondary-brown text-white shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar insumo..."
              value={tableSearchTerm}
              onChange={(e) => setTableSearchTerm(e.target.value)}
              className="text-xs pl-7 pr-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-800 outline-none w-36 sm:w-48"
            />
            <Search size={13} className="absolute left-2.5 top-2 text-stone-400" />
            {tableSearchTerm && (
              <button
                type="button"
                onClick={() => setTableSearchTerm('')}
                className="absolute right-2 top-2 text-stone-400 hover:text-stone-700"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {selectedForCompare.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 px-2 py-1 cursor-pointer"
            >
              Limpiar ({selectedForCompare.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
              selectedForCompare.length >= 2
                ? 'bg-primary-green hover:bg-primary-green-dark text-white ring-2 ring-primary-green/30'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
            }`}
            title="Comparar valores biológicos y calidad-precio de insumos"
          >
            <Scale size={14} className={selectedForCompare.length >= 2 ? 'text-white' : 'text-stone-500'} />
            Comparar {selectedForCompare.length > 0 && `(${selectedForCompare.length})`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-center" title="Seleccionar para comparar">
                  <Scale size={14} className="mx-auto text-stone-400" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo por unidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kcal/100g</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proteína/100g</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIngredients.map(ing => {
                const isSelected = selectedForCompare.includes(ing.id);
                const cat = classifyIngredientBARF(ing.name, ing);
                return (
                  <tr key={ing.id} className={`transition ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCompareItem(ing.id)}
                        className="w-4 h-4 rounded text-primary-green focus:ring-primary-green cursor-pointer"
                        title="Marcar para comparar valores biológicos y calidad-precio"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800 flex items-center gap-2">
                      <span>{ing.name}</span>
                      {isSelected && (
                        <span className="bg-primary-green text-white text-[10px] px-1.5 py-0.2 rounded-md font-mono font-semibold">
                          En Comparador
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      {cat === 'animal' && <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">🥩 Cárnico</span>}
                      {cat === 'vegetal' && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">🥦 Vegetal</span>}
                      {cat === 'suplemento' && <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">💊 Suplemento</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700 font-mono">${ing.cost_per_unit.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{ing.unit}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{ing.kcal_per_100g || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{ing.protein_g || 0}g</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openHistoryForIngredient(ing)} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded mr-1 transition cursor-pointer" title="Ver historial de precios"><History size={16} /></button>
                      <button onClick={() => openEdit(ing)} className="text-primary-green hover:bg-green-50 p-1.5 rounded mr-1 transition cursor-pointer" title="Editar insumo"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(ing.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition cursor-pointer" title="Eliminar insumo"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
              {filteredIngredients.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500 text-sm">
                    No se encontraron insumos con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Banner flotante de selección para comparar */}
      {selectedForCompare.length > 0 && !showCompareModal && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-stone-700 animate-slideUp">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-stone-200">
            <Scale size={16} className="text-emerald-400" />
            <strong>{selectedForCompare.length}</strong> {selectedForCompare.length === 1 ? 'insumo seleccionado' : 'insumos seleccionados'}
          </span>
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="bg-primary-green hover:bg-primary-green-dark text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Scale size={13} />
            Comparar Cara a Cara
          </button>
          <button
            type="button"
            onClick={() => setSelectedForCompare([])}
            className="text-stone-400 hover:text-white text-xs p-1 cursor-pointer"
            title="Limpiar selección"
          >
            <X size={16} />
          </button>
        </div>
      )}

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

      {/* --- MODAL: COMPARADOR BROMATOLÓGICO & CALIDAD-PRECIO --- */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl my-6 relative flex flex-col max-h-[90vh] shadow-2xl border border-stone-200 animate-fadeIn">
            {/* Header del Modal */}
            <div className="p-5 border-b border-stone-200 flex flex-wrap justify-between items-center bg-stone-50/90 rounded-t-3xl gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-100 text-primary-green rounded-2xl shadow-2xs">
                  <Scale size={22} />
                </span>
                <div>
                  <h3 className="font-header text-xl text-secondary-brown flex items-center gap-2">
                    Comparador Bromatológico & Calidad-Precio
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full border border-emerald-200">
                      {comparedIngredients.length} Insumos
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Contraste técnico de densidad nutricional, bioactivos y eficiencia económica ($/g proteína, kcal/$).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="text-stone-400 hover:text-stone-700 bg-white p-2 rounded-full border border-stone-200 shadow-2xs hover:bg-stone-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Insumos en Comparación y Selector para Añadir Más */}
            <div className="px-6 py-3 bg-stone-100/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-stone-600 mr-1">Insumos activos:</span>
                {comparedIngredients.map((ing) => (
                  <span
                    key={ing.id}
                    className="inline-flex items-center gap-1 bg-white text-stone-800 border border-stone-300 px-2.5 py-1 rounded-xl font-bold shadow-2xs"
                  >
                    <span>{ing.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleCompareItem(ing.id)}
                      className="text-stone-400 hover:text-red-600 ml-1 p-0.5 cursor-pointer"
                      title="Quitar de la comparación"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Selector para añadir más insumos directamente en el modal */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id && !selectedForCompare.includes(id)) {
                      setSelectedForCompare((prev) => [...prev, id]);
                    }
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-xs font-semibold cursor-pointer"
                >
                  <option value="" disabled>+ Agregar otro insumo al comparador...</option>
                  {ingredients
                    .filter((i) => !selectedForCompare.includes(i.id))
                    .map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (${Number(ing.cost_per_unit).toLocaleString('es-CL')}/{ing.unit})
                      </option>
                    ))}
                </select>
                {selectedForCompare.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedForCompare([])}
                    className="text-stone-500 hover:text-stone-800 underline text-xs cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-stone-800">
              {comparedIngredients.length < 2 ? (
                <div className="text-center py-12 space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <Scale size={40} className="mx-auto text-stone-400" />
                  <h4 className="font-header text-base text-stone-700 font-bold">
                    Selecciona al menos 2 insumos para contrastar
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Puedes marcar las casillas en la tabla de insumos o seleccionarlos en el desplegable superior para comparar cortes cárnicos, frutas o suplementos.
                  </p>
                </div>
              ) : (
                comparisonData && (
                  <>
                    {/* SECCIÓN 1: RATIO CALIDAD / PRECIO (EFICIENCIA ECONÓMICA) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-4 rounded-full bg-primary-green"></span>
                        <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown">
                          1. Eficiencia Económica & Calidad / Precio
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {comparisonData.econList.map((e) => {
                          const isBestProt = e.id === comparisonData.bestProteinCostId;
                          const isBestKcal = e.id === comparisonData.bestKcalCostId;
                          return (
                            <div
                              key={e.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                isBestProt
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                                  : 'bg-white border-stone-200 shadow-2xs'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1 mb-2">
                                <h5 className="font-bold text-sm text-stone-900 truncate" title={e.name}>
                                  {e.name}
                                </h5>
                                {isBestProt && (
                                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 shadow-2xs">
                                    <Award size={10} /> Mejor $/Prot
                                  </span>
                                )}
                              </div>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                                  <span className="text-stone-500">Costo / {e.unit}:</span>
                                  <strong className="font-mono font-bold text-stone-800">
                                    ${e.cost.toLocaleString('es-CL')}
                                  </strong>
                                </div>
                                <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                                  <span className="text-stone-500" title="Costo en CLP por cada gramo de proteína pura entregada">
                                    Costo / g Proteína:
                                  </span>
                                  <strong className={`font-mono font-bold ${isBestProt ? 'text-emerald-700 text-sm' : 'text-stone-800'}`}>
                                    {e.costPerGramProt > 0 ? `$${e.costPerGramProt.toFixed(1)} CLP` : 'N/A'}
                                  </strong>
                                </div>
                                <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                                  <span className="text-stone-500" title="Kcal metabólicas entregadas por cada $1.000 gastados en este insumo">
                                    Kcal por $1.000:
                                  </span>
                                  <strong className={`font-mono font-bold ${isBestKcal ? 'text-sky-700' : 'text-stone-800'}`}>
                                    {e.kcalPerThousandClp > 0 ? `${Math.round(e.kcalPerThousandClp)} kcal` : 'N/A'}
                                  </strong>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-500">Ratio Ca:P:</span>
                                  <strong className="font-mono font-bold text-stone-800">
                                    {e.caPRatio}:1
                                  </strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECCIÓN 2: TABLA BROMATOLÓGICA CARA A CARA (POR 100G) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-4 rounded-full bg-emerald-600"></span>
                        <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown">
                          2. Composición Bromatológica Base (por 100g)
                        </h4>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-2xs">
                        <table className="w-full text-xs">
                          <thead className="bg-stone-50 border-b border-stone-200">
                            <tr>
                              <th className="p-3 text-left font-bold text-stone-600">Nutriente / Métrica</th>
                              {comparisonData.econList.map((e) => (
                                <th key={e.id} className="p-3 text-right font-bold text-stone-800">
                                  {e.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 font-mono">
                            {[
                              { label: 'Energía Metabólica', key: 'kcal', unit: 'kcal' },
                              { label: 'Proteína Cruda', key: 'protG', unit: 'g' },
                              { label: 'Grasa Cruda', key: 'fatG', unit: 'g' },
                              { label: 'Fibra Cruda', key: 'fiberG', unit: 'g' },
                              { label: 'Humedad / Agua', key: 'moistureG', unit: '%' },
                              { label: 'Cenizas / Minerales', key: 'ashG', unit: 'g' },
                              { label: 'Carbohidratos', key: 'carbsG', unit: 'g' },
                              { label: 'Calcio', key: 'calG', unit: 'g' },
                              { label: 'Fósforo', key: 'phosG', unit: 'g' },
                            ].map((row) => {
                              const maxVal = Math.max(...comparisonData.econList.map((e) => Number(e[row.key] || 0)));
                              return (
                                <tr key={row.key} className="hover:bg-stone-50/50">
                                  <td className="p-2.5 font-sans font-semibold text-stone-700">
                                    {row.label}
                                  </td>
                                  {comparisonData.econList.map((e) => {
                                    const val = Number(e[row.key] || 0);
                                    const isMax = maxVal > 0 && val === maxVal;
                                    return (
                                      <td
                                        key={e.id}
                                        className={`p-2.5 text-right tabular-nums ${
                                          isMax ? 'font-bold text-emerald-800 bg-emerald-50/40' : 'text-stone-700'
                                        }`}
                                      >
                                        {val} {row.unit}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECCIÓN 3: MICRONUTRIENTES COMPARTIDOS (CARA A CARA) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-4 rounded-full bg-sky-600"></span>
                        <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown">
                          3. Micronutrientes Compartidos (Presentes en 2 o más insumos)
                        </h4>
                      </div>
                      {comparisonData.sharedMicros.length === 0 ? (
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500">
                          Estos insumos no comparten micronutrientes idénticos en su perfil registrado (revisa los bioactivos exclusivos más abajo).
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-2xs">
                          <table className="w-full text-xs">
                            <thead className="bg-stone-50 border-b border-stone-200">
                              <tr>
                                <th className="p-3 text-left font-bold text-stone-600">Micronutriente / Bioactivo</th>
                                {comparisonData.econList.map((e) => (
                                  <th key={e.id} className="p-3 text-right font-bold text-stone-800">
                                    {e.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 font-mono">
                              {comparisonData.sharedMicros.map((item, idx) => {
                                const amounts = Object.values(item.values).map((v) => Number(v.amount || 0));
                                const maxAmount = Math.max(...amounts);
                                return (
                                  <tr key={idx} className="hover:bg-stone-50/50">
                                    <td className="p-2.5 font-sans font-semibold text-stone-800">
                                      {item.displayName}
                                    </td>
                                    {comparisonData.econList.map((e) => {
                                      const valObj = item.values[e.id];
                                      if (!valObj) {
                                        return (
                                          <td key={e.id} className="p-2.5 text-right text-stone-300">
                                            -
                                          </td>
                                        );
                                      }
                                      const isTop = Number(valObj.amount || 0) === maxAmount && maxAmount > 0;
                                      return (
                                        <td
                                          key={e.id}
                                          className={`p-2.5 text-right tabular-nums ${
                                            isTop ? 'font-bold text-sky-800 bg-sky-50/40' : 'text-stone-700'
                                          }`}
                                          title={valObj.highlight || ''}
                                        >
                                          {valObj.amount} {valObj.unit}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 4: BIOACTIVOS EXCLUSIVOS DE CADA INSUMO */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-4 rounded-full bg-amber-500"></span>
                        <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown">
                          4. Bioactivos Exclusivos y Diferenciales de cada Insumo
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {comparisonData.econList.map((e) => {
                          const exclusives = comparisonData.exclusiveMicros[e.id] || [];
                          return (
                            <div key={e.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                              <h5 className="font-bold text-xs text-stone-900 border-b border-stone-200 pb-1.5 flex items-center justify-between">
                                <span>{e.name}</span>
                                <span className="text-[10px] text-stone-500 font-normal">
                                  {exclusives.length} exclusivos
                                </span>
                              </h5>
                              {exclusives.length === 0 ? (
                                <p className="text-[11px] text-stone-400 italic">
                                  No registra bioactivos exclusivos adicionales.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {exclusives.map((m, mIdx) => (
                                    <div key={mIdx} className="bg-white p-2 rounded-xl border border-stone-200/80 text-xs shadow-2xs">
                                      <div className="flex justify-between items-center">
                                        <strong className="text-secondary-brown text-[11px]">{m.name}</strong>
                                        <span className="font-mono text-[11px] text-stone-600 font-bold">
                                          {m.amount} {m.unit}
                                        </span>
                                      </div>
                                      {m.highlight && (
                                        <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                                          {m.highlight}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECCIÓN 5: DICTAMEN TÉCNICO DE SELECCIÓN */}
                    <div className="bg-white border-2 border-emerald-300 rounded-2xl p-4 shadow-xs space-y-2">
                      <div className="flex items-center gap-2 text-secondary-brown font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 size={16} className="text-primary-green shrink-0" />
                        <span>{comparisonData.verdictTitle}</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed">
                        {comparisonData.verdictText}
                      </p>
                    </div>
                  </>
                )
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center rounded-b-3xl">
              <span className="text-xs text-stone-500 hidden sm:inline">
                💡 Tip: Compara cortes cárnicos para optimizar el $/kg de proteína, o verduras/suplementos para balancear antioxidantes.
              </span>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="bg-secondary-brown hover:bg-stone-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ml-auto"
              >
                Cerrar Comparador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientsManager;
