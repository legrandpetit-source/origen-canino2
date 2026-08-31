import React, { useState } from 'react';
import { Truck, Package, MapPin } from 'lucide-react';

const DispatchManager = ({ orders, handleUpdateOrderStatus, handleDeleteOrder }) => {
  const [filterCity, setFilterCity] = useState('ALL');

  // Group orders by city
  const groupedOrders = orders.reduce((acc, order) => {
    const city = order.customer_city || 'Sin Comuna';
    if (!acc[city]) acc[city] = [];
    acc[city].push(order);
    return acc;
  }, {});

  const cities = Object.keys(groupedOrders).sort();

  const handleStatusChange = (order, newStatus) => {
    handleUpdateOrderStatus(order.id, { delivery_status: newStatus });
    
    // Automatically open WhatsApp if status changed to "En Ruta"
    if (newStatus === 'En Ruta') {
      const msg = encodeURIComponent(`Hola ${order.customer_name},\n\nTe escribimos de Origen Canino 🐶. ¡Buenas noticias! Tu pedido #${order.id} ya se encuentra *En Ruta* y va camino a tu domicilio en ${order.customer_city}.\n\n¡Gracias por tu compra!`);
      window.open(`https://wa.me/${order.customer_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${msg}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
        <h3 className="font-header text-2xl text-secondary-brown flex items-center gap-2">
          <Truck className="text-primary-green" /> 
          Logística y Despacho
        </h3>
        <select 
          className="border rounded-lg p-2 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-primary-green"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        >
          <option value="ALL">Todas las Comunas</option>
          {cities.map(city => (
            <option key={city} value={city}>{city} ({groupedOrders[city].length})</option>
          ))}
        </select>
      </div>

      {cities.filter(c => filterCity === 'ALL' || filterCity === c).map(city => (
        <div key={city} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-2">
            <MapPin className="text-gray-400" size={20} />
            <h4 className="font-bold text-lg text-gray-800">{city}</h4>
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">
              {groupedOrders[city].length} Pedidos
            </span>
          </div>
          
          <div className="p-4 space-y-4">
            {groupedOrders[city].map((order) => (
              <div key={order.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-primary-green transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg text-primary-green-dark">Orden #{order.id}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      order.payment_status === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.payment_status}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">{order.customer_address} - {order.customer_phone}</p>
                </div>
                
                <div className="flex gap-4 items-center bg-white p-3 rounded-lg border w-full md:w-auto">
                  <div className="flex-1 md:flex-none">
                    <span className="font-semibold block text-xs text-gray-500 mb-1">Estado de Despacho</span>
                    <select 
                      value={order.delivery_status || 'Preparación'}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                      className={`border-2 rounded p-1 text-sm font-bold w-full ${
                        order.delivery_status === 'Entregado' ? 'border-green-500 text-green-600' :
                        order.delivery_status === 'En Ruta' ? 'border-blue-500 text-blue-600' :
                        'border-yellow-500 text-yellow-600'
                      }`}
                    >
                      <option value="Preparación">Preparación</option>
                      <option value="Listo para despacho">Listo para despacho</option>
                      <option value="En Ruta">En Ruta</option>
                      <option value="Entregado">Entregado</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const msg = encodeURIComponent(`Hola ${order.customer_name},\n\nTe escribimos de Origen Canino 🐶. Te queríamos avisar que tu pedido #${order.id} se encuentra en estado: *${order.delivery_status}*.\n\n¡Gracias por tu compra!`);
                      window.open(`https://wa.me/${order.customer_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${msg}`, '_blank');
                    }}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                    title="Avisar por WhatsApp (Manual)"
                  >
                    <Package size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {orders.length === 0 && (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg">No hay pedidos registrados.</p>
        </div>
      )}
    </div>
  );
};

export default DispatchManager;
