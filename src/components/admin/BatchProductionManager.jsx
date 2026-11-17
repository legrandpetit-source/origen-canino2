import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Printer, AlertTriangle, TrendingUp, TrendingDown, Scale, Award, Activity, Search, Link2,
  Send, Copy, Check, RefreshCw, ShoppingBag, Clock, XCircle, CheckCircle2, Trash2, Sparkles, X, Info, ArrowUpRight, ArrowDownRight, Eye
} from 'lucide-react';
import ProductLabelGenerator from './ProductLabelGenerator';


// =========================================================================
// CLASIFICADOR DE INSUMOS BARF (Carnes vs Vegetales vs Suplementos)
// =========================================================================
export const classifyIngredientBARF = (name = '', dbIng = {}) => {
  const n = (name || dbIng.name || '').toLowerCase();

  const animalKeywords = [
    'pollo', 'pavo', 'res', 'vacuno', 'cordero', 'cerdo', 'salmon', 'salmón', 'pescado',
    'carne', 'hueso', 'ala', 'alas', 'truto', 'trutos', 'carcasa', 'carcasas', 'pechuga',
    'corazon', 'corazón', 'pana', 'higado', 'hígado', 'molleja', 'rinon', 'riñón',
    'pulmon', 'pulmón', 'bofe', 'tripa', 'panza', 'grasa', 'posta', 'choro', 'mejillon',
    'mejillón', 'huevo', 'pescuezo', 'cuello', 'garra', 'pata', 'higaditos', 'asadura'
  ];

  const veggieKeywords = [
    'zanahoria', 'zapallo', 'calabaza', 'frutilla', 'fresa', 'manzana', 'pera',
    'arandano', 'arándano', 'acelga', 'espinaca', 'betarraga', 'remolacha', 'apio',
    'perejil', 'brocoli', 'brócoli', 'coliflor', 'pepino', 'fruta', 'verdura',
    'vegetal', 'lechuga', 'kale', 'zucchini', 'repollo'
  ];

  const supplementKeywords = [
    'aceite', 'alga', 'kelp', 'spirulina', 'espirulina', 'curcuma', 'cúrcuma',
    'chia', 'chía', 'linaza', 'vinagre', 'kefir', 'kéfir', 'calcio', 'cascara',
    'cáscara', 'levadura', 'omega', 'jengibre', 'probiotico', 'probiótico'
  ];

  for (const k of animalKeywords) {
    if (n.includes(k)) return 'animal';
  }
  for (const k of veggieKeywords) {
    if (n.includes(k)) return 'vegetal';
  }
  for (const k of supplementKeywords) {
    if (n.includes(k)) return 'suplemento';
  }

  const prot = Number(dbIng.protein_g || 0);
  const fat = Number(dbIng.fat_g || 0);
  if (prot >= 12 || fat >= 10) return 'animal';
  if (prot < 5 && fat < 3) return 'vegetal';

  return 'suplemento';
};

// =========================================================================
// DICTAMEN INTELIGENTE DE CALIDAD BIOLÓGICA & RENTABILIDAD
// =========================================================================
const generateBatchVerdict = ({
  liveNutrition,
  previousBatch,
  costPerKgClp,
  prevCostoKg,
  marginPctLive,
  prevMargenPct,
  barfComposition,
  liveCaPRatio,
  prevCaPRatio
}) => {
  if (!previousBatch) {
    return {
      badge: 'Lote Base / Inicial',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-200',
      title: 'Snapshot Inicial de Producción',
      nutritionNote: `Formulación con ${liveNutrition.proteina.toFixed(1)}% proteína, ${liveNutrition.grasa.toFixed(1)}% grasa y relación Ca:P de ${liveCaPRatio}:1. Establece la línea base para este menú.`,
      financeNote: `Costo inicial calculado en $${costPerKgClp.toLocaleString('es-CL')} / kg con margen proyectado de ${marginPctLive}%.`,
      conclusion: 'Este lote servirá de referencia automática para contrastar costos y mejoras nutricionales en las próximas semanas.'
    };
  }

  const diffProt = Number((liveNutrition.proteina - (previousBatch.proteina_pct || 0)).toFixed(1));
  const diffFat = Number((liveNutrition.grasa - (previousBatch.grasa_pct || 0)).toFixed(1));
  const diffCosto = costPerKgClp - prevCostoKg;
  const ratioNum = parseFloat(liveCaPRatio);

  // 1. Puntos Biológicos
  let nutPoints = [];
  if (diffProt > 0.3) {
    nutPoints.push(`Densidad proteica superior (+${diffProt}% frente al lote anterior).`);
  } else if (diffProt < -0.3) {
    nutPoints.push(`Menor densidad proteica (${diffProt}% frente al lote anterior).`);
  } else {
    nutPoints.push(`Aporte proteico consistente (${liveNutrition.proteina.toFixed(1)}%).`);
  }

  if (ratioNum >= 1.0 && ratioNum <= 1.6) {
    nutPoints.push(`Relación Ca:P ideal (${liveCaPRatio}:1) conforme a estándar AAFCO.`);
  } else if (ratioNum < 1.0) {
    nutPoints.push(`Atención: Calcio bajo respecto al Fósforo (${liveCaPRatio}:1). Conviene revisar aporte de hueso carnoso o cáscara molida.`);
  } else {
    nutPoints.push(`Relación Ca:P alta (${liveCaPRatio}:1).`);
  }

  if (barfComposition.animalPct >= 70 && barfComposition.animalPct <= 85) {
    nutPoints.push(`Macro-proporción BARF óptima (${barfComposition.animalPct.toFixed(0)}% origen animal).`);
  } else if (barfComposition.animalPct < 70) {
    nutPoints.push(`Aporte de carnes bajo el estándar biológico BARF (${barfComposition.animalPct.toFixed(0)}% < 70%).`);
  }

  // 2. Puntos Financieros
  let finPoints = [];
  if (diffCosto > 0) {
    const pctSubida = prevCostoKg > 0 ? ((diffCosto / prevCostoKg) * 100).toFixed(1) : '0';
    finPoints.push(`El costo por kilo aumenta en $${diffCosto.toLocaleString('es-CL')} CLP (+${pctSubida}%).`);
  } else if (diffCosto < 0) {
    const pctAhorro = prevCostoKg > 0 ? ((Math.abs(diffCosto) / prevCostoKg) * 100).toFixed(1) : '0';
    finPoints.push(`Ahorro operativo de $${Math.abs(diffCosto).toLocaleString('es-CL')} CLP por kilo (-${pctAhorro}%).`);
  } else {
    finPoints.push(`Costo unitario idéntico al lote previo ($${costPerKgClp.toLocaleString('es-CL')}/kg).`);
  }

  finPoints.push(`Margen comercial actual: ${marginPctLive}% (Lote anterior: ${prevMargenPct}%).`);

  // 3. Veredicto y Trade-Off
  let verdict = {
    badge: 'Trade-off Equilibrado',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    title: '⭐ Balance Biológico & Comercial',
    conclusion: 'La receta mantiene los parámetros esperados de calidad y rentabilidad comercial.'
  };

  if (diffProt >= 0 && diffCosto <= 0) {
    verdict = {
      badge: 'Doble Victoria Operativa',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      title: '🏆 Optimización Nutricional & Financiera',
      conclusion: 'Lograste reducir o mantener el costo por kilo mientras preservas o incrementas la calidad proteica de la dieta.'
    };
  } else if (diffProt > 0 && diffCosto > 0) {
    verdict = {
      badge: 'Trade-off Recomendado',
      badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
      title: '⭐ Mayor Calidad Biológica con Margen Saludable',
      conclusion: `El costo sube $${diffCosto.toLocaleString('es-CL')} / kg, pero la mayor densidad proteica y calidad de ingredientes lo justifican. El margen de ${marginPctLive}% sigue siendo excelente.`
    };
  } else if (diffProt < 0 && diffCosto < 0) {
    verdict = {
      badge: 'Ahorro con Menor Densidad',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      title: '⚖️ Menor Costo pero Proteína más Baja',
      conclusion: `Ahorras $${Math.abs(diffCosto).toLocaleString('es-CL')} / kg en insumos, pero la proteína cayó ${Math.abs(diffProt)}%. Vigila que no baje del estándar de valor que esperan tus clientes.`
    };
  } else if (diffProt < 0 && diffCosto > 0) {
    verdict = {
      badge: 'Formulación a Revisar',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
      title: '⚠️ Costo Más Alto con Menor Rendimiento Nutricional',
      conclusion: `El kilo producido sube $${diffCosto.toLocaleString('es-CL')} pero el aporte proteico desciende. Conviene revisar los cortes o insumos sustitutos utilizados.`
    };
  }

  return {
    ...verdict,
    nutritionNote: nutPoints.join(' '),
    financeNote: finPoints.join(' ')
  };
};

