import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import { auth } from '../config/firebase';
import { useAuth } from './AuthContext';

interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  border: string;
  button: string;
  buttonSecondary?: string;
  text: string;
  success: string;
  warning: string;
  error: string;
}

export interface CustomTheme {
  name: string;
  colors: ThemeColors;
  price?: number;
}

type ThemeType = 'light' | 'dark' | string; // string for custom theme names

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  setCustomTheme: (themeName: string) => void;
  currentThemeColors: ThemeColors;
  availableThemes: CustomTheme[];
}

const defaultLightColors: ThemeColors = {
  primary: '#9E9E9E', // Changed to a darker gray
  secondary: '#666666',
  tertiary: '#999999',
  background: '#FFFFFF',
  border: 'transparent', // Transparent borders
  button: '#9E9E9E', // Matching the primary color
  buttonSecondary: '#E0E0E0', // Light gray for secondary buttons
  text: '#000000', // Pure black
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#FF6B6B'
};

const defaultDarkColors: ThemeColors = {
  primary: '#2C6975', // Deeper teal for dark mode
  secondary: '#CCCCCC',
  tertiary: '#999999',
  background: '#121212',
  border: '#333333',
  button: '#2C6975', // Updated to match primary
  buttonSecondary: '#1A3F45', // Darker teal for secondary buttons
  text: '#FFFFFF',
  success: '#81C784',
  warning: '#FFD54F',
  error: '#FF8A80'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const [currentThemeColors, setCurrentThemeColors] = useState<ThemeColors>(defaultLightColors);
  const [availableThemes, setAvailableThemes] = useState<CustomTheme[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    loadAllThemes();
    
    if (user) {
      loadThemeFromDatabase();
    } else {
      loadThemeFromLocal();
    }
  }, [user]);

  const loadAllThemes = () => {
    // All themes with their color properties
    const allThemes = [
      {
        name: 'Minimalist Focus',
        colors: {
          primary: '#A0D9D9', // Changed from dark gray to light blue/teal
          secondary: '#4A90E2', // Keeping the main blue color
          tertiary: '#D4F1F9', // Lighter blue for tertiary elements
          background: '#4A90E2', // Main blue background
          border: '#A0D9D9', // Light blue border
          button: '#A0D9D9', // Light blue button
          buttonSecondary: '#FFFFFF', // White secondary button for contrast
          text: '#000000', // Changed to black text for better visibility
          success: '#81C784', // Slightly adjusted for better match
          warning: '#FFD54F', // Slightly adjusted for better match
          error: '#FF8A80' // Slightly adjusted for better match
        },
        price: 300
      },
      {
        name: 'Sunset Focus',
        colors: {
          primary: '#E57373',
          secondary: '#FFA87E',
          tertiary: '#3E4E5E',
          background: '#FFF3E0',
          border: '#E57373',
          button: '#FFA87E',
          text: '#3E4E5E',
          success: '#66BB6A',
          warning: '#FFA726',
          error: '#EF5350'
        },
        price: 450
      },
      {
        name: 'Summer Vibes',
        colors: {
          primary: '#FFD700',
          secondary: '#FFFAF0',
          tertiary: '#8B4513',
          background: '#FFFAF0',
          border: '#FFD700',
          button: '#FFD700',
          text: '#8B4513',
          success: '#66BB6A',
          warning: '#FFB74D',
          error: '#EF5350'
        },
        price: 400
      },
      {
        name: 'Minty Fresh',
        colors: {
          primary: '#2E8B57',
          secondary: '#00FA9A',
          tertiary: '#A0E0A0',
          background: '#F0FFF0',
          border: '#00FA9A',
          button: '#00FA9A',
          text: '#2E8B57',
          success: '#66BB6A',
          warning: '#FFA726',
          error: '#EF5350'
        },
        price: 350
      },
      {
        name: 'Ocean Wave',
        colors: {
          primary: '#00BFFF',
          secondary: '#E0FFFF',
          tertiary: '#4682B4',
          background: '#E0FFFF',
          border: '#00BFFF',
          button: '#00BFFF',
          text: '#4682B4',
          success: '#4DB6AC',
          warning: '#4FC3F7',
          error: '#FF8A80'
        },
        price: 450
      },
    ];
    
    setAvailableThemes(allThemes);
  };

  const loadThemeFromLocal = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme);
        updateThemeColors(savedTheme);
        console.log('Theme loaded from local storage:', savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme from local storage:', error);
    }
  };
  
  const loadThemeFromDatabase = async () => {
    try {
      if (!auth.currentUser) return;
      
      const userId = auth.currentUser.uid;
      const db = getDatabase();
      const themeRef = ref(db, `users/${userId}/settings/theme`);
      
      // First try to get the theme from the database
      const snapshot = await get(themeRef);
      
      if (snapshot.exists()) {
        const savedTheme = snapshot.val();
        setTheme(savedTheme);
        updateThemeColors(savedTheme);
        console.log('Theme loaded from database:', savedTheme);
        
        // Also update local storage for offline access
        await AsyncStorage.setItem('theme', savedTheme);
      } else {
        // If no theme in database, fall back to local storage
        console.log('No theme found in database, checking local storage');
        await loadThemeFromLocal();
        
        // If we found a theme in local storage, save it to the database for future use
        if (theme !== 'light') {
          await saveThemeToDatabase(theme);
        }
      }
    } catch (error) {
      console.error('Error loading theme from database:', error);
      // Fall back to local storage
      await loadThemeFromLocal();
    }
  };
  
  const saveThemeToDatabase = async (themeName: string) => {
    try {
      if (!auth.currentUser) return;
      
      const userId = auth.currentUser.uid;
      const db = getDatabase();
      const themeRef = ref(db, `users/${userId}/settings/theme`);
      
      await set(themeRef, themeName);
      console.log('Theme saved to database:', themeName);
    } catch (error) {
      console.error('Error saving theme to database:', error);
    }
  };

  const loadTheme = async () => {
    // This function is now deprecated in favor of loadThemeFromDatabase and loadThemeFromLocal
    // Keeping it for backward compatibility
    if (user) {
      await loadThemeFromDatabase();
    } else {
      await loadThemeFromLocal();
    }
  };

  const updateThemeColors = (themeName: ThemeType) => {
    if (themeName === 'light') {
      setCurrentThemeColors(defaultLightColors);
    } else if (themeName === 'dark') {
      setCurrentThemeColors(defaultDarkColors);
    } else {
      const customTheme = availableThemes.find(t => t.name === themeName);
      if (customTheme) {
        setCurrentThemeColors(customTheme.colors);
      }
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    updateThemeColors(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
      
      if (auth.currentUser) {
        await saveThemeToDatabase(newTheme);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setCustomTheme = async (themeName: string) => {
    setTheme(themeName);
    updateThemeColors(themeName);
    try {
      await AsyncStorage.setItem('theme', themeName);
      
      if (auth.currentUser) {
        await saveThemeToDatabase(themeName);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setCustomTheme, 
      currentThemeColors,
      availableThemes 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;