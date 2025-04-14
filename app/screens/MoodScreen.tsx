import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MoodBasedTasks from '../../components/MoodBasedTasks';
import MoodCheckup from '../../components/MoodCheckup';
import { db, auth } from '@/config/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Task } from '@/types';

export default function MoodScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMood, setCurrentMood] = useState<string>('neutral');
  const [showMoodCheckup, setShowMoodCheckup] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const tasksRef = collection(db, `users/${user.uid}/tasks`);
      const q = query(tasksRef);
      const querySnapshot = await getDocs(q);
      
      const tasksList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      setTasks(tasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleMoodSelect = (mood: string) => {
    setCurrentMood(mood);
    setShowMoodCheckup(false);
  };

  const handleSelectTask = (taskId: string) => {
    console.log('Selected task:', taskId);
  };

  return (
    <View style={styles.container}>
      <MoodBasedTasks 
        tasks={tasks} 
        currentMood={currentMood} 
        onSelectTask={handleSelectTask} 
      />
      
      <MoodCheckup
        visible={showMoodCheckup}
        onClose={() => setShowMoodCheckup(false)}
        onMoodSelect={handleMoodSelect}
        tasks={tasks}
        onTaskSelect={handleSelectTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});