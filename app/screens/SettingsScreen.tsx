import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { auth } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  notifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showTaskCount: boolean;
  autoStartBreaks: boolean;
}

const SettingsScreen = () => {
  const { theme, toggleTheme, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    showTaskCount: true,
    autoStartBreaks: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleSetting = async (key: keyof Settings) => {
    try {
      const newSettings = {
        ...settings,
        [key]: !settings[key],
      };
      setSettings(newSettings);
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentThemeColors.background,
        borderBottomColor: currentThemeColors.border
      }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, { backgroundColor: currentThemeColors.button }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentThemeColors.primary }]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.section, { 
          backgroundColor: currentThemeColors.background,
          borderColor: currentThemeColors.border,
          borderWidth: 1
        }]}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.primary }]}>Notifications</Text>
          <View style={[styles.settingItem, { borderBottomColor: currentThemeColors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="notifications" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.settingLabel, { color: currentThemeColors.primary }]}>Enable Notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={() => toggleSetting('notifications')}
              trackColor={{ false: currentThemeColors.border, true: currentThemeColors.success }}
              thumbColor={settings.notifications ? currentThemeColors.primary : '#f4f3f4'}
            />
          </View>
          <View style={[styles.settingItem, { borderBottomColor: currentThemeColors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="volume-up" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.settingLabel, { color: currentThemeColors.primary }]}>Sound</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: currentThemeColors.border, true: currentThemeColors.success }}
              thumbColor={settings.soundEnabled ? currentThemeColors.primary : '#f4f3f4'}
            />
          </View>
          <View style={[styles.settingItem, { borderBottomColor: currentThemeColors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="vibration" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.settingLabel, { color: currentThemeColors.primary }]}>Vibration</Text>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: currentThemeColors.border, true: currentThemeColors.success }}
              thumbColor={settings.vibrationEnabled ? currentThemeColors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: currentThemeColors.background,
          borderColor: currentThemeColors.border,
          borderWidth: 1
        }]}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.primary }]}>Appearance</Text>
          <View style={[styles.settingItem, { borderBottomColor: currentThemeColors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="dark-mode" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.settingLabel, { color: currentThemeColors.primary }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: currentThemeColors.border, true: currentThemeColors.success }}
              thumbColor={isDark ? currentThemeColors.primary : '#f4f3f4'}
            />
          </View>
          <View style={[styles.settingItem, { borderBottomColor: currentThemeColors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="format-list-numbered" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.settingLabel, { color: currentThemeColors.primary }]}>Show Task Count</Text>
            </View>
            <Switch
              value={settings.showTaskCount}
              onValueChange={() => toggleSetting('showTaskCount')}
              trackColor={{ false: currentThemeColors.border, true: currentThemeColors.success }}
              thumbColor={settings.showTaskCount ? currentThemeColors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: currentThemeColors.background,
          borderColor: currentThemeColors.border,
          borderWidth: 1
        }]}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.primary }]}>Pomodoro</Text>
          <View style={[styles.settingItem, { borderBottomColor: currentThemeColors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="timer" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.settingLabel, { color: currentThemeColors.primary }]}>Auto-start Breaks</Text>
            </View>
            <Switch
              value={settings.autoStartBreaks}
              onValueChange={() => toggleSetting('autoStartBreaks')}
              trackColor={{ false: currentThemeColors.border, true: currentThemeColors.success }}
              thumbColor={settings.autoStartBreaks ? currentThemeColors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: currentThemeColors.background,
          borderColor: currentThemeColors.border,
          borderWidth: 1
        }]}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.primary }]}>About</Text>
          <View style={[styles.settingItem, { borderBottomColor: currentThemeColors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="info" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.settingLabel, { color: currentThemeColors.primary }]}>Version</Text>
            </View>
            <Text style={[styles.settingValue, { color: currentThemeColors.text }]}>1.0.0</Text>
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: currentThemeColors.background,
          borderColor: currentThemeColors.border,
          borderWidth: 1
        }]}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.primary }]}>Account</Text>
          <TouchableOpacity 
            style={[styles.settingItem, styles.logoutButton]} 
            onPress={handleSignOut}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons name="logout" size={24} color={currentThemeColors.error} />
              <Text style={[styles.settingLabel, styles.logoutText]}>Log Out</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={currentThemeColors.text} />
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
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
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 16,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ff6b6b',
  },
});

export default SettingsScreen;