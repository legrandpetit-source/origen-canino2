import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, Send, AlertTriangle } from 'lucide-react';

const RetentionManager = ({ orders, products }) => {
  const [retentionData, setRetentionData] = useState([]);

  useEffect(() => {
    // Calcular retención basada en pedidos entregados o enviados
    const deliveredOrders = orders.filter(o => 
      o.delivery_status === 'Entregado' || o.delivery_status === 'En Ruta'
    );

    const enriched = deliveredOrders.map(order => {
      // Calcular Kilos totales del pedido
      let totalKg = 0;
      order.items?.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        if (product && product.weight) {
          const weightStr = product.weight.toLowerCase();
          let kg = 0;
          if (weightStr.includes('kg')) {
            kg = parseFloat(weightStr.replace('kg', '').trim());
          } else if (weightStr.includes('g')) {
            kg = parseFloat(weightStr.replace('g', '').trim()) / 1000;
          }
          if (!isNaN(kg)) {
            totalKg += (kg * item.quantity);
          }
        }
      });

      // Calcular consumo en base a datos reales del perro o fallback a 400g
      let dailyConsumptionKg = 0.4; // 400g default
      
      if (order.dog_weight) {
        let percentage = 0.025; // 2.5% default adulto
        switch (order.dog_age) {
          case 'puppy_small': percentage = 0.08; break;
          case 'puppy_large': percentage = 0.05; break;
          case 'adult_low': percentage = 0.02; break;
          case 'adult_normal': percentage = 0.025; break;
          case 'adult_high': percentage = 0.035; break;
        }
        dailyConsumptionKg = parseFloat(order.dog_weight) * percentage;
      }
      
      const estimatedDays = totalKg > 0 ? Math.floor(totalKg / dailyConsumptionKg) : 0;
      
      const orderDate = new Date(order.created_at);
      const today = new Date();
      const diffTime = Math.abs(today - orderDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const daysLeft = estimatedDays - diffDays;
      
      // Estado de retención
      let status = 'good'; // Aún le queda
      if (daysLeft <= 5 && daysLeft > 0) status = 'warning'; // Por acabarse
      if (daysLeft <= 0) status = 'critical'; // Se le acabó

      return {
        ...order,
        totalKg,
        estimatedDays,
        daysPassed: diffDays,
        daysLeft,
        retentionStatus: status
      };
    });

    // Ordenar para mostrar primero los críticos y warning
    enriched.sort((a, b) => a.daysLeft - b.daysLeft);
    setRetentionData(enriched.filter(e => e.totalKg > 0));

  }, [orders, products]);

  const sendReminder = (order) => {
    let msg = '';
    if (order.dog_name) {
      msg = encodeURIComponent(`¡Hola ${order.customer_name}! 🐶\n\nNotamos que han pasado ${order.daysPassed} días desde tu último pedido, y calculamos que a ${order.dog_name} le deben quedar poquitas raciones de sus ${order.totalKg}Kg.\n\n¿Te gustaría agendar tu próxima entrega para que no se quede sin su alimento? 🐾`);
    } else {
      msg = encodeURIComponent(`Hola ${order.customer_name}! 🐶\n\nNotamos que han pasado ${order.daysPassed} días desde tu último pedido en Origen Canino, y calculamos que a tu perrito le deben quedar poquitas raciones de sus ${order.totalKg}Kg.\n\n¿Te gustaría agendar tu próxima entrega para que no se quede sin su alimento? 🐾`);
    }
    window.open(`https://wa.me/${order.customer_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-header text-2xl text-secondary-brown flex items-center gap-2">
          <Bell className="text-primary-green-dark" />
          Retención de Clientes
        </h3>
      </div>
      
      <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-sm border">
        El sistema calcula automáticamente cuántos días le durará la comida al cliente en base al perfil de su perro (peso y etapa). Te avisaremos cuando le queden menos de 5 días de alimento para que le escribas por WhatsApp.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {retentionData.map(order => (
          <div 
            key={order.id} 
            className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-3 transition ${
              order.retentionStatus === 'critical' ? 'bg-red-50 border-red-200' :
              order.retentionStatus === 'warning' ? 'bg-orange-50 border-orange-200' :
              'bg-white border-gray-100'
            }`}
          >
            <div className="flex justify-between items-start border-b border-black/5 pb-3">
              <div>
                <h4 className="font-bold text-gray-800">{order.customer_name}</h4>
                <p className="text-xs text-gray-500">Orden #{order.id} • {new Date(order.created_at).toLocaleDateString('es-CL')}</p>
                {order.dog_name && (
                  <p className="text-xs text-primary-green-dark mt-1 font-semibold">🐶 {order.dog_name} ({order.dog_weight}kg)</p>
                )}
              </div>
              {order.retentionStatus === 'critical' && <AlertTriangle size={20} className="text-red-500" />}
              {order.retentionStatus === 'warning' && <RefreshCw size={20} className="text-orange-500" />}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-center my-2">
              <div className="bg-white/50 p-2 rounded-lg">
                <span className="block text-gray-500 text-xs">Compró</span>
                <span className="font-bold text-gray-800">{order.totalKg.toFixed(1)} Kg</span>
              </div>
              <div className="bg-white/50 p-2 rounded-lg">
                <span className="block text-gray-500 text-xs">Duración Est.</span>
                <span className="font-bold text-gray-800">{order.estimatedDays} días</span>
              </div>
            </div>

            <div className="text-center mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                order.retentionStatus === 'critical' ? 'bg-red-100 text-red-700' :
                order.retentionStatus === 'warning' ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700'
              }`}>
                {order.daysLeft < 0 ? `Se acabó hace ${Math.abs(order.daysLeft)} días` : 
                 order.daysLeft === 0 ? 'Se acaba HOY' : 
                 `Le quedan ${order.daysLeft} días`}
              </span>
            </div>

            <button 
              onClick={() => sendReminder(order)}
              className="mt-auto w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <Send size={16} /> Recordar por WhatsApp
            </button>
          </div>
        ))}
        {retentionData.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No hay datos suficientes para calcular retención (se requieren pedidos entregados con productos en Kg/g).
          </div>
        )}
      </div>
    </div>
  );
};

export default RetentionManager;
