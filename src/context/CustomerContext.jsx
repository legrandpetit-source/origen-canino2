import React, { createContext, useContext, useState, useEffect } from 'react';

const CustomerContext = createContext();

export const useCustomer = () => useContext(CustomerContext);

export const CustomerProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('customer_token') || null);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'
  const [onAuthSuccessCallback, setOnAuthSuccessCallback] = useState(null);

  // Helper fetch with auth
  const fetchWithCustomerAuth = async (url, options = {}) => {
    const currentToken = token || localStorage.getItem('customer_token');
    const headers = {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
    };
    return fetch(url, { ...options, headers });
  };

  const loadProfile = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) {
      setCustomer(null);
      setDogs([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/customer/me', {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setDogs(data.dogs || []);
      } else {
        // Token inválido o expirado
        logout();
      }
    } catch (err) {
      console.error("Error loading customer profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error al iniciar sesión');
    }

    localStorage.setItem('customer_token', data.access_token);
    setToken(data.access_token);
    setCustomer(data.customer);
    setDogs(data.dogs || []);
    setIsAuthModalOpen(false);

    if (onAuthSuccessCallback) {
      onAuthSuccessCallback(data.customer);
      setOnAuthSuccessCallback(null);
    }

    return data;
  };

  const register = async (formData) => {
    const res = await fetch('/api/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error al registrar la cuenta');
    }

    localStorage.setItem('customer_token', data.access_token);
    setToken(data.access_token);
    setCustomer(data.customer);
    setDogs(data.dogs || []);
    setIsAuthModalOpen(false);

    if (onAuthSuccessCallback) {
      onAuthSuccessCallback(data.customer);
      setOnAuthSuccessCallback(null);
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem('customer_token');
    setToken(null);
    setCustomer(null);
    setDogs([]);
  };

  const updateProfile = async (profileData) => {
    const res = await fetchWithCustomerAuth('/api/customer/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar perfil');
    setCustomer(data.customer);
    return data.customer;
  };

  const addDog = async (dogData) => {
    const res = await fetchWithCustomerAuth('/api/customer/dogs', {
      method: 'POST',
      body: JSON.stringify(dogData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al agregar mascota');
    setDogs(prev => [...prev, data.dog]);
    return data.dog;
  };

  const updateDog = async (dogId, dogData) => {
    const res = await fetchWithCustomerAuth(`/api/customer/dogs/${dogId}`, {
      method: 'PUT',
      body: JSON.stringify(dogData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar mascota');
    setDogs(prev => prev.map(d => d.id === dogId ? data.dog : d));
    return data.dog;
  };

  const deleteDog = async (dogId) => {
    const res = await fetchWithCustomerAuth(`/api/customer/dogs/${dogId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al eliminar mascota');
    setDogs(prev => prev.filter(d => d.id !== dogId));
    return true;
  };

  const uploadDogPhoto = async (dogId, file) => {
    const currentToken = token || localStorage.getItem('customer_token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/customer/dogs/${dogId}/upload-photo`, {
      method: 'POST',
      headers: {
        ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al subir foto');
    setDogs(prev => prev.map(d => d.id === dogId ? { ...d, photo_url: data.photo_url } : d));
    return data.photo_url;
  };

  const fetchOrders = async () => {
    const res = await fetchWithCustomerAuth('/api/customer/orders');
    if (!res.ok) throw new Error('Error al cargar pedidos');
    return res.json();
  };

  const openAuthModal = (mode = 'login', onSuccess = null) => {
    setAuthModalMode(mode);
    setOnAuthSuccessCallback(() => onSuccess);
    setIsAuthModalOpen(true);
  };

  return (
    <CustomerContext.Provider value={{
      customer,
      dogs,
      token,
      loading,
      isAuthModalOpen,
      authModalMode,
      setAuthModalMode,
      setIsAuthModalOpen,
      openAuthModal,
      login,
      register,
      logout,
      updateProfile,
      addDog,
      updateDog,
      deleteDog,
      uploadDogPhoto,
      fetchOrders,
      fetchWithCustomerAuth
    }}>
      {children}
    </CustomerContext.Provider>
  );
};

