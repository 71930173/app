import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [staff, setStaff] = useState(null);
  const [userType, setUserType] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        'token', 'userType', 'user',
        'adminToken', 'adminData',
        'staffToken', 'staffData',
      ]);
    } catch (error) {
      console.error('Logout storage error:', error);
    }
    setUser(null);
    setAdmin(null);
    setStaff(null);
    setUserType(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const adminToken = await AsyncStorage.getItem('adminToken');
        const adminData = await AsyncStorage.getItem('adminData');
        if (adminToken && adminData) {
          const parsed = JSON.parse(adminData);
          setAdmin(parsed);
          setUser(parsed);
          setUserType('admin');
          setIsAuthenticated(true);
          api.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
          setIsLoading(false);
          return;
        }

        const staffToken = await AsyncStorage.getItem('staffToken');
        const staffData = await AsyncStorage.getItem('staffData');
        if (staffToken && staffData) {
          const parsed = JSON.parse(staffData);
          setStaff(parsed);
          setUser(parsed);
          setUserType('staff');
          setIsAuthenticated(true);
          api.defaults.headers.common['Authorization'] = `Bearer ${staffToken}`;
          setIsLoading(false);
          return;
        }

        const storedToken = await AsyncStorage.getItem('token');
        const storedUserType = await AsyncStorage.getItem('userType');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedToken && storedUserType && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setUserType(storedUserType);
          setIsAuthenticated(true);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials, type) => {
    try {
      let endpoint;
      switch (type) {
        case 'student':
          endpoint = '/auth/student/login';
          break;
        case 'guest':
          endpoint = '/auth/guest/login';
          break;
        case 'staff':
          endpoint = '/auth/staff/login';
          break;
        case 'admin':
          endpoint = '/auth/admin/login';
          break;
        default:
          throw new Error('Invalid user type');
      }

      const response = await api.post(endpoint, credentials);

      if (response.data && response.data.success) {
        const newToken = response.data.token;
        const userData = response.data[type]
          || response.data.student
          || response.data.guest
          || response.data.staff
          || response.data.admin;

        if (type === 'admin') {
          await AsyncStorage.setItem('adminToken', newToken);
          await AsyncStorage.setItem('adminData', JSON.stringify(userData));
          setAdmin(userData);
        } else if (type === 'staff') {
          await AsyncStorage.setItem('staffToken', newToken);
          await AsyncStorage.setItem('staffData', JSON.stringify(userData));
          setStaff(userData);
        } else {
          await AsyncStorage.setItem('token', newToken);
          await AsyncStorage.setItem('userType', type);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
        }

        setUser(userData);
        setUserType(type);
        setIsAuthenticated(true);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        return { success: true, user: userData };
      }
      return { success: false, error: response.data?.error || 'Login failed' };
    } catch (error) {
      let message = 'Login failed';
      if (error.response) {
        const data = error.response.data;
        if (data && typeof data === 'object' && data.error) {
          message = data.error;
        } else if (error.response.status === 401) {
          message = 'Invalid credentials';
        } else if (error.response.status === 500) {
          message = 'Server error, please try again';
        }
      } else if (error.request) {
        message = 'Cannot connect to server. Check your internet and ensure the backend is running.';
      }
      return { success: false, error: message };
    }
  }, []);

  const signup = useCallback(async (data, type) => {
    try {
      let endpoint;
      let requestData = data;

      if (type === 'guest') {
        endpoint = '/auth/guest/signup';
        requestData = {
          first_name: data.firstName || data.first_name,
          last_name: data.lastName || data.last_name,
          contact_value: data.contactValue || data.contact_value,
          contact_method: data.contactMethod || data.contact_method || 'phone',
          password: data.password,
          language: data.language || 'en',
        };
      } else if (type === 'student') {
        endpoint = '/auth/student/signup';
      } else {
        endpoint = '/auth/signup';
      }

      const response = await api.post(endpoint, requestData);

      if (response.data && response.data.success) {
        const newToken = response.data.token;
        const userData = response.data[type]
          || response.data.student
          || response.data.guest;

        if (newToken && userData) {
          await AsyncStorage.setItem('token', newToken);
          await AsyncStorage.setItem('userType', type);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          setUserType(type);
          setIsAuthenticated(true);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        }

        return { success: true, user: userData };
      }
      return { success: false, error: response.data?.error || 'Signup failed' };
    } catch (error) {
      let message = 'Signup failed';
      if (error.response) {
        const data = error.response.data;
        if (data && typeof data === 'object' && data.error) {
          message = data.error;
        } else if (error.response.status === 409) {
          message = 'Account already exists';
        } else if (error.response.status === 500) {
          message = 'Server error';
        }
      } else if (error.request) {
        message = 'Cannot connect to server. Check your internet.';
      }
      return { success: false, error: message };
    }
  }, []);

  const updateUser = useCallback(async (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem('user', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const value = {
    user,
    userType,
    isAuthenticated,
    isLoading,
    admin,
    staff,
    login,
    signup,
    logout,
    updateUser,
    isStudent: userType === 'student',
    isGuest: userType === 'guest',
    isStaff: userType === 'staff',
    isAdmin: userType === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
