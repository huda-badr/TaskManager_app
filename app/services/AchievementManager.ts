import { auth, db, rtdb } from '@/config/firebase';
import { Achievement, Task } from '@/types';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, updateDoc, Timestamp, increment, setDoc } from 'firebase/firestore';
import { ref, get, set, update, onValue } from 'firebase/database';
import { Alert } from 'react-native';
import { INITIAL_ACHIEVEMENTS } from '@/components/Achievements';

// League tiers
const LEAGUE_TIERS = [
  { name: 'Bronze', threshold: 0, color: '#CD7F32', icon: '🥉' },
  { name: 'Silver', threshold: 100, color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold', threshold: 250, color: '#FFD700', icon: '🥇' },
  { name: 'Platinum', threshold: 500, color: '#E5E4E2', icon: '💎' },
  { name: 'Diamond', threshold: 1000, color: '#B9F2FF', icon: '💎' },
  { name: 'Master', threshold: 2000, color: '#9370DB', icon: '👑' }
];

// Initialize all achievements for a user
const initializeAllAchievementsForUser = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) {
      console.error("No user ID provided");
      return false;
    }
    
    console.log(`Initializing achievements for user: ${userId}`);
    const now = new Date().toISOString();
    
    // Calculate next reset times
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString();
    
    const nextWeek = new Date();
    nextWeek.setHours(0, 0, 0, 0);
    nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
    const nextWeekStr = nextWeek.toISOString();
    
    const nextMonth = new Date();
    nextMonth.setHours(0, 0, 0, 0);
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString();
    
    // First, check if the user's Firestore document exists and read stats if available
    let firestoreStats = {
      totalTasks: 0,
      completedTasks: 0,
      currentStreak: 0,
      longestStreak: 0,
      points: 0
    };
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.stats) {
          // Use existing stats from Firestore if available
          firestoreStats = userData.stats;
          console.log(`Read existing stats from Firestore: ${JSON.stringify(firestoreStats)}`);
        } else {
          // Create stats in Firestore if not exist
          await updateDoc(userDocRef, {
            stats: firestoreStats
          });
          console.log(`Created default stats in Firestore for user ${userId}`);
        }
      } else {
        // If user doc doesn't exist at all, create it (backup for edge cases)
        await setDoc(userDocRef, {
          createdAt: Timestamp.now(),
          stats: firestoreStats,
          settings: {
            theme: 'light',
            notifications: true,
            soundEffects: true
          }
        });
        console.log(`Created new user document in Firestore for user ${userId}`);
      }
    } catch (error) {
      console.error('Error accessing Firestore stats:', error);
      // Continue execution to ensure at least the RTDB stats are initialized
    }
    
    // Initialize directly in the database with all proper attributes
    const achievements: Record<string, Achievement> = {};
    
    // Use the INITIAL_ACHIEVEMENTS array to populate all achievements
    INITIAL_ACHIEVEMENTS.forEach(achievement => {
      achievements[achievement.id] = {
        ...achievement,
        progress: 0,
        completed: false,
        claimed: false,
        type: achievement.type || 'task',
        resetPeriod: achievement.resetPeriod || null,
        createdAt: now,
        updatedAt: now
      };
      
      // Add reset dates for achievements that have reset periods
      if (achievements[achievement.id].resetPeriod) {
        let nextReset: string;
        
        switch (achievements[achievement.id].resetPeriod) {
          case 'daily':
            nextReset = tomorrowStr;
            break;
          case 'weekly':
            nextReset = nextWeekStr;
            break;
          case 'monthly':
            nextReset = nextMonthStr;
            break;
          default:
            nextReset = tomorrowStr;
        }
        
        achievements[achievement.id].lastReset = now;
        achievements[achievement.id].nextReset = nextReset;
      }
    });
    
    // Initialize stats in RTDB, using values from Firestore when available
    const stats = {
      // Use Firestore values or defaults
      points: firestoreStats.points || 0,
      completedTasks: firestoreStats.completedTasks || 0,
      totalTasks: firestoreStats.totalTasks || 0,
      tasksCompletedToday: 0,
      currentStreak: firestoreStats.currentStreak || 0,
      longestStreak: firestoreStats.longestStreak || 0,
      leagueLevel: 'Bronze',
      lastActive: now,
      lastActiveDate: now,
      completedGoals: 0,
      taskCounts: {}
    };
    
    // Calculate league level based on points
    for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
      if (stats.points >= LEAGUE_TIERS[i].threshold) {
        stats.leagueLevel = LEAGUE_TIERS[i].name;
        break;
      }
    }
    
    // Write the data to the realtime database
    await set(ref(rtdb, `users/${userId}/achievements`), achievements);
    await set(ref(rtdb, `users/${userId}/stats`), stats);
    
    console.log(`Initialized ${Object.keys(achievements).length} achievements and stats for user ${userId}`);
    return true;
  } catch (error: unknown) {
    console.error('Error initializing achievements:', error instanceof Error ? error.message : String(error));
    return false;
  }
};

