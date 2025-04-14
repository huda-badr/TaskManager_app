import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

const SettingsScreen = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    autoStartBreaks: true,
    showTaskCount: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    saveSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, isDark && styles.darkButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.section, isDark && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Notifications</Text>
          <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="notifications" size={24} color={isDark ? '#fff' : '#666'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Enable Notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={() => toggleSetting('notifications')}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.notifications ? '#2196F3' : '#f4f3f4'}
            />
          </View>
          <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="volume-up" size={24} color={isDark ? '#fff' : '#666'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Sound</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.soundEnabled ? '#2196F3' : '#f4f3f4'}
            />
          </View>
          <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="vibration" size={24} color={isDark ? '#fff' : '#666'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Vibration</Text>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.vibrationEnabled ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, isDark && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Appearance</Text>
          <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="dark-mode" size={24} color={isDark ? '#fff' : '#666'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isDark ? '#2196F3' : '#f4f3f4'}
            />
          </View>
          <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="format-list-numbered" size={24} color={isDark ? '#fff' : '#666'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Show Task Count</Text>
            </View>
            <Switch
              value={settings.showTaskCount}
              onValueChange={() => toggleSetting('showTaskCount')}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.showTaskCount ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, isDark && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Pomodoro</Text>
          <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="timer" size={24} color={isDark ? '#fff' : '#666'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Auto-start Breaks</Text>
            </View>
            <Switch
              value={settings.autoStartBreaks}
              onValueChange={() => toggleSetting('autoStartBreaks')}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.autoStartBreaks ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, isDark && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>About</Text>
          <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="info" size={24} color={isDark ? '#fff' : '#666'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Version</Text>
            </View>
            <Text style={[styles.settingValue, isDark && styles.darkText]}>1.0.0</Text>
          </View>
        </View>

        <View style={[styles.section, isDark && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Account</Text>
          <TouchableOpacity 
            style={[styles.settingItem, isDark && styles.darkSettingItem, styles.logoutButton]} 
            onPress={handleSignOut}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons name="logout" size={24} color={isDark ? '#ff6b6b' : '#ff6b6b'} />
              <Text style={[styles.settingLabel, isDark && styles.darkText, styles.logoutText]}>Log Out</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={isDark ? '#666' : '#999'} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  darkHeader: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  darkButton: {
    backgroundColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#fff',
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkSection: {
    backgroundColor: '#1E1E1E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  darkSettingItem: {
    borderBottomColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ff6b6b',
  },
});

export default SettingsScreen; 