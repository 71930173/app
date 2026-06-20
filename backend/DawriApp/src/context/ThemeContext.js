import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

const lightColors = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#10b981',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  overlay: 'rgba(0,0,0,0.5)',
  gradientStart: '#2563eb',
  gradientEnd: '#1d4ed8',
};

const darkColors = {
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  secondary: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
  success: '#34d399',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceVariant: '#334155',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  borderLight: '#1e293b',
  overlay: 'rgba(0,0,0,0.7)',
  gradientStart: '#3b82f6',
  gradientEnd: '#2563eb',
};

export const issueColors = {
  1: '#2563eb',
  2: '#10b981',
  3: '#f59e0b',
  4: '#8b5cf6',
  5: '#ec4899',
  6: '#64748b',
};

export const statusColors = {
  waiting: '#f59e0b',
  serving: '#3b82f6',
  served: '#10b981',
  cancelled: '#ef4444',
  paused: '#8b5cf6',
  no_show: '#64748b',
  resolved_remotely: '#06b6d4',
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('darkMode');
        if (saved !== null) {
          setIsDarkMode(saved === 'true');
        } else {
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Load theme error:', error);
      } finally {
        setThemeLoaded(true);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  const toggleDarkMode = useCallback(async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem('darkMode', String(newValue));
    } catch (error) {
      console.error('Save theme error:', error);
    }
  }, [isDarkMode]);

  const theme = isDarkMode ? darkColors : lightColors;

  if (!themeLoaded) return null;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme, issueColors, statusColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
