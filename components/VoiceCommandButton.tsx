import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import voiceCommandService from '../services/VoiceCommandService';
import { Task } from '@/types';

interface VoiceCommandButtonProps {
  onTaskCreated: (taskData: Partial<Task>) => void;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ onTaskCreated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      voiceCommandService.cleanUp();
    };
  }, [timerInterval]);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start timer
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      
      await voiceCommandService.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start voice recording');
      setIsRecording(false);
      if (timerInterval) clearInterval(timerInterval);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerInterval) clearInterval(timerInterval);
      setIsRecording(false);
      setIsProcessing(true);
      
      const result = await voiceCommandService.stopRecording();
      console.log('Voice recognition result:', result);
      
      if (result.confidence < 0.6) {
        Alert.alert('Low Confidence', 'Could not clearly understand the command. Please try again.');
        return;
      }
      
      const taskData = voiceCommandService.parseTaskFromVoiceCommand(result.text);
      
      if (!taskData) {
        Alert.alert('Could Not Parse', 'Could not understand how to create a task from your command. Please try again.');
        return;
      }
      
      // Notify parent component about the new task
      onTaskCreated(taskData);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        <View style={styles.recordingContainer}>
          <Text style={styles.recordingTimer}>{formatTime(recordingDuration)}</Text>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopRecording}
            disabled={isProcessing}
          >
            <MaterialIcons name="stop" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
      ) : isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.processingText}>Processing voice...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={startRecording}
        >
          <MaterialIcons name="mic" size={24} color="#007AFF" />
          <Text style={styles.voiceButtonText}>Add Task by Voice</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  voiceButtonText: {
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  stopButton: {
    backgroundColor: '#ff4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  recordingTimer: {
    fontWeight: 'bold',
    color: '#ff4444',
  },
  recordingText: {
    color: '#ff4444',
    fontWeight: '500',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  processingText: {
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default VoiceCommandButton; 