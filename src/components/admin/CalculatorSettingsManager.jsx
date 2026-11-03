import React, { useState, useEffect } from 'react';
import { Calculator, Save, RotateCcw, CheckCircle, AlertCircle, Sparkles, Dog, ShieldCheck, Info } from 'lucide-react';

const DEFAULT_CALCULATOR_SETTINGS = {
  // Dieta BARF (Cruda) - Referencia Médica Veterinaria Oficial
  barf_puppy_2_4: 10.0,
  barf_puppy_4_6: 8.0,
  barf_puppy_6_8: 6.0,
  barf_puppy_8_10: 4.0,
  barf_puppy_10_12: 3.0,
  barf_adult_normal: 3.0,
  barf_adult_medium: 2.5,
  barf_adult_low: 2.0,
  // Comida Cocinada al Vapor
  cooked_puppy_small: 8.0,
  cooked_puppy_large: 5.0,
  cooked_adult_low: 2.0,
  cooked_adult_normal: 2.5,
  cooked_adult_high: 3.5,
};

const CalculatorSettingsManager = ({ fetchWithAuth }) => {
  const [settings, setSettings] = useState(DEFAULT_CALCULATOR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Simulador rápido para que el admin pueda comprobar cómo rinde cualquier peso
  const [simWeight, setSimWeight] = useState(14);
  const [simDiet, setSimDiet] = useState('barf');
  const [simStage, setSimStage] = useState('barf_adult_normal');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/calculator-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_CALCULATOR_SETTINGS, ...data });
      }
    } catch (err) {
      console.error('Error cargando configuración de calculadora:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    const num = parseFloat(value);
    setSettings(prev => ({
      ...prev,
      [key]: isNaN(num) ? '' : num
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    // Validar que los valores sean lógicos (entre 0.5% y 20%)
    for (const [k, v] of Object.entries(settings)) {
      if (v === '' || isNaN(v) || v <= 0 || v > 20) {
        setErrorMsg(`El valor para ${k} debe ser un número entre 0.5% y 20%.`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetchWithAuth('/api/admin/calculator-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (res.ok) {
        setSuccessMsg('¡Porcentajes de la calculadora actualizados y guardados con éxito!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        throw new Error('Error al guardar en el servidor');
      }
    } catch (err) {
      setErrorMsg('No se pudieron guardar los cambios. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Deseas restablecer todos los porcentajes a la Tabla Médica Oficial de Origen Canino?')) {
      setSettings(DEFAULT_CALCULATOR_SETTINGS);
      setSuccessMsg('Valores reestablecidos a la tabla médica. Haz clic en "Guardar Porcentajes" para aplicar.');
    }
  };

  // Cálculo en vivo para el simulador
  const activePercentage = settings[simStage] || (simDiet === 'barf' ? 3.0 : 2.5);
  const simulatedDailyGrams = Math.round((simWeight * 1000) * (activePercentage / 100));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm border border-gray-100">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-primary-green mb-3"></i>
        <p className="font-medium">Cargando configuración médica de raciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary-green/10 text-primary-green p-3 rounded-xl">
              <Calculator size={28} />
            </div>
            <div>
              <h2 className="font-header text-2xl md:text-3xl text-secondary-brown m-0">
                Mantenedor de Raciones y Calculadora
              </h2>
              <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-amber-200 mt-1">
                <ShieldCheck size={12} /> Referencia Médica Oficial
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-sm max-w-2xl mt-1">
            Administra los porcentajes aplicados sobre el peso del perro para calcular los gramos diarios. Los cambios se reflejarán instantáneamente en la calculadora del sitio web.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition"
            title="Restaurar valores de la tabla médica"
          >
            <RotateCcw size={16} />
            Restablecer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-green text-white hover:bg-primary-green-dark text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-5 py-3.5 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3.5 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Porcentajes */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Bloque 1: Dieta BARF (Cruda) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary-green/20 relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div>
              <h3 className="font-header text-xl text-secondary-brown flex items-center gap-2">
                🥩 Dieta BARF (Cruda)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Alimentación biológicamente apropiada cruda
              </p>
            </div>
            <span className="bg-primary-green/10 text-primary-green font-bold text-xs px-2.5 py-1 rounded-lg">
              Tabla Médica
            </span>
          </div>

          {/* Cachorros */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Cachorros en Crecimiento (2 a 12 meses)
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  2 a 4 Meses <span className="text-xs text-gray-400 block">Máxima demanda metabólica</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_puppy_2_4}
                    onChange={(e) => handleChange('barf_puppy_2_4', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  4 a 6 Meses <span className="text-xs text-gray-400 block">Desarrollo óseo acelerado</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_puppy_4_6}
                    onChange={(e) => handleChange('barf_puppy_4_6', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  6 a 8 Meses <span className="text-xs text-gray-400 block">Fase juvenil</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_puppy_6_8}
                    onChange={(e) => handleChange('barf_puppy_6_8', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  8 a 10 Meses <span className="text-xs text-gray-400 block">Estabilización</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_puppy_8_10}
                    onChange={(e) => handleChange('barf_puppy_8_10', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  10 a 12 Meses <span className="text-xs text-gray-400 block">Transición a adulto</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_puppy_10_12}
                    onChange={(e) => handleChange('barf_puppy_10_12', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adultos BARF */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Adultos & Senior (1+ años)
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Adulto Actividad Normal <span className="text-xs text-gray-400 block">1 a 2 paseos diarios activos</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_adult_normal}
                    onChange={(e) => handleChange('barf_adult_normal', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Adulto Actividad Media <span className="text-xs text-gray-400 block">Paseos moderados / departamento</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_adult_medium}
                    onChange={(e) => handleChange('barf_adult_medium', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Adulto Actividad Baja / Senior <span className="text-xs text-gray-400 block">Sedentario, sobrepeso o +7 años</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.barf_adult_low}
                    onChange={(e) => handleChange('barf_adult_low', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 2: Comida Cocinada al Vapor */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-secondary-brown/20 relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div>
              <h3 className="font-header text-xl text-secondary-brown flex items-center gap-2">
                🍲 Comida Cocinada al Vapor
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cocción a baja temperatura para estómagos sensibles
              </p>
            </div>
            <span className="bg-secondary-brown/10 text-secondary-brown font-bold text-xs px-2.5 py-1 rounded-lg">
              Estándar Suave
            </span>
          </div>

          {/* Cachorros Cocinada */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Cachorros
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Cachorro Pequeño <span className="text-xs text-gray-400 block">2 a 6 meses</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.cooked_puppy_small}
                    onChange={(e) => handleChange('cooked_puppy_small', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Cachorro Grande <span className="text-xs text-gray-400 block">6 a 12 meses</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.cooked_puppy_large}
                    onChange={(e) => handleChange('cooked_puppy_large', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adultos Cocinada */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Adultos & Senior
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Baja Actividad / Senior <span className="text-xs text-gray-400 block">Calma, paseos cortos o sobrepeso</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.cooked_adult_low}
                    onChange={(e) => handleChange('cooked_adult_low', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Actividad Normal <span className="text-xs text-gray-400 block">Rutina típica diaria</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.cooked_adult_normal}
                    onChange={(e) => handleChange('cooked_adult_normal', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-cream/40 p-3 rounded-xl border border-gray-100">
                <label className="text-sm font-medium text-secondary-brown">
                  Alta Actividad / Deporte <span className="text-xs text-gray-400 block">Perros de trabajo o atletas</span>
                </label>
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.cooked_adult_high}
                    onChange={(e) => handleChange('cooked_adult_high', e.target.value)}
                    className="w-full text-right font-bold text-secondary-brown bg-white border border-gray-300 rounded-lg py-1 px-2 text-sm focus:ring-2 focus:ring-primary-green outline-none"
                  />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Simulador Interactivo de Comprobación para el Admin */}
      <div className="bg-gradient-to-br from-bg-cream to-white rounded-2xl p-6 md:p-8 shadow-sm border border-amber-200">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-secondary-orange" size={22} />
          <h3 className="font-header text-xl text-secondary-brown m-0">
            Simulador de Comprobación en Vivo
          </h3>
          <span className="text-xs bg-white text-secondary-brown font-semibold px-2 py-0.5 rounded-full border border-amber-100 ml-auto">
            Prueba cómo calcula la tienda
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Peso del Perro (kg)</label>
            <input
              type="number"
              min="1"
              max="90"
              value={simWeight}
              onChange={(e) => setSimWeight(parseFloat(e.target.value) || 1)}
              className="w-full bg-white text-secondary-brown font-bold rounded-xl p-2.5 border border-gray-300 text-sm focus:ring-2 focus:ring-primary-green outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Dieta</label>
            <select
              value={simDiet}
              onChange={(e) => {
                const newDiet = e.target.value;
                setSimDiet(newDiet);
                setSimStage(newDiet === 'barf' ? 'barf_adult_normal' : 'cooked_adult_normal');
              }}
              className="w-full bg-white text-secondary-brown font-medium rounded-xl p-2.5 border border-gray-300 text-sm focus:ring-2 focus:ring-primary-green outline-none"
            >
              <option value="barf">🥩 Dieta BARF (Cruda)</option>
              <option value="cooked">🍲 Comida Cocinada al Vapor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Etapa / Estilo</label>
            <select
              value={simStage}
              onChange={(e) => setSimStage(e.target.value)}
              className="w-full bg-white text-secondary-brown font-medium rounded-xl p-2.5 border border-gray-300 text-sm focus:ring-2 focus:ring-primary-green outline-none"
            >
              {simDiet === 'barf' ? (
                <>
                  <option value="barf_puppy_2_4">Cachorro 2-4 meses ({settings.barf_puppy_2_4}%)</option>
                  <option value="barf_puppy_4_6">Cachorro 4-6 meses ({settings.barf_puppy_4_6}%)</option>
                  <option value="barf_puppy_6_8">Cachorro 6-8 meses ({settings.barf_puppy_6_8}%)</option>
                  <option value="barf_puppy_8_10">Cachorro 8-10 meses ({settings.barf_puppy_8_10}%)</option>
                  <option value="barf_puppy_10_12">Cachorro 10-12 meses ({settings.barf_puppy_10_12}%)</option>
                  <option value="barf_adult_normal">Adulto Actividad Normal ({settings.barf_adult_normal}%)</option>
                  <option value="barf_adult_medium">Adulto Actividad Media ({settings.barf_adult_medium}%)</option>
                  <option value="barf_adult_low">Adulto Baja Actividad / Senior ({settings.barf_adult_low}%)</option>
                </>
              ) : (
                <>
                  <option value="cooked_puppy_small">Cachorro Pequeño 2-6m ({settings.cooked_puppy_small}%)</option>
                  <option value="cooked_puppy_large">Cachorro Grande 6-12m ({settings.cooked_puppy_large}%)</option>
                  <option value="cooked_adult_low">Adulto Baja Actividad ({settings.cooked_adult_low}%)</option>
                  <option value="cooked_adult_normal">Adulto Actividad Normal ({settings.cooked_adult_normal}%)</option>
                  <option value="cooked_adult_high">Adulto Alta Actividad ({settings.cooked_adult_high}%)</option>
                </>
              )}
            </select>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-primary-green/30 text-center shadow-sm">
            <span className="text-xs text-gray-500 block">Ración Diaria Resultante:</span>
            <span className="font-header text-2xl font-bold text-primary-green">
              {simulatedDailyGrams} <span className="text-sm font-sans font-normal text-secondary-brown">g/día</span>
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              (2 tomas de {Math.round(simulatedDailyGrams / 2)}g)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorSettingsManager;

