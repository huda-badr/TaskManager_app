import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TaskFiltersProps {
  onSearch: (text: string) => void;
  onSort: (key: 'deadline' | 'priority' | 'category') => void;
  onFilter: (status: 'all' | 'pending' | 'in_progress' | 'completed') => void;
}

export default function TaskFilters({ onSearch, onSort, onFilter }: TaskFiltersProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [activeSortKey, setActiveSortKey] = useState<'deadline' | 'priority' | 'category'>('deadline');

  const handleSearch = (text: string) => {
    onSearch(text);
  };

  const handleSort = (key: 'deadline' | 'priority' | 'category') => {
    setActiveSortKey(key);
    onSort(key);
  };

  const handleFilter = (status: 'all' | 'pending' | 'in_progress' | 'completed') => {
    setActiveFilter(status);
    onFilter(status);
  };

  const sortOptions = [
    { key: 'deadline', icon: 'event', label: 'Deadline' },
    { key: 'priority', icon: 'flag', label: 'Priority' },
    { key: 'category', icon: 'category', label: 'Category' }
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor="#666"
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.label}>Status:</Text>
        <View style={styles.filterButtons}>
          {['all', 'pending', 'in_progress', 'completed'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.activeFilterButton,
              ]}
              onPress={() => handleFilter(filter as 'all' | 'pending' | 'in_progress' | 'completed')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === filter && styles.activeFilterButtonText,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sortSection}>
        <Text style={styles.label}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                activeSortKey === option.key && styles.activeSortButton,
              ]}
              onPress={() => handleSort(option.key)}
            >
              <MaterialIcons
                name={option.icon}
                size={20}
                color={activeSortKey === option.key ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  activeSortKey === option.key && styles.activeSortButtonText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  filterSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sortSection: {
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  activeSortButton: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  activeSortButtonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 