const BatchProductionManager = ({ products = [], ingredients = [], onIngredientsUpdated }) => {
  const [subTab, setSubTab] = useState('batches'); // 'batches' | 'demand' | 'recall' | 'links'
  const [batches, setBatches] = useState([]);
  const [demandData, setDemandData] = useState(null);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Form Crear Batch
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineaProduccion, setLineaProduccion] = useState('BARF');
  const [fechaElab, setFechaElab] = useState(() => new Date().toISOString().slice(0, 10));
  const [pesoCrudoKg, setPesoCrudoKg] = useState('20');
  const [stockInicialKg, setStockInicialKg] = useState('20');
  const [indirectCosts, setIndirectCosts] = useState({
    luz_clp: 0,
    gas_clp: 0,
    agua_clp: 0,
    envases_clp: 0,
    mano_obra_clp: 0,
  });
  const [batchNotas, setBatchNotas] = useState('');
  const [formulaRows, setFormulaRows] = useState([]);
  const [waitlistForCreated, setWaitlistForCreated] = useState([]);

  // Etiqueta Dinámica del Lote
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [activeBatchLabel, setActiveBatchLabel] = useState(null);
  const [viewingBatch, setViewingBatch] = useState(null);

  // Modal Crear Nuevo Ingrediente en Catálogo sin perder el lote
  const [newIngModalOpen, setNewIngModalOpen] = useState(false);
  const [newIngEstimating, setNewIngEstimating] = useState(false);
  const [newIngSaving, setNewIngSaving] = useState(false);
  const [newIngForm, setNewIngForm] = useState({
    name: '',
    cost_per_unit: 0,
    unit: 'kg',
    kcal_per_100g: 0,
    protein_g: 0,
    fat_g: 0,
    fiber_g: 0,
    moisture_g: 0,
    ash_g: 0,
    carbs_g: 0,
    calcium_g: 0,
    phosphorus_g: 0,
    micronutrients: [],
  });

  // Recall Search
  const [recallCode, setRecallCode] = useState('');
  const [recallResult, setRecallResult] = useState(null);
  const [recallError, setRecallError] = useState('');

  // Direct Payment Link Form
  const [linkMode, setLinkMode] = useState('post_delivery_order');
  const [linkOrderId, setLinkOrderId] = useState('');
  const [linkCustName, setLinkCustName] = useState('');
  const [linkCustPhone, setLinkCustPhone] = useState('');
  const [linkCustEmail, setLinkCustEmail] = useState('');
  const [linkItems, setLinkItems] = useState([{ product_id: '', quantity: 1 }]);
  const [linkNotes, setLinkNotes] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/batches', { headers: authHeaders() });
      if (res.ok) setBatches(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDemand = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/demand-projection', { headers: authHeaders() });
      if (res.ok) setDemandData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-links', { headers: authHeaders() });
      if (res.ok) setPaymentLinks(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'batches') fetchBatches();
    if (subTab === 'demand') fetchDemand();
    if (subTab === 'links') fetchPaymentLinks();
  }, [subTab, fetchBatches, fetchDemand, fetchPaymentLinks]);

  const handleSelectProductForBatch = async (pid) => {
    setSelectedProductId(pid);
    if (!pid) {
      setFormulaRows([]);
      return;
    }
    const prod = products.find((p) => String(p.id) === String(pid));
    if (prod) {
      setLineaProduccion(String(prod.type || '').toLowerCase().includes('coc') ? 'COCIDO' : 'BARF');
    }
    try {
      const res = await fetch(`/api/admin/products/${pid}/recipe`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const rawKg = parseFloat(pesoCrudoKg) || 20;
        const rows = (data || []).map((r) => {
          const pct = Number(r.percentage || 0);
          const kg = Number(((rawKg * pct) / 100).toFixed(2));
          return {
            ingrediente_id: r.ingredient_id,
            nombre_ingrediente: r.name,
            kilos_usados: kg,
            porcentaje_formula: pct,
            cantidad_gramos: Math.round(kg * 1000),
            costo_unitario_clp: Number(r.cost_per_unit || 0),
          };
        });
        setFormulaRows(rows);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const recalcFromKilos = (rows) => {
    const totalKg = rows.reduce((s, r) => s + (parseFloat(r.kilos_usados) || 0), 0);
    if (totalKg > 0) {
      setPesoCrudoKg(String(Number(totalKg.toFixed(2))));
    }
    return rows.map((r) => {
      const kg = parseFloat(r.kilos_usados) || 0;
      return {
        ...r,
        cantidad_gramos: Math.round(kg * 1000),
        porcentaje_formula: totalKg > 0 ? Number(((kg / totalKg) * 100).toFixed(2)) : 0,
      };
    });
  };

  const pctTotal = formulaRows.reduce((s, r) => s + (parseFloat(r.porcentaje_formula) || 0), 0);
  const totalKilosIngredientes = formulaRows.reduce((s, r) => s + (parseFloat(r.kilos_usados) || 0), 0);
  const rawGramsNum = Math.round((totalKilosIngredientes > 0 ? totalKilosIngredientes : (parseFloat(pesoCrudoKg) || 0)) * 1000);
  const packGramsNum = Math.round((parseFloat(stockInicialKg) || 0) * 1000);
  const mermaPct = rawGramsNum > packGramsNum && rawGramsNum > 0
    ? (((rawGramsNum - packGramsNum) / rawGramsNum) * 100).toFixed(1)
    : '0.0';

  const handleCopyLastBatchRecipe = () => {
    let prevBatch = null;
    if (selectedProductId) {
      prevBatch = batches.find((b) => String(b.producto_id) === String(selectedProductId));
    }
    // Si no se ha seleccionado producto, o el seleccionado no tiene lote previo, tomar el último lote registrado
    if (!prevBatch && batches.length > 0) {
      prevBatch = batches[0];
    }

    if (!prevBatch) {
      showToast('No hay lotes previos registrados en el historial para copiar.');
      return;
    }

    if (prevBatch.producto_id) {
      setSelectedProductId(String(prevBatch.producto_id));
    }
    if (prevBatch.linea_produccion) {
      setLineaProduccion(prevBatch.linea_produccion);
    }
    if (prevBatch.peso_crudo_total_gramos) {
      setPesoCrudoKg(String(Number((prevBatch.peso_crudo_total_gramos / 1000).toFixed(2))));
    }
    if (prevBatch.stock_inicial_gramos) {
      setStockInicialKg(String(Number((prevBatch.stock_inicial_gramos / 1000).toFixed(2))));
    }
    if (prevBatch.indirect_costs_json) {
      try {
        const ic = typeof prevBatch.indirect_costs_json === 'string'
          ? JSON.parse(prevBatch.indirect_costs_json)
          : prevBatch.indirect_costs_json;
        setIndirectCosts({
          luz_clp: parseInt(ic.luz || ic.luz_clp || 0, 10),
          gas_clp: parseInt(ic.gas || ic.gas_clp || 0, 10),
          agua_clp: parseInt(ic.agua || ic.agua_clp || 0, 10),
          envases_clp: parseInt(ic.envases || ic.envases_clp || 0, 10),
          mano_obra_clp: parseInt(ic.mano_obra || ic.mano_obra_clp || 0, 10),
        });
      } catch (e) {
        console.error('Error parsing indirect costs:', e);
      }
    }

    if (prevBatch.ingredientes?.length) {
      const rows = prevBatch.ingredientes.map((i) => {
        const kg = Number((Number(i.cantidad_gramos || 0) / 1000).toFixed(2));
        return {
          ingrediente_id: i.ingrediente_id || '',
          nombre_ingrediente: i.nombre_ingrediente,
          kilos_usados: kg,
          porcentaje_formula: Number(i.porcentaje_formula || 0),
          cantidad_gramos: Math.round(kg * 1000),
          costo_unitario_clp: Number(i.costo_unitario_clp || 0),
        };
      });
      setFormulaRows(recalcFromKilos(rows));
    }

    showToast(`Receta y parámetros cargados desde lote ${prevBatch.codigo_lote} (${prevBatch.producto_nombre || 'Menú'}).`);
  };

  // Simulación Nutricional y Financiera en Vivo
  const ingMap = Object.fromEntries(ingredients.map((i) => [String(i.id), i]));
  const concentrationFactor =
    rawGramsNum > packGramsNum && packGramsNum > 0
      ? Math.min(1.45, rawGramsNum / packGramsNum)
      : 1.0;

  const liveNutrition = formulaRows.reduce(
    (acc, r) => {
      const dbIng = ingMap[String(r.ingrediente_id)] || {};
      const w = (parseFloat(r.porcentaje_formula) || 0) / 100;
      acc.proteina += Number(dbIng.protein_g || 0) * w * concentrationFactor;
      acc.grasa += Number(dbIng.fat_g || 0) * w * concentrationFactor;
      acc.fibra += Number(dbIng.fiber_g || 0) * w * concentrationFactor;
      acc.humedad += Number(dbIng.moisture_g || 0) * w;
      acc.cenizas += Number(dbIng.ash_g || 0) * w * concentrationFactor;
      acc.carbs += Number(dbIng.carbs_g || 0) * w * concentrationFactor;
      acc.calcio += Number(dbIng.calcium_g || 0) * w * concentrationFactor;
      acc.fosforo += Number(dbIng.phosphorus_g || 0) * w * concentrationFactor;
      acc.kcal += Number(dbIng.kcal_per_100g || 0) * w * concentrationFactor;
      const micros = Array.isArray(dbIng.micronutrients) ? dbIng.micronutrients : [];
      micros.forEach((m) => {
        if (!m?.name) return;
        const key = `${String(m.name).trim().toLowerCase()}|${String(m.unit || '').trim().toLowerCase()}`;
        const amt = Number(m.amount || 0) * w * concentrationFactor;
        if (!acc.microMap[key]) {
          acc.microMap[key] = {
            name: String(m.name).trim(),
            amount: 0,
            unit: String(m.unit || '').trim(),
            highlight: String(m.highlight || '').trim(),
          };
        }
        acc.microMap[key].amount += amt;
      });
      return acc;
    },
    { proteina: 0, grasa: 0, fibra: 0, humedad: 0, cenizas: 0, carbs: 0, calcio: 0, fosforo: 0, kcal: 0, microMap: {} }
  );
  const liveMicronutrients = Object.values(liveNutrition.microMap || {})
    .map((m) => ({ ...m, amount: Number(m.amount.toFixed(2)) }))
    .filter((m) => m.amount > 0 || m.highlight)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);

  const ingredientsCostClp = Math.round(
    formulaRows.reduce(
      (sum, r) => sum + (Number(r.cantidad_gramos || 0) / 1000) * Number(r.costo_unitario_clp || 0),
      0
    )
  );
  const indirectTotalClp = Object.values(indirectCosts).reduce((s, v) => s + (parseInt(v || 0, 10) || 0), 0);
  const totalBatchCostClp = ingredientsCostClp + indirectTotalClp;
  const stockKgNum = packGramsNum / 1000;
  const costPerKgClp = stockKgNum > 0 ? Math.round(totalBatchCostClp / stockKgNum) : 0;
  const selectedProd = products.find((p) => String(p.id) === String(selectedProductId));
  const pvpPerKgClp = selectedProd ? Number(selectedProd.price || 0) : 0;
  const marginPerKgClp = pvpPerKgClp - costPerKgClp;
  const marginPctLive = pvpPerKgClp > 0 ? ((marginPerKgClp / pvpPerKgClp) * 100).toFixed(1) : '0.0';

  // Lote Anterior para Comparación Automática
  const previousBatch = batches.find((b) => String(b.producto_id) === String(selectedProductId));
  const prevCostoKg = previousBatch
    ? Number(previousBatch.costo_unitario_kg_clp || 0) ||
      (previousBatch.stock_inicial_gramos > 0
        ? Math.round(Number(previousBatch.costo_total_batch_clp || 0) / (previousBatch.stock_inicial_gramos / 1000))
        : 0)
    : 0;
  const prevMargenPct = previousBatch && pvpPerKgClp > 0
    ? (((pvpPerKgClp - prevCostoKg) / pvpPerKgClp) * 100).toFixed(1)
    : '0.0';

  const liveCaPRatio = liveNutrition.fosforo > 0 ? (liveNutrition.calcio / liveNutrition.fosforo).toFixed(2) : '0.00';
  const prevCaPRatio = previousBatch && Number(previousBatch.fosforo_pct || 0) > 0
    ? (Number(previousBatch.calcio_pct || 0) / Number(previousBatch.fosforo_pct || 0)).toFixed(2)
    : '0.00';

  // Macro-Composición BARF en Vivo
  const barfComposition = formulaRows.reduce(
    (acc, r) => {
      const dbIng = ingMap[String(r.ingrediente_id)] || {};
      const cat = classifyIngredientBARF(r.nombre_ingrediente, dbIng);
      const kg = parseFloat(r.kilos_usados) || 0;
      const pct = parseFloat(r.porcentaje_formula) || 0;
      if (cat === 'animal') {
        acc.animalKg += kg;
        acc.animalPct += pct;
      } else if (cat === 'vegetal') {
        acc.vegetalKg += kg;
        acc.vegetalPct += pct;
      } else {
        acc.suplementoKg += kg;
        acc.suplementoPct += pct;
      }
      return acc;
    },
    { animalKg: 0, animalPct: 0, vegetalKg: 0, vegetalPct: 0, suplementoKg: 0, suplementoPct: 0 }
  );

  // Dictamen Holístico de Calidad y Rentabilidad
  const batchVerdict = generateBatchVerdict({
    liveNutrition,
    previousBatch,
    costPerKgClp,
    prevCostoKg,
    marginPctLive,
    prevMargenPct,
    barfComposition,
    liveCaPRatio,
    prevCaPRatio
  });

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!selectedProductId || formulaRows.length === 0) {
      showToast('Selecciona un producto y al menos 1 ingrediente.');
      return;
    }
    if (Math.abs(pctTotal - 100) > 1.5) {
      showToast(`Los porcentajes deben sumar 100% (actual: ${pctTotal.toFixed(1)}%).`);
      return;
    }
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          producto_id: Number(selectedProductId),
          linea_produccion: lineaProduccion,
          fecha_elaboracion: fechaElab,
          peso_crudo_total_gramos: rawGramsNum,
          stock_inicial_gramos: packGramsNum,
          extra_cost_clp: indirectTotalClp,
          indirect_costs: indirectCosts,
          notas: batchNotas || null,
          ingredientes: formulaRows.map((r) => ({
            ingrediente_id: r.ingrediente_id ? Number(r.ingrediente_id) : null,
            nombre_ingrediente: r.nombre_ingrediente,
            cantidad_gramos: Number(r.cantidad_gramos),
            porcentaje_formula: Number(r.porcentaje_formula),
            costo_unitario_clp: Number(r.costo_unitario_clp || 0),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error creando lote.');
      showToast(`Lote ${data.codigo_lote} creado, stock FIFO cargado e historial de precios actualizado.`);
      fetchBatches();
      if (onIngredientsUpdated) onIngredientsUpdated();
      if (data.waitlist_pending > 0) {
        const wRes = await fetch(`/api/admin/waitlist/${selectedProductId}`, { headers: authHeaders() });
        if (wRes.ok) setWaitlistForCreated(await wRes.json());
      } else {
        setWaitlistForCreated([]);
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleToggleBatchStatus = async (batch) => {
    const nextEstado = batch.estado === 'ACTIVO' ? 'CERRADO' : 'ACTIVO';
    const res = await fetch(`/api/admin/batches/${batch.id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ estado: nextEstado }),
    });
    if (res.ok) {
      showToast(`Lote ${batch.codigo_lote} marcado como ${nextEstado}.`);
      fetchBatches();
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (!window.confirm(`¿Estás seguro de eliminar el lote ${batch.codigo_lote} (${batch.producto_nombre})? Esta acción borrará este lote y su stock FIFO asociado para que puedas crearlo nuevamente.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error eliminando el lote.');
      showToast(`Lote ${batch.codigo_lote} eliminado correctamente.`);
      fetchBatches();
      if (onIngredientsUpdated) onIngredientsUpdated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleOpenBatchLabel = async (batchId) => {
    const res = await fetch(`/api/admin/batches/${batchId}/label`, { headers: authHeaders() });
    if (res.ok) {
      setActiveBatchLabel(await res.json());
      setLabelModalOpen(true);
    }
  };

  const handleSyncOrders = async () => {
    try {
      const res = await fetch('/api/admin/batches/sync-orders', {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error sincronizando pedidos.');
      if (data.synced_count > 0) {
        showToast(`Se descontaron exitosamente ${data.synced_count} pedido(s) del stock FIFO.`);
      } else {
        showToast('Todos los pedidos ya se encuentran sincronizados con los lotes.');
      }
      fetchBatches();
      if (onIngredientsUpdated) onIngredientsUpdated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleEstimateNewIngredientNutrition = async () => {
    if (!newIngForm.name.trim()) {
      showToast('Escribe primero el nombre del ingrediente.');
      return;
    }
    try {
      setNewIngEstimating(true);
      const res = await fetch('/api/ingredients/estimate-nutrition', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ingredient_name: newIngForm.name.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewIngForm((prev) => ({
          ...prev,
          kcal_per_100g: Number(data.kcal_per_100g || 0),
          protein_g: Number(data.protein_g || 0),
          fat_g: Number(data.fat_g || 0),
          fiber_g: Number(data.fiber_g || 0),
          moisture_g: Number(data.moisture_g || 0),
          ash_g: Number(data.ash_g || 0),
          carbs_g: Number(data.carbs_g || 0),
          calcium_g: Number(data.calcium_g || 0),
          phosphorus_g: Number(data.phosphorus_g || 0),
          micronutrients: Array.isArray(data.micronutrients) ? data.micronutrients : [],
        }));
      } else {
        showToast('No se pudo estimar con IA; puedes ingresar los valores manuales.');
      }
    } finally {
      setNewIngEstimating(false);
    }
  };

  const handleSaveNewIngredient = async (e) => {
    e.preventDefault();
    if (!newIngForm.name.trim()) return;
    try {
      setNewIngSaving(true);
      const res = await fetch('/api/admin/ingredients', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...newIngForm,
          name: newIngForm.name.trim(),
          cost_per_unit: parseInt(newIngForm.cost_per_unit || '0', 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error creando ingrediente.');

      if (onIngredientsUpdated) await onIngredientsUpdated();

      setFormulaRows((prev) =>
        recalcFromKilos([
          ...prev,
          {
            ingrediente_id: data.id,
            nombre_ingrediente: newIngForm.name.trim(),
            kilos_usados: 1,
            porcentaje_formula: 0,
            cantidad_gramos: 1000,
            costo_unitario_clp: parseInt(newIngForm.cost_per_unit || '0', 10),
          },
        ])
      );

      showToast(`Ingrediente "${newIngForm.name.trim()}" creado y agregado a este lote.`);
      setNewIngModalOpen(false);
      setNewIngForm({
        name: '',
        cost_per_unit: 0,
        unit: 'kg',
        kcal_per_100g: 0,
        protein_g: 0,
        fat_g: 0,
        fiber_g: 0,
        moisture_g: 0,
        ash_g: 0,
        carbs_g: 0,
        calcium_g: 0,
        phosphorus_g: 0,
        micronutrients: [],
      });
    } catch (err) {
      showToast(err.message);
    } finally {
      setNewIngSaving(false);
    }
  };

  const handleRecallSearch = async (e) => {
    e.preventDefault();
    if (!recallCode.trim()) return;
    setRecallError('');
    setRecallResult(null);
    const res = await fetch(`/api/admin/batches/recall/${encodeURIComponent(recallCode.trim())}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      setRecallError(data.detail || 'Lote no encontrado.');
    } else {
      setRecallResult(data);
    }
  };

  const handleCreatePaymentLink = async (e) => {
    e.preventDefault();
    const cleanItems = linkItems
      .filter((i) => i.product_id && i.quantity > 0)
      .map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) }));

    const body = {
      mode: linkMode,
      order_id: linkMode === 'post_delivery_order' && linkOrderId ? Number(linkOrderId) : null,
      customer_name: linkCustName || null,
      customer_phone: linkCustPhone || null,
      customer_email: linkCustEmail || null,
      items: cleanItems,
      notes: linkNotes || null,
      mark_delivered_now: linkMode === 'post_delivery_order' && !linkOrderId,
    };
    const res = await fetch('/api/admin/payment-links', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || 'Error creando link de pago.');
      return;
    }
    showToast(`Link generado: ${window.location.origin}${data.url_path}`);
    setLinkOrderId('');
    setLinkNotes('');
    fetchPaymentLinks();
  };

  const copyLinkUrl = (token) => {
    const url = `${window.location.origin}/pagar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2500);
  };

  const buildWaUrl = (phone, text) => {
    const clean = String(phone || '').replace(/\D/g, '');
    const withPrefix = clean.startsWith('56') ? clean : `56${clean}`;
    return `https://wa.me/${withPrefix}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center justify-between">
          <span>{toast}</span>
        </div>
      )}

      {/* Sub-navegación */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-xs">
        {[
          { id: 'batches', label: 'Lotes Semanales & FIFO', icon: Layers },
          { id: 'demand', label: 'Demanda, Alertas $30k & BOM', icon: TrendingUp },
          { id: 'recall', label: 'Trazabilidad / Recall', icon: Search },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                active
                  ? 'bg-primary-green text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: LOTES SEMANALES */}
      {subTab === 'batches' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateBatch} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-secondary-brown">
                  Registrar Nuevo Lote Semanal (Snapshot Inmutable)
                </h2>
                <p className="text-xs text-stone-500">
                  Precarga la receta base, ajusta ingredientes de estación y congela stock FIFO, nutrición y costos.
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full tabular-nums">
                Merma calculada: {mermaPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-stone-600 block mb-1">Producto / Menú</label>
                <div className="flex gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleSelectProductForBatch(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800"
                    required
                  >
                    <option value="">-- Seleccionar Menú --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.weight})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCopyLastBatchRecipe}
                    className="px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-bold text-stone-800 hover:text-stone-900 shrink-0 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Copiar ingredientes, kilos y costos del último lote registrado"
                  >
                    <Copy size={13} className="text-stone-600" />
                    Copiar Último Lote
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Línea</label>
                <select
                  value={lineaProduccion}
                  onChange={(e) => setLineaProduccion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800"
                >
                  <option value="BARF">BARF (180 días)</option>
                  <option value="COCIDO">COCIDO (120 días)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Fecha Elaboración</label>
                <input
                  type="date"
                  value={fechaElab}
                  onChange={(e) => setFechaElab(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800 tabular-nums"
                  required
                />
              </div>
            </div>

            {/* Desglose de Costos Indirectos de Cocina */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block tabular-nums">
                Costos Indirectos del Lote (CLP) — Total: ${indirectTotalClp.toLocaleString('es-CL')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { key: 'luz_clp', label: 'Luz / Electricidad' },
                  { key: 'gas_clp', label: 'Gas (Cocción)' },
                  { key: 'agua_clp', label: 'Agua / Aseo' },
                  { key: 'envases_clp', label: 'Envases y Etiquetas' },
                  { key: 'mano_obra_clp', label: 'Mano de Obra / Otros' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-stone-500 block mb-1">{field.label}</label>
                    <input
                      type="number"
                      min="0"
                      value={indirectCosts[field.key]}
                      onChange={(e) => setIndirectCosts({ ...indirectCosts, [field.key]: parseInt(e.target.value || '0', 10) })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800 tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">
                  Peso Crudo Total (Suma Ingredientes)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={totalKilosIngredientes > 0 ? totalKilosIngredientes.toFixed(2) : pesoCrudoKg}
                  onChange={(e) => setPesoCrudoKg(e.target.value)}
                  readOnly={totalKilosIngredientes > 0}
                  className={`w-full px-3 py-2 rounded-xl border border-stone-300 text-xs tabular-nums ${totalKilosIngredientes > 0 ? 'bg-stone-100 text-stone-700 font-semibold' : 'bg-white text-stone-800'}`}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Stock Final Envasado Vendible (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={stockInicialKg}
                  onChange={(e) => setStockInicialKg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800 tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Notas de Producción / Sustituciones</label>
                <input
                  type="text"
                  placeholder="Ej. Manzana sustituida por frutilla de estación"
                  value={batchNotas}
                  onChange={(e) => setBatchNotas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800"
                />
              </div>
            </div>

            {/* Tabla editable de ingredientes del batch (por KILOS reales) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 tabular-nums">
                  Ingredientes Reales Usados — Total: <strong className="text-secondary-brown">{totalKilosIngredientes.toFixed(2)} kg</strong> ({pctTotal.toFixed(0)}%)
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewIngModalOpen(true)}
                    className="text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                  >
                    <Plus size={14} /> Crear Nuevo Ingrediente
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormulaRows([...formulaRows, { ingrediente_id: '', nombre_ingrediente: '', kilos_usados: 1, porcentaje_formula: 0, cantidad_gramos: 1000, costo_unitario_clp: 0 }])}
                    className="text-xs font-bold text-primary-green hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Agregar otro ingrediente
                  </button>
                </div>
              </div>

              {/* PASO 1: Barra y Badges de Macro-Composición BARF en Vivo */}
              {formulaRows.length > 0 && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Scale size={14} className="text-stone-500" />
                        Macro-Composición BARF:
                      </span>
                      {barfComposition.animalPct >= 70 && barfComposition.animalPct <= 85 ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          ✓ Ratio BARF Equilibrado (70-85%)
                        </span>
                      ) : barfComposition.animalPct < 70 ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⚠️ Bajo en Carnes/Vísceras (&lt;70%)
                        </span>
                      ) : (
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          ℹ️ Alto en Carnes (&gt;85%)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono hidden sm:inline">
                      Estándar Biológico: 70-80% Animal • 15-25% Vegetal • 2-5% Suplementos
                    </span>
                  </div>

                  {/* Barra segmentada */}
                  <div className="h-3 w-full bg-stone-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, barfComposition.animalPct))}%` }}
                      className="bg-rose-500 transition-all duration-300"
                      title={`Carnes, Hueso & Vísceras: ${barfComposition.animalPct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, barfComposition.vegetalPct))}%` }}
                      className="bg-emerald-500 transition-all duration-300"
                      title={`Frutas & Verduras: ${barfComposition.vegetalPct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, barfComposition.suplementoPct))}%` }}
                      className="bg-indigo-500 transition-all duration-300"
                      title={`Suplementos & Otros: ${barfComposition.suplementoPct.toFixed(1)}%`}
                    />
                  </div>

                  {/* 3 Badges de Resumen */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-rose-200 flex items-center justify-between">
                      <span className="text-stone-600 font-medium flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        🥩 Carnes, Hueso & Vísceras
                      </span>
                      <strong className="text-rose-700 font-bold tabular-nums">
                        {barfComposition.animalPct.toFixed(1)}% ({barfComposition.animalKg.toFixed(1)} kg)
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span className="text-stone-600 font-medium flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        🥦 Frutas & Verduras
                      </span>
                      <strong className="text-emerald-700 font-bold tabular-nums">
                        {barfComposition.vegetalPct.toFixed(1)}% ({barfComposition.vegetalKg.toFixed(1)} kg)
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-indigo-200 flex items-center justify-between">
                      <span className="text-stone-600 font-medium flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        💊 Suplementos & Otros
                      </span>
                      <strong className="text-indigo-700 font-bold tabular-nums">
                        {barfComposition.suplementoPct.toFixed(1)}% ({barfComposition.suplementoKg.toFixed(1)} kg)
                      </strong>
                    </div>
                  </div>
                </div>
              )}
              {formulaRows.length > 0 && (
                <div className="grid grid-cols-12 gap-2 px-2.5 text-xs font-semibold text-stone-500">
                  <div className="col-span-5">Ingrediente</div>
                  <div className="col-span-2 text-right">Kilos (Kg)</div>
                  <div className="col-span-2 text-right">% Fórmula</div>
                  <div className="col-span-2 text-right">Precio / Kg</div>
                  <div className="col-span-1"></div>
                </div>
              )}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {formulaRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-2 rounded-xl border border-stone-200">
                    <div className="col-span-5">
                      <select
                        value={row.ingrediente_id || ''}
                        onChange={(e) => {
                          const ing = ingredients.find((i) => String(i.id) === e.target.value);
                          const copy = [...formulaRows];
                          copy[idx] = {
                            ...copy[idx],
                            ingrediente_id: ing ? ing.id : '',
                            nombre_ingrediente: ing ? ing.name : copy[idx].nombre_ingrediente,
                            costo_unitario_clp: ing ? ing.cost_per_unit : 0,
                          };
                          setFormulaRows(recalcFromKilos(copy));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white text-stone-800"
                      >
                        <option value="">{row.nombre_ingrediente || '-- Ingrediente --'}</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name} (${ing.cost_per_unit}/{ing.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.kilos_usados ?? 0}
                        onChange={(e) => {
                          const copy = [...formulaRows];
                          copy[idx].kilos_usados = parseFloat(e.target.value) || 0;
                          setFormulaRows(recalcFromKilos(copy));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-right tabular-nums bg-white font-semibold text-stone-800"
                        title="Kilos usados de este ingrediente"
                      />
                    </div>
                    <div className="col-span-2 text-xs tabular-nums text-right text-stone-600 font-semibold">
                      {Number(row.porcentaje_formula || 0).toFixed(1)}%
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={row.costo_unitario_clp || 0}
                        onChange={(e) => {
                          const copy = [...formulaRows];
                          copy[idx].costo_unitario_clp = parseInt(e.target.value || '0', 10);
                          setFormulaRows(copy);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-right tabular-nums bg-white text-stone-800"
                        title="Costo CLP por Kg de esta semana"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => setFormulaRows(recalcFromKilos(formulaRows.filter((_, i) => i !== idx)))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFormulaRows(recalcFromKilos([...formulaRows, { ingrediente_id: '', nombre_ingrediente: '', kilos_usados: 1, porcentaje_formula: 0, cantidad_gramos: 1000, costo_unitario_clp: 0 }]))}
                className="w-full py-2 rounded-xl border border-dashed border-stone-300 text-xs font-bold text-primary-green hover:bg-stone-50 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Agregar otro ingrediente a esta receta
              </button>
            </div>

            {/* Simulación en Vivo: Nutrición y Rentabilidad del Lote */}
            {formulaRows.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                    Tabla Nutricional Recalculada en Vivo (por 100g)
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Energía</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{Math.round(liveNutrition.kcal)} kcal</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Proteína</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.proteina.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Grasa</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.grasa.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Fibra</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.fibra.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Humedad</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.humedad.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Cenizas</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.cenizas.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Carboh.</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.carbs.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Calcio</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.calcio.toFixed(2)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Fósforo</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">{liveNutrition.fosforo.toFixed(2)}%</strong>
                    </div>
                  </div>
                  {liveMicronutrients.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-emerald-200/70">
                      <span className="text-xs font-semibold text-emerald-900 block mb-1.5">
                        Micronutrientes & Bioactivos Destacados (por 100g)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {liveMicronutrients.map((m, idx) => (
                          <span
                            key={idx}
                            title={m.highlight || ''}
                            className="text-xs bg-white text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full tabular-nums"
                          >
                            <strong>{m.name}:</strong> {m.amount} {m.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                    Rentabilidad Real del Lote (Ingredientes + Indirectos)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Ingredientes</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">${ingredientsCostClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Indirectos</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">${indirectTotalClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Costo Total Lote</span>
                      <strong className="text-xs font-bold tabular-nums text-secondary-brown">${totalBatchCostClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Costo Real / Kg</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">${costPerKgClp.toLocaleString('es-CL')}/kg</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">PVP Menú</span>
                      <strong className="text-xs font-bold tabular-nums text-stone-900">${pvpPerKgClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-xs text-stone-500 block">Margen Bruto</span>
                      <strong className={`text-xs font-bold tabular-nums ${marginPerKgClp >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        ${marginPerKgClp.toLocaleString('es-CL')} ({marginPctLive}%)
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASO 2: Comparativa Dinámica: Lote en Curso vs Último Lote Registrado */}
              {previousBatch ? (
                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                        <Activity size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                          Comparativa Dinámica: Lote Actual vs. Último Lote
                          <span className="bg-stone-100 text-stone-700 font-mono text-[11px] px-2 py-0.5 rounded-md border border-stone-200">
                            {previousBatch.codigo_lote} ({previousBatch.fecha_elaboracion})
                          </span>
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Contraste unitario de densidad nutricional (por 100g) y rentabilidad real por kilo frente a la última producción.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Tabla Nutricional Comparativa */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                        Diferencias Nutricionales (Base Tal Cual)
                      </span>
                      <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-stone-50 text-[11px] text-stone-500 font-semibold border-b border-stone-200">
                            <tr>
                              <th className="p-2">Nutriente</th>
                              <th className="p-2 text-right">Lote Anterior</th>
                              <th className="p-2 text-right">Lote Actual</th>
                              <th className="p-2 text-right">Variación (Δ)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-stone-800">
                            <tr>
                              <td className="p-2 font-medium">Proteína Cruda</td>
                              <td className="p-2 text-right font-mono">{(previousBatch.proteina_pct || 0).toFixed(1)}%</td>
                              <td className="p-2 text-right font-mono font-bold">{liveNutrition.proteina.toFixed(1)}%</td>
                              <td className="p-2 text-right font-mono">
                                {(() => {
                                  const diff = Number((liveNutrition.proteina - (previousBatch.proteina_pct || 0)).toFixed(1));
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[11px] ${diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {diff >= 0 ? `+${diff}%` : `${diff}%`}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Grasa Cruda</td>
                              <td className="p-2 text-right font-mono">{(previousBatch.grasa_pct || 0).toFixed(1)}%</td>
                              <td className="p-2 text-right font-mono font-bold">{liveNutrition.grasa.toFixed(1)}%</td>
                              <td className="p-2 text-right font-mono">
                                {(() => {
                                  const diff = Number((liveNutrition.grasa - (previousBatch.grasa_pct || 0)).toFixed(1));
                                  return (
                                    <span className="inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[11px] bg-stone-100 text-stone-700">
                                      {diff >= 0 ? `+${diff}%` : `${diff}%`}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Calcio / Fósforo</td>
                              <td className="p-2 text-right font-mono">
                                {(previousBatch.calcio_pct || 0).toFixed(2)}% / {(previousBatch.fosforo_pct || 0).toFixed(2)}%
                              </td>
                              <td className="p-2 text-right font-mono font-bold">
                                {liveNutrition.calcio.toFixed(2)}% / {liveNutrition.fosforo.toFixed(2)}%
                              </td>
                              <td className="p-2 text-right font-mono">
                                <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px] ${parseFloat(liveCaPRatio) >= 1.0 && parseFloat(liveCaPRatio) <= 1.6 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  Ca:P {liveCaPRatio}:1
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Humedad / Agua</td>
                              <td className="p-2 text-right font-mono">{(previousBatch.humedad_pct || 0).toFixed(1)}%</td>
                              <td className="p-2 text-right font-mono font-bold">{liveNutrition.humedad.toFixed(1)}%</td>
                              <td className="p-2 text-right font-mono text-[11px] text-stone-500">
                                {Number((liveNutrition.humedad - (previousBatch.humedad_pct || 0)).toFixed(1)) >= 0 ? `+${(liveNutrition.humedad - (previousBatch.humedad_pct || 0)).toFixed(1)}%` : `${(liveNutrition.humedad - (previousBatch.humedad_pct || 0)).toFixed(1)}%`}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Energía (Kcal/100g)</td>
                              <td className="p-2 text-right font-mono">{Math.round(previousBatch.kcal_100g || 0)} kcal</td>
                              <td className="p-2 text-right font-mono font-bold">{Math.round(liveNutrition.kcal)} kcal</td>
                              <td className="p-2 text-right font-mono text-[11px] text-stone-500">
                                {Math.round(liveNutrition.kcal - (previousBatch.kcal_100g || 0)) >= 0 ? `+${Math.round(liveNutrition.kcal - (previousBatch.kcal_100g || 0))} kcal` : `${Math.round(liveNutrition.kcal - (previousBatch.kcal_100g || 0))} kcal`}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tabla de Rentabilidad Comparativa */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                        Diferencias de Costos & Margen
                      </span>
                      <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-stone-50 text-[11px] text-stone-500 font-semibold border-b border-stone-200">
                            <tr>
                              <th className="p-2">Concepto</th>
                              <th className="p-2 text-right">Lote Anterior</th>
                              <th className="p-2 text-right">Lote Actual</th>
                              <th className="p-2 text-right">Impacto (Δ)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-stone-800">
                            <tr>
                              <td className="p-2 font-medium">Costo Real / Kg</td>
                              <td className="p-2 text-right font-mono">${prevCostoKg.toLocaleString('es-CL')}</td>
                              <td className="p-2 text-right font-mono font-bold">${costPerKgClp.toLocaleString('es-CL')}</td>
                              <td className="p-2 text-right font-mono">
                                {(() => {
                                  const diff = costPerKgClp - prevCostoKg;
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[11px] ${diff <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {diff <= 0 ? `-$${Math.abs(diff).toLocaleString('es-CL')}` : `+$${diff.toLocaleString('es-CL')}`}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Margen Bruto (%)</td>
                              <td className="p-2 text-right font-mono">{prevMargenPct}%</td>
                              <td className="p-2 text-right font-mono font-bold">{marginPctLive}%</td>
                              <td className="p-2 text-right font-mono">
                                {(() => {
                                  const diff = Number((parseFloat(marginPctLive) - parseFloat(prevMargenPct)).toFixed(1));
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[11px] ${diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}`}>
                                      {diff >= 0 ? `+${diff}%` : `${diff}%`}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Margen / Kg ($)</td>
                              <td className="p-2 text-right font-mono">${(pvpPerKgClp - prevCostoKg).toLocaleString('es-CL')}</td>
                              <td className="p-2 text-right font-mono font-bold">${marginPerKgClp.toLocaleString('es-CL')}</td>
                              <td className="p-2 text-right font-mono">
                                {(() => {
                                  const diff = marginPerKgClp - (pvpPerKgClp - prevCostoKg);
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[11px] ${diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {diff >= 0 ? `+$${diff.toLocaleString('es-CL')}` : `-$${Math.abs(diff).toLocaleString('es-CL')}`}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Costos Indirectos</td>
                              <td className="p-2 text-right font-mono">
                                ${(previousBatch.costo_indirecto_total_clp || (previousBatch.indirect_costs_json ? Object.values(previousBatch.indirect_costs_json).reduce((s, v) => s + (parseInt(v, 10) || 0), 0) : 0)).toLocaleString('es-CL')}
                              </td>
                              <td className="p-2 text-right font-mono font-bold">${indirectTotalClp.toLocaleString('es-CL')}</td>
                              <td className="p-2 text-right font-mono text-[11px] text-stone-500">
                                {indirectTotalClp - (previousBatch.costo_indirecto_total_clp || 0) >= 0 ? `+$${(indirectTotalClp - (previousBatch.costo_indirecto_total_clp || 0)).toLocaleString('es-CL')}` : `-$${Math.abs(indirectTotalClp - (previousBatch.costo_indirecto_total_clp || 0)).toLocaleString('es-CL')}`}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex items-center gap-2 text-xs text-sky-800">
                  <Info size={16} className="text-sky-600 flex-shrink-0" />
                  <span>
                    <strong>Primer Lote de este Menú:</strong> No hay un lote previo registrado para este producto. Al confirmar este lote, se creará la primera línea base histórica para contrastar automáticamente en las próximas semanas.
                  </span>
                </div>
              )}

              {/* PASO 3: Dictamen Técnico de Calidad Biológica & Rentabilidad (Estandarizado con el panel) */}
              <div className="bg-white border-2 border-emerald-300/80 rounded-2xl p-4 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-primary-green flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-brown flex items-center gap-2">
                        Dictamen Técnico: Calidad Biológica & Rentabilidad
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Análisis automatizado en tiempo real de balance nutricional AAFCO vs. impacto comercial.
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${batchVerdict.badgeColor} shadow-2xs`}>
                    {batchVerdict.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Award size={14} className="text-primary-green" />
                      Evaluación Biológica & Nutricional:
                    </span>
                    <p className="text-stone-700 leading-relaxed text-[11px]">
                      {batchVerdict.nutritionNote}
                    </p>
                  </div>

                  <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200 space-y-1">
                    <span className="font-bold text-sky-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-sky-700" />
                      Evaluación Financiera & Margen:
                    </span>
                    <p className="text-stone-700 leading-relaxed text-[11px]">
                      {batchVerdict.financeNote}
                    </p>
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-start gap-2.5">
                  <div className="mt-0.5 text-primary-green">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-secondary-brown block mb-0.5">
                      {batchVerdict.title}
                    </strong>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      {batchVerdict.conclusion}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

            <button
              type="submit"
              className="bg-primary-green hover:bg-primary-green-dark text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-all"
            >
              Confirmar y Congelar Lote Semanal
            </button>

            {waitlistForCreated.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-amber-900">
                  ¡Hay {waitlistForCreated.length} clientes en lista de espera para este menú! Avísales por WhatsApp:
                </p>
                <div className="flex flex-wrap gap-2">
                  {waitlistForCreated.map((w) => (
                    <a
                      key={w.id}
                      href={buildWaUrl(w.contact_phone, '¡Hola! Ya salió el nuevo lote semanal fresco en origencanino.cl 🐾 Puedes hacer tu pedido ahora.')}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                    >
                      <Send size={12} /> {w.contact_phone}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Listado de Batches */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-header text-base font-extrabold text-secondary-brown">Historial de Lotes (Orden FIFO)</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncOrders}
                  className="text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                  title="Descontar del stock FIFO los pedidos pagados/confirmados que aún no hayan sido descontados"
                >
                  <RefreshCw size={13} className="text-amber-700" /> Sincronizar Pedidos a Lotes
                </button>
                <button onClick={fetchBatches} className="text-xs font-bold text-stone-600 hover:text-primary-green flex items-center gap-1 cursor-pointer">
                  <RefreshCw size={14} /> Actualizar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase">
                    <th className="py-2.5 pr-3">Código Lote</th>
                    <th className="py-2.5 pr-3">Menú</th>
                    <th className="py-2.5 pr-3">Elab / Venc</th>
                    <th className="py-2.5 pr-3">Stock FIFO</th>
                    <th className="py-2.5 pr-3">Costo Batch</th>
                    <th className="py-2.5 pr-3">Estado</th>
                    <th className="py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50">
                      <td className="py-3 pr-3 tabular-nums font-bold text-secondary-brown">{b.codigo_lote}</td>
                      <td className="py-3 pr-3 font-semibold">{b.producto_nombre}</td>
                      <td className="py-3 pr-3 tabular-nums">
                        <div>{b.fecha_elaboracion}</div>
                        <div className="text-[10px] text-red-600">Venc: {b.fecha_consumo_preferente}</div>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        <strong>{(b.stock_disponible_gramos / 1000).toFixed(2)} kg</strong>
                        <span className="text-stone-400"> / {(b.stock_inicial_gramos / 1000).toFixed(2)} kg</span>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">${Number(b.costo_total_batch_clp || 0).toLocaleString('es-CL')}</td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          b.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800'
                            : b.estado === 'AGOTADO' ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-700'
                        }`}>
                          {b.estado}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingBatch(b)}
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold px-2.5 py-1.5 rounded-lg transition shadow-2xs cursor-pointer active:scale-95"
                          title="Ver composición, nutrición y costos de este lote"
                        >
                          <Eye size={12} className="text-emerald-700" /> Ver Lote
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenBatchLabel(b.id)}
                          className="inline-flex items-center gap-1 bg-stone-800 hover:bg-stone-900 text-white font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Printer size={12} /> Etiqueta
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBatchStatus(b)}
                          className="inline-flex items-center gap-1 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer active:scale-95"
                          title={b.estado === 'ACTIVO' ? 'Cerrar lote para que no se descuente más stock de él' : 'Reactivar lote'}
                        >
                          {b.estado === 'ACTIVO' ? <XCircle size={12} className="text-amber-600" /> : <CheckCircle2 size={12} className="text-emerald-600" />}
                          {b.estado === 'ACTIVO' ? 'Cerrar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(b)}
                          className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer active:scale-95"
                          title="Eliminar este lote para ingresarlo de nuevo"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && !loading && (
                    <tr><td colSpan={7} className="py-8 text-center text-stone-400">No hay lotes semanales registrados aún.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DEMANDA, ALERTAS $30K Y EXPLOSIÓN BOM */}
      {subTab === 'demand' && (
        <div className="space-y-6">
          {/* Alertas < $30.000 CLP y Vencimientos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-red-200 shadow-xs space-y-3">
              <h3 className="font-header font-extrabold text-sm text-red-800 flex items-center gap-2">
                <AlertTriangle size={18} /> Alerta Producción Prioritaria (&lt; $30.000 CLP)
              </h3>
              {(demandData?.low_stock_alerts || []).length === 0 ? (
                <p className="text-xs text-stone-500">Todos los menús con lotes superan el umbral mínimo vendible de $30.000 CLP.</p>
              ) : (
                demandData.low_stock_alerts.map((a) => (
                  <div key={a.producto_id} className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-red-950">{a.producto_nombre}</strong>
                      <div className="text-red-700">Stock: {a.stock_disponible_kg} kg (Valor: ${a.valor_stock_clp.toLocaleString('es-CL')})</div>
                    </div>
                    <span className="font-black text-[10px] bg-red-600 text-white px-2.5 py-1 rounded-full">{a.estado}</span>
                  </div>
                ))
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-xs space-y-3">
              <h3 className="font-header font-extrabold text-sm text-amber-900 flex items-center gap-2">
                <Clock size={18} /> Alerta Temprana de Vencimiento (≤ 14 días)
              </h3>
              {(demandData?.expiry_alerts || []).length === 0 ? (
                <p className="text-xs text-stone-500">No hay lotes activos próximos a vencer.</p>
              ) : (
                demandData.expiry_alerts.map((e) => (
                  <div key={e.batch_id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <strong className="tabular-nums">{e.codigo_lote}</strong> — {e.producto_nombre}
                      <div className="text-amber-800">Saldo: {e.stock_disponible_kg} kg · Vence: {e.fecha_consumo_preferente}</div>
                    </div>
                    <span className={`font-black text-[10px] px-2.5 py-1 rounded-full ${e.nivel === 'critico' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {e.dias_restantes} días
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lista de Compras BOM */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-header font-extrabold text-base text-secondary-brown flex items-center gap-2">
              <ShoppingBag size={18} className="text-primary-green" /> Sugerencia de Producción Semanal & Lista de Compras (BOM)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold uppercase text-stone-500 mb-2">Kilos sugeridos a producir</h4>
                {(demandData?.production_suggestions || []).length === 0 ? (
                  <p className="text-xs text-stone-400">Sin déficit proyectado para los próximos 7 días.</p>
                ) : (
                  demandData.production_suggestions.map((s) => (
                    <div key={s.producto_id} className="flex justify-between items-center text-xs py-2 border-b border-stone-100">
                      <span className="font-semibold">{s.producto_nombre}</span>
                      <span className="tabular-nums font-bold text-primary-green">Producir {s.kg_sugeridos_producir} kg</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-stone-500 mb-2">Insumos a comprar (Explosión BOM)</h4>
                {(demandData?.bom_shopping_list || []).length === 0 ? (
                  <p className="text-xs text-stone-400">No requiere compras adicionales según proyección actual.</p>
                ) : (
                  demandData.bom_shopping_list.map((b) => (
                    <div key={b.ingrediente_id} className="flex justify-between items-center text-xs py-2 border-b border-stone-100">
                      <span>{b.nombre}</span>
                      <span className="tabular-nums font-bold">{b.cantidad_kg} kg (~${b.presupuesto_estimado_clp.toLocaleString('es-CL')})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Clientes en ventana de recompra & Radar de Deserción */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-3">
              <h3 className="font-header font-extrabold text-sm text-secondary-brown">
                Ventana de Recompra (-4 días / Próximos 7 días)
              </h3>
              {(demandData?.upcoming_reorders || []).map((c) => (
                <div key={c.order_id} className="flex items-center justify-between gap-2 bg-stone-50 p-3 rounded-xl text-xs">
                  <div>
                    <strong>{c.customer_name}</strong> ({c.dog_name})
                    <div className="text-stone-500">Último: {c.ultimo_pedido_kg} kg · Recompra: {c.fecha_recompra_estimada} ({c.dias_restantes}d)</div>
                  </div>
                  <a
                    href={buildWaUrl(c.customer_phone, `¡Hola ${c.customer_name}! En unos días se acaba el alimento de ${c.dog_name} 🐾 ¿Te reservamos de nuestro lote fresco de esta semana?`)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 inline-flex items-center gap-1"
                  >
                    <Send size={12} /> WhatsApp
                  </a>
                </div>
              ))}
              {(demandData?.upcoming_reorders || []).length === 0 && (
                <p className="text-xs text-stone-400">Sin clientes en ventana de recompra inmediata.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 border border-orange-200 shadow-xs space-y-3">
              <h3 className="font-header font-extrabold text-sm text-orange-900">
                Radar de Deserción (&gt; +5 días atrasados)
              </h3>
              {(demandData?.churn_radar || []).map((c) => (
                <div key={c.order_id} className="flex items-center justify-between gap-2 bg-orange-50 p-3 rounded-xl text-xs">
                  <div>
                    <strong>{c.customer_name}</strong> ({c.dog_name})
                    <div className="text-orange-800">Atraso: {Math.abs(c.dias_restantes)} días · Último: {c.ultimo_pedido_kg} kg</div>
                  </div>
                  <a
                    href={buildWaUrl(c.customer_phone, `¡Hola ${c.customer_name}! Te extrañamos en Origen Canino 🐾 ¿Cómo sigue ${c.dog_name}? Tenemos lote fresco recién preparado.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 inline-flex items-center gap-1"
                  >
                    <Send size={12} /> Recuperar
                  </a>
                </div>
              ))}
              {(demandData?.churn_radar || []).length === 0 && (
                <p className="text-xs text-stone-400">Sin clientes atrasados.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: TRAZABILIDAD / RECALL */}
      {subTab === 'recall' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h2 className="font-header text-lg font-extrabold text-secondary-brown">
            Trazabilidad Inversa ("Recall" por Código de Lote)
          </h2>
          <form onSubmit={handleRecallSearch} className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Ej. OC-2026-S46-B01"
              value={recallCode}
              onChange={(e) => setRecallCode(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-sm tabular-nums uppercase"
            />
            <button type="submit" className="bg-primary-green text-white font-bold px-5 py-2.5 rounded-xl text-sm">
              Buscar Lote
            </button>
          </form>
          {recallError && <p className="text-sm text-red-600 font-semibold">{recallError}</p>}
          {recallResult && (
            <div className="space-y-3 pt-2">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
                <strong>{recallResult.batch.codigo_lote}</strong> — {recallResult.batch.producto_nombre} · Elab: {recallResult.batch.fecha_elaboracion}
              </div>
              <div className="space-y-2">
                {recallResult.affected_orders.map((o, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-stone-200 text-xs">
                    <div>
                      <strong>Pedido #{o.order_id}</strong> — {o.customer_name} ({o.customer_phone})
                      <div className="text-stone-500">Pago: {o.payment_status} · Entrega: {o.delivery_status}</div>
                    </div>
                    <span className="tabular-nums font-bold">{(o.gramos_descontados / 1000).toFixed(2)} kg</span>
                  </div>
                ))}
                {recallResult.affected_orders.length === 0 && (
                  <p className="text-xs text-stone-400">Aún no se han despachado pedidos desde este lote.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear Nuevo Ingrediente sin perder el lote */}
      {newIngModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-header text-lg font-extrabold text-secondary-brown">Nuevo Ingrediente en Catálogo</h3>
                <p className="text-xs text-stone-500">Se guardará en tu inventario y se agregará automáticamente a este lote.</p>
              </div>
              <button type="button" onClick={() => setNewIngModalOpen(false)} className="text-stone-400 hover:text-stone-700 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewIngredient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-stone-600 block mb-1">Nombre del Ingrediente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Corazón de cerdo"
                    value={newIngForm.name}
                    onChange={(e) => setNewIngForm({ ...newIngForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-stone-600 block mb-1">Precio Compra (CLP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newIngForm.cost_per_unit}
                    onChange={(e) => setNewIngForm({ ...newIngForm, cost_per_unit: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Unidad</label>
                  <select
                    value={newIngForm.unit}
                    onChange={(e) => setNewIngForm({ ...newIngForm, unit: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="unidad">unidad</option>
                    <option value="litro">litro</option>
                  </select>
                </div>
              </div>

              <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600">Perfil Nutricional (por 100g)</span>
                  <button
                    type="button"
                    disabled={newIngEstimating}
                    onClick={handleEstimateNewIngredientNutrition}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                  >
                    <Sparkles size={13} /> {newIngEstimating ? 'Estimando...' : 'Estimar con IA'}
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'kcal_per_100g', label: 'Kcal' },
                    { key: 'protein_g', label: 'Prot (g)' },
                    { key: 'fat_g', label: 'Grasa (g)' },
                    { key: 'fiber_g', label: 'Fibra (g)' },
                    { key: 'moisture_g', label: 'Hum (g)' },
                    { key: 'ash_g', label: 'Cen (g)' },
                    { key: 'carbs_g', label: 'Carb (g)' },
                    { key: 'calcium_g', label: 'Calcio (g)' },
                    { key: 'phosphorus_g', label: 'Fósforo (g)' },
                  ].map((m) => (
                    <div key={m.key}>
                      <label className="text-xs font-semibold text-stone-500 block mb-1">{m.label}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newIngForm[m.key]}
                        onChange={(e) => setNewIngForm({ ...newIngForm, [m.key]: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-2 rounded-xl border border-stone-300 text-xs tabular-nums bg-white"
                      />
                    </div>
                  ))}
                </div>
                {Array.isArray(newIngForm.micronutrients) && newIngForm.micronutrients.length > 0 && (
                  <div className="pt-2 border-t border-stone-200">
                    <span className="text-xs font-semibold text-stone-600 block mb-1.5">
                      Micronutrientes & Bioactivos Detectados (por 100g)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {newIngForm.micronutrients.map((m, idx) => (
                        <span
                          key={idx}
                          title={m.highlight || ''}
                          className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full tabular-nums"
                        >
                          <strong>{m.name}:</strong> {m.amount} {m.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewIngModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newIngSaving}
                  className="px-5 py-2.5 rounded-xl bg-primary-green hover:bg-primary-green-dark disabled:opacity-60 text-white text-xs font-bold"
                >
                  {newIngSaving ? 'Guardando...' : 'Guardar y Agregar al Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Completa y Composición del Lote */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl my-6 relative flex flex-col max-h-[90vh] shadow-2xl border border-stone-200 animate-fadeIn">
            {/* Header del Modal */}
            <div className="p-5 border-b border-stone-200 flex flex-wrap justify-between items-center bg-stone-50/90 rounded-t-3xl gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-100 text-primary-green rounded-2xl shadow-2xs">
                  <Layers size={22} />
                </span>
                <div>
                  <h3 className="font-header text-xl text-secondary-brown flex items-center gap-2">
                    Lote: <span className="font-mono text-emerald-800 font-extrabold">{viewingBatch.codigo_lote}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      viewingBatch.estado === 'ACTIVO'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : viewingBatch.estado === 'AGOTADO'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-stone-200 text-stone-700 border-stone-300'
                    }`}>
                      {viewingBatch.estado}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    {viewingBatch.producto_nombre} ({viewingBatch.linea_produccion}) • Elaboración: {viewingBatch.fecha_elaboracion} • Vencimiento: {viewingBatch.fecha_consumo_preferente}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenBatchLabel(viewingBatch.id)}
                  className="inline-flex items-center gap-1.5 bg-stone-800 hover:bg-stone-900 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-2xs"
                >
                  <Printer size={13} /> Etiqueta
                </button>
                <button
                  type="button"
                  onClick={() => setViewingBatch(null)}
                  className="text-stone-400 hover:text-stone-700 bg-white p-2 rounded-full border border-stone-200 shadow-2xs hover:bg-stone-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-stone-800 text-xs">
              {/* Tarjetas de Resumen Operativo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-500 block">Stock Envasado Inicial:</span>
                  <strong className="text-base font-mono font-bold text-stone-900">
                    {(viewingBatch.stock_inicial_gramos / 1000).toFixed(2)} kg
                  </strong>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
                  <span className="text-[11px] text-emerald-700 block">Stock Disponible FIFO:</span>
                  <strong className="text-base font-mono font-bold text-emerald-900">
                    {(viewingBatch.stock_disponible_gramos / 1000).toFixed(2)} kg
                  </strong>
                </div>
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-500 block">Kilos Despachados:</span>
                  <strong className="text-base font-mono font-bold text-stone-800">
                    {(((viewingBatch.stock_inicial_gramos - viewingBatch.stock_disponible_gramos) || 0) / 1000).toFixed(2)} kg
                  </strong>
                </div>
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-500 block">Merma de Cocina:</span>
                  <strong className="text-base font-mono font-bold text-amber-700">
                    {viewingBatch.merma_pct || 0}%
                  </strong>
                  <span className="text-[10px] text-stone-400 block font-normal">
                    Crudo: {((viewingBatch.peso_crudo_total_gramos || 0) / 1000).toFixed(2)} kg
                  </span>
                </div>
              </div>

              {/* 1. Ingredientes Reales Usados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown flex items-center gap-1.5">
                    <span className="w-2 h-4 rounded-full bg-primary-green"></span>
                    Ingredientes Reales Utilizados en este Lote (Snapshot Inmutable)
                  </h4>
                  <span className="text-[11px] text-stone-500 font-semibold">
                    {(viewingBatch.ingredientes || []).length} insumos
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-2xs">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                      <tr>
                        <th className="p-3 text-left">Ingrediente</th>
                        <th className="p-3 text-right">Kilos Usados</th>
                        <th className="p-3 text-right">% Fórmula</th>
                        <th className="p-3 text-right">Precio Compra</th>
                        <th className="p-3 text-right">Subtotal Insumo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {(viewingBatch.ingredientes || []).map((ing, idx) => {
                        const kg = Number(ing.cantidad_gramos || 0) / 1000;
                        const costUnit = Number(ing.costo_unitario_clp || 0);
                        const subtotal = Math.round(kg * costUnit);
                        return (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="p-2.5 font-sans font-semibold text-stone-800">
                              {ing.nombre_ingrediente}
                            </td>
                            <td className="p-2.5 text-right text-stone-800">
                              {kg.toFixed(2)} kg
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-800">
                              {Number(ing.porcentaje_formula || 0).toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-right text-stone-600">
                              ${costUnit.toLocaleString('es-CL')} / kg
                            </td>
                            <td className="p-2.5 text-right font-bold text-stone-900">
                              ${subtotal.toLocaleString('es-CL')}
                            </td>
                          </tr>
                        );
                      })}
                      {(viewingBatch.ingredientes || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-stone-400 font-sans italic">
                            No se registraron ingredientes individuales para este lote.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Costos Indirectos y Rentabilidad del Batch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Costos Indirectos */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown">
                    Costos Indirectos Prorrateados
                  </h4>
                  {viewingBatch.indirect_costs_json && Object.keys(viewingBatch.indirect_costs_json).length > 0 ? (
                    <div className="space-y-1.5 font-mono text-xs">
                      {Object.entries(viewingBatch.indirect_costs_json).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center text-stone-700 pb-1 border-b border-stone-200/60">
                          <span className="font-sans capitalize text-stone-500">{k.replace('_clp', '').replace('_', ' ')}:</span>
                          <strong>${Number(v || 0).toLocaleString('es-CL')}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-400 italic">Sin costos indirectos asignados.</p>
                  )}
                </div>

                {/* Resumen Financiero */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2 font-mono text-xs">
                  <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown font-sans">
                    Resumen Financiero del Lote
                  </h4>
                  <div className="flex justify-between items-center text-stone-700 pb-1 border-b border-emerald-200/60">
                    <span className="font-sans text-stone-600">Costo Total del Batch:</span>
                    <strong className="text-stone-900 text-sm">
                      ${Number(viewingBatch.costo_total_batch_clp || 0).toLocaleString('es-CL')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-stone-700 pb-1 border-b border-emerald-200/60">
                    <span className="font-sans text-stone-600">Costo Real por Kilo Envasado:</span>
                    <strong className="text-emerald-800 text-sm">
                      ${Math.round(Number(viewingBatch.costo_total_batch_clp || 0) / (Number(viewingBatch.stock_inicial_gramos || 1) / 1000)).toLocaleString('es-CL')} / kg
                    </strong>
                  </div>
                  {viewingBatch.producto_price && (
                    <div className="flex justify-between items-center text-stone-700">
                      <span className="font-sans text-stone-600">PVP Menú:</span>
                      <strong className="text-stone-900">
                        ${Number(viewingBatch.producto_price).toLocaleString('es-CL')}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Ficha Bromatológica Recalculada */}
              {viewingBatch.kcal_100g !== undefined && viewingBatch.kcal_100g !== null && (
                <div className="space-y-2">
                  <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown flex items-center gap-1.5">
                    <span className="w-2 h-4 rounded-full bg-emerald-600"></span>
                    Composición Bromatológica Recalculada (Base 100g)
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] text-stone-500 font-sans block">Energía</span>
                      <strong className="text-xs text-stone-900 font-bold">{Math.round(viewingBatch.kcal_100g)} kcal</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] text-stone-500 font-sans block">Proteína</span>
                      <strong className="text-xs text-emerald-800 font-bold">{Number(viewingBatch.proteina_pct || 0).toFixed(1)}%</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] text-stone-500 font-sans block">Grasa</span>
                      <strong className="text-xs text-stone-800 font-bold">{Number(viewingBatch.grasa_pct || 0).toFixed(1)}%</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] text-stone-500 font-sans block">Fibra</span>
                      <strong className="text-xs text-stone-800 font-bold">{Number(viewingBatch.fibra_pct || 0).toFixed(1)}%</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] text-stone-500 font-sans block">Humedad</span>
                      <strong className="text-xs text-sky-800 font-bold">{Number(viewingBatch.humedad_pct || 0).toFixed(1)}%</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] text-stone-500 font-sans block">Calcio / Fósforo</span>
                      <strong className="text-xs text-amber-800 font-bold">
                        {Number(viewingBatch.calcio_pct || 0).toFixed(2)}g / {Number(viewingBatch.fosforo_pct || 0).toFixed(2)}g
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Trazabilidad de Pedidos Despachados desde este Lote */}
              <div className="space-y-2">
                <h4 className="font-header text-xs font-bold uppercase tracking-wider text-secondary-brown flex items-center gap-1.5">
                  <span className="w-2 h-4 rounded-full bg-sky-600"></span>
                  Trazabilidad: Pedidos Descontados de este Lote FIFO
                </h4>
                {(viewingBatch.orders_dispatched || []).length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-2xs">
                    <table className="w-full text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                        <tr>
                          <th className="p-2.5 text-left">Pedido #</th>
                          <th className="p-2.5 text-left">Cliente</th>
                          <th className="p-2.5 text-right">Kilos Descontados</th>
                          <th className="p-2.5 text-right">Fecha Asignación</th>
                          <th className="p-2.5 text-right">Estado Entrega</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono">
                        {viewingBatch.orders_dispatched.map((ord, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="p-2.5 font-bold text-stone-900">
                              #{ord.order_id}
                            </td>
                            <td className="p-2.5 font-sans text-stone-800">
                              {ord.customer_name}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-800">
                              {(Number(ord.gramos_descontados || 0) / 1000).toFixed(2)} kg
                            </td>
                            <td className="p-2.5 text-right text-stone-500 text-[11px]">
                              {ord.created_at ? new Date(ord.created_at).toLocaleString('es-CL') : '-'}
                            </td>
                            <td className="p-2.5 text-right">
                              <span className="font-sans px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                {ord.delivery_status || 'Preparación'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 italic text-[11px]">
                    Aún no se registran pedidos descontados de este lote (el stock permanece íntegro o los pedidos no se han sincronizado).
                  </div>
                )}
              </div>

              {/* 5. Notas de Producción */}
              {viewingBatch.notas && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <span className="font-bold text-secondary-brown text-[11px] block">Notas de Producción / Sustituciones:</span>
                  <p className="text-stone-700 italic">{viewingBatch.notas}</p>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center rounded-b-3xl">
              <span className="text-xs text-stone-500 hidden sm:inline">
                🔒 Snapshot inmutable: garantiza trazabilidad ante consultas de clientes o auditorías sanitarias.
              </span>
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="bg-secondary-brown hover:bg-stone-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ml-auto"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Etiqueta Dinámica del Lote */}
      <ProductLabelGenerator
        isOpen={labelModalOpen}
        onClose={() => {
          setLabelModalOpen(false);
          setActiveBatchLabel(null);
        }}
        batchLabelData={activeBatchLabel}
      />
    </div>
  );
};

export default BatchProductionManager;

