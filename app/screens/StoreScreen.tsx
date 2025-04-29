import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { getDatabase, ref, update, get } from 'firebase/database';
import { auth } from '@/config/firebase';

const StoreScreen = () => {
  const { theme, setCustomTheme, availableThemes, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';
  const [userPoints, setUserPoints] = useState(0);
  const [purchasedThemes, setPurchasedThemes] = useState<string[]>([]);
  const [currentActiveTheme, setCurrentActiveTheme] = useState(theme);

  useEffect(() => {
    loadUserPoints();
    loadPurchasedThemes();
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  const loadUserPoints = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const db = getDatabase();
      const pointsRef = ref(db, `users/${userId}/stats/points`);
      const snapshot = await get(pointsRef);
      if (snapshot.exists()) {
        setUserPoints(snapshot.val());
      }
    } catch (error) {
      console.error('Error loading user points:', error);
    }
  };

  const loadPurchasedThemes = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const db = getDatabase();
      const themesRef = ref(db, `users/${userId}/stats/purchasedThemes`);
      const snapshot = await get(themesRef);
      if (snapshot.exists()) {
        const purchased = snapshot.val();
        setPurchasedThemes(Object.keys(purchased));
      }
    } catch (error) {
      console.error('Error loading purchased themes:', error);
    }
  };

  const handleBuyTheme = async (themeName: string, price: number) => {
    if (userPoints >= price) {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const db = getDatabase();
        const updates = {
          [`users/${userId}/stats/points`]: userPoints - price,
          [`users/${userId}/stats/purchasedThemes/${themeName}`]: true
        };

        await update(ref(db), updates);
        setUserPoints(prev => prev - price);
        setPurchasedThemes(prev => [...prev, themeName]);
        alert(`Theme "${themeName}" purchased successfully!`);
      } catch (error) {
        alert('Failed to purchase theme. Please try again.');
        console.error(error);
      }
    } else {
      alert('Not enough points to buy this theme.');
    }
  };

  const handleApplyTheme = (themeName: string) => {
    setCustomTheme(themeName);
    setCurrentActiveTheme(themeName);
    alert(`Theme "${themeName}" applied successfully!`);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentThemeColors.background,
        borderBottomColor: currentThemeColors.border 
      }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, { backgroundColor: currentThemeColors.buttonSecondary }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentThemeColors.primary }]}>Store</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={[styles.userPoints, { color: currentThemeColors.text }]}>
          Your Points: {userPoints}
        </Text>

        {availableThemes.map((themeItem, index) => (
          <View
            key={index}
            style={[styles.themeCard, { 
              backgroundColor: currentThemeColors.background,
              borderColor: currentThemeColors.border,
              borderWidth: 1 
            }]}
          >
            <Text style={[styles.themeName, { color: currentThemeColors.text }]}>
              {themeItem.name}
            </Text>
            <View style={styles.colorPalette}>
              {Object.entries(themeItem.colors).slice(0, 6).map(([key, color]) => (
                <View
                  key={key}
                  style={[styles.colorBox, { backgroundColor: color }]}
                />
              ))}
            </View>
            <Text style={[styles.themePrice, { color: currentThemeColors.secondary }]}>
              {themeItem.name === currentActiveTheme ? 'Active' : purchasedThemes.includes(themeItem.name) ? 'Purchased' : `${themeItem.price} Points`}
            </Text>
            {purchasedThemes.includes(themeItem.name) ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: themeItem.colors.button },
                  currentActiveTheme === themeItem.name && styles.activeButton
                ]}
                onPress={() => handleApplyTheme(themeItem.name)}
                disabled={currentActiveTheme === themeItem.name}
              >
                <Text style={[styles.buttonText, { 
                  color: isDark ? currentThemeColors.background : '#000000' 
                }]}>
                  {currentActiveTheme === themeItem.name ? 'Active' : 'Apply Theme'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: userPoints >= (themeItem.price || 0) ? currentThemeColors.success : currentThemeColors.buttonSecondary }
                ]}
                disabled={userPoints < (themeItem.price || 0)}
                onPress={() => handleBuyTheme(themeItem.name, themeItem.price || 0)}
              >
                <Text style={[styles.buttonText, { 
                  color: isDark ? currentThemeColors.background : '#000000'
                }]}>
                  {userPoints >= (themeItem.price || 0) ? 'Buy' : 'Not Enough Points'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  userPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  themeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  themeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  themePrice: {
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StoreScreen;