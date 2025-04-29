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

interface MoodBasedTasksProps {
  tasks: Task[];
  currentMood: string;
  onSelectTask: (taskId: string) => void;
}

interface Styles {
  container: ViewStyle;
  sectionTitle: TextStyle;
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
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  taskDeadline: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
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
    fontSize: 12,
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
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

export default function MoodBasedTasks({
  tasks,
  currentMood,
  onSelectTask,
}: MoodBasedTasksProps) {
  const getSuggestedTasks = () => {
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
      .slice(0, 5); // Limit to 5 suggestions
  };

  const suggestedTasks = getSuggestedTasks();

  if (suggestedTasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No matching tasks found for your current mood.
          {'\n'}
          This might be a good time to plan new tasks!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Suggested Tasks for Your Mood:</Text>
      <ScrollView style={styles.taskList}>
        {suggestedTasks.map((task) => (
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
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}