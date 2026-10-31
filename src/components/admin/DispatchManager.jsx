import React, { useState } from 'react';
import { Truck, Package, MapPin, Building2, CheckCircle2, CreditCard, Landmark } from 'lucide-react';

const DispatchManager = ({ orders, handleUpdateOrderStatus, handleDeleteOrder }) => {
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterBuilding, setFilterBuilding] = useState('ALL');

  // Group orders by city
  const groupedOrders = orders.reduce((acc, order) => {
    const city = order.customer_city || 'Sin Comuna';
    if (!acc[city]) acc[city] = [];
    acc[city].push(order);
    return acc;
  }, {});

  const cities = Object.keys(groupedOrders).sort();

  // Lista de edificios únicos presentes en las órdenes
  const buildings = Array.from(new Set(orders.map(o => o.nfc_building_code).filter(Boolean)));

  const handleStatusChange = (order, newStatus) => {
    handleUpdateOrderStatus(order.id, { delivery_status: newStatus });
    
    // Automatically open WhatsApp if status changed to "En Ruta"
    if (newStatus === 'En Ruta') {
      const msg = encodeURIComponent(`Hola ${order.customer_name},\n\nTe escribimos de Origen Canino 🐶. ¡Buenas noticias! Tu pedido #${order.id} ya se encuentra *En Ruta* y va camino a tu domicilio en ${order.customer_city}.\n\n¡Gracias por tu compra!`);
      window.open(`https://wa.me/${order.customer_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${msg}`, '_blank');
    }
  };

  const handleValidateTransfer = (orderId) => {
    if (window.confirm(`¿Confirmas que recibiste la transferencia para el pedido #${orderId}? Se marcará como PAGADO.`)) {
      handleUpdateOrderStatus(orderId, { payment_status: 'Pagado' });
    }
  };

  const filteredOrdersByBuilding = (orderList) => {
    if (filterBuilding === 'ALL') return orderList;
    return orderList.filter(o => o.nfc_building_code === filterBuilding);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-gray-200 gap-3">
        <h3 className="font-header text-2xl text-secondary-brown flex items-center gap-2">
          <Truck className="text-primary-green" /> 
          Logística y Despacho
        </h3>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro por Edificio NFC */}
          {buildings.length > 0 && (
            <select 
              className="border rounded-lg p-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-primary-green"
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
            >
              <option value="ALL">🏢 Todos los Edificios NFC</option>
              {buildings.map(b => (
                <option key={b} value={b}>Edificio: {b}</option>
              ))}
            </select>
          )}

          {/* Filtro por Comuna */}
          <select 
            className="border rounded-lg p-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-primary-green"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          >
            <option value="ALL">Todas las Comunas</option>
            {cities.map(city => (
              <option key={city} value={city}>{city} ({groupedOrders[city].length})</option>
            ))}
          </select>
        </div>
      </div>

      {cities.filter(c => filterCity === 'ALL' || filterCity === c).map(city => {
        const cityOrders = filteredOrdersByBuilding(groupedOrders[city]);
        if (cityOrders.length === 0) return null;

        return (
          <div key={city} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="text-primary-green" size={20} />
                <h4 className="font-bold text-lg text-gray-800">{city}</h4>
              </div>
              <span className="bg-primary-green/10 text-primary-green-dark text-xs px-2.5 py-1 rounded-full font-bold">
                {cityOrders.length} Pedidos
              </span>
            </div>
            
            <div className="divide-y divide-gray-100">
              {cityOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50/80 transition flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-primary-green-dark">Orden #{order.id}</h4>
                      
                      {/* Estado de Pago */}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        order.payment_status === 'Pagado' 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      }`}>
                        {order.payment_status === 'Pagado' ? <CheckCircle2 size={12} /> : null}
                        {order.payment_status || 'Pendiente'}
                      </span>

                      {/* Método de Pago */}
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-700 flex items-center gap-1">
                        {order.payment_method === 'mercadopago' ? (
                          <>
                            <CreditCard size={12} className="text-blue-600" /> Mercado Pago
                          </>
                        ) : (
                          <>
                            <Landmark size={12} className="text-orange-600" /> Transferencia
                          </>
                        )}
                      </span>

                      {/* Tag Comunidad NFC si existe */}
                      {order.nfc_building_code && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Building2 size={12} /> NFC: {order.nfc_building_code}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-gray-800">
                      {order.customer_name} <span className="text-xs text-gray-400 font-normal">({order.customer_phone})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      📍 {order.customer_address}
                    </p>

                    {/* Si es transferencia, mostrar banco y comprobante con opción de validar */}
                    {order.payment_method === 'transferencia' && (
                      <div className="text-xs bg-amber-50/70 border border-amber-200/60 p-2 rounded-lg text-amber-900 flex flex-wrap items-center justify-between gap-2 mt-1">
                        <div>
                          <span>Banco Emisor: <strong>{order.transfer_bank || 'No especificado'}</strong></span>
                          <span className="mx-2">•</span>
                          <span>N° Comprobante: <strong>{order.transfer_receipt_number || 'Sin N°'}</strong></span>
                        </div>
                        {order.payment_status !== 'Pagado' && (
                          <button
                            type="button"
                            onClick={() => handleValidateTransfer(order.id)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md transition shadow-xs flex items-center gap-1"
                          >
                            <CheckCircle2 size={13} /> Validar Transferencia
                          </button>
                        )}
                      </div>
                    )}

                    {/* Productos comprados y Total */}
                    <div className="text-xs text-gray-600 pt-1 flex flex-wrap items-center gap-2">
                      <span>Monto: <strong className="text-primary-green-dark">${order.total?.toLocaleString('es-CL')}</strong></span>
                      {order.discount_amount > 0 && (
                        <span className="text-green-600">(Desc: -${order.discount_amount.toLocaleString('es-CL')})</span>
                      )}
                      <span>• Perro: {order.dog_name || 'N/A'} ({order.dog_weight || '0'} Kg)</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-center w-full md:w-auto">
                    <div className="flex-1 md:flex-none min-w-[150px]">
                      <span className="font-semibold block text-[10px] uppercase text-gray-500 mb-1">Estado de Entrega</span>
                      <select 
                        value={order.delivery_status || 'Preparación'}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        className={`border rounded-lg p-1.5 text-xs font-bold w-full outline-none ${
                          order.delivery_status === 'Entregado' ? 'border-green-500 text-green-700 bg-green-50' :
                          order.delivery_status === 'En Ruta' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                          'border-yellow-500 text-yellow-700 bg-yellow-50'
                        }`}
                      >
                        <option value="Preparación">Preparación</option>
                        <option value="Listo para despacho">Listo para despacho</option>
                        <option value="En Ruta">En Ruta (Avisar WA)</option>
                        <option value="Entregado">Entregado</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={() => {
                        const msg = encodeURIComponent(`Hola ${order.customer_name},\n\nTe escribimos de Origen Canino 🐶. Te queríamos avisar que tu pedido #${order.id} se encuentra en estado: *${order.delivery_status}*.\n\n¡Gracias por tu compra!`);
                        window.open(`https://wa.me/${order.customer_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${msg}`, '_blank');
                      }}
                      className="p-2.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition mt-4 md:mt-0"
                      title="Avisar por WhatsApp (Manual)"
                    >
                      <Package size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {orders.length === 0 && (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg">No hay pedidos registrados.</p>
        </div>
      )}
    </div>
  );
};

export default DispatchManager;
