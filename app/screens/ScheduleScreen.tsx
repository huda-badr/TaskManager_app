import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useTheme } from '../context/ThemeContext';
import { useTaskContext } from '../context/TaskContext';
import { Calendar } from 'react-native-calendars';

// Define types
interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  [key: string]: any;
}

// Keep the MarkedDates interface
interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    marked?: boolean;
    selectedColor?: string;
    dotColor?: string;
  };
}

const ScheduleScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Get tasks from TaskContext
  const { tasks } = useTaskContext();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [tasksForSelectedDate, setTasksForSelectedDate] = useState<Task[]>([]);

  // Generate marked dates based on tasks due dates
  useEffect(() => {
    const generateMarkedDates = () => {
      const marked: MarkedDates = {};
      
      // Mark tasks due dates
      tasks.forEach(task => {
        if (task.dueDate) {
          const dateStr = task.dueDate.toISOString().split('T')[0];
          
          marked[dateStr] = {
            ...marked[dateStr],
            marked: true,
            dotColor: task.completed ? '#4CAF50' : '#FF9800',
          };
          
          // If it's the selected date, highlight it
          if (dateStr === selectedDate) {
            marked[dateStr] = {
              ...marked[dateStr],
              selected: true,
              selectedColor: task.completed ? '#4CAF50' : '#FF9800',
            };
          }
        }
      });
      
      // Always mark the selected date even if no tasks
      if (!marked[selectedDate]) {
        marked[selectedDate] = {
          selected: true,
          selectedColor: '#2196F3',
        };
      }
      
      setMarkedDates(marked);
    };
    
    generateMarkedDates();
  }, [tasks, selectedDate]);

  // Filter tasks for the selected date
  useEffect(() => {
    const filterTasksForDate = () => {
      const filteredTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        
        const taskDate = task.dueDate.toISOString().split('T')[0];
        return taskDate === selectedDate;
      });
      
      setTasksForSelectedDate(filteredTasks);
    };
    
    filterTasksForDate();
  }, [selectedDate, tasks]);

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };
  
  const handleTaskPress = (taskId: string) => {
    // Navigate to task detail or edit screen
  };
  
  const renderTaskItem = ({ item }: { item: Task }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.taskItem,
          item.priority === 'high' && styles.highPriorityTask,
          item.priority === 'medium' && styles.mediumPriorityTask,
          item.priority === 'low' && styles.lowPriorityTask,
          isDark && styles.darkTaskItem
        ]}
        onPress={() => handleTaskPress(item.id)}
      >
        <View style={styles.taskHeader}>
          <Text style={[
            styles.taskTitle,
            item.completed && styles.completedTaskTitle,
            isDark && styles.darkText
          ]}>
            {item.title}
          </Text>
          <MaterialIcons
            name={item.completed ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={isDark ? (item.completed ? "#4CAF50" : "#666") : (item.completed ? "#4CAF50" : "#333")}
          />
        </View>
        
        {item.description ? (
          <Text style={[styles.taskDescription, isDark && styles.darkText]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        
        <View style={styles.taskFooter}>
          <View style={[styles.taskMeta, isDark && styles.darkTaskMeta]}>
            <MaterialIcons name="schedule" size={16} color={isDark ? "#666" : "#333"} />
            <Text style={[styles.taskMetaText, isDark && styles.darkText]}>
              {item.dueDate ? item.dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time'}
            </Text>
          </View>
          <View style={[styles.taskStatus, isDark && styles.darkTaskStatus]}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: item.completed ? "#4CAF50" : "#FFC107" }
            ]} />
            <Text style={[styles.statusText, isDark && styles.darkText]}>
              {item.completed ? "Completed" : "In Progress"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#000" : "#fff"} />
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && styles.darkBackButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Schedule</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={[styles.content, isDark && styles.darkContent]}>
        {/* Calendar Section */}
        <View style={[styles.calendarSection, isDark && styles.darkCalendarSection]}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Calendar</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            hideExtraDays={true}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: isDark ? '#121212' : '#fff',
              calendarBackground: isDark ? '#1E1E1E' : '#fff',
              textSectionTitleColor: isDark ? '#ccc' : '#b6c1cd',
              selectedDayBackgroundColor: '#2196F3',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2196F3',
              dayTextColor: isDark ? '#fff' : '#2d4150',
              textDisabledColor: isDark ? '#444' : '#d9e1e8',
              dotColor: '#2196F3',
              selectedDotColor: '#ffffff',
              arrowColor: isDark ? '#fff' : '#2196F3',
              monthTextColor: isDark ? '#fff' : '#2d4150',
              indicatorColor: isDark ? '#fff' : '#2196F3',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
          />
          
          {/* Tasks for selected date */}
          <View style={styles.selectedDateContainer}>
            <Text style={[styles.selectedDateTitle, isDark && styles.darkText]}>
              Tasks for {new Date(selectedDate).toLocaleDateString()}
            </Text>
            
            {tasksForSelectedDate.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isDark && styles.darkText]}>
                  No tasks for this day.
                </Text>
                <TouchableOpacity 
                  style={styles.createTaskButton}
                  onPress={() => router.push('/create-task')}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <Text style={styles.createTaskButtonText}>Create Task</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={tasksForSelectedDate}
                renderItem={renderTaskItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.tasksList}
                scrollEnabled={false}
              />
            )}
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  darkBackButton: {
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
  content: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  darkContent: {
    backgroundColor: '#121212',
  },
  
  // Calendar Section
  calendarSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  darkCalendarSection: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
    borderColor: '#333',
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  selectedDateContainer: {
    marginTop: 16,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  createTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createTaskButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tasksList: {
    paddingBottom: 16,
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  darkTaskItem: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  highPriorityTask: {
    borderLeftColor: '#f44336',
  },
  mediumPriorityTask: {
    borderLeftColor: '#ff9800',
  },
  lowPriorityTask: {
    borderLeftColor: '#4caf50',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkTaskMeta: {
    backgroundColor: '#333',
  },
  taskMetaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkTaskStatus: {
    backgroundColor: '#333',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  }
});

export default ScheduleScreen; 