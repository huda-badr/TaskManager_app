import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="explore" size={64} color="#808080" />
        <Text style={styles.title}>Explore</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Task Management Features</Text>
        <Text style={styles.text}>
          This app helps you manage your tasks efficiently with features like:
        </Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <MaterialIcons name="mood" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Mood-based task suggestions</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="repeat" size={24} color="#2196F3" />
            <Text style={styles.featureText}>Recurring tasks</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="mic" size={24} color="#FF9800" />
            <Text style={styles.featureText}>Voice commands</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="timer" size={24} color="#9C27B0" />
            <Text style={styles.featureText}>Pomodoro timer</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 15,
  },
  featureList: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 10,
  },
});
