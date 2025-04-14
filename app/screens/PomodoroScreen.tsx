import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

const PomodoroScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState({
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
  });

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const initializeScreen = async () => {
        if (!isInitialized) {
          await loadSessions();
          await loadSettings();
          setIsInitialized(true);
        }
      };

      initializeScreen();

      return () => {
        // Cleanup when screen loses focus
        setIsActive(false);
      };
    }, [isInitialized])
  );

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (typeof prevTime !== 'number' || isNaN(prevTime)) {
            return settings.workDuration * 60;
          }
          const newTime = prevTime - 1;
          return newTime >= 0 ? newTime : 0;
        });
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete();
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeLeft]);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('pomodoroSessions');
      if (savedSessions) {
        const parsedSessions = parseInt(savedSessions, 10);
        if (!isNaN(parsedSessions)) {
          setSessions(parsedSessions);
        }
      }
    } catch (error) {
      console.error('Error loading pomodoro sessions:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('pomodoroSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          setSettings(parsedSettings);
          if (!isActive && !isBreak) {
            const duration = parsedSettings.workDuration * 60;
            setTimeLeft(isNaN(duration) ? 25 * 60 : duration);
          }
        }
      }
    } catch (error) {
      console.error('Error loading pomodoro settings:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      if (!isActive && !isBreak) {
        const duration = newSettings.workDuration * 60;
        setTimeLeft(isNaN(duration) ? 25 * 60 : duration);
      }
    } catch (error) {
      console.error('Error saving pomodoro settings:', error);
    }
  };

  const handleTimerComplete = async () => {
    try {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      await AsyncStorage.setItem('pomodoroSessions', newSessions.toString());

      const isLongBreak = newSessions % settings.sessionsUntilLongBreak === 0;
      const nextBreakTime = isLongBreak ? settings.longBreakDuration : settings.breakDuration;

      setIsActive(false);
      Alert.alert(
        isBreak ? 'Break Complete!' : 'Work Session Complete!',
        isBreak 
          ? 'Ready to focus again?' 
          : `Great job! Take a ${isLongBreak ? 'long ' : ''}break and stay productive!`,
        [
          {
            text: 'Continue',
            onPress: () => {
              setIsBreak(!isBreak);
              const duration = isBreak ? settings.workDuration * 60 : nextBreakTime * 60;
              setTimeLeft(isNaN(duration) ? 25 * 60 : duration);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating pomodoro sessions:', error);
    }
  };

  const toggleTimer = () => {
    if (typeof timeLeft !== 'number' || isNaN(timeLeft)) {
      setTimeLeft(settings.workDuration * 60);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    const duration = settings.workDuration * 60;
    setTimeLeft(isNaN(duration) ? 25 * 60 : duration);
    setIsBreak(false);
  };

  const formatTime = (seconds: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return '25:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleBackPress = () => {
    if (isActive) {
      Alert.alert(
        'Timer Active',
        'Are you sure you want to leave? Your current session will be lost.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              setIsActive(false);
              router.replace('/');
            }
          }
        ]
      );
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? '#121212' : '#fff'} />
      
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, isDark && styles.darkButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Pomodoro Timer</Text>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={[styles.settingsButton, isDark && styles.darkButton]}
        >
          <MaterialIcons name="settings" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, isDark && styles.darkContent]}>
        <View style={[styles.timerContainer, isDark && styles.darkTimerContainer]}>
          <Text style={[styles.timerText, isDark && styles.darkText]}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={[styles.timerLabel, isDark && styles.darkText]}>
            {isBreak ? 'Break Time' : 'Work Time'}
          </Text>
        </View>

        <View style={[styles.controls, isDark && styles.darkControls]}>
          <TouchableOpacity
            style={[styles.controlButton, isDark && styles.darkControlButton]}
            onPress={toggleTimer}
          >
            <MaterialIcons
              name={isActive ? 'pause' : 'play-arrow'}
              size={32}
              color={isDark ? '#fff' : '#333'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, isDark && styles.darkControlButton]}
            onPress={resetTimer}
          >
            <MaterialIcons name="refresh" size={32} color={isDark ? '#fff' : '#333'} />
          </TouchableOpacity>
        </View>

        <View style={[styles.statsContainer, isDark && styles.darkStatsContainer]}>
          <Text style={[styles.statsTitle, isDark && styles.darkText]}>Today's Progress</Text>
          <View style={[styles.statsGrid, isDark && styles.darkStatsGrid]}>
            <View style={[styles.statItem, isDark && styles.darkStatItem]}>
              <MaterialIcons name="timer" size={24} color={isDark ? '#fff' : '#333'} />
              <Text style={[styles.statValue, isDark && styles.darkText]}>{sessions}</Text>
              <Text style={[styles.statLabel, isDark && styles.darkText]}>Sessions</Text>
            </View>
            <View style={[styles.statItem, isDark && styles.darkStatItem]}>
              <MaterialIcons name="schedule" size={24} color={isDark ? '#fff' : '#333'} />
              <Text style={[styles.statValue, isDark && styles.darkText]}>
                {sessions * settings.workDuration}
              </Text>
              <Text style={[styles.statLabel, isDark && styles.darkText]}>Minutes</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {showSettings && (
        <View style={[styles.settingsModal, isDark && styles.darkSettingsModal]}>
          <View style={[styles.settingsContent, isDark && styles.darkSettingsContent]}>
            <Text style={[styles.settingsTitle, isDark && styles.darkText]}>Timer Settings</Text>
            
            <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Work Time (minutes)</Text>
              <View style={[styles.settingControls, isDark && styles.darkSettingControls]}>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, workDuration: Math.max(1, settings.workDuration - 1) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="remove" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.settingValue, isDark && styles.darkText]}>{settings.workDuration}</Text>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, workDuration: Math.min(60, settings.workDuration + 1) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="add" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Break Time (minutes)</Text>
              <View style={[styles.settingControls, isDark && styles.darkSettingControls]}>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, breakDuration: Math.max(1, settings.breakDuration - 1) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="remove" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.settingValue, isDark && styles.darkText]}>{settings.breakDuration}</Text>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, breakDuration: Math.min(30, settings.breakDuration + 1) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="add" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Long Break Time (minutes)</Text>
              <View style={[styles.settingControls, isDark && styles.darkSettingControls]}>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, longBreakDuration: Math.max(5, settings.longBreakDuration - 5) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="remove" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.settingValue, isDark && styles.darkText]}>{settings.longBreakDuration}</Text>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, longBreakDuration: Math.min(60, settings.longBreakDuration + 5) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="add" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.settingItem, isDark && styles.darkSettingItem]}>
              <Text style={[styles.settingLabel, isDark && styles.darkText]}>Sessions Until Long Break</Text>
              <View style={[styles.settingControls, isDark && styles.darkSettingControls]}>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, sessionsUntilLongBreak: Math.max(2, settings.sessionsUntilLongBreak - 1) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="remove" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.settingValue, isDark && styles.darkText]}>{settings.sessionsUntilLongBreak}</Text>
                <TouchableOpacity
                  onPress={() => saveSettings({ ...settings, sessionsUntilLongBreak: Math.min(8, settings.sessionsUntilLongBreak + 1) })}
                  style={[styles.settingButton, isDark && styles.darkSettingButton]}
                >
                  <MaterialIcons name="add" size={24} color={isDark ? '#fff' : '#333'} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, isDark && styles.darkCloseButton]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={[styles.closeButtonText, isDark && styles.darkText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  darkContent: {
    backgroundColor: '#121212',
  },
  timerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkTimerContainer: {
    backgroundColor: '#1E1E1E',
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  darkControls: {
    backgroundColor: 'transparent',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  darkControlButton: {
    backgroundColor: '#1E1E1E',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkStatsContainer: {
    backgroundColor: '#1E1E1E',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  darkStatsGrid: {
    backgroundColor: 'transparent',
  },
  statItem: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    minWidth: 120,
  },
  darkStatItem: {
    backgroundColor: '#333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  settingsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkSettingsModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  settingsContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  darkSettingsContent: {
    backgroundColor: '#1E1E1E',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  darkSettingItem: {
    backgroundColor: 'transparent',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  darkSettingControls: {
    backgroundColor: '#333',
  },
  settingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkSettingButton: {
    backgroundColor: '#1E1E1E',
  },
  settingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  darkCloseButton: {
    backgroundColor: '#333',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default PomodoroScreen; 