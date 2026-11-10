import React, { useState } from 'react';
import { 
  Printer, X, Tag, ShieldCheck, QrCode, Snowflake, 
  Flame, Drumstick, AlertCircle, Check, Copy, Sliders
} from 'lucide-react';

const ProductLabelGenerator = ({ activeLine, totalKg, isOpen, onClose }) => {
  const [packSize, setPackSize] = useState('1kg'); // '1kg', '500g', '2kg'
  const [printLayout, setPrintLayout] = useState('single'); // 'single' (10x15 adhesiva) o 'sheet' (4 por hoja carta)
  const [copiesCount, setCopiesCount] = useState(4);

  // Fechas y Lote automáticos
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const [lotNumber, setLotNumber] = useState(`LOT-${activeLine.toUpperCase()}-${dateStr}-01`);
  const [elabDate, setElabDate] = useState(today.toLocaleDateString('es-CL'));
  
  const expireDateObj = new Date(today);
  expireDateObj.setMonth(expireDateObj.getMonth() + 6);
  const [expireDate, setExpireDate] = useState(expireDateObj.toLocaleDateString('es-CL'));

  if (!isOpen) return null;

  // Datos específicos según la línea
  const isBarf = activeLine === 'barf';

  const labelData = isBarf ? {
    title: "DIETA BARF CRUDA BIOLÓGICA",
    subtitle: "Pollo & Vegetales Vivos con Hueso Carnoso Molido",
    typeTag: "ALIMENTO CRUDO CONGELADO PARA PERROS DE TODAS LAS EDADES",
    netWeight: packSize === '1kg' ? '1.000 g (1 Kg)' : packSize === '500g' ? '500 g' : '2.000 g (2 Kg)',
    ingredients: "Cogote de pollo entero con hueso carnoso molido (70%), puré vegetal cocido al vapor (zapallo camote, zanahoria, betarraga) (12%), contre de vacuno/pollo (10%), pana de pollo/cerdo (5%), zapallo italiano, manzana fresca, tallos de apio (3%), huevos frescos enteros sin cáscara, cúrcuma longa pura, pimienta negra molida activadora.",
    guaranteedAnalysis: [
      { label: "Proteína Cruda (mín.)", value: "14.5%" },
      { label: "Grasa Cruda (mín.)", value: "11.2%" },
      { label: "Fibra Cruda (máx.)", value: "1.8%" },
      { label: "Humedad (máx.)", value: "67.5%" },
      { label: "Materia Mineral / Cenizas (máx.)", value: "2.9%" },
      { label: "Calcio (mín.)", value: "0.85%" },
      { label: "Fósforo (mín.)", value: "0.65%" },
      { label: "Relación Calcio:Fósforo (Ca:P)", value: "1.3 : 1" },
      { label: "Energía Metabolizable (EM)", value: "1.620 kcal/kg" }
    ],
    storage: "Mantener estrictamente congelado a -18°C. Descongelar en refrigerador 12-24 horas antes de servir. Una vez descongelado, mantener refrigerado y consumir dentro de 72 horas. NO COCINAR NI CALENTAR EN MICROONDAS (el hueso cocido pierde elasticidad).",
    safetyWarning: "Lavar manos, recipientes y superficies con agua caliente y jabón después de manipular alimentos crudos. Exclusivo para consumo canino.",
    sagNote: "Elaborado conforme a estándares biológicos AAFCO y directrices nutricionales SAG Chile."
  } : {
    title: "DIETA COCINADA AL VAPOR",
    subtitle: "Cerdo Magro & Puré Digestivo con Balance Óseo de Calcio",
    typeTag: "ALIMENTO COMPLETO COCINADO PARA PERROS CON ESTÓMAGO SENSIBLE",
    netWeight: packSize === '1kg' ? '1.000 g (1 Kg)' : packSize === '500g' ? '500 g' : '2.000 g (2 Kg)',
    ingredients: "Carne magra de cerdo sin hueso (70%), puré de verduras al vapor con caldo natural (zapallo camote, zapallo italiano, zanahoria) (20%), pana/hígado de cerdo o pollo (10%), carbonato de calcio orgánico bioasimilable (harina ultrafina de cáscara de huevo pasteurizada), huevos de gallina enteros cocidos.",
    guaranteedAnalysis: [
      { label: "Proteína Cruda (mín.)", value: "16.8%" },
      { label: "Grasa Cruda (mín.)", value: "8.5%" },
      { label: "Fibra Cruda (máx.)", value: "1.5%" },
      { label: "Humedad (máx.)", value: "70.2%" },
      { label: "Materia Mineral / Cenizas (máx.)", value: "2.1%" },
      { label: "Calcio (mín.)", value: "0.58%" },
      { label: "Fósforo (mín.)", value: "0.45%" },
      { label: "Relación Calcio:Fósforo (Ca:P)", value: "1.28 : 1" },
      { label: "Energía Metabolizable (EM)", value: "1.480 kcal/kg" }
    ],
    storage: "Mantener congelado a -18°C o refrigerado entre 0°C y 4°C. Para servir, entibiar a baño maría o servir a temperatura ambiente. No sobrecalentar para preservar vitaminas termolábiles.",
    safetyWarning: "Fórmula hipoalergénica de descarte monoproteica. Libre de granos, gluten, subproductos, colorantes y conservantes químicos.",
    sagNote: "Suplementado con calcio bioasimilable para estricto equilibrio mineral óseo (AAFCO/SAG)."
  };

  const handlePrintLabels = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 my-6 print:border-0 print:shadow-none print:m-0 print:p-0">
        
        {/* Controles Superiores (Ocultos en impresión) */}
        <div className="print:hidden">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                <Tag size={20} className="text-amber-600" />
              </span>
              <div>
                <h3 className="text-xl font-black font-header text-stone-800">
                  Generador de Etiquetas de Producto & Valores Nutricionales
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Cumplimiento técnico de etiquetado (SAG / AAFCO) y trazabilidad de lote de cocina.
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Barra de Configuración de Lote y Formato */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4 p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">N° de Lote de Cocina:</label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full bg-white px-2.5 py-1.5 border border-stone-300 rounded-xl font-mono font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Formato Empaque:</label>
              <select
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className="w-full bg-white px-2.5 py-1.5 border border-stone-300 rounded-xl font-bold text-stone-800"
              >
                <option value="1kg">Bolsa 1.000 g (1 Kg)</option>
                <option value="500g">Pouch 500 g</option>
                <option value="2kg">Pack Familiar 2 Kg</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">F. Elaboración / Venc:</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={elabDate}
                  onChange={(e) => setElabDate(e.target.value)}
                  className="w-1/2 bg-white px-2 py-1.5 border border-stone-300 rounded-xl text-[11px] font-mono text-center"
                  title="Elaboración"
                />
                <input
                  type="text"
                  value={expireDate}
                  onChange={(e) => setExpireDate(e.target.value)}
                  className="w-1/2 bg-white px-2 py-1.5 border border-stone-300 rounded-xl text-[11px] font-mono text-center"
                  title="Vencimiento"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Diseño de Impresión:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrintLayout('single')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] border transition ${
                    printLayout === 'single' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300'
                  }`}
                >
                  Adhesiva 1x1
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('sheet')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] border transition ${
                    printLayout === 'sheet' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300'
                  }`}
                >
                  Pliego x4
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VISTA PREVIA Y CONTENIDO IMPRIMIBLE DE LA ETIQUETA        */}
        {/* ======================================================== */}
        <div className={`my-4 ${printLayout === 'sheet' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'flex justify-center'}`}>
          {Array.from({ length: printLayout === 'sheet' ? copiesCount : 1 }).map((_, idx) => (
            <div 
              key={idx}
              className="w-full max-w-md bg-white border-2 border-stone-900 rounded-2xl p-4 text-stone-900 font-sans shadow-xs flex flex-col justify-between text-left print:shadow-none print:border-2 print:border-black print:break-inside-avoid print:m-1"
              style={{ minHeight: '440px' }}
            >
              {/* Cabecera de Marca */}
              <div>
                <div className="flex items-start justify-between border-b-2 border-stone-900 pb-2 mb-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                      ORIGEN CANINO • NUTRICIÓN BIOLÓGICA
                    </div>
                    <h1 className="text-lg font-black tracking-tight leading-none text-stone-900 mt-0.5">
                      {labelData.title}
                    </h1>
                    <div className="text-[11px] font-bold text-stone-600 mt-0.5">
                      {labelData.subtitle}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-stone-900 text-white text-xs font-black px-2 py-0.5 rounded-md">
                      {labelData.netWeight}
                    </span>
                    <div className="text-[9px] font-mono text-stone-500 mt-0.5 font-bold">
                      {isBarf ? '100% CRUDO' : '100% VAPOR'}
                    </div>
                  </div>
                </div>

                <div className="text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-1 rounded-sm mb-2 text-center">
                  {labelData.typeTag}
                </div>

                {/* Tabla de Análisis Garantizado */}
                <div className="mb-2.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-stone-900 border-b border-stone-400 pb-0.5 mb-1 flex items-center justify-between">
                    <span>ANÁLISIS GARANTIZADO (BASE TAL CUAL)</span>
                    <span className="font-mono text-[9px] text-stone-500">ESTÁNDAR AAFCO / SAG</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                    {labelData.guaranteedAnalysis.map((item, i) => (
                      <div key={i} className="flex justify-between border-b border-dotted border-stone-200 py-0.5">
                        <span className="text-stone-600">{item.label}:</span>
                        <span className="font-bold font-mono text-stone-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ingredientes */}
                <div className="mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-900 block mb-0.5">
                    INGREDIENTES (ORDEN DECRECIENTE):
                  </span>
                  <p className="text-[9.5px] text-stone-700 leading-tight">
                    {labelData.ingredients}
                  </p>
                </div>

                {/* Guía Rápida de Alimentación */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-1.5 mb-2 text-[9px]">
                  <span className="font-black text-amber-900 block mb-0.5">
                    RACIÓN DIARIA RECOMENDADA (2% A 3% DEL PESO DEL PERRO):
                  </span>
                  <div className="grid grid-cols-4 gap-1 text-center font-mono text-stone-800 font-semibold">
                    <div>5 kg: 120-150g</div>
                    <div>10 kg: 250-300g</div>
                    <div>20 kg: 500-600g</div>
                    <div>30 kg: 750-900g</div>
                  </div>
                </div>
              </div>

              {/* Pie de Etiqueta: Lote, Conservación y QR */}
              <div className="border-t-2 border-stone-900 pt-2 mt-auto">
                <div className="flex items-center justify-between text-[9px] mb-1.5">
                  <div>
                    <span className="text-stone-500 font-bold">LOTE: </span>
                    <span className="font-mono font-black text-stone-900">{lotNumber}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-bold">ELAB: </span>
                    <span className="font-mono font-bold text-stone-800">{elabDate}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-bold">VENC (-18°C): </span>
                    <span className="font-mono font-black text-red-700">{expireDate}</span>
                  </div>
                </div>

                <p className="text-[8.5px] text-stone-600 leading-tight mb-1">
                  <strong>CONSERVACIÓN:</strong> {labelData.storage}
                </p>

                <div className="flex items-center justify-between text-[8px] text-stone-500 pt-1 border-t border-stone-200">
                  <span>origencanino.cl • Santiago, Chile</span>
                  <span className="font-mono font-bold text-stone-700">Resolución SAG en Trámite</span>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Botones de Acción (Ocultos en impresión) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-100 print:hidden">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Formato listo para impresión en adhesivo térmico (Zebra/Brother) o papel estándar.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrintLabels}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <Printer size={16} className="text-amber-400" />
              <span>Imprimir Etiquetas Ahora</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductLabelGenerator;

