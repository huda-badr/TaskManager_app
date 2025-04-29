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
import { Task } from '@/types';

// Keep the MarkedDates interface
interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    marked?: boolean;
    selectedColor?: string;
    dotColor?: string;
    dots?: Array<{key: string; color: string; selectedDotColor?: string}>;
  };
}

// Utility function to generate all occurrence dates for a recurring task
const generateRecurringDates = (task: Task): Date[] => {
  if (!task.isRecurring || !task.dueDate) return [];

  const dates: Date[] = [];
  const startDate = new Date(task.dueDate);
  // For recurring tasks without an end date, default to 1 year from start
  const endDate = task.recurringEndDate 
    ? new Date(task.recurringEndDate) 
    : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  
  const interval = task.recurringInterval || 1;
  
  let currentDate = new Date(startDate);
  dates.push(new Date(currentDate)); // Always include the start date
  
  // Ensure we don't create an infinite loop
  const maxDays = 730; // Limit to 2 years of recurring dates as safety
  let count = 1;

  while (currentDate < endDate && count < maxDays) {
    let nextDate = new Date(currentDate);
    
    // Calculate next occurrence based on recurring type
    switch (task.recurringType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      
      case 'monthly':
        // Get the current day of month to preserve
        const dayOfMonth = nextDate.getDate();
        
        // Add the specified number of months
        nextDate.setMonth(nextDate.getMonth() + interval);
        
        // Check if the day of month changed (e.g., Jan 31 -> Feb 28/29)
        // This happens when the target month doesn't have enough days
        const newMonth = nextDate.getMonth();
        const expectedMonth = (currentDate.getMonth() + interval) % 12;
        
        if (newMonth !== expectedMonth) {
          // Set to the last day of the expected month
          nextDate = new Date(nextDate.getFullYear(), expectedMonth + 1, 0);
        }
        break;
      
      default:
        // Invalid type, stop generating dates
        return dates;
    }
    
    // Only add if it's before or on the end date
    if (nextDate <= endDate) {
      dates.push(new Date(nextDate));
      currentDate = nextDate;
      count++;
    } else {
      break;
    }
  }
  
  return dates;
}

