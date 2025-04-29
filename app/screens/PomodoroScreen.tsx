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
  const { theme, currentThemeColors } = useTheme();
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
            },
          },
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
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              setIsActive(false);
              router.replace('/');
            },
          },
        ]
      );
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={currentThemeColors.background} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: currentThemeColors.background,
            borderBottomColor: currentThemeColors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, { backgroundColor: currentThemeColors.buttonSecondary }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentThemeColors.primary }]}>Pomodoro Timer</Text>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={[styles.settingsButton, { backgroundColor: currentThemeColors.buttonSecondary }]}
        >
          <MaterialIcons name="settings" size={24} color={currentThemeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: currentThemeColors.background }]}>
        <View
          style={[
            styles.timerContainer,
            {
              backgroundColor: currentThemeColors.background,
              borderColor: currentThemeColors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.timerText, { color: currentThemeColors.text }]}>{formatTime(timeLeft)}</Text>
          <Text style={[styles.timerLabel, { color: currentThemeColors.secondary }]}>
            {isBreak ? 'Break Time' : 'Work Time'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: currentThemeColors.primary }]}
            onPress={toggleTimer}
          >
            <MaterialIcons
              name={isActive ? 'pause' : 'play-arrow'}
              size={32}
              color={isDark ? currentThemeColors.background : '#000000'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: currentThemeColors.primary }]}
            onPress={resetTimer}
          >
            <MaterialIcons
              name="refresh"
              size={32}
              color={isDark ? currentThemeColors.background : '#000000'}
            />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.statsContainer,
            {
              backgroundColor: currentThemeColors.background,
              borderColor: currentThemeColors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.statsTitle, { color: currentThemeColors.text }]}>Today's Progress</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { backgroundColor: currentThemeColors.buttonSecondary }]}>
              <MaterialIcons name="timer" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{sessions}</Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.secondary }]}>Sessions</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: currentThemeColors.buttonSecondary }]}>
              <MaterialIcons name="schedule" size={24} color={currentThemeColors.primary} />
              <Text style={[styles.statValue, { color: currentThemeColors.text }]}>
                {sessions * settings.workDuration}
              </Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.secondary }]}>Minutes</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {showSettings && (
        <View style={[styles.settingsModal, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.settingsContent, { backgroundColor: currentThemeColors.background }]}>
            <Text style={[styles.settingsTitle, { color: currentThemeColors.text }]}>Timer Settings</Text>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: currentThemeColors.text }]}>Work Time (minutes)</Text>
              <View style={[styles.settingControls, { backgroundColor: currentThemeColors.buttonSecondary }]}>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({ ...settings, workDuration: Math.max(1, settings.workDuration - 1) })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="remove"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
                <Text style={[styles.settingValue, { color: currentThemeColors.text }]}>{settings.workDuration}</Text>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({ ...settings, workDuration: Math.min(60, settings.workDuration + 1) })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: currentThemeColors.text }]}>Break Time (minutes)</Text>
              <View style={[styles.settingControls, { backgroundColor: currentThemeColors.buttonSecondary }]}>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({ ...settings, breakDuration: Math.max(1, settings.breakDuration - 1) })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="remove"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
                <Text style={[styles.settingValue, { color: currentThemeColors.text }]}>{settings.breakDuration}</Text>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({ ...settings, breakDuration: Math.min(30, settings.breakDuration + 1) })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: currentThemeColors.text }]}>Long Break Time (minutes)</Text>
              <View style={[styles.settingControls, { backgroundColor: currentThemeColors.buttonSecondary }]}>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({ ...settings, longBreakDuration: Math.max(5, settings.longBreakDuration - 5) })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="remove"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
                <Text style={[styles.settingValue, { color: currentThemeColors.text }]}>{settings.longBreakDuration}</Text>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({ ...settings, longBreakDuration: Math.min(60, settings.longBreakDuration + 5) })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: currentThemeColors.text }]}>Sessions Until Long Break</Text>
              <View style={[styles.settingControls, { backgroundColor: currentThemeColors.buttonSecondary }]}>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({
                      ...settings,
                      sessionsUntilLongBreak: Math.max(2, settings.sessionsUntilLongBreak - 1),
                    })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="remove"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
                <Text
                  style={[styles.settingValue, { color: currentThemeColors.text }]}
                >
                  {settings.sessionsUntilLongBreak}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    saveSettings({
                      ...settings,
                      sessionsUntilLongBreak: Math.min(8, settings.sessionsUntilLongBreak + 1),
                    })
                  }
                  style={[styles.settingButton, { backgroundColor: currentThemeColors.primary }]}
                >
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={isDark ? currentThemeColors.background : '#000000'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: currentThemeColors.primary }]}
              onPress={() => setShowSettings(false)}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  { color: isDark ? currentThemeColors.background : '#000000' },
                ]}
              >
                Close
              </Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timerContainer: {
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
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 18,
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statsContainer: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: 120,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  settingsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContent: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 8,
  },
  settingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PomodoroScreen;