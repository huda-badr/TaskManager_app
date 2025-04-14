import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface MoodCheckupProps {
  visible: boolean;
  onClose: () => void;
  onMoodSelect: (mood: string) => void;
  isDark: boolean;
}

const MOODS = [
  { id: 'happy', icon: '😊', label: 'Happy' },
  { id: 'neutral', icon: '😐', label: 'Neutral' },
  { id: 'tired', icon: '😫', label: 'Tired' },
  { id: 'stressed', icon: '😰', label: 'Stressed' },
  { id: 'productive', icon: '💪', label: 'Productive' }
];

const MoodCheckup = ({ visible, onClose, onMoodSelect, isDark }: MoodCheckupProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalContainer, isDark && styles.darkContainer]}>
        <View style={[styles.modalContent, isDark && styles.darkContent]}>
          <View style={styles.header}>
            <Text style={[styles.title, isDark && styles.darkText]}>How are you feeling?</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={isDark ? '#fff' : '#333'} />
            </TouchableOpacity>
          </View>
          <View style={styles.moodContainer}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodButton,
                  isDark && styles.darkMoodButton,
                ]}
                onPress={() => onMoodSelect(mood.id)}
              >
                <Text style={styles.moodEmoji}>{mood.icon}</Text>
                <Text style={[styles.moodText, isDark && styles.darkText]}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  darkContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  darkContent: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  darkText: {
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  moodButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    width: '47%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  darkMoodButton: {
    backgroundColor: '#2C2C2C',
    borderColor: '#404040',
    borderWidth: 1,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default MoodCheckup; 