// Export the achievement manager functions
export const AchievementManager = {
  initializeAllAchievementsForUser,
  
  fetchAchievements: async (): Promise<{ achievements: Achievement[], userPoints: number } | null> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('fetchAchievements: No user logged in');
        return null;
      }
      
      console.log('fetchAchievements: Checking for user data...');
      
      // First check if achievements exist in Realtime Database
      const userRef = ref(rtdb, `users/${userId}`);
      const userSnapshot = await get(userRef);
      
      let userPoints = 0;
      let achievements: Achievement[] = [];
      
      if (userSnapshot.exists()) {
        console.log('fetchAchievements: User data found in rtdb');
        const userData = userSnapshot.val();
        userPoints = userData.stats?.points || 0;
        
        if (userData.achievements) {
          console.log('fetchAchievements: Achievements found, count:', Object.keys(userData.achievements).length);
          achievements = Object.entries(userData.achievements).map(([key, value]) => ({
            ...(value as Achievement),
            docId: key
          }));
        } else {
          console.log('fetchAchievements: No achievements found, initializing...');
          // Initialize if not exists
          await initializeAllAchievementsForUser(userId);
          return await AchievementManager.fetchAchievements();
        }
      } else {
        console.log('fetchAchievements: No user data found, initializing...');
        // Initialize user data
        await initializeAllAchievementsForUser(userId);
        return await AchievementManager.fetchAchievements();
      }
      
      return { achievements, userPoints };
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return null;
    }
  },
  
  updateMoodTrackingAchievement: async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Get the mood tracking achievement
      const userRef = ref(rtdb, `users/${userId}/achievements/mood_tracking`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const achievement = snapshot.val();
        if (achievement.completed) return;
        
        // Increment progress
        const newProgress = (achievement.progress || 0) + 1;
        const completed = newProgress >= achievement.total;
        
        // Update the achievement
        await update(userRef, {
          progress: newProgress,
          completed,
          updatedAt: new Date().toISOString()
        });
        
        if (completed) {
          Alert.alert('Achievement Unlocked!', 'You\'ve unlocked the Mood Tracker achievement!');
        }
      }
    } catch (error) {
      console.error('Error updating mood tracking achievement:', error);
    }
  },
  
  updateVoiceCommandAchievement: async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Get the voice command achievement from realtime database
      const userRef = ref(rtdb, `users/${userId}/achievements/voice_commands`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const achievement = snapshot.val();
        if (achievement.completed) return;
        
        // Increment progress
        const newProgress = (achievement.progress || 0) + 1;
        const completed = newProgress >= achievement.total;
        
        // Update the achievement
        await update(userRef, {
          progress: newProgress,
          completed,
          updatedAt: new Date().toISOString()
        });
        
        if (completed) {
          Alert.alert('Achievement Unlocked!', 'You\'ve unlocked the Voice Commander achievement!');
        }
      }
      
      console.log('Voice command achievement updated');
    } catch (error) {
      console.error('Error updating voice command achievement:', error);
    }
  },
  
  updatePomodoroAchievement: async (sessions: number) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Similar implementation to track Pomodoro sessions
      console.log('Pomodoro achievement updated, sessions:', sessions);
    } catch (error) {
      console.error('Error updating pomodoro achievement:', error);
    }
  },
  
  updateStreakAchievement: async (currentStreak: number) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Similar implementation to track streak
      console.log('Streak achievement updated, current streak:', currentStreak);
    } catch (error) {
      console.error('Error updating streak achievement:', error);
    }
  },
  
  updateDailyGrindAchievement: async (consecutiveDaysWithFiveTasks: number) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Similar implementation for daily grind
      console.log('Daily grind achievement updated, days:', consecutiveDaysWithFiveTasks);
    } catch (error) {
      console.error('Error updating daily grind achievement:', error);
    }
  },
  
  trackGoalCompletion: async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Similar implementation for goal tracking
      console.log('Goal completion tracked');
    } catch (error) {
      console.error('Error tracking goal completion:', error);
    }
  },
  
  handleUpdateAchievements: async (tasks: Task[]) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return false;
      
      console.log('Updating achievements based on', tasks.length, 'tasks');
      
      // Get current user stats and achievements
      const userStatsRef = ref(rtdb, `users/${userId}/stats`);
      const statsSnapshot = await get(userStatsRef);
      const currentStats = statsSnapshot.exists() ? statsSnapshot.val() : {};
      
      const achievementsRef = ref(rtdb, `users/${userId}/achievements`);
      const achievementsSnapshot = await get(achievementsRef);
      let achievements = achievementsSnapshot.exists() ? achievementsSnapshot.val() : {};
      
      // If achievements don't exist yet, initialize them
      if (!achievements || Object.keys(achievements).length === 0) {
        await initializeAllAchievementsForUser(userId);
        return true;
      }
      
      // Calculate important metrics from tasks
      const completedTasks = tasks.filter(task => task.completed).length;
      const highPriorityCompleted = tasks.filter(task => task.completed && task.priority === 'high').length;
      const categoriesCompleted = new Set(tasks.filter(task => task.completed).map(task => task.category)).size;
      
      // Get tasks completed today
      const now = new Date();
      const today = now.toDateString();
      const tasksCompletedToday = tasks.filter(
        task => task.completed && task.completedAt && new Date(task.completedAt).toDateString() === today
      ).length;
      
      // Prepare the updates object
      const updates: {[key: string]: any} = {};
      
      // Update basic stats
      updates[`users/${userId}/stats/completedTasks`] = completedTasks;
      updates[`users/${userId}/stats/tasksCompletedToday`] = tasksCompletedToday;
      updates[`users/${userId}/stats/lastActive`] = now.toISOString();
      updates[`users/${userId}/stats/lastActiveDate`] = now.toISOString();
      
      // Calculate and update league based on current points (not adding new points)
      let newLeague = "Bronze";
      for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
        if (currentStats.points >= LEAGUE_TIERS[i].threshold) {
          newLeague = LEAGUE_TIERS[i].name;
          break;
        }
      }
      updates[`users/${userId}/stats/leagueLevel`] = newLeague;
      
      // Update achievement progress
      // 1. Task Starter - First task completed
      if (achievements.task_starter && !achievements.task_starter.completed) {
        const newProgress = completedTasks > 0 ? 1 : 0;
        updates[`users/${userId}/achievements/task_starter/progress`] = newProgress;
        updates[`users/${userId}/achievements/task_starter/completed`] = newProgress >= achievements.task_starter.total;
        updates[`users/${userId}/achievements/task_starter/updatedAt`] = now.toISOString();
      }
      
      // 2. Task Master - 10 tasks completed
      if (achievements.task_master && !achievements.task_master.completed) {
        const newProgress = Math.min(completedTasks, achievements.task_master.total);
        updates[`users/${userId}/achievements/task_master/progress`] = newProgress;
        updates[`users/${userId}/achievements/task_master/completed`] = newProgress >= achievements.task_master.total;
        updates[`users/${userId}/achievements/task_master/updatedAt`] = now.toISOString();
      }
      
      // 3. Consistency is Key - 5 tasks in one day
      if (achievements.consistency_is_key && !achievements.consistency_is_key.completed) {
        const newProgress = Math.min(tasksCompletedToday, achievements.consistency_is_key.total);
        updates[`users/${userId}/achievements/consistency_is_key/progress`] = newProgress;
        updates[`users/${userId}/achievements/consistency_is_key/completed`] = newProgress >= achievements.consistency_is_key.total;
        updates[`users/${userId}/achievements/consistency_is_key/updatedAt`] = now.toISOString();
      }
      
      // 4. Task Collector - 50 tasks completed
      if (achievements.task_collector && !achievements.task_collector.completed) {
        const newProgress = Math.min(completedTasks, achievements.task_collector.total);
        updates[`users/${userId}/achievements/task_collector/progress`] = newProgress;
        updates[`users/${userId}/achievements/task_collector/completed`] = newProgress >= achievements.task_collector.total;
        updates[`users/${userId}/achievements/task_collector/updatedAt`] = now.toISOString();
      }
      
      // 5. Task Champion - 100 tasks completed
      if (achievements.task_champion && !achievements.task_champion.completed) {
        const newProgress = Math.min(completedTasks, achievements.task_champion.total);
        updates[`users/${userId}/achievements/task_champion/progress`] = newProgress;
        updates[`users/${userId}/achievements/task_champion/completed`] = newProgress >= achievements.task_champion.total;
        updates[`users/${userId}/achievements/task_champion/updatedAt`] = now.toISOString();
      }
      
      // 6. Task Commander - 200 tasks completed
      if (achievements.task_commander && !achievements.task_commander.completed) {
        const newProgress = Math.min(completedTasks, achievements.task_commander.total);
        updates[`users/${userId}/achievements/task_commander/progress`] = newProgress;
        updates[`users/${userId}/achievements/task_commander/completed`] = newProgress >= achievements.task_commander.total;
        updates[`users/${userId}/achievements/task_commander/updatedAt`] = now.toISOString();
      }
      
      // 7. Urgency Pro - 5 high priority tasks completed
      if (achievements.urgency_pro && !achievements.urgency_pro.completed) {
        const newProgress = Math.min(highPriorityCompleted, achievements.urgency_pro.total);
        updates[`users/${userId}/achievements/urgency_pro/progress`] = newProgress;
        updates[`users/${userId}/achievements/urgency_pro/completed`] = newProgress >= achievements.urgency_pro.total;
        updates[`users/${userId}/achievements/urgency_pro/updatedAt`] = now.toISOString();
      }
      
      // 8. Task Diversifier - Complete tasks in 5 different categories
      if (achievements.task_diversifier && !achievements.task_diversifier.completed) {
        const newProgress = Math.min(categoriesCompleted, achievements.task_diversifier.total);
        updates[`users/${userId}/achievements/task_diversifier/progress`] = newProgress;
        updates[`users/${userId}/achievements/task_diversifier/completed`] = newProgress >= achievements.task_diversifier.total;
        updates[`users/${userId}/achievements/task_diversifier/updatedAt`] = now.toISOString();
      }
      
      // Track streak achievements
      if (currentStats.currentStreak && currentStats.currentStreak >= 7) {
        // Update Task Streak achievement
        if (achievements.task_streak && !achievements.task_streak.completed) {
          const newProgress = Math.min(currentStats.currentStreak, achievements.task_streak.total);
          updates[`users/${userId}/achievements/task_streak/progress`] = newProgress;
          updates[`users/${userId}/achievements/task_streak/completed`] = newProgress >= achievements.task_streak.total;
          updates[`users/${userId}/achievements/task_streak/updatedAt`] = now.toISOString();
        }
      }
      
      // Update achievements and automatically claim them if completed
      let totalPointsToAward = 0;
      interface CompletedAchievement {
        title: string;
        points: number;
      }
      const newlyCompletedAchievements: CompletedAchievement[] = [];
      
      const achievementsToUpdate = [
        {
          id: 'task_starter',
          condition: completedTasks >= 1,
          progress: 1,
          total: 1
        },
        {
          id: 'task_master',
          condition: completedTasks >= 10,
          progress: completedTasks,
          total: 10
        },
        {
          id: 'consistency_is_key',
          condition: tasksCompletedToday >= 5,
          progress: tasksCompletedToday,
          total: 5
        },
        {
          id: 'task_collector',
          condition: completedTasks >= 50,
          progress: completedTasks,
          total: 50
        },
        {
          id: 'task_champion',
          condition: completedTasks >= 100,
          progress: completedTasks,
          total: 100
        },
        {
          id: 'task_commander',
          condition: completedTasks >= 200,
          progress: completedTasks,
          total: 200
        },
        {
          id: 'urgency_pro',
          condition: highPriorityCompleted >= 5,
          progress: highPriorityCompleted,
          total: 5
        },
        {
          id: 'task_diversifier',
          condition: categoriesCompleted >= 5,
          progress: categoriesCompleted,
          total: 5
        },
        {
          id: 'task_streak',
          condition: currentStats.currentStreak >= 7,
          progress: currentStats.currentStreak,
          total: 7
        }
      ];
      
      achievementsToUpdate.forEach(({ id, condition, progress, total }) => {
        // Only process achievements that are not completed and not claimed
        if (achievements[id] && !achievements[id].completed && !achievements[id].claimed) {
          // Update progress
          updates[`users/${userId}/achievements/${id}/progress`] = progress;
          
          // Check if achievement is completed
          if (condition) {
            // Mark as completed but NOT automatically claimed
            updates[`users/${userId}/achievements/${id}/completed`] = true;
            updates[`users/${userId}/achievements/${id}/updatedAt`] = now.toISOString();
            
            // Add to newly completed achievements for notification
            newlyCompletedAchievements.push({
              title: achievements[id].title,
              points: achievements[id].points
            });
          }
        }
        // We don't modify already completed achievements here
      });
      
      // Don't calculate points for completed tasks - only add points when achievements are claimed
      const currentPoints = currentStats.points || 0;
      
      // Apply all updates in one batch
      await update(ref(rtdb), updates);
      
      // Show notifications for completed achievements
      if (newlyCompletedAchievements.length === 1) {
        const achievement = newlyCompletedAchievements[0];
        Alert.alert(
          'Achievement Unlocked!', 
          `You've unlocked "${achievement.title}"! Go to Achievements to claim your ${achievement.points} points.`
        );
      } else if (newlyCompletedAchievements.length > 1) {
        Alert.alert(
          'Achievements Unlocked!', 
          `You've unlocked ${newlyCompletedAchievements.length} achievements! Go to Achievements to claim your points.`
        );
      }
      
      // Show league up notification if changed
      if (newLeague !== (statsSnapshot.exists() ? statsSnapshot.val().leagueLevel : "Bronze")) {
        Alert.alert('Level Up!', `Congratulations! You've reached ${newLeague} league!`);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating achievements:', error);
      return false;
    }
  },
  
  trackTaskCompletionRealtime: async (task: Task): Promise<boolean> => {
    try {
      console.log("🔍 [Achievement Tracking] Starting trackTaskCompletionRealtime with task:", {
        id: task.id,
        title: task.title,
        completed: task.completed,
        category: task.category,
        priority: task.priority
      });
      
      if (!task.completed) {
        console.log("❌ [Achievement Tracking] Task is not marked as completed, skipping achievement tracking");
        return false;
      }
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log("❌ [Achievement Tracking] No user ID found, skipping achievement tracking");
        return false;
      }
      
      console.log(`✅ [Achievement Tracking] User authenticated: ${userId}`);
      
      const now = new Date();
      const today = now.toDateString();
      
      // Get current user stats
      console.log(`🔍 [Achievement Tracking] Fetching current user stats from path: users/${userId}/stats`);
      const userStatsRef = ref(rtdb, `users/${userId}/stats`);
      const statsSnapshot = await get(userStatsRef);
      
      if (!statsSnapshot.exists()) {
        console.log("⚠️ [Achievement Tracking] No stats found for user, will initialize default values");
      } else {
        console.log("✅ [Achievement Tracking] User stats found:", statsSnapshot.val());
      }
      
      const currentStats = statsSnapshot.exists() ? statsSnapshot.val() : {};
      
      // Get current achievements
      console.log(`🔍 [Achievement Tracking] Fetching current achievements from path: users/${userId}/achievements`);
      const achievementsRef = ref(rtdb, `users/${userId}/achievements`);
      const achievementsSnapshot = await get(achievementsRef);
      
      if (!achievementsSnapshot.exists()) {
        console.log("⚠️ [Achievement Tracking] No achievements found, need to initialize");
      } else {
        console.log(`✅ [Achievement Tracking] Found ${Object.keys(achievementsSnapshot.val()).length} achievements`);
      }
      
      let achievements = achievementsSnapshot.exists() ? achievementsSnapshot.val() : {};
      
      // Check if we need to initialize all achievements
      if (!achievements || Object.keys(achievements).length <= 1) {
        console.log("🔄 [Achievement Tracking] Missing achievements, initializing all achievements...");
        await initializeAllAchievementsForUser(userId);
        
        // Get the newly initialized achievements
        const newAchievementsSnapshot = await get(achievementsRef);
        if (newAchievementsSnapshot.exists()) {
          achievements = newAchievementsSnapshot.val();
          console.log(`✅ [Achievement Tracking] Initialized ${Object.keys(achievements).length} achievements`);
        } else {
          console.error("❌ [Achievement Tracking] Failed to initialize achievements");
          return false;
        }
      } else {
        console.log(`✅ [Achievement Tracking] Found ${Object.keys(achievements).length} existing achievements`);
      }
      
      // Prepare the updates object
      const updates: {[key: string]: any} = {};
      
      // Calculate stats updates
      const completedTasks = (currentStats.completedTasks || 0) + 1;
      const tasksCompletedToday = currentStats.tasksCompletedToday || 0;
      const lastActiveDate = currentStats.lastActiveDate ? new Date(currentStats.lastActiveDate).toDateString() : null;
      const newTasksCompletedToday = lastActiveDate !== today ? 1 : tasksCompletedToday + 1;
      
      console.log(`🔍 [Achievement Tracking] Calculated stats:`, {
        completedTasks,
        tasksCompletedToday: newTasksCompletedToday,
        lastActiveDate,
        today
      });
      
      // Update basic stats
      updates[`users/${userId}/stats/completedTasks`] = completedTasks;
      updates[`users/${userId}/stats/tasksCompletedToday`] = newTasksCompletedToday;
      updates[`users/${userId}/stats/lastActive`] = now.toISOString();
      updates[`users/${userId}/stats/lastActiveDate`] = now.toISOString();
      
      // Update streak information
      let currentStreak = currentStats.currentStreak || 0;
      let longestStreak = currentStats.longestStreak || 0;
      
      // Check if this is a new day
      if (lastActiveDate) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActiveDate === yesterday.toDateString()) {
          // Continuing the streak
          currentStreak += 1;
          console.log(`✅ [Achievement Tracking] Continuing streak, new value: ${currentStreak}`);
        } else if (lastActiveDate !== today) {
          // Not yesterday and not today, reset streak
          currentStreak = 1;
          console.log(`🔄 [Achievement Tracking] Resetting streak to 1 (last active: ${lastActiveDate})`);
        } else {
          console.log(`ℹ️ [Achievement Tracking] Already active today, streak remains: ${currentStreak}`);
        }
      } else {
        // First activity, start streak at 1
        currentStreak = 1;
        console.log(`✅ [Achievement Tracking] First activity, starting streak at 1`);
      }
      
      // Update longest streak if needed
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        console.log(`🏆 [Achievement Tracking] New longest streak: ${longestStreak}`);
      }
      
      updates[`users/${userId}/stats/currentStreak`] = currentStreak;
      updates[`users/${userId}/stats/longestStreak`] = longestStreak;
      
      // Use existing points for league calculation
      const currentPoints = currentStats.points || 0;
      
      // Calculate and update league based on points
      let newLeague = "Bronze";
      for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
        if (currentPoints >= LEAGUE_TIERS[i].threshold) {
          newLeague = LEAGUE_TIERS[i].name;
          break;
        }
      }
      updates[`users/${userId}/stats/leagueLevel`] = newLeague;
      
      // Store task type counts
      const taskCounts = currentStats.taskCounts || {};
      if (task.category) {
        taskCounts[task.category] = (taskCounts[task.category] || 0) + 1;
        console.log(`✅ [Achievement Tracking] Updated count for category ${task.category}: ${taskCounts[task.category]}`);
      }
      
      // Count high priority tasks
      const highPriorityCompleted = task.priority === 'high' 
        ? (taskCounts.highPriority || 0) + 1 
        : (taskCounts.highPriority || 0);
      
      if (task.priority === 'high') {
        taskCounts.highPriority = highPriorityCompleted;
        console.log(`✅ [Achievement Tracking] Updated count for high priority tasks: ${highPriorityCompleted}`);
      }
      
      updates[`users/${userId}/stats/taskCounts`] = taskCounts;
      
      // Calculate categories completed
      // For the task_diversifier achievement
      const categoriesCompleted = Object.keys(taskCounts).filter(key => key !== 'highPriority').length;
      console.log(`ℹ️ [Achievement Tracking] Categories completed: ${categoriesCompleted}`);
      
      // Check and update achievements based on stats
      const achievementsToUpdate = [
        {
          id: 'task_starter',
          condition: completedTasks >= 1,
          progress: 1,
          total: 1
        },
        {
          id: 'task_master',
          condition: completedTasks >= 10,
          progress: completedTasks,
          total: 10
        },
        {
          id: 'consistency_is_key',
          condition: newTasksCompletedToday >= 5,
          progress: newTasksCompletedToday,
          total: 5
        },
        {
          id: 'task_collector',
          condition: completedTasks >= 50,
          progress: completedTasks,
          total: 50
        },
        {
          id: 'task_champion',
          condition: completedTasks >= 100,
          progress: completedTasks,
          total: 100
        },
        {
          id: 'task_commander',
          condition: completedTasks >= 200,
          progress: completedTasks,
          total: 200
        },
        {
          id: 'urgency_pro',
          condition: highPriorityCompleted >= 5,
          progress: highPriorityCompleted,
          total: 5
        },
        {
          id: 'task_diversifier',
          condition: categoriesCompleted >= 5,
          progress: categoriesCompleted,
          total: 5
        },
        {
          id: 'task_streak',
          condition: currentStreak >= 7,
          progress: currentStreak,
          total: 7
        }
      ];
      
      // Update achievements but do not auto-claim
      const newlyCompletedAchievements: {title: string, points: number}[] = [];
      
      achievementsToUpdate.forEach(({ id, condition, progress, total }) => {
        // Only process achievements that are not completed and not claimed
        if (achievements[id] && !achievements[id].completed && !achievements[id].claimed) {
          // Update progress
          console.log(`🔄 [Achievement Tracking] Updating "${id}" progress: ${progress}/${total}`);
          updates[`users/${userId}/achievements/${id}/progress`] = progress;
          
          // Check if achievement is completed
          if (condition) {
            // Mark as completed but do not automatically claim
            console.log(`🏆 [Achievement Tracking] Achievement "${id}" completed!`);
            updates[`users/${userId}/achievements/${id}/completed`] = true;
            updates[`users/${userId}/achievements/${id}/updatedAt`] = now.toISOString();
            
            // Track completed achievement for notification only
            newlyCompletedAchievements.push({
              title: achievements[id].title,
              points: achievements[id].points
            });
          }
        }
      });
      
      console.log(`📝 [Achievement Tracking] Prepared ${Object.keys(updates).length} updates to write`);
      
      // Apply all updates in one batch
      try {
        console.log(`💾 [Achievement Tracking] Writing updates to database...`);
        await update(ref(rtdb), updates);
        console.log(`✅ [Achievement Tracking] Successfully wrote updates to database`);
        
        // Verify updates were applied
        console.log(`🔍 [Achievement Tracking] Verifying updates were applied...`);
        const verifyStatsRef = ref(rtdb, `users/${userId}/stats`);
        const verifyStatsSnapshot = await get(verifyStatsRef);
        if (verifyStatsSnapshot.exists()) {
          const verifiedStats = verifyStatsSnapshot.val();
          console.log(`✅ [Achievement Tracking] Verified stats:`, {
            completedTasks: verifiedStats.completedTasks,
            tasksCompletedToday: verifiedStats.tasksCompletedToday,
            streak: verifiedStats.currentStreak
          });
        } else {
          console.error(`❌ [Achievement Tracking] Failed to verify stats - no data found!`);
        }
      } catch (updateError) {
        console.error(`❌ [Achievement Tracking] Error writing updates:`, updateError);
        return false;
      }
      
      // Show notifications for completed achievements
      if (newlyCompletedAchievements.length === 1) {
        const achievement = newlyCompletedAchievements[0];
        Alert.alert(
          'Achievement Unlocked!', 
          `You've unlocked "${achievement.title}"! Go to Achievements to claim your ${achievement.points} points.`
        );
      } else if (newlyCompletedAchievements.length > 1) {
        Alert.alert(
          'Achievements Unlocked!', 
          `You've unlocked ${newlyCompletedAchievements.length} achievements! Go to Achievements to claim your points.`
        );
      }
      
      // Show league up notification if changed
      if (newLeague !== (statsSnapshot.exists() ? statsSnapshot.val().leagueLevel : "Bronze")) {
        Alert.alert('Level Up!', `Congratulations! You've reached ${newLeague} league!`);
      }
      
      console.log(`✅ [Achievement Tracking] Completed trackTaskCompletionRealtime successfully`);
      return true;
    } catch (error) {
      console.error('❌ [Achievement Tracking] Error updating achievements:', error);
      return false;
    }
  },
  
  // Add a new function to claim achievements using Realtime Database
  handleClaimRealtimeAchievement: async (achievementId: string): Promise<void> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('[CLAIM] No authenticated user found when claiming achievement');
        Alert.alert('Sign In Required', 'Please sign in to claim achievements.');
        return;
      }
      
      console.log(`[CLAIM] Starting claim process for achievement ${achievementId} by user ${userId}`);
      
      // Get the achievement reference to check if it's claimable
      const achievementRef = ref(rtdb, `users/${userId}/achievements/${achievementId}`);
      const achievementSnapshot = await get(achievementRef);
      
      if (!achievementSnapshot.exists()) {
        console.error(`[CLAIM] Achievement ${achievementId} not found in database`);
        
        // For new users, try to initialize achievements first
        console.log('[CLAIM] Attempting to initialize achievements for new user');
        await initializeAllAchievementsForUser(userId);
        
        // Check again after initialization
        const retrySnapshot = await get(achievementRef);
        if (!retrySnapshot.exists()) {
          Alert.alert('Error', 'Achievement not found. Please restart the app and try again.');
          return;
        }
        
        // Use the newly initialized achievement
        const achievement = retrySnapshot.val();
        console.log('[CLAIM] Achievement initialized and found:', achievement);
        
        // If it's not completed yet, we can't claim it
        if (!achievement.completed) {
          Alert.alert('Not Completed', 'You need to complete this achievement before claiming it.');
          return;
        }
      }
      
      // Get the achievement data
      const achievement = achievementSnapshot.exists() ? 
        achievementSnapshot.val() : 
        (await get(achievementRef)).val();
        
      console.log('[CLAIM] Achievement data:', achievement);
      
      // Check if it can be claimed
      if (!achievement.completed) {
        console.log(`[CLAIM] Achievement ${achievementId} is not completed yet`);
        Alert.alert('Not Completed', 'You need to complete this achievement before claiming it.');
        return;
      }
      
      if (achievement.claimed) {
        console.log(`[CLAIM] Achievement ${achievementId} is already claimed`);
        Alert.alert('Already Claimed', 'You have already claimed this achievement.');
        return;
      }
      
      // Get or initialize stats for the user
      const statsRef = ref(rtdb, `users/${userId}/stats`);
      const statsSnapshot = await get(statsRef);
      
      // Use default stats if not found
      let stats = {
        points: 0,
        completedTasks: 0,
        currentStreak: 0,
        longestStreak: 0,
        leagueLevel: 'Bronze',
        lastActive: new Date().toISOString(),
        lastActiveDate: new Date().toISOString()
      };
      
      // If stats exist, use them
      if (statsSnapshot.exists()) {
        stats = statsSnapshot.val();
      } else {
        // Initialize stats if they don't exist
        console.log('[CLAIM] Stats node does not exist. Creating it now.');
        await set(statsRef, stats);
      }
      
      console.log('[CLAIM] Current stats before update:', stats);
      
      // Calculate points
      const pointsToAward = achievement.points || 0;
      const currentPoints = stats.points || 0; // Ensure this isn't undefined
      const newTotalPoints = currentPoints + pointsToAward;
      
      console.log(`[CLAIM] Points calculation: ${currentPoints} + ${pointsToAward} = ${newTotalPoints}`);
      
      // Atomic transaction to update both achievement status and user points
      const updates: { [key: string]: any } = {};
      
      // Mark achievement as claimed and permanently unclaimable
      updates[`users/${userId}/achievements/${achievementId}/claimed`] = true;
      updates[`users/${userId}/achievements/${achievementId}/updatedAt`] = new Date().toISOString();
      
      // Update points in stats - directly setting the correct value
      updates[`users/${userId}/stats/points`] = newTotalPoints;
      updates[`users/${userId}/stats/lastUpdated`] = new Date().toISOString();
      
      // Calculate and update league based on new total points
      let newLeague = "Bronze";
      for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
        if (newTotalPoints >= LEAGUE_TIERS[i].threshold) {
          newLeague = LEAGUE_TIERS[i].name;
          break;
        }
      }
      updates[`users/${userId}/stats/leagueLevel`] = newLeague;
      
      // Apply all updates in one atomic operation
      console.log('[CLAIM] Writing all updates to database in one transaction');
      await update(ref(rtdb), updates);
      
      // Verify the achievement was marked as claimed
      const verifyAchievementSnapshot = await get(achievementRef);
      if (verifyAchievementSnapshot.exists()) {
        console.log('[CLAIM] Verify achievement claimed status:', verifyAchievementSnapshot.val().claimed);
        if (!verifyAchievementSnapshot.val().claimed) {
          console.error('[CLAIM] Failed to mark achievement as claimed');
          throw new Error('Failed to mark achievement as claimed');
        }
      }
      
      // Verify points were updated
      const verifyPointsSnapshot = await get(statsRef);
      if (verifyPointsSnapshot.exists()) {
        console.log('[CLAIM] Verify updated points:', verifyPointsSnapshot.val().points);
        if (verifyPointsSnapshot.val().points !== newTotalPoints) {
          console.error('[CLAIM] Points were not updated correctly');
          throw new Error('Points were not updated correctly');
        }
      } else {
        console.error('[CLAIM] Stats node missing after update attempt');
        throw new Error('Stats node missing after update');
      }
      
      console.log(`[CLAIM] Achievement claim operation completed for ${achievementId}`);
      
      // Show notification to user with point information
      Alert.alert(
        'Achievement Claimed!', 
        `You've claimed the achievement and earned ${pointsToAward} points! Your total is now ${newTotalPoints} points.`
      );
      
      // Show league up notification if changed
      if (newLeague !== stats.leagueLevel) {
        Alert.alert('Level Up!', `Congratulations! You've reached ${newLeague} league!`);
      }
      
      // Trigger auto-backup after claiming an achievement
      AchievementManager.autoBackupAchievements().catch(error => 
        console.error('[CLAIM] Auto-backup error:', error)
      );
      
    } catch (error) {
      console.error('[CLAIM] Error claiming achievement:', error);
      Alert.alert('Error', 'There was a problem claiming your achievement. Please try again.');
    }
  },
  
  // Force initialization of achievements
  forceInitializeAchievements: async (): Promise<boolean> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to initialize achievements');
        return false;
      }
      
      console.log('forceInitializeAchievements: Starting force initialization...');
      const success = await initializeAllAchievementsForUser(userId);
      
      if (success) {
        Alert.alert('Success', 'All achievements have been initialized. Your progress has been reset.');
        console.log('forceInitializeAchievements: Initialization successful');
      } else {
        Alert.alert('Error', 'Failed to initialize achievements');
        console.log('forceInitializeAchievements: Initialization failed');
      }
      
      return success;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error force initializing achievements:', errorMessage);
      Alert.alert('Error', `Failed to initialize achievements: ${errorMessage}`);
      return false;
    }
  },
  
  // Setup a real-time listener for achievements and points
  setupRealtimeListener: (
    onUpdate: (data: { achievements: Achievement[], userPoints: number }) => void
  ): (() => void) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.log('setupRealtimeListener: No user logged in');
      return () => {};
    }
    
    console.log('setupRealtimeListener: Setting up listener...');
    const userRef = ref(rtdb, `users/${userId}`);
    
    // Initial data fetch to provide immediate data
    const fetchInitialData = async () => {
      try {
        console.log('Initial data fetch started...');
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const userPoints = userData.stats?.points || 0;
          
          let achievements: Achievement[] = [];
          if (userData.achievements) {
            achievements = Object.entries(userData.achievements).map(([key, value]) => ({
              ...(value as Achievement),
              docId: key
            }));
          }
          
          // Call the callback with the updated data
          onUpdate({ achievements, userPoints });
          console.log('Initial data fetch complete:', { 
            achievementCount: achievements.length, 
            userPoints,
            completedCount: achievements.filter(a => a.completed).length,
            claimedCount: achievements.filter(a => a.claimed).length 
          });
        } else {
          console.log('No user data found on initial fetch');
          // Initialize achievements if none exist
          await initializeAllAchievementsForUser(userId);
          // Try again after initialization
          const retrySnapshot = await get(userRef);
          if (retrySnapshot.exists()) {
            const userData = retrySnapshot.val();
            const userPoints = userData.stats?.points || 0;
            
            let achievements: Achievement[] = [];
            if (userData.achievements) {
              achievements = Object.entries(userData.achievements).map(([key, value]) => ({
                ...(value as Achievement),
                docId: key
              }));
            }
            
            // Call the callback with the updated data
            onUpdate({ achievements, userPoints });
            console.log('Retry fetch complete after initialization');
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    // Call for immediate data
    fetchInitialData();
    
    // Set up the real-time listener
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const userPoints = userData.stats?.points || 0;
        
        let achievements: Achievement[] = [];
        if (userData.achievements) {
          achievements = Object.entries(userData.achievements).map(([key, value]) => ({
            ...(value as Achievement),
            docId: key
          }));
        }
        
        // Call the callback with the updated data
        onUpdate({ achievements, userPoints });
        console.log('Real-time update received:', { 
          userPoints,
          completedCount: achievements.filter(a => a.completed).length,
          claimedCount: achievements.filter(a => a.claimed).length 
        });
      } else {
        console.log('No data in snapshot from real-time update');
      }
    }, (error) => {
      console.error('setupRealtimeListener: Error in listener:', error);
    });
    
    // Return a function to unsubscribe when needed
    return () => {
      console.log('setupRealtimeListener: Unsubscribing...');
      unsubscribe();
    };
  },

  // Backup user achievement data to a separate location in RTDB
  backupAchievementData: async (): Promise<boolean> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('backupAchievementData: No user logged in');
        return false;
      }
      
      console.log('backupAchievementData: Starting backup process');
      
      // Get current user data from RTDB
      const userRef = ref(rtdb, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        console.log('backupAchievementData: No user data found to backup');
        return false;
      }
      
      const userData = snapshot.val();
      const backupData = {
        achievements: userData.achievements || {},
        stats: userData.stats || {},
        backupDate: new Date().toISOString()
      };
      
      // Write to backups location with timestamp
      const backupRef = ref(rtdb, `backups/${userId}/achievements`);
      await set(backupRef, backupData);
      
      console.log('backupAchievementData: Backup completed successfully');
      return true;
    } catch (error) {
      console.error('Error backing up achievement data:', error);
      return false;
    }
  },
  
  // Restore user achievement data from backup
  restoreAchievementData: async (): Promise<boolean> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('restoreAchievementData: No user logged in');
        return false;
      }
      
      console.log('restoreAchievementData: Starting restore process');
      
      // Get backup data
      const backupRef = ref(rtdb, `backups/${userId}/achievements`);
      const backupSnapshot = await get(backupRef);
      
      if (!backupSnapshot.exists()) {
        console.log('restoreAchievementData: No backup data found');
        return false;
      }
      
      const backupData = backupSnapshot.val();
      
      // Restore achievements and stats
      const userRef = ref(rtdb, `users/${userId}`);
      await update(userRef, {
        achievements: backupData.achievements,
        stats: backupData.stats
      });
      
      // Also update Firestore stats for consistency
      try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          'stats.points': backupData.stats.points || 0,
          'stats.completedTasks': backupData.stats.completedTasks || 0,
          'stats.currentStreak': backupData.stats.currentStreak || 0,
          'stats.longestStreak': backupData.stats.longestStreak || 0,
          'stats.lastUpdated': new Date()
        });
      } catch (firestoreError) {
        console.error('Warning: Could not update Firestore during restore:', firestoreError);
        // Continue execution as RTDB is the primary source for achievements
      }
      
      console.log('restoreAchievementData: Restore completed successfully');
      return true;
    } catch (error) {
      console.error('Error restoring achievement data:', error);
      return false;
    }
  },
  
  // Auto-backup achievements after significant events
  autoBackupAchievements: async (): Promise<void> => {
    try {
      // Check if we should perform a backup (e.g. not too soon after previous backup)
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const lastBackupRef = ref(rtdb, `backups/${userId}/achievements/backupDate`);
      const lastBackupSnapshot = await get(lastBackupRef);
      
      const now = new Date();
      let shouldBackup = true;
      
      if (lastBackupSnapshot.exists()) {
        const lastBackupDate = new Date(lastBackupSnapshot.val());
        // Only backup if last backup was more than 1 hour ago
        const hoursSinceLastBackup = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60);
        shouldBackup = hoursSinceLastBackup >= 1;
      }
      
      if (shouldBackup) {
        await AchievementManager.backupAchievementData();
      }
    } catch (error) {
      console.error('Error in auto-backup:', error);
    }
  },

  // Perform periodic syncs of achievement data between RTDB and Firestore
  syncAchievementStats: async (): Promise<boolean> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return false;
      
      // Get stats from RTDB (source of truth)
      const statsRef = ref(rtdb, `users/${userId}/stats`);
      const statsSnapshot = await get(statsRef);
      
      if (!statsSnapshot.exists()) return false;
      const rtdbStats = statsSnapshot.val();
      
      // Update Firestore with the RTDB stats
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        'stats.points': rtdbStats.points || 0,
        'stats.completedTasks': rtdbStats.completedTasks || 0,
        'stats.currentStreak': rtdbStats.currentStreak || 0,
        'stats.longestStreak': rtdbStats.longestStreak || 0,
        'stats.lastSynced': new Date()
      });
      
      console.log('syncAchievementStats: Stats synchronized successfully');
      return true;
    } catch (error) {
      console.error('Error syncing achievement stats:', error);
      return false;
    }
  },

  // Helper function to access the correct stats path
  getUserStatsRef: (userId: string | null | undefined) => {
    if (!userId) {
      userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('getUserStatsRef: No user ID available');
        return null;
      }
    }
    return ref(rtdb, `users/${userId}/stats`);
  },

  // Helper function to get user points
  getUserPoints: async (userId?: string): Promise<number> => {
    try {
      const statsRef = AchievementManager.getUserStatsRef(userId);
      if (!statsRef) return 0;
      
      const snapshot = await get(statsRef);
      if (snapshot.exists()) {
        return snapshot.val().points || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting user points:', error);
      return 0;
    }
  },
  
  // Update user points directly
  updateUserPoints: async (pointsToAdd: number): Promise<boolean> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return false;
      
      // Get current points
      const statsRef = ref(rtdb, `users/${userId}/stats`);
      const snapshot = await get(statsRef);
      const currentPoints = snapshot.exists() ? (snapshot.val().points || 0) : 0;
      
      // Calculate new points
      const newPoints = currentPoints + pointsToAdd;
      
      // Update points in RTDB
      await update(statsRef, {
        points: newPoints,
        lastUpdated: new Date().toISOString()
      });
      
      // Also update in Firestore
      try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          'stats.points': newPoints,
          'stats.lastUpdated': new Date()
        });
      } catch (error) {
        console.error('Failed to update Firestore points:', error);
        // Continue execution as RTDB is the primary source
      }
      
      console.log(`Updated points: ${currentPoints} + ${pointsToAdd} = ${newPoints}`);
      return true;
    } catch (error) {
      console.error('Error updating user points:', error);
      return false;
    }
  }
};

export default AchievementManager;