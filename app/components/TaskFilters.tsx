import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TaskFiltersProps {
  onSearch: (query: string) => void;
  onSort: (key: 'priority' | 'category' | 'deadline') => void;
  onFilter: (status: 'all' | 'pending' | 'in_progress' | 'completed') => void;
  isDark: boolean;
  currentThemeColors?: any; // Add theme colors prop
}

const TaskFilters: React.FC<TaskFiltersProps> = ({ 
  onSearch, 
  onSort, 
  onFilter, 
  isDark,
  currentThemeColors 
}) => {
  const [activeSort, setActiveSort] = useState<string | null>(null);

  const handleSort = (key: 'priority' | 'deadline') => {
    setActiveSort(prevSort => prevSort === key ? null : key);
    onSort(key);
  };
  
  // Use theme colors when available, fallback to default styling when not
  const themeBackground = currentThemeColors?.buttonSecondary || (isDark ? '#292929' : '#fff');
  const themeBorder = currentThemeColors?.border || (isDark ? '#444' : '#ddd');
  const themeText = currentThemeColors?.text || (isDark ? '#fff' : '#333');
  const themePlaceholder = currentThemeColors?.placeholder || (isDark ? '#aaa' : '#999');
  const themePrimary = currentThemeColors?.primary || (isDark ? '#4CAF50' : '#4CAF50');
  const themeSecondary = currentThemeColors?.secondary || (isDark ? '#ddd' : '#555');
  
  // Background color for sort buttons (use warning color from theme if available)
  const sortButtonBgColor = currentThemeColors?.warning || (isDark ? '#FF9800' : '#FFC107');
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: 'transparent', // Make it transparent to show parent background
        borderColor: themeBorder,
        // Remove shadow styles
        shadowOpacity: 0,
        elevation: 0
      }
    ]}>
      <View style={[
        styles.searchContainer, 
        { 
          borderColor: themeBorder,
          borderWidth: 1,
          backgroundColor: sortButtonBgColor // Use the same color as sort buttons
        }
      ]}>
        <MaterialIcons 
          name="search" 
          size={20} 
          color={themePlaceholder} 
          style={styles.searchIcon} 
        />
        <TextInput
          style={[
            styles.searchInput, 
            { color: themeText }
          ]}
          placeholder="Search tasks..."
          placeholderTextColor={themePlaceholder}
          onChangeText={onSearch}
        />
      </View>
      
      <View style={styles.filterToolbar}>
        <Text style={[
          styles.filterLabel, 
          { color: themeSecondary }
        ]}>
          Sort by:
        </Text>
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              { 
                backgroundColor: activeSort === 'priority' 
                  ? themePrimary
                  : sortButtonBgColor
              }
            ]} 
            onPress={() => handleSort('priority')}
          >
            <MaterialIcons 
              name="flag" 
              size={18} 
              color={activeSort === 'priority' ? '#fff' : themeSecondary} 
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeSort === 'priority' ? '#fff' : themeSecondary }
            ]}>
              Priority
            </Text>
          </TouchableOpacity>
          
          {/* <TouchableOpacity 
            style={[
              styles.filterButton, 
              { 
                backgroundColor: activeSort === 'category' 
                  ? themePrimary
                  : sortButtonBgColor
              }
            ]} 
            onPress={() => handleSort('category')}
          >
            <MaterialIcons 
              name="category" 
              size={18} 
              color={activeSort === 'category' ? '#fff' : themeSecondary}
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeSort === 'category' ? '#fff' : themeSecondary }
            ]}>
              Category
            </Text>
          </TouchableOpacity> */}
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              { 
                backgroundColor: activeSort === 'deadline' 
                  ? themePrimary
                  : sortButtonBgColor
              }
            ]} 
            onPress={() => handleSort('deadline')}
          >
            <MaterialIcons 
              name="schedule" 
              size={18}
              color={activeSort === 'deadline' ? '#fff' : themeSecondary}
            />
            <Text style={[
              styles.filterButtonText,
              { color: activeSort === 'deadline' ? '#fff' : themeSecondary }
            ]}>
              Due Date
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 14,
  },
  filterToolbar: {
    marginTop: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TaskFilters;