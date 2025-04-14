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
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  moodButton: ViewStyle;
  moodText: TextStyle;
  taskList: ViewStyle;
  taskItem: ViewStyle;
  taskContent: ViewStyle;
  taskTitle: TextStyle;
  taskDeadline: TextStyle;
  taskMeta: ViewStyle;
  priorityBadge: ViewStyle;
  priorityHigh: ViewStyle;
  priorityMedium: ViewStyle;
  priorityLow: ViewStyle;
  priorityText: TextStyle;
  categoryText: TextStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
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
  moodText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
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
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  taskDeadline: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
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
  priorityText: {
    fontSize: 10,
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
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
});

const MOOD_TASK_PRIORITIES = {
  happy: ['high', 'medium'],
  neutral: ['medium', 'low'],
  tired: ['low', 'medium'],
  stressed: ['low'],
  productive: ['high'],
};

const MOOD_CATEGORIES = {
  happy: ['creative', 'social', 'learning'],
  neutral: ['routine', 'organization', 'maintenance'],
  tired: ['simple', 'quick', 'relaxing'],
  stressed: ['mindful', 'self-care', 'planning'],
  productive: ['important', 'challenging', 'focus'],
};

const getPriorityStyle = (priority: string): ViewStyle => {
  switch (priority.toLowerCase()) {
    case 'high':
      return styles.priorityHigh;
    case 'medium':
      return styles.priorityMedium;
    case 'low':
      return styles.priorityLow;
    default:
      return styles.priorityMedium;
  }
};

export default function MoodBasedSuggestions({
  tasks,
  currentMood,
  onSelectTask,
  onOpenMoodCheckup,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suggested Tasks</Text>
        <TouchableOpacity style={styles.moodButton} onPress={onOpenMoodCheckup}>
          <Text style={styles.moodText}>
            {currentMood ? `Mood: ${currentMood.charAt(0).toUpperCase() + currentMood.slice(1)}` : 'Set Your Mood'}
          </Text>
          <MaterialIcons name="mood" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.taskList}>
        {suggestedTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {currentMood
                ? "No matching tasks found for your current mood."
                : "Set your mood to get personalized task suggestions!"}
            </Text>
          </View>
        ) : (
          suggestedTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => onSelectTask(task.id)}
            >
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.dueDate && (
                  <Text style={styles.taskDeadline}>
                    Due: {task.dueDate.toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.taskMeta}>
                  <View style={[styles.priorityBadge, getPriorityStyle(task.priority)]}>
                    <Text style={styles.priorityText}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Text>
                  </View>
                  {task.category && (
                    <Text style={styles.categoryText}>{task.category}</Text>
                  )}
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
} 