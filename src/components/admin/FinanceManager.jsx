import React, { useState, useEffect } from 'react';
import { DollarSign, Download, Calendar, TrendingUp } from 'lucide-react';

const FinanceManager = ({ fetchWithAuth }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/finance/report?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        alert('Error al generar el reporte');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const handleDownloadCSV = () => {
    if (!report) return;
    
    // Generar CSV simple
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Concepto,Monto\n"
      + `Total Ventas,${report.total_sales}\n`
      + `Total Despachos,${report.total_shipping}\n`
      + `Costo Produccion,${report.total_production_cost}\n`
      + `Utilidad Bruta,${report.net_profit}\n`
      + `Cantidad Pedidos Pagados,${report.orders_count}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Finanzas_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-header text-2xl text-secondary-brown">Módulo de Finanzas</h3>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-white border rounded-lg p-2 gap-2 items-center shadow-sm">
            <Calendar size={18} className="text-primary-green-dark" />
            <select 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-gray-700"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>Mes {m}</option>
              ))}
            </select>
            <span className="text-gray-300">/</span>
            <select 
              value={year} 
              onChange={(e) => setYear(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-gray-700"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-primary-green-dark text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-sm"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-8">Cargando reporte...</p>
      ) : report ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign size={20} />
              <h4 className="font-bold">Total Ventas</h4>
            </div>
            <p className="text-3xl font-bold text-gray-800">${report.total_sales.toLocaleString('es-CL')}</p>
            <p className="text-sm text-gray-400">Incluye despacho</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <TrendingUp size={20} className="text-red-500" />
              <h4 className="font-bold">Costo Producción</h4>
            </div>
            <p className="text-3xl font-bold text-red-500">-${report.total_production_cost.toLocaleString('es-CL')}</p>
            <p className="text-sm text-gray-400">Ingredientes y costos fijos</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign size={20} className="text-green-500" />
              <h4 className="font-bold">Utilidad Bruta</h4>
            </div>
            <p className="text-3xl font-bold text-green-500">${report.net_profit.toLocaleString('es-CL')}</p>
            <p className="text-sm text-gray-400">Ventas - Costos</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Calendar size={20} />
              <h4 className="font-bold">Pedidos Pagados</h4>
            </div>
            <p className="text-3xl font-bold text-gray-800">{report.orders_count}</p>
            <p className="text-sm text-gray-400">En este periodo</p>
          </div>
        </div>
      ) : (
        <p className="text-center py-8 text-gray-500">No se encontraron datos para este mes.</p>
      )}
    </div>
  );
};

export default FinanceManager;
