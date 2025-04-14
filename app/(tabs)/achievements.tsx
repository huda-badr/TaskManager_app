import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Text } from 'react-native';
import { Achievements, Achievement } from '@/components/Achievements';
import { AchievementManager } from '@/app/services/AchievementManager';
import { auth } from '@/config/firebase';
import { router, useFocusEffect } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listenerUnsubscribe = useRef<(() => void) | null>(null);
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/(auth)/login");
      } else if (!initialLoadComplete.current) {
        console.log("Initial load of achievements tab");
        // Only set up listener on first load
        setupRealtimeListener();
        initialLoadComplete.current = true;
      }
    });

    return () => {
      unsubscribe();
      // Clean up real-time listener
      if (listenerUnsubscribe.current) {
        console.log("Cleaning up achievements listener");
        listenerUnsubscribe.current();
        listenerUnsubscribe.current = null;
      }
    };
  }, []);
  
  // Just fetch data when the screen comes back into focus, don't update anything
  useFocusEffect(
    React.useCallback(() => {
      console.log("Achievement tab in focus", {
        hasInitialLoad: initialLoadComplete.current,
        hasListener: !!listenerUnsubscribe.current
      });
      
      // Only restore the listener if we lost it, don't trigger any updates
      if (initialLoadComplete.current && !listenerUnsubscribe.current) {
        console.log("Restoring achievements listener on focus");
        // If we lost our listener but are returning to this screen, set it up again
        setupRealtimeListener();
      }
      return () => {};
    }, [])
  );
  
  const setupRealtimeListener = () => {
    console.log("Setting up new achievements listener");
    // Clean up any existing listener
    if (listenerUnsubscribe.current) {
      console.log("Cleaning up existing listener before creating new one");
      listenerUnsubscribe.current();
      listenerUnsubscribe.current = null;
    }
    
    // Set loading to true while we wait for data
    setLoading(true);
    
    // Set up new real-time listener that will keep UI in sync with database
    listenerUnsubscribe.current = AchievementManager.setupRealtimeListener(({ achievements, userPoints }) => {
      console.log(`Received real-time update: ${achievements.length} achievements, ${userPoints} points`);
      setAchievements(achievements);
      setUserPoints(userPoints);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const forceRefreshAchievements = async () => {
    console.log("Forcing a complete refresh of achievements data");
    setLoading(true);
    
    try {
      // First, get all current tasks to evaluate achievement progress
      const tasksRef = collection(db, 'users', auth.currentUser!.uid, 'tasks');
      const tasksSnapshot = await getDocs(tasksRef);
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${tasks.length} tasks, ${tasks.filter((t: any) => t.completed).length} completed`);
      
      // Update all achievements based on tasks
      await AchievementManager.handleUpdateAchievements(tasks as Task[]);
      
      // Get fresh achievements data
      const result = await AchievementManager.fetchAchievements();
      if (result) {
        setAchievements(result.achievements);
        setUserPoints(result.userPoints);
        console.log(`Refreshed achievements data: ${result.achievements.length} achievements, ${result.userPoints} points`);
      }
    } catch (error) {
      console.error("Error in force refresh:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    console.log("Manual refresh of achievements requested");
    setRefreshing(true);
    forceRefreshAchievements();
  };

  const handleClaimReward = async (achievementId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      // Call the AchievementManager's claim achievement function
      // The real-time listener will update the UI automatically
      await AchievementManager.handleClaimRealtimeAchievement(achievementId);
      
    } catch (error) {
      console.error('Error claiming reward:', error);
      Alert.alert('Error', 'Failed to claim reward');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Achievements 
        achievements={achievements} 
        userPoints={userPoints} 
        onClaimReward={handleClaimReward}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      
      {/* Force Update Button */}
      <TouchableOpacity 
        style={styles.updateButton}
        onPress={forceRefreshAchievements}
        disabled={loading || refreshing}
      >
        <Text style={styles.updateButtonText}>
          {loading || refreshing ? "Updating..." : "Force Update Achievements"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
  updateButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    margin: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 