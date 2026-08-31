import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft, Tag } from 'lucide-react';
import NutritionLabel from './NutritionLabel';

const ProductRecipeManager = ({ product, ingredients, fetchWithAuth, onClose }) => {
  const [recipe, setRecipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ ingredient_id: '', quantity: '' });
  const [fixedCost, setFixedCost] = useState(product.fixed_cost || 0);
  const [savingCost, setSavingCost] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}/recipe`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
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

  // Calcular el costo total
  const rawMaterialCost = recipe.reduce((sum, item) => sum + (item.cost_per_unit * item.quantity), 0);
  const totalCost = rawMaterialCost + Number(fixedCost);
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
              <p className="text-gray-500 text-sm">Precio de venta: ${product.price.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Dashboard Resumen Financiero */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-blue-800 text-sm font-bold mb-1">Materia Prima</p>
              <p className="text-2xl font-bold text-blue-900">${rawMaterialCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <p className="text-orange-800 text-sm font-bold mb-1">Costo Fijo (Mano de obra, envase)</p>
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
                  className="text-white bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded shadow text-sm"
                >
                  {savingCost ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-red-800 text-sm font-bold mb-1">Costo Total</p>
              <p className="text-2xl font-bold text-red-900">${totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
            </div>
            <div className={`p-4 rounded-xl border ${margin > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`${margin > 0 ? 'text-green-800' : 'text-red-800'} text-sm font-bold mb-1`}>Margen de Ganancia</p>
              <p className={`text-2xl font-bold ${margin > 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${margin.toLocaleString(undefined, {maximumFractionDigits:0})} ({marginPercent}%)
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-gray-800">Ingredientes de la Receta</h4>
            <div className="flex gap-2">
              <button 
                onClick={handleShowNutrition} 
                className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 font-bold"
              >
                <Tag size={18} /> Etiqueta Nutricional
              </button>
              <button onClick={() => setIsAdding(true)} className="bg-primary-green-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90">
                <Plus size={18} /> Agregar Ingrediente
              </button>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleSaveIngredient} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingrediente</label>
                <select 
                  value={formData.ingredient_id} 
                  onChange={e => setFormData({...formData, ingredient_id: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-green-dark outline-none" required
                >
                  <option value="">Selecciona un ingrediente...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit}) - ${ing.cost_per_unit}/{ing.unit}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input 
                  type="number" step="0.01" min="0.01"
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})}
                  placeholder="Ej: 0.5"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-green-dark outline-none" required 
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-primary-green-dark text-white px-4 py-2 rounded-lg hover:bg-opacity-90">Agregar</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando receta...</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">Ingrediente</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Cantidad</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Costo Unitario</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Costo Total</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recipe.map(item => {
                    const cost = item.cost_per_unit * item.quantity;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-gray-600">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-gray-600">${item.cost_per_unit.toLocaleString()} / {item.unit}</td>
                        <td className="px-4 py-3 text-gray-900 font-bold">${cost.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteIngredient(item.ingredient_id)} className="text-red-600 hover:text-red-900 p-2"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {recipe.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No hay ingredientes en esta receta. Agrega uno arriba.</td>
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
