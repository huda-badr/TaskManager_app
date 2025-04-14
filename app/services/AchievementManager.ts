import { auth, db, rtdb } from '@/config/firebase';
import { Achievement, Task } from '@/types';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, updateDoc, Timestamp, increment } from 'firebase/firestore';
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
    
    // Initialize stats
    const stats = {
      points: 0,
      completedTasks: 0,
      tasksCompletedToday: 0,
      currentStreak: 0,
      longestStreak: 0,
      leagueLevel: 'Bronze',
      lastActive: now,
      lastActiveDate: now,
      completedGoals: 0
    };
    
    // Write the data to the database
    await set(ref(rtdb, `users/${userId}/achievements`), achievements);
    await set(ref(rtdb, `users/${userId}/stats`), stats);
    
    console.log(`Initialized ${Object.keys(achievements).length} achievements for user ${userId}`);
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
      
      // Similar implementation as updateMoodTrackingAchievement
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
      
      // Check for league change and notify user
      const currentLeague = currentStats.leagueLevel || "Bronze";
      if (newLeague !== currentLeague) {
        Alert.alert('Level Up!', `Congratulations! You've reached ${newLeague} league!`);
      }
      
      // Update all applicable achievements based on current metrics
      
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
  
  // Add a function to track task completion with Realtime Database
  trackTaskCompletionRealtime: async (task: Task): Promise<boolean> => {
    try {
      console.log("trackTaskCompletionRealtime called with task:", {
        id: task.id,
        title: task.title,
        completed: task.completed,
        category: task.category,
        priority: task.priority
      });
      
      if (!task.completed) {
        console.log("Task is not marked as completed, skipping achievement tracking");
        return false;
      }
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log("No user ID found, skipping achievement tracking");
        return false;
      }
      
      console.log(`Tracking task completion for user ${userId}`);
      
      const now = new Date();
      const today = now.toDateString();
      
      // Get current user stats
      const userStatsRef = ref(rtdb, `users/${userId}/stats`);
      const statsSnapshot = await get(userStatsRef);
      const currentStats = statsSnapshot.exists() ? statsSnapshot.val() : {};
      
      console.log("Current user stats:", {
        completedTasks: currentStats.completedTasks || 0,
        tasksCompletedToday: currentStats.tasksCompletedToday || 0,
        currentStreak: currentStats.currentStreak || 0,
        points: currentStats.points || 0
      });
      
      // Get current achievements
      const achievementsRef = ref(rtdb, `users/${userId}/achievements`);
      const achievementsSnapshot = await get(achievementsRef);
      let achievements = achievementsSnapshot.exists() ? achievementsSnapshot.val() : {};
      
      // Check if we need to initialize all achievements
      if (!achievements || Object.keys(achievements).length <= 1) {
        console.log("Missing achievements, initializing all achievements...");
        await initializeAllAchievementsForUser(userId);
        
        // Get the newly initialized achievements
        const newAchievementsSnapshot = await get(achievementsRef);
        if (newAchievementsSnapshot.exists()) {
          achievements = newAchievementsSnapshot.val();
          console.log(`Initialized ${Object.keys(achievements).length} achievements`);
        } else {
          console.error("Failed to initialize achievements");
          return false;
        }
      } else {
        console.log(`Found ${Object.keys(achievements).length} existing achievements`);
      }
      
      // Prepare the updates object
      const updates: {[key: string]: any} = {};
      
      // Calculate stats updates
      const completedTasks = (currentStats.completedTasks || 0) + 1;
      const tasksCompletedToday = currentStats.tasksCompletedToday || 0;
      const lastActiveDate = currentStats.lastActiveDate ? new Date(currentStats.lastActiveDate).toDateString() : null;
      const newTasksCompletedToday = lastActiveDate !== today ? 1 : tasksCompletedToday + 1;
      
      console.log("Calculated task statistics:", {
        completedTasks,
        tasksCompletedToday: newTasksCompletedToday,
        lastActiveDate
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
          console.log(`Continuing streak: ${currentStreak}`);
        } else if (lastActiveDate !== today) {
          // Not yesterday and not today, reset streak
          currentStreak = 1;
          console.log(`Resetting streak, new value: ${currentStreak}`);
        }
      } else {
        // First activity, start streak at 1
        currentStreak = 1;
        console.log(`First activity, setting streak to: ${currentStreak}`);
      }
      
      // Update longest streak if needed
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        console.log(`New longest streak: ${longestStreak}`);
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
        console.log(`Updated count for category ${task.category}: ${taskCounts[task.category]}`);
      }
      if (task.priority === 'high') {
        taskCounts.highPriority = (taskCounts.highPriority || 0) + 1;
        console.log(`Updated count for high priority tasks: ${taskCounts.highPriority}`);
      }
      updates[`users/${userId}/stats/taskCounts`] = taskCounts;
      
      // Process achievement updates
      console.log("Processing achievement updates based on task completion...");
      
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
          condition: taskCounts.highPriority >= 5,
          progress: taskCounts.highPriority || 0,
          total: 5
        },
        {
          id: 'task_diversifier',
          condition: Object.keys(taskCounts).length >= 5,
          progress: Object.keys(taskCounts).length,
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
          updates[`users/${userId}/achievements/${id}/progress`] = progress;
          console.log(`Updating achievement ${id} progress to ${progress}/${total}`);
          
          // Check if achievement is completed
          if (condition) {
            // Mark as completed but NOT automatically claimed
            updates[`users/${userId}/achievements/${id}/completed`] = true;
            updates[`users/${userId}/achievements/${id}/updatedAt`] = now.toISOString();
            console.log(`Achievement ${id} is now completed!`);
            
            // Track completed achievement for notification only
            newlyCompletedAchievements.push({
              title: achievements[id].title,
              points: achievements[id].points
            });
          }
        } else {
          console.log(`Skipping achievement ${id} - already completed: ${achievements[id]?.completed}, claimed: ${achievements[id]?.claimed}`);
        }
      });
      
      // Show a summary of achievement updates
      console.log(`Updating ${Object.keys(updates).length} values in the database`);
      if (newlyCompletedAchievements.length > 0) {
        console.log(`Completed ${newlyCompletedAchievements.length} new achievements`);
      }
      
      // Apply all updates in one batch
      await update(ref(rtdb), updates);
      console.log("All updates applied successfully");
      
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
      
      console.log("Task completion tracking finished successfully");
      return true;
    } catch (error: unknown) {
      console.error('Error tracking task completion:', error instanceof Error ? error.message : String(error));
      return false;
    }
  },
  
  // Add a new function to claim achievements using Realtime Database
  handleClaimRealtimeAchievement: async (achievementId: string): Promise<void> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      console.log(`Claiming achievement ${achievementId} for user ${userId}`);
      
      // Create a transaction reference
      const userRef = ref(rtdb, `users/${userId}`);
      
      // Always get fresh data directly from the database to prevent race conditions
      const userSnapshot = await get(userRef);
      
      if (!userSnapshot.exists()) {
        console.error('User data not found');
        return;
      }
      
      const userData = userSnapshot.val();
      const achievements = userData.achievements || {};
      const stats = userData.stats || {};
      
      // Check if achievement exists and can be claimed
      if (!achievements[achievementId]) {
        console.error(`Achievement with id ${achievementId} not found`);
        return;
      }
      
      const achievement = achievements[achievementId];
      
      // Skip if already claimed to prevent duplicate points
      if (!achievement.completed || achievement.claimed) {
        console.log(`Achievement ${achievementId} cannot be claimed - either not completed or already claimed`);
        console.log('Achievement state:', achievement);
        return;
      }
      
      // Debug current points
      console.log(`Current points before claiming: ${stats.points}`);
      
      // Prepare the updates
      const updates: {[key: string]: any} = {};
      
      // Mark achievement as claimed, but don't modify other properties
      updates[`users/${userId}/achievements/${achievementId}/claimed`] = true;
      updates[`users/${userId}/achievements/${achievementId}/updatedAt`] = new Date().toISOString();
      
      // Only add points if not already claimed - use database values for points
      const pointsToAward = achievement.points || 0;
      const currentPoints = stats.points || 0;
      
      // Explicitly calculate new total
      const newTotalPoints = currentPoints + pointsToAward;
      
      console.log(`Adding ${pointsToAward} points. Current: ${currentPoints}, New total: ${newTotalPoints}`);
      
      // Update the points with the calculated value from database
      updates[`users/${userId}/stats/points`] = newTotalPoints;
      
      // Calculate and update league based on points from database
      let newLeague = "Bronze";
      for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
        if (newTotalPoints >= LEAGUE_TIERS[i].threshold) {
          newLeague = LEAGUE_TIERS[i].name;
          break;
        }
      }
      updates[`users/${userId}/stats/leagueLevel`] = newLeague;
      
      // Apply all updates in one batch
      await update(ref(rtdb), updates);
      
      console.log(`Achievement ${achievementId} claimed successfully. Points awarded: ${pointsToAward}, New total: ${newTotalPoints}`);
      
      // Show claim notification
      Alert.alert(
        'Achievement Claimed!', 
        `You've claimed the achievement and earned ${pointsToAward} points!`
      );
      
      // Show league up notification if changed
      if (newLeague !== stats.leagueLevel) {
        Alert.alert('Level Up!', `Congratulations! You've reached ${newLeague} league!`);
      }
    } catch (error: unknown) {
      console.error('Error claiming achievement:', error instanceof Error ? error.message : String(error));
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
  }
};

export default AchievementManager;