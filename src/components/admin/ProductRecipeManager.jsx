import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft, Tag, ChefHat, RefreshCw, AlertCircle } from 'lucide-react';
import NutritionLabel from './NutritionLabel';

const ProductRecipeManager = ({ product, ingredients, fetchWithAuth, onClose }) => {
  const [recipe, setRecipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ ingredient_id: '', quantity: '' });
  const [fixedCost, setFixedCost] = useState(product.fixed_cost || 0);
  const [savingCost, setSavingCost] = useState(false);
  const [importingKitchen, setImportingKitchen] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);

  const fetchRecipe = async () => {
    try {
      const res = await fetchWithAuth(`/api/admin/products/${product.id}/recipe`);
      if (res.ok) {
        const data = await res.json();
        setRecipe(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipe();
  }, [product.id]);

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!formData.ingredient_id || !formData.quantity) return;
    
    try {
      const res = await fetchWithAuth(`/api/admin/products/${product.id}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: parseInt(formData.ingredient_id),
          quantity: parseFloat(formData.quantity)
        })
      });

      if (res.ok) {
        setIsAdding(false);
        setFormData({ ingredient_id: '', quantity: '' });
        fetchRecipe();
      } else {
        alert('Error al guardar ingrediente en receta');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIngredient = async (ingredientId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este ingrediente de la receta?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/products/${product.id}/recipe/${ingredientId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRecipe();
      } else {
        alert('Error al eliminar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportKitchenRecipe = async () => {
    if (!ingredients || ingredients.length === 0) {
      alert("Primero debes registrar ingredientes en el Maestro de Ingredientes.");
      return;
    }

    const isBarf = product.name.toLowerCase().includes('barf') || product.name.toLowerCase().includes('cruda');
    
    // Mapear ingredientes proporcionales a 1 kg estándar
    const findIng = (terms) => ingredients.find(i => terms.some(t => i.name.toLowerCase().includes(t.toLowerCase())));

    let itemsToSync = [];
    if (isBarf) {
      const rules = [
        { terms: ['cogote'], qty: 0.70 },
        { terms: ['pana pollo', 'pana de pollo', 'pana'], qty: 0.05 },
        { terms: ['contre pollo', 'contre de pollo', 'contre'], qty: 0.10 },
        { terms: ['zapallo camote', 'camote'], qty: 0.079 },
        { terms: ['zanahoria'], qty: 0.048 },
        { terms: ['betarraga'], qty: 0.015 },
        { terms: ['zapallo italiano', 'italiano'], qty: 0.012 },
        { terms: ['manzana'], qty: 0.010 },
        { terms: ['apio'], qty: 0.007 }
      ];
      for (const r of rules) {
        const match = findIng(r.terms);
        if (match) itemsToSync.push({ ingredient_id: match.id, quantity: r.qty });
      }
    } else {
      const rules = [
        { terms: ['cerdo'], qty: 0.70 },
        { terms: ['pana cerdo', 'pana'], qty: 0.05 },
        { terms: ['zapallo camote', 'camote'], qty: 0.10 },
        { terms: ['zanahoria'], qty: 0.10 }
      ];
      for (const r of rules) {
        const match = findIng(r.terms);
        if (match) itemsToSync.push({ ingredient_id: match.id, quantity: r.qty });
      }
    }

    if (itemsToSync.length === 0) {
      alert("No se encontraron ingredientes coincidentes en tu Maestro de Ingredientes para cargar automáticamente. Puedes agregarlos individualmente.");
      return;
    }

    setImportingKitchen(true);
    try {
      const res = await fetchWithAuth(`/api/admin/products/${product.id}/recipe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSync })
      });

      // Si el costo fijo no está definido, asignar costo base de empaque $250
      if (!fixedCost || fixedCost === 0) {
        setFixedCost(250);
        await fetchWithAuth(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...product, fixed_cost: 250 })
        });
      }

      if (res.ok) {
        await fetchRecipe();
        alert(`¡Receta importada desde Cocina exitosamente con ${itemsToSync.length} ingredientes enlazados a sus costos reales!`);
      } else {
        alert("Error al importar la receta");
      }
    } catch (err) {
      console.error(err);
      alert("Error al importar receta");
    } finally {
      setImportingKitchen(false);
    }
  };

  const handleShowNutrition = async () => {
    try {
      const res = await fetchWithAuth(`/api/admin/products/${product.id}/nutrition`);
      if (res.ok) {
        const data = await res.json();
        setNutritionData(data);
        setShowNutrition(true);
      } else {
        alert('Error calculando nutrición. Asegúrate de que los ingredientes tengan valores.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFixedCost = async () => {
    setSavingCost(true);
    try {
      const res = await fetchWithAuth(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, fixed_cost: fixedCost })
      });
      if (res.ok) {
        alert('Costo fijo actualizado');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCost(false);
    }
  };

  // Obtener el precio vivo más reciente del Maestro de Ingredientes
  const getIngredientLiveCost = (item) => {
    const live = ingredients?.find(i => i.id === item.ingredient_id);
    return live ? Number(live.cost_per_unit) : Number(item.cost_per_unit || 0);
  };

  // Calcular el costo total en base a los precios vigentes del Maestro
  const rawMaterialCost = recipe.reduce((sum, item) => sum + (getIngredientLiveCost(item) * Number(item.quantity || 0)), 0);
  const totalCost = rawMaterialCost + Number(fixedCost || 0);
  const margin = product.price - totalCost;
  const marginPercent = totalCost > 0 ? ((margin / product.price) * 100).toFixed(1) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 relative flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h3 className="font-header text-2xl text-secondary-brown">Receta: {product.name}</h3>
              <p className="text-gray-500 text-sm">Precio de venta catálogo (PVP): ${product.price.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Dashboard Resumen Financiero Sincronizado */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-blue-800 text-xs font-bold uppercase tracking-wider">Materia Prima</p>
                <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold">En Vivo</span>
              </div>
              <p className="text-2xl font-black text-blue-900">${rawMaterialCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              <p className="text-[11px] text-blue-600 mt-1">Calculado con precios de tu Maestro</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <p className="text-orange-800 text-xs font-bold uppercase tracking-wider mb-1">Envase & Mano de Obra</p>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={fixedCost} 
                  onChange={(e) => setFixedCost(Number(e.target.value))}
                  className="w-24 bg-white border border-orange-200 rounded px-2 py-1 text-lg font-bold text-orange-900 outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button 
                  onClick={handleSaveFixedCost}
                  disabled={savingCost}
                  className="text-white bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded shadow text-xs font-bold"
                >
                  {savingCost ? '...' : 'Guardar'}
                </button>
              </div>
              <p className="text-[11px] text-orange-600 mt-1">Bolsa al vacío + Etiqueta</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-red-800 text-xs font-bold uppercase tracking-wider mb-1">Costo Total Unitario</p>
              <p className="text-2xl font-black text-red-900">${totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              <p className="text-[11px] text-red-600 mt-1">Materia prima + Envase</p>
            </div>
            <div className={`p-4 rounded-xl border ${margin > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`${margin > 0 ? 'text-green-800' : 'text-red-800'} text-xs font-bold uppercase tracking-wider mb-1`}>Margen Bruto Real</p>
              <p className={`text-2xl font-black ${margin > 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${margin.toLocaleString(undefined, {maximumFractionDigits:0})} ({marginPercent}%)
              </p>
              <p className="text-[11px] text-green-700 mt-1">Ganancia neta por bolsa vendida</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-800">Ingredientes de la Receta (1 kg de producto)</h4>
              <p className="text-xs text-gray-500">Los costos unitarios se actualizan automáticamente al cambiar precios en el Maestro.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleImportKitchenRecipe} 
                disabled={importingKitchen}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow-sm"
              >
                <ChefHat size={15} /> {importingKitchen ? 'Cargando...' : 'Cargar Formulación Cocina (1 kg)'}
              </button>
              <button 
                onClick={handleShowNutrition} 
                className="bg-gray-900 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-black text-xs font-bold"
              >
                <Tag size={15} /> Etiqueta Nutricional
              </button>
              <button onClick={() => setIsAdding(true)} className="bg-primary-green-dark text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-opacity-90 text-xs font-bold">
                <Plus size={15} /> Agregar Ingrediente
              </button>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleSaveIngredient} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-700 mb-1">Ingrediente del Maestro</label>
                <select 
                  value={formData.ingredient_id} 
                  onChange={e => setFormData({...formData, ingredient_id: e.target.value})}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-green-dark outline-none bg-white" required
                >
                  <option value="">Selecciona un ingrediente...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit}) - ${Number(ing.cost_per_unit).toLocaleString()}/{ing.unit}</option>
                  ))}
                </select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-bold text-gray-700 mb-1">Cantidad (kg / unid)</label>
                <input 
                  type="number" step="0.001" min="0.001"
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})}
                  placeholder="Ej: 0.079"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-green-dark outline-none bg-white" required 
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-primary-green-dark text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-opacity-90">Guardar en Receta</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando receta...</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Ingrediente</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Proporción (1 kg)</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Costo Unitario Vigente</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Costo en Producto</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recipe.map(item => {
                    const unitCost = getIngredientLiveCost(item);
                    const cost = unitCost * Number(item.quantity || 0);
                    return (
                      <tr key={item.ingredient_id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          ${unitCost.toLocaleString()} / {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-black">${cost.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteIngredient(item.ingredient_id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition" title="Eliminar de receta">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {recipe.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle size={24} className="text-amber-500" />
                          <p className="font-semibold text-gray-700">No hay ingredientes enlazados en esta receta.</p>
                          <p className="text-xs text-gray-500">Haz clic en <strong>"Cargar Formulación Cocina (1 kg)"</strong> para sincronizarla automáticamente con tu producción.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {showNutrition && (
        <NutritionLabel 
          product={product} 
          nutritionData={nutritionData} 
          onClose={() => setShowNutrition(false)} 
        />
      )}
    </div>
  );
};

export default ProductRecipeManager;
