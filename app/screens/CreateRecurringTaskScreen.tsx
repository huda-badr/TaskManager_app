import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateRecurringTaskScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [task, setTask] = useState({
    title: '',
    description: '',
    deadline: new Date(),
    priority: 'medium' as 'low' | 'medium' | 'high',
    recurringType: 'daily' as 'daily' | 'weekly' | 'monthly',
    recurringInterval: 1,
    recurringEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  });
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [activeDateInput, setActiveDateInput] = useState<'start' | 'end'>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async () => {
    if (!task.title.trim()) {
      Alert.alert('Error', 'Please fill in the task title');
      return;
    }

    if (task.recurringEndDate <= task.deadline) {
      Alert.alert('Error', 'End date must be after the start date');
      return;
    }

    try {
      setIsSubmitting(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/(auth)/login');
        return;
      }

      const newTask = {
        title: task.title.trim(),
        description: task.description.trim() || '',
        deadline: Timestamp.fromDate(task.deadline),
        priority: task.priority,
        userId,
        createdAt: Timestamp.now(),
        completed: false,
        isRecurring: true,
        recurringType: task.recurringType,
        recurringInterval: task.recurringInterval,
        recurringEndDate: Timestamp.fromDate(task.recurringEndDate),
      };

      const docRef = await addDoc(collection(db, `users/${userId}/tasks`), newTask);
      
      // Set a flag in AsyncStorage to indicate a new task was created
      await AsyncStorage.setItem('taskCreated', 'true');
      await AsyncStorage.setItem('lastTaskId', docRef.id);

      // Add immediate notification that creation was successful and navigate back
      Alert.alert('Success', 'Recurring task created successfully');
      
      // Navigate back to the home screen immediately
      router.back();
    } catch (error) {
      console.error('Error creating recurring task:', error);
      Alert.alert('Error', 'Failed to create recurring task. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.darkContainer]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#000" : "#fff"} />
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && styles.darkBackButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Create Recurring Task</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={[styles.content, isDark && styles.darkContent]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.form, isDark && styles.darkForm]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Title</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              placeholder="Enter task title"
              value={task.title}
              onChangeText={(text) => setTask({ ...task, title: text })}
              placeholderTextColor={isDark ? "#888" : "#999"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, isDark && styles.darkInput]}
              placeholder="Add task description"
              value={task.description}
              onChangeText={(text) => setTask({ ...task, description: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor={isDark ? "#888" : "#999"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Start Date & Time</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.datePickerButton, isDark && styles.darkDatePickerButton, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setPickerMode('date');
                  setActiveDateInput('start');
                  setShowDeadlinePicker(true);
                }}
              >
                <View style={styles.datePickerContent}>
                  <MaterialIcons name="calendar-today" size={20} color={isDark ? "#888" : "#666"} />
                  <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                    {task.deadline.toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.datePickerButton, isDark && styles.darkDatePickerButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => {
                  setPickerMode('time');
                  setActiveDateInput('start');
                  setShowDeadlinePicker(true);
                }}
              >
                <View style={styles.datePickerContent}>
                  <MaterialIcons name="access-time" size={20} color={isDark ? "#888" : "#666"} />
                  <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                    {task.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>End Date & Time</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.datePickerButton, isDark && styles.darkDatePickerButton, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setPickerMode('date');
                  setActiveDateInput('end');
                  setShowEndDatePicker(true);
                }}
              >
                <View style={styles.datePickerContent}>
                  <MaterialIcons name="event" size={20} color={isDark ? "#888" : "#666"} />
                  <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                    {task.recurringEndDate.toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.datePickerButton, isDark && styles.darkDatePickerButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => {
                  setPickerMode('time');
                  setActiveDateInput('end');
                  setShowEndDatePicker(true);
                }}
              >
                <View style={styles.datePickerContent}>
                  <MaterialIcons name="access-time" size={20} color={isDark ? "#888" : "#666"} />
                  <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                    {task.recurringEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {showDeadlinePicker && (
            <DateTimePicker
              value={task.deadline}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDeadlinePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  if (pickerMode === 'time') {
                    // When selecting time, preserve the date
                    const currentDate = new Date(task.deadline);
                    currentDate.setHours(selectedDate.getHours());
                    currentDate.setMinutes(selectedDate.getMinutes());
                    setTask({ ...task, deadline: currentDate });
                  } else {
                    // When selecting date, preserve the time
                    const newDate = new Date(selectedDate);
                    const currentTime = new Date(task.deadline);
                    newDate.setHours(currentTime.getHours());
                    newDate.setMinutes(currentTime.getMinutes());
                    setTask({ ...task, deadline: newDate });
                  }
                }
                
                // On Android, we need to show the time picker after date picker
                if (Platform.OS === 'android' && pickerMode === 'date' && selectedDate) {
                  setTimeout(() => {
                    setPickerMode('time');
                    setShowDeadlinePicker(true);
                  }, 100);
                }
              }}
              minimumDate={pickerMode === 'date' ? new Date() : undefined}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={task.recurringEndDate}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  if (pickerMode === 'time') {
                    // When selecting time, preserve the date
                    const currentDate = new Date(task.recurringEndDate);
                    currentDate.setHours(selectedDate.getHours());
                    currentDate.setMinutes(selectedDate.getMinutes());
                    setTask({ ...task, recurringEndDate: currentDate });
                  } else {
                    // When selecting date, preserve the time
                    const newDate = new Date(selectedDate);
                    const currentTime = new Date(task.recurringEndDate);
                    newDate.setHours(currentTime.getHours());
                    newDate.setMinutes(currentTime.getMinutes());
                    setTask({ ...task, recurringEndDate: newDate });
                  }
                }
                
                // On Android, we need to show the time picker after date picker
                if (Platform.OS === 'android' && pickerMode === 'date' && selectedDate) {
                  setTimeout(() => {
                    setPickerMode('time');
                    setShowEndDatePicker(true);
                  }, 100);
                }
              }}
              minimumDate={pickerMode === 'date' ? task.deadline : undefined}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Recurrence Type</Text>
            <View style={styles.recurrenceButtons}>
              {[
                { id: 'daily', label: 'Daily', icon: 'today' as const },
                { id: 'weekly', label: 'Weekly', icon: 'date-range' as const },
                { id: 'monthly', label: 'Monthly', icon: 'calendar-today' as const }
              ].map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.recurrenceButton,
                    isDark && styles.darkRecurrenceButton,
                    task.recurringType === type.id && (isDark ? styles.darkSelectedRecurrence : styles.selectedRecurrence)
                  ]}
                  onPress={() => setTask({ ...task, recurringType: type.id as 'daily' | 'weekly' | 'monthly' })}
                >
                  <MaterialIcons 
                    name={type.icon} 
                    size={20} 
                    color={task.recurringType === type.id ? (isDark ? '#4CAF50' : '#2196F3') : (isDark ? '#888' : '#666')} 
                  />
                  <Text
                    style={[
                      styles.recurrenceButtonText,
                      isDark && styles.darkText,
                      task.recurringType === type.id && (isDark ? styles.darkSelectedText : styles.selectedText)
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Priority</Text>
            <View style={styles.priorityButtons}>
              {[
                { id: 'low', label: 'Low', color: '#4CAF50', bgColor: '#E8F5E9', darkColor: '#388E3C', icon: 'flag' as const },
                { id: 'medium', label: 'Medium', color: '#FF9800', bgColor: '#FFF3E0', darkColor: '#F57C00', icon: 'flag' as const },
                { id: 'high', label: 'High', color: '#F44336', bgColor: '#FFEBEE', darkColor: '#D32F2F', icon: 'flag' as const }
              ].map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.priorityButton,
                    isDark && styles.darkPriorityButton,
                    task.priority === p.id && { 
                      backgroundColor: isDark ? p.darkColor : p.bgColor,
                      borderColor: isDark ? p.darkColor : p.color
                    }
                  ]}
                  onPress={() => setTask({ ...task, priority: p.id as 'low' | 'medium' | 'high' })}
                >
                  <MaterialIcons 
                    name={p.icon} 
                    size={16} 
                    color={task.priority === p.id ? (isDark ? '#fff' : p.color) : (isDark ? '#888' : '#666')} 
                  />
                  <Text
                    style={[
                      styles.priorityButtonText,
                      isDark && styles.darkText,
                      task.priority === p.id && { color: isDark ? '#fff' : p.color }
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, isDark && styles.darkFooter]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, isDark && styles.darkCancelButton]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, isDark && styles.darkCancelButtonText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateTask}
        >
          <Text style={styles.createButtonText}>Create Task</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  darkContainer: {
    backgroundColor: '#000',
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
    backgroundColor: '#121212',
    borderBottomColor: '#333',
    shadowColor: 'transparent',
    elevation: 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  darkBackButton: {
    backgroundColor: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#E0E0E0',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  darkContent: {
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkForm: {
    backgroundColor: '#121212',
    shadowColor: 'transparent',
    elevation: 0,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  darkInput: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    color: '#E0E0E0',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  darkDatePickerButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  recurrenceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  recurrenceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  darkRecurrenceButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  selectedRecurrence: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  darkSelectedRecurrence: {
    backgroundColor: '#1E1E1E',
    borderColor: '#4CAF50',
  },
  recurrenceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  darkSelectedText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  darkPriorityButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkFooter: {
    backgroundColor: '#121212',
    borderTopColor: '#333',
    shadowColor: 'transparent',
    elevation: 0,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  darkCancelButton: {
    backgroundColor: '#1E1E1E',
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  darkCancelButtonText: {
    color: '#E0E0E0',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default CreateRecurringTaskScreen; 