const ScheduleScreen = () => {
  const { theme, currentThemeColors } = useTheme();
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
        // Handle regular tasks
        if (task.dueDate) {
          const dateStr = task.dueDate.toISOString().split('T')[0];
          
          marked[dateStr] = {
            ...marked[dateStr],
            marked: true,
            dotColor: task.completed ? currentThemeColors.success : currentThemeColors.warning,
          };
          
          // If it's the selected date, highlight it
          if (dateStr === selectedDate) {
            marked[dateStr] = {
              ...marked[dateStr],
              selected: true,
              selectedColor: task.completed ? currentThemeColors.success : currentThemeColors.warning,
            };
          }
        }
        
        // Handle recurring tasks
        if (task.isRecurring) {
          console.log(`Processing recurring task for calendar: ${task.title}`);
          console.log(`Recurring type: ${task.recurringType}`);
          console.log(`Recurring interval: ${task.recurringInterval}`);
          
          // Get proper dates accounting for Firestore timestamp objects
          const startDate = task.dueDate ? new Date(task.dueDate) : null;
          let endDate = null;
          
          // Handle recurring end date (could be a Firestore timestamp)
          if (task.recurringEndDate) {
            if (typeof task.recurringEndDate === 'object' && 'seconds' in task.recurringEndDate) {
              endDate = new Date(task.recurringEndDate.seconds * 1000);
            } else {
              endDate = new Date(task.recurringEndDate);
            }
          } else {
            // Default end date is 1 year from start date
            endDate = startDate ? new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate()) : null;
          }
          
          if (startDate && endDate) {
            // Create a copy of the task with proper date objects
            const recurringTask = {
              ...task,
              dueDate: startDate,
              recurringEndDate: endDate
            };
            
            // Mark dates on calendar based on recurrence type
            const currentDate = new Date();
            const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const interval = task.recurringInterval || 1;
            
            let dateToMark = new Date(startDate);
            
            // Mark all appropriate dates up to end date
            while (dateToMark <= endDate) {
              const dateStr = dateToMark.toISOString().split('T')[0];
              
              // Only mark present and future dates
              if (dateToMark >= today) {
                marked[dateStr] = {
                  ...marked[dateStr],
                  marked: true,
                  dotColor: '#9C27B0', // Purple for recurring tasks
                };
                
                if (dateStr === selectedDate) {
                  marked[dateStr] = {
                    ...marked[dateStr],
                    selected: true,
                    selectedColor: '#9C27B0',
                  };
                }
              }
              
              // Calculate next occurrence
              switch(task.recurringType) {
                case 'daily':
                  dateToMark.setDate(dateToMark.getDate() + interval);
                  break;
                case 'weekly':
                  dateToMark.setDate(dateToMark.getDate() + (7 * interval));
                  break;
                case 'monthly':
                  const day = dateToMark.getDate();
                  dateToMark.setMonth(dateToMark.getMonth() + interval);
                  
                  // Handle months with fewer days
                  const lastDay = new Date(dateToMark.getFullYear(), dateToMark.getMonth() + 1, 0).getDate();
                  if (day > lastDay) {
                    dateToMark.setDate(lastDay);
                  }
                  break;
                default:
                  // Move to next day if recurrence type is unknown
                  dateToMark.setDate(dateToMark.getDate() + 1);
              }
            }
          }
        }
      });
      
      // Always mark the selected date even if no tasks
      if (!marked[selectedDate]) {
        marked[selectedDate] = {
          selected: true,
          selectedColor: currentThemeColors.primary,
        };
      }
      
      setMarkedDates(marked);
    };
    
    generateMarkedDates();
  }, [tasks, selectedDate, currentThemeColors]);

  // Filter tasks for the selected date
  useEffect(() => {
    const filterTasksForDate = () => {
      const selectedDateObj = new Date(selectedDate);
      // Set time to midnight for accurate date comparison
      selectedDateObj.setHours(0, 0, 0, 0);

      // Create a new array to hold all tasks for the selected date
      const tasksForDate: Task[] = [];
      
      tasks.forEach(task => {
        // Handle potential Firebase timestamp conversions
        let taskDueDate = task.dueDate;
        let recurringEndDate = task.recurringEndDate;
        
        // Convert deadline to dueDate if needed
        if (!taskDueDate && task.deadline) {
          // Handle Firestore timestamp
          if (task.deadline && typeof task.deadline === 'object' && 'seconds' in task.deadline) {
            taskDueDate = new Date(task.deadline.seconds * 1000);
          }
        }
        
        // Convert recurringEndDate if it's a Firestore timestamp
        if (task.isRecurring && task.recurringEndDate && typeof task.recurringEndDate === 'object' && 'seconds' in task.recurringEndDate) {
          recurringEndDate = new Date(task.recurringEndDate.seconds * 1000);
        }
        
        // Handle regular (non-recurring) tasks
        if (taskDueDate && !task.isRecurring) {
          const taskDate = new Date(taskDueDate);
          taskDate.setHours(0, 0, 0, 0); // Set time to midnight for comparison
          
          if (taskDate.getTime() === selectedDateObj.getTime()) {
            tasksForDate.push(task);
          }
        }
        
        // Handle recurring tasks
        if (task.isRecurring && taskDueDate) {
          // For recurring tasks, ensure we have an end date (default: 1 year from start)
          const endDate = recurringEndDate || new Date(taskDueDate.getTime() + 365 * 24 * 60 * 60 * 1000);
          const startDate = new Date(taskDueDate);
          
          // Set hours to midnight for accurate comparison
          startDate.setHours(0, 0, 0, 0);
          
          // Check if the selected date is between start date and end date (inclusive)
          if (selectedDateObj >= startDate && selectedDateObj <= endDate) {
            // For daily tasks, always show them
            if (task.recurringType === 'daily') {
              tasksForDate.push({
                ...task,
                dueDate: new Date(selectedDateObj),
                isRecurringInstance: true
              });
            }
            // For weekly tasks, check if it's the same day of the week
            else if (task.recurringType === 'weekly') {
              if (selectedDateObj.getDay() === startDate.getDay()) {
                tasksForDate.push({
                  ...task,
                  dueDate: new Date(selectedDateObj),
                  isRecurringInstance: true
                });
              }
            }
            // For monthly tasks, check if it's the same day of the month
            else if (task.recurringType === 'monthly') {
              // Handle cases like the 31st of the month when the current month doesn't have 31 days
              const dayOfMonth = startDate.getDate();
              const lastDayOfSelectedMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth() + 1, 0).getDate();
              
              if (selectedDateObj.getDate() === Math.min(dayOfMonth, lastDayOfSelectedMonth)) {
                tasksForDate.push({
                  ...task,
                  dueDate: new Date(selectedDateObj),
                  isRecurringInstance: true
                });
              }
            }
          }
        }
      });
      
      setTasksForSelectedDate(tasksForDate);
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
          { 
            backgroundColor: currentThemeColors.background,
            borderLeftWidth: 4,
            borderLeftColor: item.priority === 'high' 
              ? '#f44336' 
              : item.priority === 'medium'
                ? '#ff9800'
                : '#4caf50',
            borderColor: currentThemeColors.border,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1
          }
        ]}
        onPress={() => handleTaskPress(item.id)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.titleContainer}>
            <Text style={[
              styles.taskTitle,
              { color: currentThemeColors.text },
              // Modified to keep text visible even when completed, only adding strikethrough
              item.completed && { textDecorationLine: 'line-through' }
            ]}>
              {item.title}
            </Text>
            
            {(item.isRecurring || item.isRecurringInstance) && (
              <View style={styles.recurringBadge}>
                <MaterialIcons name="repeat" size={14} color={currentThemeColors.text} />
                <Text style={[styles.recurringText, { color: currentThemeColors.text }]}>
                  {item.recurringType || 'recurring'}
                </Text>
              </View>
            )}
          </View>
          <MaterialIcons
            name={item.completed ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={item.completed ? currentThemeColors.success : currentThemeColors.text}
          />
        </View>
        
        {item.description ? (
          <Text 
            style={[
              styles.taskDescription, 
              // Updated to use text color for all tasks including completed ones
              { color: currentThemeColors.text }
            ]} 
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
        
        <View style={styles.taskFooter}>
          <View style={[
            styles.taskMeta, 
            { backgroundColor: currentThemeColors.buttonSecondary }
          ]}>
            <MaterialIcons name="schedule" size={16} color={currentThemeColors.text} />
            <Text style={[styles.taskMetaText, { color: currentThemeColors.primary }]}>
              {item.dueDate ? item.dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time'}
            </Text>
          </View>
          <View style={[
            styles.taskStatus, 
            { backgroundColor: currentThemeColors.buttonSecondary }
          ]}>
            <View 
              style={[
                styles.statusIndicator,
                { backgroundColor: item.completed ? currentThemeColors.success : "#FFC107" }
              ]} 
            />
            <Text style={[styles.statusText, { color: currentThemeColors.secondary }]}>
              {item.completed ? "Completed" : "In Progress"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={currentThemeColors.background} 
      />
      <ScrollView style={styles.content}>
        {/* Calendar Section */}
        <View style={[
          styles.calendarSection, 
          { 
            backgroundColor: currentThemeColors.background,
            borderColor: currentThemeColors.border,
            borderWidth: 1
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Calendar</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            hideExtraDays={true}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: currentThemeColors.background,
              calendarBackground: currentThemeColors.background,
              textSectionTitleColor: currentThemeColors.secondary,
              selectedDayBackgroundColor: currentThemeColors.primary,
              selectedDayTextColor: isDark ? currentThemeColors.background : '#ffffff',
              todayTextColor: currentThemeColors.primary,
              dayTextColor: currentThemeColors.text,
              textDisabledColor: currentThemeColors.secondary,
              dotColor: currentThemeColors.primary,
              selectedDotColor: isDark ? currentThemeColors.background : '#ffffff',
              arrowColor: currentThemeColors.primary,
              monthTextColor: currentThemeColors.text,
              indicatorColor: currentThemeColors.primary,
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
            <Text style={[styles.selectedDateTitle, { color: currentThemeColors.text }]}>
              Tasks for {new Date(selectedDate).toLocaleDateString()}
            </Text>
            
            {tasksForSelectedDate.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: currentThemeColors.secondary }]}>
                  No tasks for this day.
                </Text>
                <TouchableOpacity 
                  style={[styles.createTaskButton, { backgroundColor: currentThemeColors.primary }]}
                  onPress={() => router.push('/create-task')}
                >
                  <MaterialIcons 
                    name="add" 
                    size={20} 
                    color={isDark ? currentThemeColors.background : '#ffffff'} 
                  />
                  <Text style={[
                    styles.createTaskButtonText, 
                    { color: isDark ? currentThemeColors.background : '#ffffff' }
                  ]}>
                    Create Task
                  </Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  
  // Calendar Section
  calendarSection: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectedDateContainer: {
    marginTop: 16,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  createTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createTaskButtonText: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tasksList: {
    paddingBottom: 16,
  },
  taskItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(156, 39, 176, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  recurringText: {
    fontSize: 12,
    marginLeft: 4,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskMetaText: {
    marginLeft: 4,
    fontSize: 12,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    textTransform: 'capitalize',
  }
});

export default ScheduleScreen;