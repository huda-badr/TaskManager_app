import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MoodBasedTasks from './MoodBasedTasks';
import { Task } from '@/types';

interface MoodCheckupProps {
  onMoodSelect: (mood: string) => void;
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  onTaskSelect: (taskId: string) => void;
}

const MOODS = [
  { id: 'happy', icon: '😊', label: 'Happy', color: '#FFD700' },
  { id: 'neutral', icon: '😐', label: 'Neutral', color: '#A9A9A9' },
  { id: 'tired', icon: '😫', label: 'Tired', color: '#87CEEB' },
  { id: 'stressed', icon: '😰', label: 'Stressed', color: '#FF6B6B' },
  { id: 'productive', icon: '💪', label: 'Productive', color: '#98FB98' },
];

const QUOTES = {
  happy: [
    "Your energy is contagious! Let's tackle those important tasks!",
    "Great mood! Perfect time to focus on your priorities.",
    "Your positive energy will help you achieve great things today!",
  ],
  neutral: [
    "A balanced mood is perfect for steady progress.",
    "Take it one task at a time, you've got this!",
    "Stay focused and maintain this steady pace.",
  ],
  tired: [
    "It's okay to take it easy. Focus on what's most important.",
    "Remember to take breaks and stay hydrated!",
    "Let's prioritize your energy levels today.",
  ],
  stressed: [
    "Take a deep breath. Let's break this down into manageable steps.",
    "You're stronger than you think. Let's tackle this together.",
    "Remember to take care of yourself first.",
  ],
  productive: [
    "You're on fire! Let's channel this energy into your goals!",
    "Your productivity is impressive! Keep this momentum going!",
    "You're in the zone! Let's make the most of it!",
  ],
};

const PRIORITY_TIPS = {
  happy: "Focus on high-priority tasks while your energy is high!",
  neutral: "Balance your priorities to maintain steady progress.",
  tired: "Start with low-priority tasks and build up your energy.",
  stressed: "Break down high-priority tasks into smaller steps.",
  productive: "Tackle your most challenging tasks now!",
};

export default function MoodCheckup({ onMoodSelect, visible, onClose, tasks, onTaskSelect }: MoodCheckupProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setShowSuggestions(true);
    onMoodSelect(mood);
  };

  const getRandomQuote = (mood: string) => {
    const quotes = QUOTES[mood as keyof typeof QUOTES] || QUOTES.neutral;
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>How are you feeling today?</Text>
            {showSuggestions && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.scrollView}>
            {!showSuggestions ? (
              <View style={styles.moodsContainer}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[
                      styles.moodButton,
                      { backgroundColor: mood.color },
                      selectedMood === mood.id && styles.selectedMood,
                    ]}
                    onPress={() => handleMoodSelect(mood.id)}
                  >
                    <Text style={styles.moodIcon}>{mood.icon}</Text>
                    <Text style={styles.moodLabel}>{mood.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.suggestionsContainer}>
                {selectedMood && (
                  <>
                    <View style={styles.quoteContainer}>
                      <Text style={styles.quoteText}>
                        {getRandomQuote(selectedMood)}
                      </Text>
                      <Text style={styles.priorityTip}>
                        {PRIORITY_TIPS[selectedMood as keyof typeof PRIORITY_TIPS]}
                      </Text>
                    </View>
                    <MoodBasedTasks
                      tasks={tasks}
                      currentMood={selectedMood}
                      onSelectTask={onTaskSelect}
                    />
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    maxHeight: '80%',
  },
  moodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 15,
  },
  moodButton: {
    width: '45%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selectedMood: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  moodIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  suggestionsContainer: {
    flex: 1,
  },
  quoteContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 24,
  },
  priorityTip: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
}); 