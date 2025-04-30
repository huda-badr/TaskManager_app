import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Text } from 'react-native';
import { Achievements, Achievement } from '@/components/Achievements';
import { AchievementManager } from '@/app/services/AchievementManager';
import { auth, rtdb, testRTDBConnection } from '@/config/firebase';
import { router, useFocusEffect } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task } from '@/types';
import { ref, set, get, update } from 'firebase/database';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
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

  const testRTDBPermissions = async () => {
    setConnectionStatus('Testing connection...');
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setConnectionStatus('Error: Not logged in');
        return;
      }
      
      // First test basic connection
      const connectionResult = await testRTDBConnection();
      
      if (!connectionResult) {
        setConnectionStatus('Failed to connect to database');
        return;
      }
      
      // Test user-specific permissions
      try {
        // Test stats write
        const statsRef = ref(rtdb, `users/${userId}/stats`);
        const statsSnapshot = await get(statsRef);
        const currentStats = statsSnapshot.exists() ? statsSnapshot.val() : {};
        const lastPoints = currentStats.points || 0;
        
        // Try writing points and then resetting them
        await update(statsRef, { points: lastPoints + 1 });
        
        // Verify the write
        const updatedStatsSnapshot = await get(statsRef);
        
        if (updatedStatsSnapshot.exists() && updatedStatsSnapshot.val().points === lastPoints + 1) {
          // Reset the points
          await update(statsRef, { points: lastPoints });
          setConnectionStatus('✅ Success: Read/write permissions working');
          
          // Double check that reset worked
          const finalStatsSnapshot = await get(statsRef);
          if (finalStatsSnapshot.exists() && finalStatsSnapshot.val().points === lastPoints) {
            console.log('Points successfully reset to original value');
          } else {
            console.warn('Points reset may have failed, check database');
          }
          
        } else {
          setConnectionStatus('❌ Error: Write appeared to succeed but verification failed');
        }
      } catch (error) {
        console.error('Permission test error:', error);
        setConnectionStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClaimReward = async (achievementId: string) => {
    try {
      console.log(`Attempting to claim achievement: ${achievementId}`);
      
      const user = auth.currentUser;
      if (!user) {
        console.log("No authenticated user found");
        router.replace("/(auth)/login");
        return;
      }

      console.log(`User authenticated, proceeding to claim achievement for user: ${user.uid}`);
      
      // Find the achievement in current state to verify it's eligible for claiming
      const achievementToClaim = achievements.find(a => a.id === achievementId);
      if (!achievementToClaim) {
        console.log(`Achievement ${achievementId} not found in current state`);
        Alert.alert('Error', 'Achievement not found');
        return;
      }
      
      console.log(`Achievement eligibility check: completed=${achievementToClaim.completed}, claimed=${achievementToClaim.claimed}`);
      
      if (!achievementToClaim.completed) {
        console.log(`Achievement ${achievementId} is not completed yet`);
        Alert.alert('Error', 'This achievement is not completed yet');
        return;
      }
      
      if (achievementToClaim.claimed) {
        console.log(`Achievement ${achievementId} is already claimed`);
        Alert.alert('Already Claimed', 'You have already claimed this achievement');
        return;
      }

      // Call the AchievementManager's claim achievement function
      console.log(`Calling AchievementManager.handleClaimRealtimeAchievement with id: ${achievementId}`);
      await AchievementManager.handleClaimRealtimeAchievement(achievementId);
      console.log(`Claim function completed, points should be updated`);
      
    } catch (error) {
      console.error('Error claiming reward:', error);
      Alert.alert('Error', 'Failed to claim reward');
    }
  };

  const handleBackupData = async () => {
    setBackupInProgress(true);
    try {
      const success = await AchievementManager.backupAchievementData();
      if (success) {
        Alert.alert('Success', 'Achievement data has been backed up successfully');
      } else {
        Alert.alert('Error', 'Failed to backup achievement data');
      }
    } catch (error) {
      console.error('Error in backup process:', error);
      Alert.alert('Error', 'An unexpected error occurred during backup');
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreData = async () => {
    Alert.alert(
      'Restore Data',
      'This will restore your achievement data from the most recent backup. Any current progress may be overwritten. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          style: 'destructive',
          onPress: async () => {
            setRestoreInProgress(true);
            try {
              const success = await AchievementManager.restoreAchievementData();
              if (success) {
                Alert.alert('Success', 'Achievement data has been restored successfully');
                // Refresh achievements after restore
                setupRealtimeListener();
              } else {
                Alert.alert('Error', 'Failed to restore achievement data. No backup found.');
              }
            } catch (error) {
              console.error('Error in restore process:', error);
              Alert.alert('Error', 'An unexpected error occurred during restore');
            } finally {
              setRestoreInProgress(false);
            }
          }
        }
      ]
    );
  };

  // Auto backup achievements on load
  useEffect(() => {
    if (initialLoadComplete.current && !loading) {
      AchievementManager.autoBackupAchievements();
    }
  }, [loading]);

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
      
      {/* Connection Status */}
      {connectionStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{connectionStatus}</Text>
        </View>
      )}
      
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
      
      {/* Test Database Connection Button */}
      <TouchableOpacity 
        style={styles.connectionTestButton}
        onPress={testRTDBPermissions}
        disabled={loading}
      >
        <Text style={styles.updateButtonText}>
          Test Database Connection
        </Text>
      </TouchableOpacity>

      {/* Backup and Restore Buttons */}
      <View style={styles.backupRestoreContainer}>
        <TouchableOpacity 
          style={[styles.backupRestoreButton, { backgroundColor: backupInProgress ? '#ccc' : '#4CAF50' }]}
          onPress={handleBackupData}
          disabled={backupInProgress || loading || refreshing}
        >
          <Text style={styles.backupRestoreButtonText}>
            {backupInProgress ? "Backing up..." : "Backup Data"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.backupRestoreButton, { backgroundColor: restoreInProgress ? '#ccc' : '#f44336' }]}
          onPress={handleRestoreData}
          disabled={restoreInProgress || loading || refreshing}
        >
          <Text style={styles.backupRestoreButtonText}>
            {restoreInProgress ? "Restoring..." : "Restore Data"}
          </Text>
        </TouchableOpacity>
      </View>
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
  backupRestoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 10,
  },
  backupRestoreButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  backupRestoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  statusText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  connectionTestButton: {
    backgroundColor: '#ff9800',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    margin: 10,
  },
});