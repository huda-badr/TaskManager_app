import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TaskFiltersProps {
  onSearch: (query: string) => void;
  onSort: (key: 'priority' | 'category' | 'deadline') => void;
  onFilter: (status: 'all' | 'pending' | 'in_progress' | 'completed') => void;
  isDark: boolean;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({ onSearch, onSort, onFilter, isDark }) => {
  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <TextInput
        style={[styles.searchInput, isDark && styles.darkInput]}
        placeholder="Search tasks..."
        placeholderTextColor={isDark ? '#666' : '#999'}
        onChangeText={onSearch}
      />
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={() => onSort('priority')}>
          <MaterialIcons name="flag" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => onSort('category')}>
          <MaterialIcons name="category" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => onSort('deadline')}>
          <MaterialIcons name="schedule" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#1E1E1E',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: '#333',
  },
  darkInput: {
    borderColor: '#333',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    padding: 8,
  },
});

export default TaskFilters; 