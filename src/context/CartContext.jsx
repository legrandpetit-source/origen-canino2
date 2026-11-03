import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [dogData, setDogData] = useState({ name: '', weight: '', age: '' });
  
  // Promoción de Primera Compra
  const [firstOrderPromo, setFirstOrderPromo] = useState({
    enabled: true,
    percent: 10,
    code: 'BIENVENIDO10',
    title: '¡10% OFF en tu primera compra!'
  });

  const [hasPurchased, setHasPurchased] = useState(() => {
    return localStorage.getItem('origencanino_has_purchased') === 'true';
  });

  useEffect(() => {
    fetch('/api/promotions/first-order')
      .then(res => res.json())
      .then(data => {
        if (data) setFirstOrderPromo(data);
      })
      .catch(err => console.error("Error cargando promo:", err));
  }, []);

  const markAsPurchased = () => {
    setHasPurchased(true);
    try {
      localStorage.setItem('origencanino_has_purchased', 'true');
    } catch (e) {
      console.error(e);
    }
  };

  // Comunidad NFC (Edificio/Condominio)
  const [nfcCommunity, setNfcCommunityState] = useState(() => {
    try {
      const saved = localStorage.getItem('origencanino_nfc_community');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setNfcCommunity = (community) => {
    setNfcCommunityState(community);
    if (community) {
      try {
        localStorage.setItem('origencanino_nfc_community', JSON.stringify(community));
      } catch (e) {
        console.error("Error guardando comunidad NFC en localStorage:", e);
      }
    } else {
      localStorage.removeItem('origencanino_nfc_community');
    }
  };

  const clearNfcCommunity = () => {
    setNfcCommunityState(null);
    localStorage.removeItem('origencanino_nfc_community');
  };

  const addItem = (product, quantity = 1) => {
    setItems(current => {
      const existing = current.find(item => item.id === product.id);
      if (existing) {
        return current.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...current, { ...product, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (productId) => {
    setItems(current => current.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) return removeItem(productId);
    setItems(current => current.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Descuento NFC calculado
  const nfcDiscount = (nfcCommunity && nfcCommunity.discount_percent > 0)
    ? Math.round(total * (nfcCommunity.discount_percent / 100))
    : 0;

  // Descuento Primera Compra (si está habilitado y es nuevo comprador)
  const isFirstPurchaseEligible = !hasPurchased;
  const firstOrderDiscount = (firstOrderPromo?.enabled && isFirstPurchaseEligible && total > 0)
    ? Math.round(total * (Number(firstOrderPromo.percent) / 100))
    : 0;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart, total, itemCount,
      isCartOpen, setIsCartOpen, dogData, setDogData,
      nfcCommunity, setNfcCommunity, clearNfcCommunity, nfcDiscount,
      firstOrderPromo, firstOrderDiscount, isFirstPurchaseEligible, markAsPurchased
    }}>
      {children}
    </CartContext.Provider>
  );
};
