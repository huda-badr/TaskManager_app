import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Task } from '@/types';

interface RecurringTaskFormProps {
  onCreateTask: (taskData: Partial<Task>) => void;
  isDark: boolean;
}

const RecurringTaskForm = ({ onCreateTask, isDark }: RecurringTaskFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const handleSubmit = () => {
    if (title.trim()) {
      onCreateTask({
        title: title.trim(),
        description: description.trim(),
        deadline: {
          seconds: Math.floor(deadline.getTime() / 1000),
          nanoseconds: (deadline.getTime() % 1000) * 1000000
        },
        priority,
        isRecurring: true
      });
      setTitle('');
      setDescription('');
    }
  };

  return (
    <Modal visible={true} animationType="slide" transparent>
      <View style={[styles.modalContainer, isDark && styles.darkModalContainer]}>
        <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
          <Text style={[styles.modalTitle, isDark && styles.darkText]}>Create Recurring Task</Text>
          
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Task Title"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, styles.textArea, isDark && styles.darkInput]}
            placeholder="Description"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.datePickerButton, isDark && styles.darkDatePickerButton]}
            onPress={() => setShowDeadlinePicker(true)}
          >
            <Text style={[styles.datePickerText, isDark && styles.darkText]}>
              {deadline.toLocaleDateString()}
            </Text>
            <MaterialIcons name="event" size={24} color={isDark ? '#888' : '#333'} />
          </TouchableOpacity>

          {showDeadlinePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              onChange={(event, selectedDate) => {
                setShowDeadlinePicker(false);
                if (selectedDate) {
                  setDeadline(selectedDate);
                }
              }}
            />
          )}

          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Priority</Text>
          <View style={styles.priorityButtons}>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                isDark && styles.darkPriorityButton,
                priority === 'low' && styles.selectedPriority,
                priority === 'low' && isDark && styles.darkSelectedPriority
              ]}
              onPress={() => setPriority('low')}
            >
              <Text style={[
                styles.priorityButtonText,
                isDark && styles.darkText,
                priority === 'low' && styles.selectedPriorityText
              ]}>Low</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                isDark && styles.darkPriorityButton,
                priority === 'medium' && styles.selectedPriority,
                priority === 'medium' && isDark && styles.darkSelectedPriority
              ]}
              onPress={() => setPriority('medium')}
            >
              <Text style={[
                styles.priorityButtonText,
                isDark && styles.darkText,
                priority === 'medium' && styles.selectedPriorityText
              ]}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                isDark && styles.darkPriorityButton,
                priority === 'high' && styles.selectedPriority,
                priority === 'high' && isDark && styles.darkSelectedPriority
              ]}
              onPress={() => setPriority('high')}
            >
              <Text style={[
                styles.priorityButtonText,
                isDark && styles.darkText,
                priority === 'high' && styles.selectedPriorityText
              ]}>High</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Repeat</Text>
          <View style={styles.frequencyButtons}>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                isDark && styles.darkFrequencyButton,
                recurringType === 'daily' && styles.selectedFrequency,
                recurringType === 'daily' && isDark && styles.darkSelectedFrequency
              ]}
              onPress={() => setRecurringType('daily')}
            >
              <Text style={[
                styles.frequencyButtonText,
                isDark && styles.darkText,
                recurringType === 'daily' && styles.selectedFrequencyText
              ]}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                isDark && styles.darkFrequencyButton,
                recurringType === 'weekly' && styles.selectedFrequency,
                recurringType === 'weekly' && isDark && styles.darkSelectedFrequency
              ]}
              onPress={() => setRecurringType('weekly')}
            >
              <Text style={[
                styles.frequencyButtonText,
                isDark && styles.darkText,
                recurringType === 'weekly' && styles.selectedFrequencyText
              ]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                isDark && styles.darkFrequencyButton,
                recurringType === 'monthly' && styles.selectedFrequency,
                recurringType === 'monthly' && isDark && styles.darkSelectedFrequency
              ]}
              onPress={() => setRecurringType('monthly')}
            >
              <Text style={[
                styles.frequencyButtonText,
                isDark && styles.darkText,
                recurringType === 'monthly' && styles.selectedFrequencyText
              ]}>Monthly</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isDark && styles.darkSubmitButton]}
            onPress={handleSubmit}
          >
            <MaterialIcons name="add-task" size={24} color="#fff" />
            <Text style={styles.submitButtonText}>Create Recurring Task</Text>
          </TouchableOpacity>
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
  darkModalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkModalContent: {
    backgroundColor: '#121212',
    shadowColor: 'transparent',
    elevation: 0,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  darkText: {
    color: '#E0E0E0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  darkInput: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    color: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  darkDatePickerButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  priorityButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  darkPriorityButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  selectedPriority: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  darkSelectedPriority: {
    backgroundColor: '#388E3C',
    borderColor: '#388E3C',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedPriorityText: {
    color: '#fff',
    fontWeight: '600',
  },
  frequencyButtons: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  darkFrequencyButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  selectedFrequency: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  darkSelectedFrequency: {
    backgroundColor: '#388E3C',
    borderColor: '#388E3C',
  },
  frequencyButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFrequencyText: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  darkSubmitButton: {
    backgroundColor: '#388E3C',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RecurringTaskForm; 