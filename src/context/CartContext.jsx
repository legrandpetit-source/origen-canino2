import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const parseWeightGrams = (weightStr) => {
  if (!weightStr) return 1000;
  const text = String(weightStr).trim().toLowerCase().replace(',', '.');
  const m = text.match(/(\d+(?:\.\d+)?)\s*(kg|k|g|gr|grs)?/);
  if (!m) return 1000;
  const val = parseFloat(m[1]);
  const unit = m[2] || '';
  if (unit.startsWith('k')) return Math.max(1, Math.round(val * 1000));
  if (unit.startsWith('g')) return Math.max(1, Math.round(val));
  return val <= 20 ? Math.max(1, Math.round(val * 1000)) : Math.max(1, Math.round(val));
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [dogData, setDogData] = useState({ name: '', weight: '', age: '' });
  const [directLinkToken, setDirectLinkToken] = useState(null);
  
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

  // Comunidad NFC (Edificio/Condominio) - Solo activo si se ingresa directamente desde NFC
  const [nfcCommunity, setNfcCommunityState] = useState(() => {
    try {
      // Limpiar residuo histórico persistente de localStorage
      localStorage.removeItem('origencanino_nfc_community');
      const saved = sessionStorage.getItem('origencanino_nfc_community');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setNfcCommunity = (community) => {
    setNfcCommunityState(community);
    if (community) {
      try {
        sessionStorage.setItem('origencanino_nfc_community', JSON.stringify(community));
      } catch (e) {
        console.error("Error guardando comunidad NFC en sessionStorage:", e);
      }
    } else {
      sessionStorage.removeItem('origencanino_nfc_community');
    }
  };

  const clearNfcCommunity = () => {
    setNfcCommunityState(null);
    sessionStorage.removeItem('origencanino_nfc_community');
    localStorage.removeItem('origencanino_nfc_community');
  };

  const addItem = (product, quantity = 1) => {
    setItems(current => {
      const existing = current.find(item => item.id === product.id);
      const nextQty = (existing ? existing.quantity : 0) + quantity;
      if (product.has_batches && product.stock_disponible_gramos != null) {
        const unitG = parseWeightGrams(product.weight);
        const maxQty = Math.floor(product.stock_disponible_gramos / unitG);
        if (nextQty > maxQty) return current;
      }
      if (existing) {
        return current.map(item => 
          item.id === product.id ? { ...item, quantity: nextQty } : item
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
    setItems(current => current.map(item => {
      if (item.id !== productId) return item;
      if (item.has_batches && item.stock_disponible_gramos != null) {
        const unitG = parseWeightGrams(item.weight);
        const maxQty = Math.floor(item.stock_disponible_gramos / unitG);
        if (newQuantity > maxQty) return { ...item, quantity: Math.max(1, maxQty) };
      }
      return { ...item, quantity: newQuantity };
    }));
  };

  const loadAssistedCart = (assistedItems, token) => {
    setDirectLinkToken(token);
    setItems(assistedItems || []);
  };

  const clearCart = () => {
    setItems([]);
    setDirectLinkToken(null);
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Descuento NFC calculado (anulado en links de pago directo sin descuento)
  const nfcDiscount = (!directLinkToken && nfcCommunity && nfcCommunity.discount_percent > 0)
    ? Math.round(total * (nfcCommunity.discount_percent / 100))
    : 0;

  // Descuento Primera Compra (anulado en links de pago directo sin descuento)
  const isFirstPurchaseEligible = !hasPurchased && !directLinkToken;
  const firstOrderDiscount = (!directLinkToken && firstOrderPromo?.enabled && isFirstPurchaseEligible && total > 0)
    ? Math.round(total * (Number(firstOrderPromo.percent) / 100))
    : 0;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart, total, itemCount,
      isCartOpen, setIsCartOpen, dogData, setDogData,
      nfcCommunity, setNfcCommunity, clearNfcCommunity, nfcDiscount,
      firstOrderPromo, firstOrderDiscount, isFirstPurchaseEligible, markAsPurchased,
      directLinkToken, setDirectLinkToken, loadAssistedCart
    }}>
      {children}
    </CartContext.Provider>
  );
};
