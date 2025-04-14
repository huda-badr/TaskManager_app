import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Task } from '@/types';

type VoiceCommandButtonProps = {
  onTaskCreated: (taskData: Partial<Task>) => void;
  isDark: boolean;
};

const VoiceCommandButton = ({ onTaskCreated, isDark }: VoiceCommandButtonProps) => {
  return (
    <TouchableOpacity onPress={() => onTaskCreated({})}>
      <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
        <MaterialIcons name="mic" size={24} color="#2196F3" />
      </View>
      <Text style={[styles.actionButtonText, isDark && styles.darkText]}>Voice Command</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  darkText: {
    color: '#fff',
  },
});

export default VoiceCommandButton; 