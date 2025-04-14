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

const CreateTaskScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [task, setTask] = useState({
    title: '',
    description: '',
    deadline: new Date(),
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [deadlinePickerMode, setDeadlinePickerMode] = useState<'date' | 'time'>('date');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async () => {
    if (!task.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the task');
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
        status: 'pending',
        userId,
        createdAt: Timestamp.now(),
        completed: false,
        isRecurring: false,
      };

      const docRef = await addDoc(collection(db, `users/${userId}/tasks`), newTask);
      
      // Set a flag in AsyncStorage to indicate a new task was created
      await AsyncStorage.setItem('taskCreated', 'true');
      await AsyncStorage.setItem('lastTaskId', docRef.id);

      // Add immediate notification that creation was successful and navigate back
      Alert.alert('Success', 'Task created successfully');
      
      // Navigate back to the home screen immediately
      router.back();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
      setIsSubmitting(false);
    }
  };

  const priorityOptions = [
    { id: 'low', label: 'Low', color: '#4CAF50', bgColor: '#E8F5E9', icon: 'flag' as const },
    { id: 'medium', label: 'Medium', color: '#FFC107', bgColor: '#FFF8E1', icon: 'flag' as const },
    { id: 'high', label: 'High', color: '#F44336', bgColor: '#FFEBEE', icon: 'flag' as const },
  ];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.darkContainer]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && styles.darkButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Create New Task</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.form, isDark && styles.darkForm]}>
          <View style={[styles.inputGroup, isDark && styles.darkInputGroup]}>
            <Text style={[styles.label, isDark && styles.darkText]}>Title</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              placeholder="Enter task title"
              value={task.title}
              onChangeText={(text) => setTask({ ...task, title: text })}
              placeholderTextColor={isDark ? '#666' : '#999'}
            />
          </View>

          <View style={[styles.inputGroup, isDark && styles.darkInputGroup]}>
            <Text style={[styles.label, isDark && styles.darkText]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, isDark && styles.darkInput]}
              placeholder="Add task description"
              value={task.description}
              onChangeText={(text) => setTask({ ...task, description: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor={isDark ? '#666' : '#999'}
            />
          </View>

          <View style={[styles.inputGroup, isDark && styles.darkInputGroup]}>
            <Text style={[styles.label, isDark && styles.darkText]}>Deadline</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.datePickerButton, isDark && styles.darkDatePickerButton, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setDeadlinePickerMode('date');
                  setShowDeadlinePicker(true);
                }}
              >
                <View style={[styles.datePickerContent, isDark && styles.darkDatePickerContent]}>
                  <MaterialIcons name="calendar-today" size={20} color={isDark ? '#fff' : '#333'} />
                  <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                    {task.deadline.toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.datePickerButton, isDark && styles.darkDatePickerButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => {
                  setDeadlinePickerMode('time');
                  setShowDeadlinePicker(true);
                }}
              >
                <View style={[styles.datePickerContent, isDark && styles.darkDatePickerContent]}>
                  <MaterialIcons name="access-time" size={20} color={isDark ? '#fff' : '#333'} />
                  <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                    {task.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {showDeadlinePicker && (
            <DateTimePicker
              value={task.deadline}
              mode={deadlinePickerMode}
              display="default"
              onChange={(event, selectedDate) => {
                setShowDeadlinePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  // When selecting time, preserve the date
                  if (deadlinePickerMode === 'time' && selectedDate) {
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
                if (Platform.OS === 'android' && deadlinePickerMode === 'date' && selectedDate) {
                  setTimeout(() => {
                    setDeadlinePickerMode('time');
                    setShowDeadlinePicker(true);
                  }, 100);
                }
              }}
              minimumDate={deadlinePickerMode === 'date' ? new Date() : undefined}
            />
          )}

          <View style={[styles.inputGroup, isDark && styles.darkInputGroup]}>
            <Text style={[styles.label, isDark && styles.darkText]}>Priority</Text>
            <View style={[styles.priorityButtons, isDark && styles.darkPriorityButtons]}>
              {priorityOptions.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.priorityButton,
                    { backgroundColor: task.priority === p.id ? p.bgColor : '#F5F5F5' },
                    isDark && styles.darkPriorityButton,
                    task.priority === p.id && styles.priorityButtonActive,
                  ]}
                  onPress={() => setTask({ ...task, priority: p.id as 'low' | 'medium' | 'high' })}
                >
                  <MaterialIcons
                    name={p.icon}
                    size={16}
                    color={task.priority === p.id ? p.color : (isDark ? '#fff' : '#666')}
                  />
                  <Text
                    style={[
                      styles.priorityButtonText,
                      { color: task.priority === p.id ? p.color : (isDark ? '#fff' : '#666') },
                      task.priority === p.id && styles.priorityButtonTextActive,
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
          <Text style={[styles.cancelButtonText, isDark && styles.darkText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.createButton, isDark && styles.darkCreateButton]}
          onPress={handleCreateTask}
        >
          <Text style={[styles.createButtonText, isDark && styles.darkText]}>Create Task</Text>
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
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
    backgroundColor: '#1E1E1E',
  },
  inputGroup: {
    marginBottom: 24,
  },
  darkInputGroup: {
    backgroundColor: '#333',
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
    backgroundColor: '#333',
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  darkDatePickerButton: {
    backgroundColor: '#333',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  darkDatePickerContent: {
    backgroundColor: '#333',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  darkPriorityButtons: {
    backgroundColor: '#333',
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  darkPriorityButton: {
    backgroundColor: '#333',
  },
  priorityButtonActive: {
    backgroundColor: '#4CAF50',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priorityButtonTextActive: {
    color: '#fff',
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
    backgroundColor: '#1E1E1E',
    borderTopColor: '#333',
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
    backgroundColor: '#333',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  darkCreateButton: {
    backgroundColor: '#4CAF50',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CreateTaskScreen; 