import { Task } from '@/types';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface MoodBasedSuggestionsProps {
  tasks: Task[];
  currentMood: string | null;
  onSelectTask: (taskId: string) => void;
  onOpenMoodCheckup: () => void;
  isDark: boolean;
}

const getMoodBasedTasks = (tasks: Task[], mood: string | null) => {
  if (!mood) return [];
  
  switch (mood.toLowerCase()) {
    case 'productive':
      return tasks.filter(task => task.priority === 'high' && !task.completed).slice(0, 3);
    case 'tired':
      return tasks.filter(task => task.priority === 'low' && !task.completed).slice(0, 3);
    case 'stressed':
      return tasks.filter(task => task.priority === 'medium' && !task.completed).slice(0, 3);
    default:
      return tasks.filter(task => !task.completed).slice(0, 3);
  }
};

const getMotivationalMessage = (mood: string | null) => {
  if (!mood) return '';
  
  switch (mood.toLowerCase()) {
    case 'productive':
      return "You're in a productive mood! Let's make the most of this energy and tackle some important tasks. Remember: productivity isn't about doing more, it's about doing what matters.";
    case 'tired':
      return "It's okay to take it easy. Focus on smaller tasks and remember that progress, no matter how small, is still progress. Take breaks when needed!";
    case 'stressed':
      return "When feeling stressed, breaking tasks into smaller steps can help. Take deep breaths, focus on one thing at a time, and remember that you've got this!";
    case 'happy':
      return "Your positive energy is contagious! Channel this happiness into your tasks and spread the joy through accomplishments.";
    case 'neutral':
      return "A balanced mood is a great state for steady progress. Pick tasks that align with your current energy level.";
    default:
      return "Every mood is an opportunity to approach tasks differently. Choose what feels right for you right now.";
  }
};

const MoodBasedSuggestions: React.FC<MoodBasedSuggestionsProps> = ({
  tasks,
  currentMood,
  onSelectTask,
  onOpenMoodCheckup,
  isDark
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestedTasks = getMoodBasedTasks(tasks, currentMood);
  const motivationalMessage = getMotivationalMessage(currentMood);

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, isDark && styles.darkContainer]}
        onPress={() => currentMood ? setShowSuggestions(true) : onOpenMoodCheckup()}
      >
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.darkText]}>Mood-Based Suggestions</Text>
          {currentMood ? (
            <View style={[styles.moodBadge, isDark && styles.darkMoodBadge]}>
              <MaterialIcons name="mood" size={20} color={isDark ? '#fff' : '#2196F3'} />
              <Text style={[styles.moodText, isDark && styles.darkText]}>
                {currentMood}
              </Text>
            </View>
          ) : (
            <View style={[styles.checkupButton, isDark && styles.darkCheckupButton]}>
              <MaterialIcons name="add-reaction" size={20} color={isDark ? '#fff' : '#2196F3'} />
              <Text style={[styles.checkupText, isDark && styles.darkCheckupText]}>
                mood
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showSuggestions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>
                Task Suggestions
              </Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowSuggestions(false)}
              >
                <MaterialIcons 
                  name="close" 
                  size={24} 
                  color={isDark ? '#fff' : '#333'} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.motivationContainer}>
              <MaterialIcons 
                name="lightbulb" 
                size={24} 
                color={isDark ? '#FFD700' : '#FFA000'} 
                style={styles.motivationIcon} 
              />
              <Text style={[styles.motivationText, isDark && styles.darkSubText]}>
                {motivationalMessage}
              </Text>
            </View>

            <Text style={[styles.subtitle, isDark && styles.darkSubText]}>
              {suggestedTasks.length > 0 
                ? `Based on your ${currentMood} mood, you might want to try:`
                : 'No tasks available for your current mood'}
            </Text>

            <ScrollView style={styles.taskList}>
              {suggestedTasks.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskItem, isDark && styles.darkTaskItem]}
                  onPress={() => {
                    onSelectTask(task.id);
                    setShowSuggestions(false);
                  }}
                >
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, isDark && styles.darkText]}>
                      {task.title}
                    </Text>
                    {task.description && (
                      <Text style={[styles.taskDescription, isDark && styles.darkSubText]} numberOfLines={1}>
                        {task.description}
                      </Text>
                    )}
                  </View>
                  <MaterialIcons 
                    name="chevron-right" 
                    size={24} 
                    color={isDark ? '#666' : '#999'} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  darkContainer: {
    backgroundColor: '#121212',
    borderColor: '#333',
    borderWidth: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  darkMoodBadge: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    borderWidth: 1,
  },
  moodText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  checkupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  darkCheckupButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    borderWidth: 1,
  },
  checkupText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 4,
  },
  darkCheckupText: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  darkModalContent: {
    backgroundColor: '#121212',
    borderColor: '#333',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  taskList: {
    padding: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  darkTaskItem: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    borderWidth: 1,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
  },
  darkSubText: {
    color: '#999',
  },
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    margin: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  darkMotivationContainer: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    borderWidth: 1,
    borderLeftColor: '#FFD700',
  },
  motivationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  motivationText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
});

export default MoodBasedSuggestions; 