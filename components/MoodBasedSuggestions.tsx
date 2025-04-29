import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Task } from '@/types';

interface MoodBasedSuggestionsProps {
  tasks: Task[];
  currentMood: string | null;
  onSelectTask: (taskId: string) => void;
  onOpenMoodCheckup: () => void;
  isDark?: boolean; // Added isDark prop for theme support
}

interface Styles {
  container: ViewStyle;
  darkContainer: ViewStyle; // Added for dark theme
  header: ViewStyle;
  title: TextStyle;
  darkTitle: TextStyle; // Added for dark theme
  moodButton: ViewStyle;
  darkMoodButton: ViewStyle; // Added for dark theme
  moodText: TextStyle;
  darkMoodText: TextStyle; // Added for dark theme
  taskList: ViewStyle;
  taskItem: ViewStyle;
  darkTaskItem: ViewStyle; // Added for dark theme
  taskContent: ViewStyle;
  taskTitle: TextStyle;
  darkTaskTitle: TextStyle; // Added for dark theme
  taskDeadline: TextStyle;
  darkTaskDeadline: TextStyle; // Added for dark theme
  taskMeta: ViewStyle;
  priorityBadge: ViewStyle;
  priorityHigh: ViewStyle;
  priorityMedium: ViewStyle;
  priorityLow: ViewStyle;
  darkPriorityHigh: ViewStyle; // Added for dark theme
  darkPriorityMedium: ViewStyle; // Added for dark theme
  darkPriorityLow: ViewStyle; // Added for dark theme
  priorityText: TextStyle;
  darkPriorityText: TextStyle; // Added for dark theme
  categoryText: TextStyle;
  darkCategoryText: TextStyle; // Added for dark theme
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  darkEmptyText: TextStyle; // Added for dark theme
}

const styles = StyleSheet.create<Styles>({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkContainer: {
    backgroundColor: '#292929',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  darkTitle: {
    color: '#fff',
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkMoodButton: {
    backgroundColor: '#3a3a3a',
  },
  moodText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  darkMoodText: {
    color: '#ccc',
  },
  taskList: {
    maxHeight: 200,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkTaskItem: {
    backgroundColor: '#3a3a3a',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  darkTaskTitle: {
    color: '#fff',
  },
  taskDeadline: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  darkTaskDeadline: {
    color: '#aaa',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginRight: 6,
  },
  priorityHigh: {
    backgroundColor: '#ffebee',
  },
  priorityMedium: {
    backgroundColor: '#fff3e0',
  },
  priorityLow: {
    backgroundColor: '#e8f5e9',
  },
  darkPriorityHigh: {
    backgroundColor: '#4a2525',
  },
  darkPriorityMedium: {
    backgroundColor: '#4a3a25',
  },
  darkPriorityLow: {
    backgroundColor: '#25432c',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '500',
  },
  darkPriorityText: {
    color: '#ddd',
  },
  categoryText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  darkCategoryText: {
    color: '#aaa',
  },
  emptyContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
  },
  darkEmptyText: {
    color: '#aaa',
  },
});

const MOOD_TASK_PRIORITIES = {
  happy: ['high', 'medium'],
  neutral: ['medium', 'low'],
  tired: ['low', 'medium'],
  stressed: ['low'],
  productive: ['high'],
};

const MOOD_CATEGORIES = {
  happy: ['creative', 'social', 'learning', 'enjoyable', 'expressive', 'collaborative', 'innovative', 'fulfilling', 'engaging', 'inspiring'],
  neutral: ['routine', 'organization', 'maintenance', 'administrative', 'methodical', 'structured', 'systematic', 'practical', 'essential', 'standard'],
  tired: ['simple', 'quick', 'relaxing', 'manageable', 'effortless', 'brief', 'straightforward', 'undemanding', 'low-effort', 'restful'],
  stressed: ['mindful', 'self-care', 'planning', 'calming', 'organizing', 'preparing', 'reflecting', 'prioritizing', 'incremental', 'therapeutic'],
  productive: ['important', 'challenging', 'focus', 'strategic', 'high-value', 'skill-building', 'analytical', 'complex', 'achievement', 'growth'],
};

const getPriorityStyle = (priority: string, isDark: boolean): ViewStyle => {
  switch (priority.toLowerCase()) {
    case 'high':
      return isDark ? styles.darkPriorityHigh : styles.priorityHigh;
    case 'medium':
      return isDark ? styles.darkPriorityMedium : styles.priorityMedium;
    case 'low':
      return isDark ? styles.darkPriorityLow : styles.priorityLow;
    default:
      return isDark ? styles.darkPriorityMedium : styles.priorityMedium;
  }
};

export default function MoodBasedSuggestions({
  tasks,
  currentMood,
  onSelectTask,
  onOpenMoodCheckup,
  isDark = false, // Default value for backward compatibility
}: MoodBasedSuggestionsProps) {
  const getSuggestedTasks = () => {
    if (!currentMood) return [];
    
    const priorities = MOOD_TASK_PRIORITIES[currentMood as keyof typeof MOOD_TASK_PRIORITIES] || ['medium'];
    const categories = MOOD_CATEGORIES[currentMood as keyof typeof MOOD_CATEGORIES] || [];
    
    return tasks
      .filter(task => !task.completed)
      .filter(task => priorities.includes(task.priority.toLowerCase()))
      .sort((a, b) => {
        // Prioritize tasks that match the current mood's categories
        const aMatchesCategory = categories.some(cat => 
          a.category?.toLowerCase().includes(cat.toLowerCase())
        );
        const bMatchesCategory = categories.some(cat => 
          b.category?.toLowerCase().includes(cat.toLowerCase())
        );
        
        if (aMatchesCategory && !bMatchesCategory) return -1;
        if (!aMatchesCategory && bMatchesCategory) return 1;
        
        // Then sort by deadline if available
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      })
      .slice(0, 3); // Limit to 3 suggestions for the home screen
  };

  const suggestedTasks = getSuggestedTasks();

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.darkTitle]}>Suggested Tasks</Text>
        <TouchableOpacity 
          style={[styles.moodButton, isDark && styles.darkMoodButton]} 
          onPress={onOpenMoodCheckup}
        >
          <Text style={[styles.moodText, isDark && styles.darkMoodText]}>
            {currentMood ? `Mood: ${currentMood.charAt(0).toUpperCase() + currentMood.slice(1)}` : 'Set Your Mood'}
          </Text>
          <MaterialIcons name="mood" size={16} color={isDark ? '#ccc' : '#666'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.taskList}>
        {suggestedTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, isDark && styles.darkEmptyText]}>
              {currentMood
                ? "No matching tasks found for your current mood."
                : "Set your mood to get personalized task suggestions!"}
            </Text>
          </View>
        ) : (
          suggestedTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskItem, isDark && styles.darkTaskItem]}
              onPress={() => onSelectTask(task.id)}
            >
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, isDark && styles.darkTaskTitle]}>
                  {task.title}
                </Text>
                {task.dueDate && (
                  <Text style={[styles.taskDeadline, isDark && styles.darkTaskDeadline]}>
                    Due: {task.dueDate.toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.taskMeta}>
                  <View style={[styles.priorityBadge, getPriorityStyle(task.priority, isDark)]}>
                    <Text style={[styles.priorityText, isDark && styles.darkPriorityText]}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Text>
                  </View>
                  {task.category && (
                    <Text style={[styles.categoryText, isDark && styles.darkCategoryText]}>
                      {task.category}
                    </Text>
                  )}
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={isDark ? '#ccc' : '#666'} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}