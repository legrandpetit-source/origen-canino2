import React, { useState } from 'react';
import { 
  ChefHat, Scale, AlertTriangle, AlertCircle, CheckCircle2, 
  Printer, Info, Flame, Drumstick, Egg, Sparkles, RefreshCw,
  FileText, Check, ShieldAlert, Tag, DollarSign, TrendingUp,
  Wallet, Coins, ChevronDown, ChevronUp
} from 'lucide-react';
import ProductLabelGenerator from './ProductLabelGenerator';

const KitchenProductionManager = () => {
  const [activeLine, setActiveLine] = useState('barf'); // 'barf' o 'cocinada'
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showCostSettings, setShowCostSettings] = useState(false);

  // --- ESTADO LÍNEA 1: BARF CRUDA (BASE COGOTE) ---
  const [cogoteKg, setCogoteKg] = useState(100);
  const [panaPercent, setPanaPercent] = useState(5.0);
  const [contrePercent, setContrePercent] = useState(10.0);
  const [purePercent, setPurePercent] = useState(12.0);
  const [crudoPercent, setCrudoPercent] = useState(3.0);
  const [betarragaPercentInVeg, setBetarragaPercentInVeg] = useState(3.5); // % de la betarraga dentro de los vegetales (máx 5%)

  // --- PRECIOS E INSUMOS BARF ($ CLP) ---
  const [barfPvp, setBarfPvp] = useState(5000);
  const [costCogoteKg, setCostCogoteKg] = useState(1200);
  const [costPanaKg, setCostPanaKg] = useState(1800);
  const [costContreKg, setCostContreKg] = useState(3200);
  const [costVegKg, setCostVegKg] = useState(1100);
  const [costEggUnit, setCostEggUnit] = useState(180);
  const [costAdditivesKg, setCostAdditivesKg] = useState(12000);
  const [costPackagingUnit, setCostPackagingUnit] = useState(250);

  // --- ESTADO LÍNEA 2: COCINADA AL VAPOR (BASE CERDO) ---
  const [cerdoKg, setCerdoKg] = useState(10);
  const [cookedPanaPercent, setCookedPanaPercent] = useState(10.0);
  const [cookedVegPercent, setCookedVegPercent] = useState(20.0);
  const [calciumRatioGramsPerKg, setCalciumRatioGramsPerKg] = useState(5.5); // 5.0 a 6.0 g por kg de cerdo
  const [wholeEggsWithShell, setWholeEggsWithShell] = useState(0); // Huevos enteros con cáscara que van a la olla

  // --- PRECIOS E INSUMOS COCINADA ($ CLP) ---
  const [cookedPvp, setCookedPvp] = useState(8000);
  const [costCerdoKg, setCostCerdoKg] = useState(4200);
  const [costCookedPanaKg, setCostCookedPanaKg] = useState(1800);
  const [costCookedVegKg, setCostCookedVegKg] = useState(1100);
  const [costCalciumKg, setCostCalciumKg] = useState(2500);
  const [costCookedPackagingUnit, setCostCookedPackagingUnit] = useState(250);

  // ==========================================
  // CÁLCULOS MATEMÁTICOS LÍNEA 1: BARF (BASE COGOTE = 70%)
  // ==========================================
  const validCogote = Math.max(0, Number(cogoteKg) || 0);
  const barfTotalMezcla = validCogote > 0 ? (validCogote / 0.70) : 0;
  
  const barfPanaKg = barfTotalMezcla * (panaPercent / 100);
  const barfContreKg = barfTotalMezcla * (contrePercent / 100);
  const barfPureKg = barfTotalMezcla * (purePercent / 100);
  const barfCrudoKg = barfTotalMezcla * (crudoPercent / 100);
  const barfTotalVegKg = barfPureKg + barfCrudoKg;

  // Subdesglose de puré cocido
  const zapalloCamoteKg = barfPureKg * 0.66;
  const zanahoriaKg = barfPureKg * 0.40;
  const betarragaKg = barfPureKg * 0.13;
  const aguaCoccionLitros = validCogote * 0.03; // 3 Litros por cada 100 kg cogote

  // Subdesglose de crudos
  const zapalloItalianoKg = barfCrudoKg * 0.40;
  const manzanaKg = barfCrudoKg * 0.35;
  const talloApioKg = barfCrudoKg * 0.25;

  // Huevos enteros sin cáscara: 30 huevos por cada 100 kg de cogote (0.3 por kg)
  const barfHuevosUnidades = Math.round(validCogote * 0.30);
  const barfHuevosKgEstimado = (barfHuevosUnidades * 0.05).toFixed(1); // ~50g por huevo

  // Aditivos por cada 100 kg cogote: Cúrcuma 150g, Pimienta 15g
  const curcumaGramos = Math.round(validCogote * 1.5);
  const pimientaGramos = Math.round(validCogote * 0.15);

  // Warnings BARF
  const warningPanaBarf = panaPercent > 6.0;
  const warningBetarragaBarf = betarragaPercentInVeg > 5.0;

  // ==========================================
  // CÁLCULOS MATEMÁTICOS LÍNEA 2: COCINADA (BASE CERDO = 70%)
  // ==========================================
  const validCerdo = Math.max(0, Number(cerdoKg) || 0);
  const cookedTotalMezcla = validCerdo > 0 ? (validCerdo / 0.70) : 0;
  
  const cookedPanaKg = cookedTotalMezcla * (cookedPanaPercent / 100);
  const cookedVegKg = cookedTotalMezcla * (cookedVegPercent / 100);
  
  // Balance de Calcio:
  // 5.5g de polvo de cáscara por cada 1 kg de carne de cerdo
  const calciumTotalRequiredGrams = Math.round(validCerdo * calciumRatioGramsPerKg);
  // Cada huevo entero con cáscara aporta ~5.5g de polvo de cáscara
  const eggShellProvidedGrams = Math.round(wholeEggsWithShell * 5.5);
  const additionalEggShellPowderGrams = Math.max(0, calciumTotalRequiredGrams - eggShellProvidedGrams);

  // ==========================================
  // CÁLCULOS FINANCIEROS Y RENTABILIDAD (COSTOS Y MÁRGENES)
  // ==========================================
  // 1. Costos Línea BARF
  const barfCostCogote = validCogote * costCogoteKg;
  const barfCostPana = barfPanaKg * costPanaKg;
  const barfCostContre = barfContreKg * costContreKg;
  const barfCostVeg = barfTotalVegKg * costVegKg;
  const barfCostEggs = barfHuevosUnidades * costEggUnit;
  const barfCostAdditives = ((curcumaGramos + pimientaGramos) / 1000) * costAdditivesKg;
  const barfCostPackaging = barfTotalMezcla * costPackagingUnit;

  const barfTotalCost = Math.round(barfCostCogote + barfCostPana + barfCostContre + barfCostVeg + barfCostEggs + barfCostAdditives + barfCostPackaging);
  const barfCostPerKg = barfTotalMezcla > 0 ? Math.round(barfTotalCost / barfTotalMezcla) : 0;
  const barfGrossMarginPerKg = barfPvp - barfCostPerKg;
  const barfMarginPercent = barfPvp > 0 ? ((barfGrossMarginPerKg / barfPvp) * 100).toFixed(1) : '0';
  const barfTotalProfit = Math.round(barfGrossMarginPerKg * barfTotalMezcla);
  const barfTotalRevenue = Math.round(barfPvp * barfTotalMezcla);

  // 2. Costos Línea Cocinada
  const cookedCostCerdo = validCerdo * costCerdoKg;
  const cookedCostPana = cookedPanaKg * costCookedPanaKg;
  const cookedCostVeg = cookedVegKg * costCookedVegKg;
  const cookedCostEggs = wholeEggsWithShell * costEggUnit;
  const cookedCostCalcium = (additionalEggShellPowderGrams / 1000) * costCalciumKg;
  const cookedCostPackaging = cookedTotalMezcla * costCookedPackagingUnit;

  const cookedTotalCost = Math.round(cookedCostCerdo + cookedCostPana + cookedCostVeg + cookedCostEggs + cookedCostCalcium + cookedCostPackaging);
  const cookedCostPerKg = cookedTotalMezcla > 0 ? Math.round(cookedTotalCost / cookedTotalMezcla) : 0;
  const cookedGrossMarginPerKg = cookedPvp - cookedCostPerKg;
  const cookedMarginPercent = cookedPvp > 0 ? ((cookedGrossMarginPerKg / cookedPvp) * 100).toFixed(1) : '0';
  const cookedTotalProfit = Math.round(cookedGrossMarginPerKg * cookedTotalMezcla);
  const cookedTotalRevenue = Math.round(cookedPvp * cookedTotalMezcla);

  // Valores activos según pestaña
  const activeCostPerKg = activeLine === 'barf' ? barfCostPerKg : cookedCostPerKg;
  const activeTotalCost = activeLine === 'barf' ? barfTotalCost : cookedTotalCost;
  const activePvp = activeLine === 'barf' ? barfPvp : cookedPvp;
  const activeMarginPerKg = activeLine === 'barf' ? barfGrossMarginPerKg : cookedGrossMarginPerKg;
  const activeMarginPercent = activeLine === 'barf' ? barfMarginPercent : cookedMarginPercent;
  const activeTotalProfit = activeLine === 'barf' ? barfTotalProfit : cookedTotalProfit;
  const activeTotalRevenue = activeLine === 'barf' ? barfTotalRevenue : cookedTotalRevenue;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado Principal y Selector de Línea de Producción */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-800 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ChefHat size={13} /> Centro de Producción de Cocina
            </span>
          </div>
          <h2 className="text-2xl font-black font-header text-stone-800">
            Calculadora Industrial de Lotes de Comida
          </h2>
          <p className="text-xs text-stone-500 font-sans mt-0.5">
            Estandarización de recetas y fichas operativas para que cualquier cocinero prepare los lotes exactos sin riesgo de error.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLabelModal(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 px-4 py-2.5 rounded-2xl font-bold text-xs transition shadow-2xs cursor-pointer"
            title="Generar e imprimir etiquetas de empaque con análisis garantizado AAFCO/SAG"
          >
            <Tag size={15} />
            <span>Generar Etiquetas SAG / AAFCO</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer"
            title="Imprimir hoja de ruta para la mesa de cocina"
          >
            <Printer size={15} />
            <span>Imprimir Ficha de Lote</span>
          </button>
        </div>
      </div>

      {/* Selector de Paneles Independientes (BARF vs COCINADA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setActiveLine('barf')}
          className={`p-4 rounded-3xl text-left transition border-2 cursor-pointer flex items-center gap-3.5 ${
            activeLine === 'barf'
              ? 'bg-emerald-50/80 border-emerald-600 shadow-sm'
              : 'bg-white border-stone-200 hover:border-emerald-300'
          }`}
        >
          <div className={`p-3 rounded-2xl ${activeLine === 'barf' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            <Drumstick size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-header font-black text-sm text-stone-800">1. Dieta BARF Cruda</span>
              <span className="bg-emerald-200/70 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Base Cogote Pollo (70%)</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Hueso blando natural, puré cocido + vegetales crudos, huevos sin cáscara, cúrcuma y pimienta.
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveLine('cocinada')}
          className={`p-4 rounded-3xl text-left transition border-2 cursor-pointer flex items-center gap-3.5 ${
            activeLine === 'cocinada'
              ? 'bg-amber-50/80 border-amber-600 shadow-sm'
              : 'bg-white border-stone-200 hover:border-amber-300'
          }`}
        >
          <div className={`p-3 rounded-2xl ${activeLine === 'cocinada' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
            <Flame size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-header font-black text-sm text-stone-800">2. Dieta Cocinada al Vapor</span>
              <span className="bg-amber-200/70 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Base Cerdo sin Hueso (70%)</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Carne magra, puré de verduras al vapor y balance obligatorio de calcio (harina de cáscara tipo talco).
            </p>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PANEL DE RENTABILIDAD, COSTOS Y MARGEN BRUTO EN TIEMPO REAL                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <DollarSign size={16} />
              </span>
              <h3 className="text-base font-black font-header text-stone-800">
                Análisis Financiero de Costos & Margen del Lote
              </h3>
            </div>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              Cálculo de rentabilidad por kilo producido vs. precio de venta para la línea {activeLine === 'barf' ? 'BARF Cruda' : 'Cocinada Cerdo'}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCostSettings(!showCostSettings)}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Coins size={14} className="text-amber-600" />
            <span>{showCostSettings ? 'Ocultar Precios de Compra' : 'Ajustar Precios de Compra ($/kg)'}</span>
            {showCostSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Formulario Desplegable de Costos de Materias Primas */}
        {showCostSettings && (
          <div className="bg-stone-50/80 border border-stone-200 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {activeLine === 'barf' ? (
              <>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cogote Pollo ($/kg):</label>
                  <input
                    type="number"
                    value={costCogoteKg}
                    onChange={(e) => setCostCogoteKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Pana Pollo/Cerdo ($/kg):</label>
                  <input
                    type="number"
                    value={costPanaKg}
                    onChange={(e) => setCostPanaKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Contre/Carne ($/kg):</label>
                  <input
                    type="number"
                    value={costContreKg}
                    onChange={(e) => setCostContreKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Verduras Mix ($/kg):</label>
                  <input
                    type="number"
                    value={costVegKg}
                    onChange={(e) => setCostVegKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Huevo Fresco ($/unid):</label>
                  <input
                    type="number"
                    value={costEggUnit}
                    onChange={(e) => setCostEggUnit(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Aditivos ($/kg):</label>
                  <input
                    type="number"
                    value={costAdditivesKg}
                    onChange={(e) => setCostAdditivesKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Bolsa + Etiqueta ($/unid):</label>
                  <input
                    type="number"
                    value={costPackagingUnit}
                    onChange={(e) => setCostPackagingUnit(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cerdo sin Hueso ($/kg):</label>
                  <input
                    type="number"
                    value={costCerdoKg}
                    onChange={(e) => setCostCerdoKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Pana de Cerdo ($/kg):</label>
                  <input
                    type="number"
                    value={costCookedPanaKg}
                    onChange={(e) => setCostCookedPanaKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Verduras Vapor ($/kg):</label>
                  <input
                    type="number"
                    value={costCookedVegKg}
                    onChange={(e) => setCostCookedVegKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Harina Cáscara ($/kg):</label>
                  <input
                    type="number"
                    value={costCalciumKg}
                    onChange={(e) => setCostCalciumKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Bolsa + Etiqueta ($/unid):</label>
                  <input
                    type="number"
                    value={costCookedPackagingUnit}
                    onChange={(e) => setCostCookedPackagingUnit(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Tarjetas KPI de Rentabilidad */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Costo Total del Lote */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">
              Costo Total del Lote
            </span>
            <div className="text-xl sm:text-2xl font-black font-header text-stone-800">
              ${activeTotalCost.toLocaleString('es-CL')}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Para {activeLine === 'barf' ? barfTotalMezcla.toFixed(1) : cookedTotalMezcla.toFixed(1)} kg de alimento
            </p>
          </div>

          {/* 2. Costo Unitario por Kilo */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">
              Costo Neto / Kilo
            </span>
            <div className="text-xl sm:text-2xl font-black font-header text-stone-800">
              ${activeCostPerKg.toLocaleString('es-CL')} <span className="text-xs font-normal text-stone-500">/ kg</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Materia prima + empaque
            </p>
          </div>

          {/* 3. Precio de Venta al Público (Editable) */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">
              Precio Venta a Público (PVP)
            </span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-stone-400">$</span>
              <input
                type="number"
                value={activeLine === 'barf' ? barfPvp : cookedPvp}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  if (activeLine === 'barf') setBarfPvp(val);
                  else setCookedPvp(val);
                }}
                className="w-full bg-white px-2 py-1 border border-stone-300 rounded-lg text-lg font-black font-header text-stone-900"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Precio bolsa de 1 Kg
            </p>
          </div>

          {/* 4. Margen de Ganancia */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Margen Bruto
              </span>
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-header text-emerald-700">
              {activeMarginPercent}%
            </div>
            <p className="text-[11px] font-bold text-emerald-800 mt-1">
              +${activeMarginPerKg.toLocaleString('es-CL')} / bolsa • Ganancia lote: +${activeTotalProfit.toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: CALCULADORA DIETA BARF CRUDA (BASE COGOTE DE POLLO = 70%)       */}
      {/* ========================================================================= */}
      {activeLine === 'barf' && (
        <div className="space-y-6">
          
          {/* Card Entrada de Materia Prima Base */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                  Paso 1: Ingreso de Materia Prima Base
                </span>
                <h3 className="text-lg font-black font-header text-stone-800 mt-1">
                  ¿Cuántos Kilos de Cogote de Pollo se procesarán hoy?
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  El cogote representa el <strong>70% de la mezcla total</strong>. Toda la receta se calculará proporcionalmente.
                </p>
              </div>

              {/* Presets Rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[50, 80, 100, 150, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCogoteKg(preset)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      cogoteKg === preset
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {preset} kg
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="sm:col-span-1 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kilos de Cogote de Pollo (Base 70%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={cogoteKg}
                    onChange={(e) => setCogoteKg(parseFloat(e.target.value) || 0)}
                    className="w-full text-2xl font-black font-header text-emerald-800 bg-white border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="absolute right-3 top-3 font-bold text-sm text-stone-400">kg</span>
                </div>
              </div>

              {/* Rendimiento Total del Lote */}
              <div className="sm:col-span-2 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    Rendimiento Total Estimado de la Mezcla
                  </span>
                  <Scale size={18} className="text-emerald-300" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black font-header text-white">
                    {barfTotalMezcla.toFixed(2)}
                  </span>
                  <span className="text-lg font-bold text-emerald-200">kg de comida BARF</span>
                </div>
                <p className="text-[11px] text-emerald-100/80 mt-1">
                  Equivalente a aprox. <strong>{Math.round(barfTotalMezcla * 2)} packs de 500g</strong> o <strong>{Math.round(barfTotalMezcla)} packs de 1 kg</strong> listos para ultracongelar a -18°C.
                </p>
              </div>
            </div>
          </div>

          {/* Alertas y Reglas Médicas Estrictas */}
          <div className="space-y-2">
            <div className="bg-rose-50 border-l-4 border-rose-600 p-3.5 rounded-r-2xl flex items-start gap-3 text-xs text-rose-900">
              <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold uppercase tracking-wide">Regla Médica Estricta - Cero Hojas de Apio:</strong>
                <p className="mt-0.5 text-rose-800">
                  Quedan terminantemente <strong>PROHIBIDAS las hojas de apio</strong>; solo se permite el uso del <strong>tallo</strong>. Las hojas contienen aceites esenciales concentrados que generan vómitos severos e inmediatos en los perros.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-600 p-3.5 rounded-r-2xl flex items-start gap-3 text-xs text-amber-900">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold uppercase tracking-wide">Cáscaras de Huevo en Línea BARF:</strong>
                <p className="mt-0.5 text-amber-800">
                  Los huevos van <strong>SIN cáscara</strong>. Las cáscaras se descartan para no sobrecargar de calcio, ya que el hueso del cogote aporta el 100% del requerimiento biológico.
                </p>
              </div>
            </div>

            {warningPanaBarf && (
              <div className="bg-red-100 border border-red-300 text-red-900 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-pulse">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>⚠️ Advertencia de Pana: El porcentaje supera el 6%. Alto riesgo de heces líquidas o exceso de Vitamina A.</span>
              </div>
            )}
          </div>

          {/* Tabla de Pesaje de Ingredientes para el Operario */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black font-header text-stone-800">
                  Ficha de Pesaje para la Mesa de Preparación
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Instrucciones exactas de pesaje para un lote de {validCogote} kg de cogote.
                </p>
              </div>
              <span className="text-xs font-bold text-stone-400">Valores calculados al 100%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200">
                    <th className="p-3">Ingrediente</th>
                    <th className="p-3 text-center">% de la Mezcla</th>
                    <th className="p-3 text-right">Peso Exacto a Pesar</th>
                    <th className="p-3 text-left">Instrucciones de Cocina</th>
                    <th className="p-3 text-center">Checklist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {/* Cogote */}
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-800 flex items-center gap-2">
                      <Drumstick size={15} className="text-emerald-700" />
                      <span>Cogote de Pollo</span>
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-800">70.0%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">{validCogote.toFixed(2)} kg</td>
                    <td className="p-3 text-stone-500">Base con hueso carnoso blando. Moler en disco grueso industrial.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-emerald-700 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Pana */}
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-800">Pana (Hígado) de Pollo / Cerdo</td>
                    <td className="p-3 text-center font-bold text-stone-600">{panaPercent}%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">{barfPanaKg.toFixed(2)} kg</td>
                    <td className="p-3 text-stone-500">Víscera secretora vital. Rango seguro 4% a 6%. Moler cruda con la carne.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-emerald-700 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Contre */}
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-800">Contre (Molleja) o Carne sin hueso</td>
                    <td className="p-3 text-center font-bold text-stone-600">{contrePercent}%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">{barfContreKg.toFixed(2)} kg</td>
                    <td className="p-3 text-stone-500">Víscera muscular / carne magra de alta masticabilidad. Moler crudo.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-emerald-700 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Puré Vegetal Cocido */}
                  <tr className="hover:bg-stone-50 bg-amber-50/30">
                    <td className="p-3 font-bold text-stone-800">
                      <div>Puré Vegetal Cocido al Vapor</div>
                      <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                        • Zapallo Camote cocido: <strong>{zapalloCamoteKg.toFixed(2)} kg</strong><br />
                        • Zanahoria cocida: <strong>{zanahoriaKg.toFixed(2)} kg</strong><br />
                        • Betarraga cocida (máx 5%): <strong>{betarragaKg.toFixed(2)} kg</strong>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-stone-600">{purePercent}%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">
                      <div>{barfPureKg.toFixed(2)} kg</div>
                      <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                        + {aguaCoccionLitros.toFixed(1)} L agua de cocción
                      </div>
                    </td>
                    <td className="p-3 text-stone-500">
                      Cocinar al vapor y triturar en puré suave. Retener los litros indicados de agua de cocción para reincorporar nutrientes.
                    </td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-emerald-700 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Vegetales Crudos Molidos */}
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-800">
                      <div>Vegetales Crudos Molidos</div>
                      <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                        • Zapallo Italiano: <strong>{zapalloItalianoKg.toFixed(2)} kg</strong> | Manzana: <strong>{manzanaKg.toFixed(2)} kg</strong><br />
                        • Tallo de Apio: <strong>{talloApioKg.toFixed(2)} kg</strong> (CERO hojas)
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-stone-600">{crudoPercent}%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">{barfCrudoKg.toFixed(2)} kg</td>
                    <td className="p-3 text-stone-500">Procesar crudos finamente para romper la pared de celulosa y permitir absorción.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-emerald-700 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Huevos */}
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-800 flex items-center gap-2">
                      <Egg size={15} className="text-amber-500" />
                      <span>Huevos Enteros (SIN CÁSCARA)</span>
                    </td>
                    <td className="p-3 text-center font-bold text-stone-600">~1.5%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">
                      <div>{barfHuevosUnidades} unidades</div>
                      <div className="text-[10px] text-stone-400">(aprox. {barfHuevosKgEstimado} kg)</div>
                    </td>
                    <td className="p-3 text-stone-500">
                      Romper huevos e incorporar la clara y yema cruda a la masa. <strong>Desechar cáscaras</strong>.
                    </td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-emerald-700 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Suplementos */}
                  <tr className="hover:bg-stone-50 bg-stone-50/50">
                    <td className="p-3 font-bold text-stone-800">
                      <div>Cúrcuma + Pimienta Negra (Activador)</div>
                      <div className="text-[10px] text-stone-500 font-normal">Antioxidante celular y antiinflamatorio</div>
                    </td>
                    <td className="p-3 text-center font-bold text-stone-600">Aditivo</td>
                    <td className="p-3 text-right font-black text-sm text-amber-800">
                      <div>Cúrcuma: {curcumaGramos} g</div>
                      <div>Pimienta: {pimientaGramos} g</div>
                    </td>
                    <td className="p-3 text-stone-500">Pesar en gramera de precisión y mezclar uniformemente en el puré antes de unir con la carne.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-emerald-700 rounded cursor-pointer" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: CALCULADORA DIETA COCINADA AL VAPOR (BASE CERDO SIN HUESO = 70%) */}
      {/* ========================================================================= */}
      {activeLine === 'cocinada' && (
        <div className="space-y-6">
          
          {/* Card Entrada de Materia Prima Base */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded-full">
                  Paso 1: Ingreso de Carne de Cerdo sin Hueso
                </span>
                <h3 className="text-lg font-black font-header text-stone-800 mt-1">
                  ¿Cuántos Kilos de Cerdo sin Hueso se cocinarán?
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Carne magra (Plateada o pulpa limpia). Representa el <strong>70% de la mezcla total</strong>.
                </p>
              </div>

              {/* Presets Rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[10, 20, 50, 80, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCerdoKg(preset)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      cerdoKg === preset
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {preset} kg
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="sm:col-span-1 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kilos de Carne de Cerdo sin Hueso (70%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={cerdoKg}
                    onChange={(e) => setCerdoKg(parseFloat(e.target.value) || 0)}
                    className="w-full text-2xl font-black font-header text-amber-800 bg-white border border-stone-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-600"
                  />
                  <span className="absolute right-3 top-3 font-bold text-sm text-stone-400">kg</span>
                </div>
              </div>

              {/* Rendimiento Total Cocinada */}
              <div className="sm:col-span-2 bg-gradient-to-br from-amber-800 to-amber-950 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                    Rendimiento Total Estimado de Comida Cocinada
                  </span>
                  <Flame size={18} className="text-amber-300" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black font-header text-white">
                    {cookedTotalMezcla.toFixed(2)}
                  </span>
                  <span className="text-lg font-bold text-amber-200">kg de comida cocinada al vapor</span>
                </div>
                <p className="text-[11px] text-amber-100/80 mt-1">
                  Ideal para perros con estómagos sensibles, gastropatías o rechazo a dietas crudas.
                </p>
              </div>
            </div>
          </div>

          {/* MÓDULO MATEMÁTICO DE CALCIO: CRÍTICO POR CARNE SIN HUESO */}
          <div className="bg-amber-50/70 border-2 border-amber-400 rounded-3xl p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-2xl shrink-0 mt-0.5">
                <Scale size={20} />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black font-header text-amber-900 uppercase tracking-wide">
                    Módulo Crítico: Balance Calcio : Fósforo (Harina de Cáscara de Huevo)
                  </h4>
                  <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Obligatorio
                  </span>
                </div>
                <p className="text-xs text-amber-800 font-sans mt-0.5">
                  La carne de cerdo pura tiene exceso de fósforo y <strong>cero calcio</strong>. Para evitar la descalcificación ósea del perro, se requieren obligatoriamente <strong>5 a 6 gramos de polvo de cáscara ultrafina por cada kilo de carne de cerdo</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-amber-200">
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Calcio Total Requerido</span>
                    <div className="text-xl font-black text-amber-900 mt-1">{calciumTotalRequiredGrams} gramos</div>
                    <span className="text-[10px] text-stone-400">({calciumRatioGramsPerKg}g / kg cerdo)</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                      ¿Huevos enteros cocidos en la olla?
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={wholeEggsWithShell}
                        onChange={(e) => setWholeEggsWithShell(parseInt(e.target.value) || 0)}
                        className="w-20 text-sm font-black text-stone-800 bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-center outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="text-xs text-stone-500">unidades</span>
                    </div>
                    {wholeEggsWithShell > 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                        Aportan: ~{eggShellProvidedGrams}g calcio
                      </span>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-amber-700 to-amber-900 text-white p-3 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                      Polvo de Cáscara Faltante a Pesar
                    </span>
                    <div className="text-2xl font-black text-white mt-1">
                      {additionalEggShellPowderGrams} gramos
                    </div>
                    <span className="text-[10px] text-amber-100">
                      Pesar de harina de cáscara almacenada
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencias Visuales Cocinada */}
          <div className="space-y-2">
            <div className="bg-rose-50 border-l-4 border-rose-600 p-3.5 rounded-r-2xl flex items-start gap-3 text-xs text-rose-900">
              <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold uppercase tracking-wide">Molienda de Cáscara Tipo Talco / Harina:</strong>
                <p className="mt-0.5 text-rose-800">
                  Las cáscaras rotas a mano o en trozos <strong>NO se absorben</strong> en el tracto digestivo y pueden irritar los intestinos. Debe usarse polvo fino molido tipo harina en licuadora o molinillo de café.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-600 p-3.5 rounded-r-2xl flex items-start gap-3 text-xs text-amber-900">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold uppercase tracking-wide">Cocción al Vapor y Retención de Caldo:</strong>
                <p className="mt-0.5 text-amber-800">
                  Todas las verduras (Zapallo camote, zapallo italiano y zanahoria) deben cocinarse al vapor y procesarse en puré con todo el caldo de fondo para no perder vitaminas hidrosolubles. <strong>Cero hojas de apio</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Pesaje de Ingredientes Cocinada */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black font-header text-stone-800">
                  Ficha de Pesaje de Cocina (Línea Cocinada de Cerdo)
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Instrucciones exactas de pesaje para un lote de {validCerdo} kg de cerdo sin hueso.
                </p>
              </div>
              <span className="text-xs font-bold text-stone-400">Valores al 100%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200">
                    <th className="p-3">Ingrediente</th>
                    <th className="p-3 text-center">% de la Mezcla</th>
                    <th className="p-3 text-right">Peso Exacto a Pesar</th>
                    <th className="p-3 text-left">Instrucciones de Cocina</th>
                    <th className="p-3 text-center">Checklist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {/* Cerdo */}
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-800 flex items-center gap-2">
                      <Flame size={15} className="text-amber-600" />
                      <span>Carne de Cerdo sin Hueso</span>
                    </td>
                    <td className="p-3 text-center font-bold text-amber-800">70.0%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">{validCerdo.toFixed(2)} kg</td>
                    <td className="p-3 text-stone-500">Cortes magros/grasos limpios sin hueso. Cocinar al vapor a 85°C y picar en trozos medianos.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-amber-600 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Pana */}
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-800">Pana / Hígado de Cerdo o Pollo</td>
                    <td className="p-3 text-center font-bold text-stone-600">{cookedPanaPercent}%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">{cookedPanaKg.toFixed(2)} kg</td>
                    <td className="p-3 text-stone-500">Cocinar al vapor suave (solo blanquear 5-7 min) para conservar nutrientes esenciales.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-amber-600 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Verduras al Vapor */}
                  <tr className="hover:bg-stone-50 bg-amber-50/20">
                    <td className="p-3 font-bold text-stone-800">
                      <div>Verduras al Vapor en Puré</div>
                      <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                        • Zapallo Camote + Zapallo Italiano + Zanahoria
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-stone-600">{cookedVegPercent}%</td>
                    <td className="p-3 text-right font-black text-sm text-stone-900">{cookedVegKg.toFixed(2)} kg</td>
                    <td className="p-3 text-stone-500">Cocinar al vapor y licuar en puré con todo el caldo residual. Cero hojas de apio.</td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-amber-600 rounded cursor-pointer" /></td>
                  </tr>

                  {/* Harina de Cáscara */}
                  <tr className="hover:bg-stone-50 bg-amber-100/30">
                    <td className="p-3 font-bold text-amber-900 flex items-center gap-2">
                      <Scale size={15} className="text-amber-700" />
                      <span>Polvo / Harina de Cáscara de Huevo</span>
                    </td>
                    <td className="p-3 text-center font-bold text-amber-800">Calcio</td>
                    <td className="p-3 text-right font-black text-sm text-amber-900">
                      {additionalEggShellPowderGrams} gramos
                    </td>
                    <td className="p-3 text-stone-600 font-medium">
                      Pesar en gramera de precisión. Espolvorear e incorporar de manera homogénea en el puré caliente antes del mezclado final.
                    </td>
                    <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 accent-amber-600 rounded cursor-pointer" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Generador e Impresor de Etiquetas de Empaque */}
      <ProductLabelGenerator
        activeLine={activeLine}
        totalKg={activeLine === 'barf' ? barfTotalMezcla : cookedTotalMezcla}
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
      />

    </div>
  );
};

export default KitchenProductionManager;
