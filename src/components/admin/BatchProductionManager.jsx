import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Printer, AlertTriangle, TrendingUp, Search, Link2,
  Send, Copy, Check, RefreshCw, ShoppingBag, Clock, XCircle, CheckCircle2, Trash2
} from 'lucide-react';
import ProductLabelGenerator from './ProductLabelGenerator';

const BatchProductionManager = ({ products = [], ingredients = [] }) => {
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
    if (!selectedProductId) return;
    const prevBatch = batches.find((b) => String(b.producto_id) === String(selectedProductId));
    if (!prevBatch || !prevBatch.ingredientes?.length) {
      showToast('No hay un lote anterior para este menú; usando receta plantilla.');
      return;
    }
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
    showToast(`Receta copiada desde lote ${prevBatch.codigo_lote}.`);
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
      acc.kcal += Number(dbIng.kcal_per_100g || 0) * w * concentrationFactor;
      return acc;
    },
    { proteina: 0, grasa: 0, fibra: 0, humedad: 0, cenizas: 0, carbs: 0, kcal: 0 }
  );

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
      showToast(`Lote ${data.codigo_lote} creado y congelado con éxito.`);
      fetchBatches();
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

  const handleOpenBatchLabel = async (batchId) => {
    const res = await fetch(`/api/admin/batches/${batchId}/label`, { headers: authHeaders() });
    if (res.ok) {
      setActiveBatchLabel(await res.json());
      setLabelModalOpen(true);
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
          <form onSubmit={handleCreateBatch} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-header text-lg font-extrabold text-secondary-brown">
                  Registrar Nuevo Lote Semanal (Snapshot Inmutable)
                </h2>
                <p className="text-xs text-stone-500">
                  Precarga la receta base, ajusta ingredientes de estación y congela stock FIFO, nutrición y costos.
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                Merma calculada: {mermaPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-stone-600 block mb-1">Producto / Menú</label>
                <div className="flex gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleSelectProductForBatch(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white"
                    required
                  >
                    <option value="">-- Seleccionar Menú --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.weight})</option>
                    ))}
                  </select>
                  {selectedProductId && (
                    <button
                      type="button"
                      onClick={handleCopyLastBatchRecipe}
                      className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 shrink-0"
                      title="Copiar ingredientes y precios del último lote de este menú"
                    >
                      Copiar Último Lote
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Línea</label>
                <select
                  value={lineaProduccion}
                  onChange={(e) => setLineaProduccion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm bg-white"
                >
                  <option value="BARF">BARF (180 días)</option>
                  <option value="COCIDO">COCIDO (120 días)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Fecha Elaboración</label>
                <input
                  type="date"
                  value={fechaElab}
                  onChange={(e) => setFechaElab(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm"
                  required
                />
              </div>
            </div>

            {/* Desglose de Costos Indirectos de Cocina */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
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
                    <label className="text-[11px] font-semibold text-stone-500 block mb-1">{field.label}</label>
                    <input
                      type="number"
                      min="0"
                      value={indirectCosts[field.key]}
                      onChange={(e) => setIndirectCosts({ ...indirectCosts, [field.key]: parseInt(e.target.value || '0', 10) })}
                      className="w-full px-2.5 py-2 rounded-xl border border-stone-300 text-xs bg-white font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Peso Crudo Total (Suma Ingredientes)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={totalKilosIngredientes > 0 ? totalKilosIngredientes.toFixed(2) : pesoCrudoKg}
                  onChange={(e) => setPesoCrudoKg(e.target.value)}
                  readOnly={totalKilosIngredientes > 0}
                  className={`w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-mono ${totalKilosIngredientes > 0 ? 'bg-stone-100 text-stone-700' : 'bg-white'}`}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Stock Final Envasado Vendible (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={stockInicialKg}
                  onChange={(e) => setStockInicialKg(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Notas de Producción / Sustituciones</label>
                <input
                  type="text"
                  placeholder="Ej. Manzana sustituida por frutilla de estación"
                  value={batchNotas}
                  onChange={(e) => setBatchNotas(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>
            </div>

            {/* Tabla editable de ingredientes del batch (por KILOS reales) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Ingredientes Reales Usados — Total: <strong className="text-secondary-brown">{totalKilosIngredientes.toFixed(2)} kg</strong> ({pctTotal.toFixed(0)}%)
                </span>
                <button
                  type="button"
                  onClick={() => setFormulaRows([...formulaRows, { ingrediente_id: '', nombre_ingrediente: '', kilos_usados: 1, porcentaje_formula: 0, cantidad_gramos: 1000, costo_unitario_clp: 0 }])}
                  className="text-xs font-bold text-primary-green hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Agregar otro ingrediente
                </button>
              </div>
              {formulaRows.length > 0 && (
                <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
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
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
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
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs text-right font-mono bg-white font-bold"
                        title="Kilos usados de este ingrediente"
                      />
                    </div>
                    <div className="col-span-2 text-xs font-mono text-right text-stone-600">
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
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs text-right font-mono bg-white"
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 mb-2">
                    Tabla Nutricional Recalculada en Vivo (por 100g)
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Energía</span>
                      <strong className="font-mono">{Math.round(liveNutrition.kcal)} kcal</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Proteína</span>
                      <strong className="font-mono">{liveNutrition.proteina.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Grasa</span>
                      <strong className="font-mono">{liveNutrition.grasa.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Fibra</span>
                      <strong className="font-mono">{liveNutrition.fibra.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Humedad</span>
                      <strong className="font-mono">{liveNutrition.humedad.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Cenizas</span>
                      <strong className="font-mono">{liveNutrition.cenizas.toFixed(1)}%</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Carbohidratos</span>
                      <strong className="font-mono">{liveNutrition.carbs.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 mb-2">
                    Rentabilidad Real del Lote (Ingredientes + Indirectos)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Ingredientes</span>
                      <strong className="font-mono">${ingredientsCostClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Indirectos (Luz/Gas...)</span>
                      <strong className="font-mono">${indirectTotalClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Costo Total Lote</span>
                      <strong className="font-mono text-secondary-brown">${totalBatchCostClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Costo Real / Kg</span>
                      <strong className="font-mono">${costPerKgClp.toLocaleString('es-CL')}/kg</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">PVP Menú</span>
                      <strong className="font-mono">${pvpPerKgClp.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-500 block">Margen Bruto</span>
                      <strong className={`font-mono ${marginPerKgClp >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        ${marginPerKgClp.toLocaleString('es-CL')} ({marginPctLive}%)
                      </strong>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-header text-base font-extrabold text-secondary-brown">Historial de Lotes (Orden FIFO)</h3>
              <button onClick={fetchBatches} className="text-xs font-bold text-stone-600 hover:text-primary-green flex items-center gap-1">
                <RefreshCw size={14} /> Actualizar
              </button>
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
                      <td className="py-3 pr-3 font-mono font-bold text-secondary-brown">{b.codigo_lote}</td>
                      <td className="py-3 pr-3 font-semibold">{b.producto_nombre}</td>
                      <td className="py-3 pr-3 font-mono">
                        <div>{b.fecha_elaboracion}</div>
                        <div className="text-[10px] text-red-600">Venc: {b.fecha_consumo_preferente}</div>
                      </td>
                      <td className="py-3 pr-3 font-mono">
                        <strong>{(b.stock_disponible_gramos / 1000).toFixed(2)} kg</strong>
                        <span className="text-stone-400"> / {(b.stock_inicial_gramos / 1000).toFixed(2)} kg</span>
                      </td>
                      <td className="py-3 pr-3 font-mono">${Number(b.costo_total_batch_clp || 0).toLocaleString('es-CL')}</td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          b.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800'
                            : b.estado === 'AGOTADO' ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-700'
                        }`}>
                          {b.estado}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenBatchLabel(b.id)}
                          className="inline-flex items-center gap-1 bg-stone-800 hover:bg-stone-900 text-white font-bold px-2.5 py-1.5 rounded-lg"
                        >
                          <Printer size={12} /> Etiqueta
                        </button>
                        <button
                          onClick={() => handleToggleBatchStatus(b)}
                          className="inline-flex items-center gap-1 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold px-2.5 py-1.5 rounded-lg"
                        >
                          {b.estado === 'ACTIVO' ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                          {b.estado === 'ACTIVO' ? 'Cerrar' : 'Activar'}
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
                      <strong className="font-mono">{e.codigo_lote}</strong> — {e.producto_nombre}
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
                      <span className="font-mono font-bold text-primary-green">Producir {s.kg_sugeridos_producir} kg</span>
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
                      <span className="font-mono font-bold">{b.cantidad_kg} kg (~${b.presupuesto_estimado_clp.toLocaleString('es-CL')})</span>
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
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-mono uppercase"
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
                    <span className="font-mono font-bold">{(o.gramos_descontados / 1000).toFixed(2)} kg</span>
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

