import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (email, password, username) => {
    const response = await api.post('/auth/register', { email, password, username });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const checkLicense = async () => {
    try {
      const response = await api.get('/auth/license');
      if (response.data.licenseStatus) {
        setUser(prev => ({ 
          ...prev, 
          licenseStatus: response.data.licenseStatus,
          licenseApprovedAt: response.data.licenseApprovedAt
        }));
      }
      return response.data;
    } catch (error) {
      console.error('License check error:', error);
      return { isLicensed: false };
    }
  };

  const isLicensed = () => {
    return user?.licenseStatus === 'active' || user?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      updateUser, 
      fetchUser,
      checkLicense,
      isLicensed
    }}>
      {children}
    </AuthContext.Provider>
  );
};
