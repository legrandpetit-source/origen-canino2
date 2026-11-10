import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Scale, AlertTriangle, AlertCircle, CheckCircle2, 
  Printer, Info, Flame, Drumstick, Egg, Sparkles, RefreshCw,
  FileText, Check, ShieldAlert, Tag, DollarSign, TrendingUp,
  Wallet, Coins, ChevronDown, ChevronUp, Snowflake, History,
  BarChart3, Layers, PlusCircle, Trash2, Archive, TrendingDown
} from 'lucide-react';
import ProductLabelGenerator from './ProductLabelGenerator';

const KitchenProductionManager = ({ fetchWithAuth, ingredients = [], fetchIngredients, products = [] }) => {
  const [activeLine, setActiveLine] = useState('barf'); // 'barf' o 'cocinada'
  const [activeSubTab, setActiveSubTab] = useState('recipe'); // 'recipe', 'history', 'breakeven', 'cold'
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showCostSettings, setShowCostSettings] = useState(false);

  // --- HISTORIAL DE COSTOS & INSUMOS ---
  const [costHistory, setCostHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyNote, setHistoryNote] = useState('');
  const [savingHistory, setSavingHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Historial de precios de insumos en feria / mayoristas
  const [ingredientHistory, setIngredientHistory] = useState([]);
  const [loadingIngHistory, setLoadingIngHistory] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState('batches'); // 'batches' | 'ingredients'
  const [exportingRecipe, setExportingRecipe] = useState(false);

  // --- PUNTO DE EQUILIBRIO (COSTOS FIJOS) & META 200 KG/SEM ---
  const [monthlyRent, setMonthlyRent] = useState(250000);
  const [monthlyElectricity, setMonthlyElectricity] = useState(120000);
  const [monthlyMaintenance, setMonthlyMaintenance] = useState(80000);
  const [targetWeeklyKg, setTargetWeeklyKg] = useState(200); // Meta estratégica de Patricio: 200 kg/semana

  // --- CAPACIDAD DE FRÍO & MAQUINARIAS ---
  const [freezers, setFreezers] = useState([
    { id: 1, name: 'Freezer Horizontal 1 (500L)', capacityKg: 250, currentStockKg: 140, active: true },
    { id: 2, name: 'Freezer Horizontal 2 (300L)', capacityKg: 150, currentStockKg: 85, active: true },
  ]);
  const [simulatedMachinesCount, setSimulatedMachinesCount] = useState(1);
  const [simulatedMachineCapacity, setSimulatedMachineCapacity] = useState(250); // 500L = 250 kg
  const [simulatedMachinePrice, setSimulatedMachinePrice] = useState(580000); // $580.000 CLP

  // --- ESTADO LÍNEA 1: BARF CRUDA (BASE COGOTE) ---
  const [cogoteKg, setCogoteKg] = useState(100);
  const [panaPercent, setPanaPercent] = useState(5.0);
  const [contrePercent, setContrePercent] = useState(10.0);
  const [purePercent, setPurePercent] = useState(12.0);
  const [crudoPercent, setCrudoPercent] = useState(3.0);
  const [betarragaPercentInVeg, setBetarragaPercentInVeg] = useState(3.5); // % de la betarraga dentro de los vegetales (máx 5%)

  // --- PRECIOS E INSUMOS BARF ($ CLP) ---
  const [barfPvp, setBarfPvp] = useState(5000);
  const [costCogoteKg, setCostCogoteKg] = useState(800); // Sincronizado con Maestro Ingredientes ($800)
  const [costPanaKg, setCostPanaKg] = useState(1450);   // Sincronizado ($1.450)
  const [costContreKg, setCostContreKg] = useState(3200);
  
  // Desglose de Vegetales Reales (Actualizados con compra de hoy)
  const [costZapalloCamoteKg, setCostZapalloCamoteKg] = useState(2700); // ¡Precio real de hoy $2.700!
  const [costZanahoriaKg, setCostZanahoriaKg] = useState(1500);
  const [costBetarragaKg, setCostBetarragaKg] = useState(1000);
  const [costZapalloItalianoKg, setCostZapalloItalianoKg] = useState(1200);
  const [costManzanaKg, setCostManzanaKg] = useState(1500);
  const [costApioKg, setCostApioKg] = useState(1500);

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
  const [costCookedPanaKg, setCostCookedPanaKg] = useState(1450);
  const [costCalciumKg, setCostCalciumKg] = useState(2500);
  const [costCookedPackagingUnit, setCostCookedPackagingUnit] = useState(250);

  // --- SINCRONIZACIÓN AUTOMÁTICA CON MAESTRO DE INGREDIENTES ---
  useEffect(() => {
    if (!ingredients || ingredients.length === 0) return;

    const getPrice = (terms, fallback) => {
      const match = ingredients.find(item => 
        terms.some(t => item.name.toLowerCase().includes(t.toLowerCase()))
      );
      return match ? Number(match.cost_per_unit) : fallback;
    };

    setCostCogoteKg(prev => getPrice(['cogote'], prev));
    setCostPanaKg(prev => getPrice(['pana pollo', 'pana de pollo', 'pana'], prev));
    setCostContreKg(prev => getPrice(['contre pollo', 'contre de pollo', 'contre'], prev));
    setCostZapalloCamoteKg(prev => getPrice(['zapallo camote', 'camote'], prev));
    setCostZanahoriaKg(prev => getPrice(['zanahoria'], prev));
    setCostBetarragaKg(prev => getPrice(['betarraga'], prev));
    setCostZapalloItalianoKg(prev => getPrice(['zapallo italiano', 'italiano'], prev));
    setCostManzanaKg(prev => getPrice(['manzana'], prev));
    setCostApioKg(prev => getPrice(['apio'], prev));
    setCostEggUnit(prev => getPrice(['huevo'], prev));
    setCostCerdoKg(prev => getPrice(['cerdo', 'carne cerdo'], prev));
    setCostCookedPanaKg(prev => getPrice(['pana cerdo', 'pana'], prev));
    setCostPackagingUnit(prev => getPrice(['bolsa', 'etiqueta', 'envase'], prev));
  }, [ingredients]);

  const loadIngredientHistory = async () => {
    if (!fetchWithAuth) return;
    setLoadingIngHistory(true);
    try {
      const res = await fetchWithAuth('/api/admin/ingredients/history');
      if (res.ok) {
        const data = await res.json();
        setIngredientHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIngHistory(false);
    }
  };

  const handleExportRecipeToProduct = async () => {
    if (!products || products.length === 0) {
      alert("No se encontraron productos en el catálogo.");
      return;
    }

    const targetProduct = products.find(p => 
      activeLine === 'barf' 
        ? (p.name.toLowerCase().includes('barf') || p.name.toLowerCase().includes('cruda'))
        : (p.name.toLowerCase().includes('cocinada') || p.name.toLowerCase().includes('vapor'))
    );

    if (!targetProduct) {
      alert(`No se encontró un producto en el catálogo para la línea ${activeLine === 'barf' ? 'BARF' : 'Cocinada'}.`);
      return;
    }

    if (!window.confirm(`¿Deseas exportar la formulación estándar (1 kg) de ${activeLine === 'barf' ? 'Dieta BARF' : 'Dieta Cocinada'} a la receta del producto "${targetProduct.name}"? Esto vinculará la materia prima y costos fijos de empaque.`)) {
      return;
    }

    setExportingRecipe(true);
    try {
      const findId = (terms) => {
        const match = ingredients.find(i => terms.some(t => i.name.toLowerCase().includes(t.toLowerCase())));
        return match ? match.id : null;
      };

      let recipeItems = [];
      if (activeLine === 'barf') {
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
          const id = findId(r.terms);
          if (id) recipeItems.push({ ingredient_id: id, quantity: r.qty });
        }
      } else {
        const rules = [
          { terms: ['cerdo'], qty: 0.70 },
          { terms: ['pana cerdo', 'pana'], qty: 0.05 },
          { terms: ['zapallo camote', 'camote'], qty: 0.10 },
          { terms: ['zanahoria'], qty: 0.10 }
        ];
        for (const r of rules) {
          const id = findId(r.terms);
          if (id) recipeItems.push({ ingredient_id: id, quantity: r.qty });
        }
      }

      if (recipeItems.length === 0) {
        alert("No se pudieron enlazar los ingredientes porque aún no existen en el Maestro de Ingredientes.");
        return;
      }

      const res = await fetchWithAuth(`/api/admin/products/${targetProduct.id}/recipe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: recipeItems })
      });

      // Actualizar costo de envase
      await fetchWithAuth(`/api/products/${targetProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...targetProduct,
          fixed_cost: activeLine === 'barf' ? costPackagingUnit : costCookedPackagingUnit
        })
      });

      if (res.ok) {
        alert(`¡Receta sincronizada con éxito para "${targetProduct.name}"! Ahora el catálogo de productos refleja exactamente los costos de cocina.`);
      } else {
        alert("Error al sincronizar receta.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al sincronizar receta.");
    } finally {
      setExportingRecipe(false);
    }
  };

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

  // Desglose Ponderado Real de Vegetales (Puré Cocido + Crudos Molidos)
  const barfCostZapalloCamote = zapalloCamoteKg * costZapalloCamoteKg;
  const barfCostZanahoria = zanahoriaKg * costZanahoriaKg;
  const barfCostBetarraga = betarragaKg * costBetarragaKg;
  const barfCostPureVeg = barfCostZapalloCamote + barfCostZanahoria + barfCostBetarraga;
  const barfCostCrudosVeg = (zapalloItalianoKg * costZapalloItalianoKg) + (manzanaKg * costManzanaKg) + (talloApioKg * costApioKg);
  const barfCostVeg = barfCostPureVeg + barfCostCrudosVeg;

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
  const cookedAvgVegCost = (costZapalloCamoteKg + costZapalloItalianoKg + costZanahoriaKg) / 3;
  const cookedCostVeg = cookedVegKg * cookedAvgVegCost;
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

  // ==========================================
  // CÁLCULOS: PUNTO DE EQUILIBRIO (BREAK-EVEN)
  // ==========================================
  const totalFixedCosts = monthlyRent + monthlyElectricity + monthlyMaintenance;
  const breakEvenKg = activeMarginPerKg > 0 ? Math.ceil(totalFixedCosts / activeMarginPerKg) : 0;
  const breakEvenDogs = Math.ceil(breakEvenKg / 15); // Perro mediano: 15 kg/mes
  const activeKilosPlanned = activeLine === 'barf' ? barfTotalMezcla : cookedTotalMezcla;
  const breakEvenCoveragePercent = breakEvenKg > 0 ? Math.min(200, Math.round((activeKilosPlanned / breakEvenKg) * 100)) : 0;

  // Cálculos de la Meta Estratégica: 200 kg / semana (800 kg / mes)
  const targetMonthlyKg = targetWeeklyKg * 4;
  const targetMonthlyDogs = Math.round(targetMonthlyKg / 15);
  const targetGrossRevenue = targetMonthlyKg * activePvp;
  const targetTotalVariableCost = targetMonthlyKg * activeCostPerKg;
  const targetContributionMargin = targetGrossRevenue - targetTotalVariableCost;
  const targetNetProfitMonthly = targetContributionMargin - totalFixedCosts;
  const targetNetProfitWeekly = Math.round(targetNetProfitMonthly / 4);

  // Días de utilidad neta para financiar adquisiciones:
  const dailyNetProfit = targetNetProfitMonthly / 30;
  const daysToFundFreezer = dailyNetProfit > 0 ? Math.ceil(580000 / dailyNetProfit) : 0;
  const daysToFundMoledora = dailyNetProfit > 0 ? Math.ceil(900000 / dailyNetProfit) : 0;
  const assistantMonthlyCost = 350000;
  const profitWithAssistant = targetNetProfitMonthly - assistantMonthlyCost;

  // ==========================================
  // CÁLCULOS: CAPACIDAD DE FRÍO & MAQUINARIAS
  // ==========================================
  const totalFreezerCapacity = freezers.filter(f => f.active).reduce((sum, f) => sum + f.capacityKg, 0);
  const totalCurrentStock = freezers.filter(f => f.active).reduce((sum, f) => sum + f.currentStockKg, 0);
  const totalWithNewBatch = totalCurrentStock + activeKilosPlanned;
  const occupancyPercent = totalFreezerCapacity > 0 ? Math.round((totalCurrentStock / totalFreezerCapacity) * 100) : 0;
  const occupancyWithNewBatchPercent = totalFreezerCapacity > 0 ? Math.round((totalWithNewBatch / totalFreezerCapacity) * 100) : 0;

  // Simulador de Expansión de Maquinaria
  const simulatedAdditionalCapacity = simulatedMachinesCount * simulatedMachineCapacity;
  const simulatedTotalCapacity = totalFreezerCapacity + simulatedAdditionalCapacity;
  const simulatedAdditionalDogs = Math.floor(simulatedAdditionalCapacity / 15);
  const simulatedAdditionalMonthlyRevenue = simulatedAdditionalCapacity * activePvp;
  const simulatedAdditionalMonthlyProfit = simulatedAdditionalCapacity * activeMarginPerKg;
  const simulatedInvestmentTotal = simulatedMachinesCount * simulatedMachinePrice;
  const simulatedRoiMonths = simulatedAdditionalMonthlyProfit > 0 ? (simulatedInvestmentTotal / simulatedAdditionalMonthlyProfit).toFixed(1) : '0';

  // --- LLAMADAS API HISTORIAL ---
  const loadHistory = async () => {
    if (!fetchWithAuth) return;
    setLoadingHistory(true);
    try {
      const res = await fetchWithAuth(`/api/admin/kitchen/history?line=${activeLine}`);
      if (res.ok) {
        const data = await res.json();
        setCostHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      if (historyViewMode === 'batches') {
        loadHistory();
      } else {
        loadIngredientHistory();
      }
    }
  }, [activeSubTab, activeLine, historyViewMode]);

  const handleSaveToHistory = async () => {
    if (!fetchWithAuth) return;
    setSavingHistory(true);
    try {
      const payload = {
        production_line: activeLine,
        batch_total_kg: activeKilosPlanned,
        cost_per_kg: activeCostPerKg,
        pvp_price: activePvp,
        gross_margin_percent: parseFloat(activeMarginPercent),
        gross_margin_clp: activeMarginPerKg,
        raw_costs: activeLine === 'barf' ? {
          cogote_kg: costCogoteKg,
          pana_kg: costPanaKg,
          contre_kg: costContreKg,
          veg_kg: costVegKg,
          egg_unit: costEggUnit,
          additives_kg: costAdditivesKg,
          packaging_unit: costPackagingUnit
        } : {
          cerdo_kg: costCerdoKg,
          pana_kg: costCookedPanaKg,
          veg_kg: costCookedVegKg,
          calcium_kg: costCalciumKg,
          packaging_unit: costCookedPackagingUnit
        },
        provider_notes: historyNote
      };

      const res = await fetchWithAuth('/api/admin/kitchen/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('¡Costos y márgenes archivados con éxito en el historial!');
        setHistoryNote('');
        setShowSaveModal(false);
        loadHistory();
      } else {
        alert('Error al guardar en el historial');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingHistory(false);
    }
  };

  const handleDeleteHistoryItem = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro histórico?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/kitchen/history/${id}`, { method: 'DELETE' });
      if (res.ok) loadHistory();
    } catch (err) {
      console.error(err);
    }
  };

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
            onClick={handleExportRecipeToProduct}
            disabled={exportingRecipe}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2.5 rounded-2xl font-bold text-xs transition shadow-2xs cursor-pointer"
            title="Sincronizar formulación para 1kg con la Receta del Producto en Catálogo"
          >
            <Layers size={15} />
            <span>{exportingRecipe ? 'Sincronizando...' : 'Exportar a Receta Catálogo'}</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2.5 rounded-2xl font-bold text-xs transition shadow-2xs cursor-pointer"
            title="Archivar costos y margen actual en el historial histórico"
          >
            <Archive size={15} className="text-amber-400" />
            <span>Archivar Costos Lote</span>
          </button>

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
            <span>Imprimir Ficha</span>
          </button>
        </div>
      </div>

      {/* Barra de Sub-Pestañas Estratégicas de Cocina */}
      <div className="bg-white p-1.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab('recipe')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'recipe'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ChefHat size={15} />
          <span>1. Receta & Producción</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <History size={15} />
          <span>2. Historial de Costos & Alertas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('breakeven')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'breakeven'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <BarChart3 size={15} />
          <span>3. Punto de Equilibrio (Break-Even)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cold')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'cold'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Snowflake size={15} className="text-cyan-500" />
          <span>4. Capacidad de Frío & Maquinarias</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-PESTAÑA 1: RECETAS Y PRODUCCIÓN                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'recipe' && (
        <div className="space-y-6">

          {/* Banner de Sincronización con Maestro de Ingredientes */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/90 border border-emerald-200/80 px-4 py-2.5 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-emerald-950">
                Sincronización en Vivo: Los costos de insumos y materia prima se alimentan automáticamente desde tu Maestro ({ingredients.length} insumos registrados).
              </span>
            </div>
            {fetchIngredients && (
              <button 
                onClick={fetchIngredients}
                className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 text-[11px] underline cursor-pointer"
              >
                <RefreshCw size={12} /> Refrescar Precios
              </button>
            )}
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
          <div className="bg-stone-50/80 border border-stone-200 p-4 rounded-2xl space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    <label className="block font-bold text-stone-700 mb-1">Huevo Fresco ($/unid):</label>
                    <input
                      type="number"
                      value={costEggUnit}
                      onChange={(e) => setCostEggUnit(Number(e.target.value) || 0)}
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

            {/* Desglose Específico de Verduras con Alertas de Inflación */}
            <div className="pt-2 border-t border-stone-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-2">
                Desglose Específico de Verduras & Frutas (Precios de Compra en Feria / Lo Valledor):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-300">
                  <label className="block font-bold text-amber-900 text-[10px] mb-1">🎃 Zapallo Camote:</label>
                  <input
                    type="number"
                    value={costZapalloCamoteKg}
                    onChange={(e) => setCostZapalloCamoteKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-2 py-1 border border-amber-400 rounded-lg font-black text-amber-900"
                  />
                  <span className="text-[9px] text-amber-700 font-bold block mt-0.5">Hoy: $2.700/kg</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[10px] mb-1">🥕 Zanahoria ($/kg):</label>
                  <input
                    type="number"
                    value={costZanahoriaKg}
                    onChange={(e) => setCostZanahoriaKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-2 py-1 border border-stone-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[10px] mb-1">🟣 Betarraga ($/kg):</label>
                  <input
                    type="number"
                    value={costBetarragaKg}
                    onChange={(e) => setCostBetarragaKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-2 py-1 border border-stone-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[10px] mb-1">🥒 Zap. Italiano ($/kg):</label>
                  <input
                    type="number"
                    value={costZapalloItalianoKg}
                    onChange={(e) => setCostZapalloItalianoKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-2 py-1 border border-stone-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[10px] mb-1">🍏 Manzana ($/kg):</label>
                  <input
                    type="number"
                    value={costManzanaKg}
                    onChange={(e) => setCostManzanaKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-2 py-1 border border-stone-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[10px] mb-1">🌿 Tallo Apio ($/kg):</label>
                  <input
                    type="number"
                    value={costApioKg}
                    onChange={(e) => setCostApioKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-2 py-1 border border-stone-300 rounded-lg font-bold"
                  />
                </div>
              </div>
            </div>

            {activeLine === 'barf' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Aditivos Cúrcuma/Pimienta ($/kg):</label>
                  <input
                    type="number"
                    value={costAdditivesKg}
                    onChange={(e) => setCostAdditivesKg(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Bolsa Sellada + Etiqueta ($/unid):</label>
                  <input
                    type="number"
                    value={costPackagingUnit}
                    onChange={(e) => setCostPackagingUnit(Number(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
                  />
                </div>
              </div>
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

      </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PESTAÑA 2: HISTORIAL DE COSTOS & ALERTAS DE INFLACIÓN                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <History size={16} />
                  </span>
                  <h3 className="text-xl font-black font-header text-stone-800">
                    Historial de Costos de Producción & Margen
                  </h3>
                </div>
                <p className="text-xs text-stone-500 font-sans mt-0.5">
                  Registro histórico de variaciones de insumos y precios de materias primas para proteger tu margen.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer"
                >
                  <Archive size={14} className="text-amber-400" />
                  Archivar Costos de Hoy
                </button>
                <button
                  onClick={loadHistory}
                  className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                  title="Refrescar historial"
                >
                  <RefreshCw size={15} className={loadingHistory ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Selector de Modo para Historial: Lotes vs Precios Insumos */}
            <div className="flex flex-wrap items-center justify-between gap-3 my-4">
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl">
                <button
                  onClick={() => setHistoryViewMode('batches')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    historyViewMode === 'batches' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Archive size={14} />
                  <span>Lotes de Producción</span>
                </button>
                <button
                  onClick={() => { setHistoryViewMode('ingredients'); loadIngredientHistory(); }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    historyViewMode === 'ingredients' ? 'bg-white text-amber-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <History size={14} className="text-amber-600" />
                  <span>Historial de Precios de Insumos (Feria / Mayoristas)</span>
                </button>
              </div>

              {historyViewMode === 'batches' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveLine('barf')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeLine === 'barf' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    BARF Cruda
                  </button>
                  <button
                    onClick={() => setActiveLine('cocinada')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeLine === 'cocinada' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Cocinada Cerdo
                  </button>
                </div>
              )}
            </div>

            {/* VISTA 1: TABLA HISTÓRICA DE LOTES */}
            {historyViewMode === 'batches' && (
              <>
                {loadingHistory ? (
                  <div className="text-center py-10 text-xs text-stone-400">Cargando historial de costos...</div>
                ) : costHistory.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200 p-6">
                    <Archive size={32} className="mx-auto text-stone-300 mb-2" />
                    <p className="text-xs font-bold text-stone-700">Aún no hay registros archivados para esta línea</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Haz clic en "Archivar Costos de Hoy" para guardar el primer punto de referencia.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-stone-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Línea</th>
                          <th className="p-3 text-right">Lote (kg)</th>
                          <th className="p-3 text-right">Costo / kg</th>
                          <th className="p-3 text-right">PVP / kg</th>
                          <th className="p-3 text-right">Margen %</th>
                          <th className="p-3 text-right">Margen $</th>
                          <th className="p-3">Notas / Factura</th>
                          <th className="p-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {costHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50 transition">
                            <td className="p-3 font-mono font-medium text-stone-600">
                              {new Date(item.created_at).toLocaleDateString('es-CL')}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                item.production_line === 'barf' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.production_line}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold">{item.batch_total_kg} kg</td>
                            <td className="p-3 text-right font-mono font-bold text-stone-900">${item.cost_per_kg?.toLocaleString('es-CL')}</td>
                            <td className="p-3 text-right font-mono text-stone-600">${item.pvp_price?.toLocaleString('es-CL')}</td>
                            <td className="p-3 text-right font-mono font-black text-emerald-700">{item.gross_margin_percent}%</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-800">+${item.gross_margin_clp?.toLocaleString('es-CL')}</td>
                            <td className="p-3 text-stone-500 italic max-w-xs truncate">{item.provider_notes || '—'}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteHistoryItem(item.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar registro"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* VISTA 2: TABLA HISTÓRICA DE PRECIOS DE INSUMOS (FERIA / PROVEEDORES) */}
            {historyViewMode === 'ingredients' && (
              <>
                {loadingIngHistory ? (
                  <div className="text-center py-10 text-xs text-stone-400">Cargando variaciones de insumos...</div>
                ) : ingredientHistory.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200 p-6">
                    <History size={32} className="mx-auto text-stone-300 mb-2" />
                    <p className="text-xs font-bold text-stone-700">Aún no hay variaciones de precios registradas</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Al actualizar precios en el Maestro de Ingredientes, el sistema generará automáticamente la curva histórica aquí.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-stone-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Insumo</th>
                          <th className="p-3 text-right">Precio Anterior</th>
                          <th className="p-3 text-right">Precio Nuevo</th>
                          <th className="p-3 text-center">Variación</th>
                          <th className="p-3">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {ingredientHistory.map((item, idx) => {
                          const prev = item.previous_price ? Number(item.previous_price) : null;
                          const curr = Number(item.price);
                          const diff = prev !== null ? curr - prev : 0;
                          const pct = prev && prev > 0 ? ((diff / prev) * 100).toFixed(1) : null;
                          const isIncrease = diff > 0;
                          const isDecrease = diff < 0;

                          return (
                            <tr key={item.id || idx} className="hover:bg-stone-50 transition">
                              <td className="p-3 font-mono text-stone-500">
                                {item.created_at ? new Date(item.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="p-3 font-bold text-stone-900">{item.ingredient_name}</td>
                              <td className="p-3 text-right font-mono text-stone-500">
                                {prev !== null ? `$${prev.toLocaleString('es-CL')}` : <span className="text-stone-400 italic">Inicial</span>}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-stone-900">
                                ${curr.toLocaleString('es-CL')} / {item.unit || 'kg'}
                              </td>
                              <td className="p-3 text-center">
                                {prev === null ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">Alta</span>
                                ) : isIncrease ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 inline-flex items-center gap-1">
                                    <TrendingUp size={11} /> +${diff.toLocaleString('es-CL')} (+{pct}%)
                                  </span>
                                ) : isDecrease ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                    <TrendingDown size={11} /> -${Math.abs(diff).toLocaleString('es-CL')} ({pct}%)
                                  </span>
                                ) : (
                                  <span className="text-stone-400">Sin cambio</span>
                                )}
                              </td>
                              <td className="p-3 text-stone-600 italic max-w-xs truncate">{item.notes || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PESTAÑA 3: PUNTO DE EQUILIBRIO (BREAK-EVEN POINT)                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'breakeven' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                  <BarChart3 size={16} />
                </span>
                <h3 className="text-xl font-black font-header text-stone-800">
                  Calculador de Punto de Equilibrio (*Break-Even Point*)
                </h3>
              </div>
              <p className="text-xs text-stone-500 font-sans">
                Determina exactamente cuántos kilos o perros suscritos necesitas vender para cubrir todos tus costos fijos operativos.
              </p>
            </div>

            {/* Inputs de Costos Fijos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-stone-50 rounded-2xl border border-stone-200">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Arriendo Cocina / Taller ($/mes):</label>
                <input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value) || 0)}
                  className="w-full bg-white px-3 py-2 border border-stone-300 rounded-xl font-bold text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Electricidad Congeladores ($/mes):</label>
                <input
                  type="number"
                  value={monthlyElectricity}
                  onChange={(e) => setMonthlyElectricity(Number(e.target.value) || 0)}
                  className="w-full bg-white px-3 py-2 border border-stone-300 rounded-xl font-bold text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mantención & Otros Gastos ($/mes):</label>
                <input
                  type="number"
                  value={monthlyMaintenance}
                  onChange={(e) => setMonthlyMaintenance(Number(e.target.value) || 0)}
                  className="w-full bg-white px-3 py-2 border border-stone-300 rounded-xl font-bold text-sm text-stone-900"
                />
              </div>
            </div>

            {/* Resultados Clave del Break-Even */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-stone-900 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Total Gastos Fijos</span>
                <div className="text-2xl sm:text-3xl font-black font-header text-white mt-1">
                  ${totalFixedCosts.toLocaleString('es-CL')} <span className="text-xs font-normal text-stone-400">/ mes</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-2">Para mantener la planta operativa 24/7</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Kilos para Estar en Cero</span>
                <div className="text-2xl sm:text-3xl font-black font-header text-blue-900 mt-1">
                  {breakEvenKg.toLocaleString('es-CL')} <span className="text-xs font-normal text-blue-600">kg / mes</span>
                </div>
                <p className="text-[11px] text-blue-700 mt-2">Basado en tu margen actual de ${activeMarginPerKg.toLocaleString('es-CL')} / kg</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Perros Medianos Requeridos</span>
                <div className="text-2xl sm:text-3xl font-black font-header text-emerald-900 mt-1">
                  {breakEvenDogs} <span className="text-xs font-normal text-emerald-600">perros / mes</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-2">Consumo prom. 15 kg/mes. Desde el perro #{breakEvenDogs + 1}, todo es utilidad neta.</p>
              </div>
            </div>

            {/* Barra de Progreso y Diagnóstico */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
              <div className="flex justify-between items-center text-xs font-bold text-amber-900 mb-2">
                <span>Cobertura del Lote Actual ({activeKilosPlanned.toFixed(1)} kg) vs. Punto de Equilibrio</span>
                <span>{breakEvenCoveragePercent}%</span>
              </div>
              <div className="w-full bg-amber-200/50 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, breakEvenCoveragePercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-amber-800 mt-2">
                {breakEvenCoveragePercent >= 100
                  ? `✓ ¡Excelente! Con este lote de ${activeKilosPlanned.toFixed(1)} kg cubres el 100% de tus costos fijos mensuales y te quedan ganancias limpias.`
                  : `Necesitas producir y vender ${Math.max(0, breakEvenKg - Math.round(activeKilosPlanned))} kg adicionales este mes para llegar al punto de equilibrio.`}
              </p>
            </div>

            {/* --- SECCIÓN ESTRATÉGICA: HITO 200 KG/SEMANA (HOJA DE RUTA PATRICIO) --- */}
            <div className="bg-stone-900 text-white p-6 rounded-3xl border border-stone-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-xl">
                      <TrendingUp size={18} />
                    </span>
                    <h4 className="text-lg font-black font-header text-white">
                      Hoja de Ruta Estratégica: Meta {targetWeeklyKg} Kilos / Semana
                    </h4>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    Proyección de volumen sostenible ({targetMonthlyKg} kg/mes) para alcanzar la utilidad que financia nuevo personal y maquinaria de frío.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-stone-800/80 p-2 rounded-2xl border border-stone-700">
                  <span className="text-xs text-stone-400 font-bold pl-2">Meta semanal:</span>
                  <input
                    type="number"
                    value={targetWeeklyKg}
                    onChange={(e) => setTargetWeeklyKg(Math.max(10, Number(e.target.value) || 0))}
                    className="w-20 bg-stone-900 text-amber-400 font-black text-sm px-2.5 py-1.5 rounded-xl border border-stone-700 text-center outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-stone-400 font-bold pr-2">kg/sem</span>
                </div>
              </div>

              {/* 4 KPIs Clave de la Meta */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60">
                  <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Volumen Mensual</span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">
                    {targetMonthlyKg.toLocaleString('es-CL')} <span className="text-xs font-normal text-stone-400">kg/mes</span>
                  </div>
                  <p className="text-[11px] text-amber-400 font-bold mt-1">~{targetMonthlyDogs} perros suscritos</p>
                </div>

                <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60">
                  <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Facturación Bruta</span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">
                    ${targetGrossRevenue.toLocaleString('es-CL')}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">${(targetGrossRevenue / 4).toLocaleString('es-CL')} por semana</p>
                </div>

                <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60">
                  <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Costos Totales (Var + Fijos)</span>
                  <div className="text-xl sm:text-2xl font-black text-rose-300 mt-1">
                    ${(targetTotalVariableCost + totalFixedCosts).toLocaleString('es-CL')}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">Insumos + Arriendo + Luz</p>
                </div>

                <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-500/40">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Ganancia Neta en Bolsillo</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                    +${targetNetProfitMonthly.toLocaleString('es-CL')}
                  </div>
                  <p className="text-[11px] text-emerald-300 font-bold mt-1">+${targetNetProfitWeekly.toLocaleString('es-CL')} limpios/sem</p>
                </div>
              </div>

              {/* Plan de Reinversión de Maquinaria y Personal */}
              <div className="bg-stone-800/40 p-5 rounded-2xl border border-stone-700/60 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-black text-sm">🚀 Plan de Reinversión al Alcanzar los {targetWeeklyKg} kg/semana:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-stone-900/80 rounded-xl border border-stone-700 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5"><Snowflake size={14}/> 1. Capacidad de Frío</span>
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">{daysToFundFreezer} días</span>
                    </div>
                    <p className="text-stone-300 font-bold text-sm">Freezer 500L ($580.000)</p>
                    <p className="text-[11px] text-stone-400">
                      Almacena 250 kg extras. Con tu utilidad neta de ${targetNetProfitMonthly.toLocaleString('es-CL')}, se autofinancia en solo <strong>{daysToFundFreezer} días de ventas</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-900/80 rounded-xl border border-stone-700 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5"><ChefHat size={14}/> 2. Personal de Cocina</span>
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold">Part-time</span>
                    </div>
                    <p className="text-stone-300 font-bold text-sm">Ayudante ($350.000 / mes)</p>
                    <p className="text-[11px] text-stone-400">
                      Te libera del 70% de la molienda y envasado pesado. Tu utilidad neta sigue siendo de <strong>+${profitWithAssistant.toLocaleString('es-CL')}/mes</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-900/80 rounded-xl border border-stone-700 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5"><Scale size={14}/> 3. Moledora Industrial</span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">{daysToFundMoledora} días</span>
                    </div>
                    <p className="text-stone-300 font-bold text-sm">Moledora Hueso ($900.000)</p>
                    <p className="text-[11px] text-stone-400">
                      Reduce el tiempo de preparación a la mitad. Se autofinancia con menos de <strong>{daysToFundMoledora} días</strong> de utilidad líquida.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PESTAÑA 4: CAPACIDAD DE FRÍO & SIMULADOR DE MAQUINARIA (ROI)          */}
      {/* ========================================================================= */}
      {activeSubTab === 'cold' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-cyan-100 text-cyan-800 rounded-lg">
                  <Snowflake size={16} />
                </span>
                <h3 className="text-xl font-black font-header text-stone-800">
                  Capacidad de Frío (-18°C) & Expansión de Maquinaria
                </h3>
              </div>
              <p className="text-xs text-stone-500 font-sans">
                Monitorea el espacio de congeladores disponible y simula el retorno de inversión (ROI) al adquirir nuevas máquinas.
              </p>
            </div>

            {/* Congeladores Actuales */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-stone-700 block">Tus Máquinas Congeladoras Activas:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {freezers.map(f => (
                  <div key={f.id} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
                        <Snowflake size={14} className="text-cyan-600" />
                        {f.name}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Capacidad máx: <strong className="text-stone-700">{f.capacityKg} kg</strong> • Stock actual: <strong className="text-stone-700">{f.currentStockKg} kg</strong>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase">
                      Activo
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Termómetro de Ocupación de Frío */}
            <div className="bg-cyan-50/50 border border-cyan-200 p-5 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-cyan-900">Ocupación Actual de Frío:</span>
                <span className="font-black text-cyan-900 font-mono">{occupancyPercent}% ({totalCurrentStock} de {totalFreezerCapacity} kg)</span>
              </div>
              <div className="w-full bg-cyan-200/60 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    occupancyPercent > 85 ? 'bg-red-500' : occupancyPercent > 70 ? 'bg-amber-500' : 'bg-cyan-600'
                  }`}
                  style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-cyan-800">
                Tienes espacio libre para <strong>{Math.max(0, totalFreezerCapacity - totalCurrentStock)} kg adicionales</strong> antes de saturar tus congeladores.
              </p>
            </div>

            {/* SIMULADOR DE EXPANSIÓN DE MAQUINARIA (ROI) */}
            <div className="bg-stone-900 text-white p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h4 className="text-base font-black font-header text-amber-400">
                  Simulador de Expansión de Maquinaria & Retorno de Inversión (ROI)
                </h4>
              </div>
              <p className="text-xs text-stone-300 font-sans">
                ¿Qué pasa si compras una máquina adicional para producir más comida y sumar nuevos clientes?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">Máquinas a comprar:</label>
                  <select
                    value={simulatedMachinesCount}
                    onChange={(e) => setSimulatedMachinesCount(Number(e.target.value) || 1)}
                    className="w-full bg-stone-800 text-white px-3 py-2 rounded-xl text-xs font-bold border border-stone-700"
                  >
                    <option value={1}>1 Freezer Industrial</option>
                    <option value={2}>2 Freezers Industriales</option>
                    <option value={3}>3 Freezers Industriales</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">Capacidad por máquina:</label>
                  <select
                    value={simulatedMachineCapacity}
                    onChange={(e) => setSimulatedMachineCapacity(Number(e.target.value) || 250)}
                    className="w-full bg-stone-800 text-white px-3 py-2 rounded-xl text-xs font-bold border border-stone-700"
                  >
                    <option value={150}>300 Litros (~150 kg)</option>
                    <option value={250}>500 Litros (~250 kg)</option>
                    <option value={350}>700 Litros (~350 kg)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">Precio Compra Máquina ($):</label>
                  <input
                    type="number"
                    value={simulatedMachinePrice}
                    onChange={(e) => setSimulatedMachinePrice(Number(e.target.value) || 0)}
                    className="w-full bg-stone-800 text-white px-3 py-2 rounded-xl text-xs font-bold border border-stone-700"
                  />
                </div>
              </div>

              {/* Métricas del ROI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-800">
                <div className="bg-stone-800/80 p-3 rounded-xl">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">Inversión Total</span>
                  <div className="text-lg font-black text-white mt-0.5">${simulatedInvestmentTotal.toLocaleString('es-CL')}</div>
                </div>

                <div className="bg-stone-800/80 p-3 rounded-xl">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">Capacidad Extra</span>
                  <div className="text-lg font-black text-cyan-400 mt-0.5">+{simulatedAdditionalCapacity} kg <span className="text-[10px] font-normal text-stone-400">(+{simulatedAdditionalDogs} perros)</span></div>
                </div>

                <div className="bg-stone-800/80 p-3 rounded-xl">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">Utilidad Mensual Extra</span>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">+${simulatedAdditionalMonthlyProfit.toLocaleString('es-CL')} / mes</div>
                </div>

                <div className="bg-emerald-950/80 border border-emerald-500/30 p-3 rounded-xl">
                  <span className="text-[10px] text-emerald-300 block font-black uppercase">Plazo Retorno (ROI)</span>
                  <div className="text-xl font-black text-amber-400 mt-0.5">{simulatedRoiMonths} meses</div>
                  <span className="text-[9px] text-emerald-200">¡Se paga sola en ~{Math.round(parseFloat(simulatedRoiMonths) * 30)} días!</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Archivar Costos en Historial */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-black font-header text-stone-800 mb-2">
              Archivar Costos de este Lote en el Historial
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Se guardará el costo actual de <strong>${activeCostPerKg.toLocaleString('es-CL')} / kg</strong> y el margen de <strong>{activeMarginPercent}%</strong> para la línea {activeLine === 'barf' ? 'BARF' : 'Cocinada'}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nota del Proveedor / Factura (Opcional):</label>
                <input
                  type="text"
                  value={historyNote}
                  onChange={(e) => setHistoryNote(e.target.value)}
                  placeholder="Ej: Compra Lo Valledor Factura 5410, subió el cerdo 5%"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingHistory}
                  onClick={handleSaveToHistory}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingHistory ? 'Guardando...' : 'Confirmar y Archivar'}
                </button>
              </div>
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
