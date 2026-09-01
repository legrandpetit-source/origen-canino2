import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Sparkles, Loader } from 'lucide-react';

const IngredientsManager = ({ ingredients, fetchIngredients, fetchWithAuth }) => {
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({ 
    name: '', cost_per_unit: 0, unit: 'kg',
    kcal_per_100g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, moisture_g: 0, ash_g: 0, carbs_g: 0
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = isAdding ? '/api/admin/ingredients' : `/api/admin/ingredients/${editingIngredient.id}`;
      const method = isAdding ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsAdding(false);
        setEditingIngredient(null);
        fetchIngredients();
      } else {
        alert('Error al guardar ingrediente');
      }
    } catch (err) {
      console.error(err);
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
    setIsAdding(true);
    setEditingIngredient(null);
  };

  const openEdit = (ing) => {
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
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-header text-2xl text-secondary-brown">Materia Prima e Ingredientes</h3>
        <button onClick={openAdd} className="bg-primary-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-green-dark transition shadow-sm text-sm font-bold">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {(isAdding || editingIngredient) && (
        <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-green-dark outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
              <input type="number" value={formData.cost_per_unit} onChange={e => setFormData({...formData, cost_per_unit: Number(e.target.value)})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-green-dark outline-none" required min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-green-dark outline-none">
                <option value="kg">Kilo (Kg)</option>
                <option value="litro">Litro (L)</option>
                <option value="unidad">Unidad</option>
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-3 border-t pt-4 mt-2">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 text-sm">Valores Nutricionales (Por cada 100g / 100ml)</h4>
                <button 
                  type="button" 
                  onClick={handleGenerateNutrition}
                  disabled={isGenerating}
                  className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition font-medium disabled:opacity-50"
                >
                  {isGenerating ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                  {isGenerating ? "Pensando..." : "Autocompletar con IA"}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kcal</label>
                  <input type="number" step="0.1" value={formData.kcal_per_100g} onChange={e => setFormData({...formData, kcal_per_100g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Proteína (g)</label>
                  <input type="number" step="0.1" value={formData.protein_g} onChange={e => setFormData({...formData, protein_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Grasa (g)</label>
                  <input type="number" step="0.1" value={formData.fat_g} onChange={e => setFormData({...formData, fat_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Carbs (g)</label>
                  <input type="number" step="0.1" value={formData.carbs_g} onChange={e => setFormData({...formData, carbs_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fibra (g)</label>
                  <input type="number" step="0.1" value={formData.fiber_g} onChange={e => setFormData({...formData, fiber_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Humedad (g)</label>
                  <input type="number" step="0.1" value={formData.moisture_g} onChange={e => setFormData({...formData, moisture_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cenizas (g)</label>
                  <input type="number" step="0.1" value={formData.ash_g} onChange={e => setFormData({...formData, ash_g: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-green outline-none" min="0" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => { setIsAdding(false); setEditingIngredient(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
            <button type="submit" className="bg-primary-green-dark text-white px-6 py-2 rounded-lg hover:bg-opacity-90 flex items-center gap-2">
              <Save size={18} /> Guardar
            </button>
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
                    <button onClick={() => openEdit(ing)} className="text-primary-green hover:bg-green-50 p-1.5 rounded mr-2 transition"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(ing.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {ingredients.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500 text-sm">No hay ingredientes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IngredientsManager;
