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

  // Catálogo de stock vivo para validación centralizada
  const [catalogStock, setCatalogStock] = useState({});

  const refreshCatalogStock = () => {
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const map = {};
          data.forEach(p => {
            map[p.id] = {
              id: p.id,
              name: p.name,
              weight: p.weight,
              price: p.price,
              stock_disponible_gramos: p.stock_disponible_gramos ?? 0,
              has_batches: !!p.has_batches
            };
          });
          setCatalogStock(map);
        }
      })
      .catch(err => console.error("Error refreshing catalog stock in CartContext:", err));
  };

  useEffect(() => {
    refreshCatalogStock();
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

  // Promoción activa por enlace directo (?promo=CODIGO) — pre-aplicable al carrito
  const [activePromo, setActivePromoState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('origencanino_active_promo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setActivePromo = (promo) => {
    setActivePromoState(promo);
    if (promo) {
      try {
        sessionStorage.setItem('origencanino_active_promo', JSON.stringify(promo));
      } catch {}
    } else {
      sessionStorage.removeItem('origencanino_active_promo');
    }
  };

  const clearActivePromo = () => setActivePromo(null);

  const addItem = (product, quantity = 1) => {
    // Info de stock fresca: buscar en catalogStock centralizado o en product
    const stockInfo = catalogStock[product.id] || product;
    const availG = (stockInfo.stock_disponible_gramos != null)
      ? stockInfo.stock_disponible_gramos
      : (product.stock_disponible_gramos ?? 0);
    const unitG = parseWeightGrams(product.weight || stockInfo.weight) || 1000;
    const maxQty = Math.floor(availG / unitG);

    // Si el producto no tiene lote activo con stock para al menos 1 unidad, bloqueo absoluto
    if (maxQty <= 0) {
      console.warn(`[Cart] ${product.name} no cuenta con lote semanal activo con stock suficiente (${availG}g / ${unitG}g). Bloqueado.`);
      return false;
    }

    let addedSuccessfully = true;
    setItems(current => {
      const existing = current.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= maxQty) {
        addedSuccessfully = false;
        return current;
      }
      const targetQty = currentQty + quantity;
      const nextQty = Math.min(targetQty, maxQty);

      if (existing) {
        return current.map(item => 
          item.id === product.id 
            ? { ...item, quantity: nextQty, stock_disponible_gramos: availG, maxQty } 
            : item
        );
      }
      return [...current, { ...product, quantity: nextQty, stock_disponible_gramos: availG, maxQty }];
    });
    setIsCartOpen(true);
    return addedSuccessfully;
  };

  const removeItem = (productId) => {
    setItems(current => current.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) return removeItem(productId);
    setItems(current => current.map(item => {
      if (item.id !== productId) return item;
      const stockInfo = catalogStock[productId] || item;
      const availG = (stockInfo.stock_disponible_gramos != null)
        ? stockInfo.stock_disponible_gramos
        : (item.stock_disponible_gramos ?? 0);
      const unitG = parseWeightGrams(item.weight || stockInfo.weight) || 1000;
      const maxQty = Math.floor(availG / unitG);

      if (maxQty <= 0) {
        return { ...item, maxQty: 0, stock_disponible_gramos: 0 };
      }
      const cappedQty = Math.min(newQuantity, maxQty);
      return { ...item, quantity: cappedQty, maxQty, stock_disponible_gramos: availG };
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

  // Kilos totales SOLO en dietas (BARF + Cocinada; excluye snacks/caldos)
  const dietKg = Number(
    (
      items.reduce((sumG, item) => {
        const pType = String(item.type || 'barf').toLowerCase();
        if (pType === 'snack') return sumG;
        const unitG = parseWeightGrams(item.weight) || 1000;
        return sumG + unitG * (item.quantity || 0);
      }, 0) / 1000
    ).toFixed(2)
  );

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
      items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, dietKg,
      isCartOpen, setIsCartOpen, dogData, setDogData,
      nfcCommunity, setNfcCommunity, clearNfcCommunity, nfcDiscount,
      activePromo, setActivePromo, clearActivePromo,
      firstOrderPromo, firstOrderDiscount, isFirstPurchaseEligible, markAsPurchased,
      directLinkToken, setDirectLinkToken, loadAssistedCart,
      catalogStock, refreshCatalogStock
    }}>
      {children}
    </CartContext.Provider>
  );
};
