import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '@/config/firebase';
import { collection, addDoc, Timestamp, getDoc, doc } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleTaskReminder } from '../services/TaskNotificationService';
import { useTheme } from '../context/ThemeContext';
import { useTaskContext } from '../context/TaskContext';

const CreateTaskScreen = () => {
  // Get the taskId from URL parameters if editing an existing task
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const isEditMode = !!taskId;

  // Get the task update function from context
  const { updateTask } = useTaskContext();

  const { theme, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';
  const [task, setTask] = useState({
    id: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    deadline: new Date(new Date().setHours(new Date().getHours() + 24)),
    completed: false,
    status: 'pending' as 'pending' | 'in_progress' | 'completed'
  });
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [deadlinePickerMode, setDeadlinePickerMode] = useState<'date' | 'time'>('date');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  // Load existing task data if in edit mode
  useEffect(() => {
    const loadTaskData = async () => {
      if (!taskId) return;
      
      try {
        setIsLoading(true);
        const userId = auth.currentUser?.uid;
        if (!userId) {
          router.replace('/(auth)/login');
          return;
        }

        const taskDocRef = doc(db, `users/${userId}/tasks/${taskId}`);
        const taskDoc = await getDoc(taskDocRef);
        
        if (taskDoc.exists()) {
          const taskData = taskDoc.data();
          setTask({
            id: taskId,
            title: taskData.title || '',
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            deadline: taskData.deadline ? new Date(taskData.deadline.seconds * 1000) : new Date(),
            completed: taskData.completed || false,
            status: taskData.status || 'pending'
          });
        } else {
          Alert.alert('Error', 'Task not found');
          router.back();
        }
      } catch (error) {
        console.error('Error loading task:', error);
        Alert.alert('Error', 'Failed to load task data');
      } finally {
        setIsLoading(false);
      }
    };

    if (isEditMode) {
      loadTaskData();
    } else {
      // Check if there's a task title from the chatbot when creating a new task
      const checkForChatbotTask = async () => {
        try {
          const chatbotTaskTitle = await AsyncStorage.getItem('chatbot_task_title');
          if (chatbotTaskTitle) {
            // Update the task title in the form
            setTask(prevTask => ({
              ...prevTask,
              title: chatbotTaskTitle
            }));
            
            // Clear the storage item after using it
            await AsyncStorage.removeItem('chatbot_task_title');
          }
        } catch (error) {
          console.error('Error checking for chatbot task:', error);
        }
      };
      
      checkForChatbotTask();
    }
  }, [taskId]);

  const handleSaveTask = async () => {
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

      if (isEditMode) {
        // Update existing task
        await updateTask(taskId as string, {
          title: task.title.trim(),
          description: task.description.trim() || '',
          deadline: Timestamp.fromDate(task.deadline),
          priority: task.priority,
          completed: task.completed,
          status: task.status
        });

        // Schedule updated reminder
        await scheduleTaskReminder({
          id: taskId as string,
          title: task.title,
          dueDate: task.deadline,
        });

        Alert.alert('Success', 'Task updated successfully');
      } else {
        // Create new task
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

        // Schedule a reminder for the task
        await scheduleTaskReminder({
          id: docRef.id,
          title: newTask.title,
          dueDate: newTask.deadline.toDate(),
        });

        Alert.alert('Success', 'Task created successfully');
      }
      
      // Navigate back to the home screen
      router.back();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} task:`, error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} task. Please try again.`);
      setIsSubmitting(false);
    }
  };

  const priorityOptions = [
    { id: 'low', label: 'Low', color: '#4CAF50', bgColor: '#E8F5E9', icon: 'flag' as const },
    { id: 'medium', label: 'Medium', color: '#FFC107', bgColor: '#FFF8E1', icon: 'flag' as const },
    { id: 'high', label: 'High', color: '#F44336', bgColor: '#FFEBEE', icon: 'flag' as const },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={currentThemeColors.background} 
        />
        <View style={[
          styles.header, 
          { 
            backgroundColor: currentThemeColors.background,
            borderBottomColor: currentThemeColors.border 
          }
        ]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: currentThemeColors.buttonSecondary }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentThemeColors.primary }]}>
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </Text>
          <View style={styles.headerRight} />
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: currentThemeColors.background }]}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
          <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>Loading task data...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: currentThemeColors.background }]}
    >
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={currentThemeColors.background} 
      />
      <View style={[
        styles.header, 
        { 
          backgroundColor: currentThemeColors.background,
          borderBottomColor: currentThemeColors.border 
        }
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: currentThemeColors.buttonSecondary }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentThemeColors.primary }]}>
          {isEditMode ? 'Edit Task' : 'Create New Task'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[
          styles.form, 
          { 
            backgroundColor: currentThemeColors.background,
            borderColor: currentThemeColors.border,
            borderWidth: 1
          }
        ]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentThemeColors.text }]}>Title</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: currentThemeColors.buttonSecondary,
                  borderColor: currentThemeColors.border,
                  color: currentThemeColors.text 
                }
              ]}
              placeholder="Enter task title"
              value={task.title}
              onChangeText={(text) => setTask({ ...task, title: text })}
              placeholderTextColor={isDark ? "#666" : "#999"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentThemeColors.text }]}>Description</Text>
            <TextInput
              style={[
                styles.input, 
                styles.textArea, 
                { 
                  backgroundColor: currentThemeColors.buttonSecondary,
                  borderColor: currentThemeColors.border,
                  color: currentThemeColors.text 
                }
              ]}
              placeholder="Add task description"
              value={task.description}
              onChangeText={(text) => setTask({ ...task, description: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor={isDark ? "#666" : "#999"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentThemeColors.text }]}>Deadline</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[
                  styles.datePickerButton, 
                  { 
                    backgroundColor: currentThemeColors.buttonSecondary,
                    borderColor: currentThemeColors.border,
                    flex: 1, 
                    marginRight: 8 
                  }
                ]}
                onPress={() => {
                  setDeadlinePickerMode('date');
                  setShowDeadlinePicker(true);
                }}
              >
                <View style={styles.datePickerContent}>
                  <MaterialIcons name="calendar-today" size={20} color={currentThemeColors.text} />
                  <Text style={[styles.datePickerText, { color: currentThemeColors.text }]}>
                    {task.deadline.toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.datePickerButton, 
                  { 
                    backgroundColor: currentThemeColors.buttonSecondary,
                    borderColor: currentThemeColors.border,
                    flex: 1, 
                    marginLeft: 8 
                  }
                ]}
                onPress={() => {
                  setDeadlinePickerMode('time');
                  setShowDeadlinePicker(true);
                }}
              >
                <View style={styles.datePickerContent}>
                  <MaterialIcons name="access-time" size={20} color={currentThemeColors.text} />
                  <Text style={[styles.datePickerText, { color: currentThemeColors.text }]}>
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentThemeColors.text }]}>Priority</Text>
            <View style={styles.priorityButtons}>
              {priorityOptions.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.priorityButton,
                    { 
                      backgroundColor: task.priority === p.id ? p.bgColor : currentThemeColors.buttonSecondary,
                      borderColor: task.priority === p.id ? p.color : currentThemeColors.border 
                    }
                  ]}
                  onPress={() => setTask({ ...task, priority: p.id as 'low' | 'medium' | 'high' })}
                >
                  <MaterialIcons
                    name={p.icon}
                    size={16}
                    color={task.priority === p.id ? p.color : currentThemeColors.text}
                  />
                  <Text
                    style={[
                      styles.priorityButtonText,
                      { color: task.priority === p.id ? p.color : currentThemeColors.text }
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isEditMode && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentThemeColors.text }]}>Status</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { 
                      backgroundColor: task.status === 'pending' 
                        ? currentThemeColors.warning 
                        : currentThemeColors.buttonSecondary,
                      borderColor: task.status === 'pending'
                        ? currentThemeColors.warning
                        : currentThemeColors.border 
                    }
                  ]}
                  onPress={() => setTask({ ...task, status: 'pending', completed: false })}
                >
                  <MaterialIcons
                    name="schedule"
                    size={16}
                    color={currentThemeColors.text}
                  />
                  <Text style={[styles.statusButtonText, { color: currentThemeColors.text }]}>
                    Pending
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { 
                      backgroundColor: task.status === 'in_progress' 
                        ? currentThemeColors.primary 
                        : currentThemeColors.buttonSecondary,
                      borderColor: task.status === 'in_progress'
                        ? currentThemeColors.primary
                        : currentThemeColors.border 
                    }
                  ]}
                  onPress={() => setTask({ ...task, status: 'in_progress', completed: false })}
                >
                  <MaterialIcons
                    name="pending"
                    size={16}
                    color={currentThemeColors.text}
                  />
                  <Text style={[styles.statusButtonText, { color: currentThemeColors.text }]}>
                    In Progress
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { 
                      backgroundColor: task.status === 'completed' 
                        ? currentThemeColors.success 
                        : currentThemeColors.buttonSecondary,
                      borderColor: task.status === 'completed'
                        ? currentThemeColors.success
                        : currentThemeColors.border 
                    }
                  ]}
                  onPress={() => setTask({ ...task, status: 'completed', completed: true })}
                >
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={currentThemeColors.text}
                  />
                  <Text style={[styles.statusButtonText, { color: currentThemeColors.text }]}>
                    Completed
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[
        styles.footer, 
        { 
          backgroundColor: currentThemeColors.background,
          borderTopColor: currentThemeColors.border 
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.button, 
            styles.cancelButton, 
            { backgroundColor: currentThemeColors.buttonSecondary }
          ]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, { color: currentThemeColors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button, 
            styles.createButton, 
            { backgroundColor: currentThemeColors.primary }
          ]}
          onPress={handleSaveTask}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={isDark ? currentThemeColors.background : '#000000'} />
          ) : (
            <Text style={[
              styles.createButtonText, 
              { color: isDark ? currentThemeColors.background : '#000000' }
            ]}>
              {isEditMode ? 'Save Changes' : 'Create Task'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerText: {
    fontSize: 16,
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
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {},
  createButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateTaskScreen;