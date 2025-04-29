import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  useWindowDimensions,
} from "react-native";
import { auth, db } from "@/config/firebase";
import { router, useFocusEffect } from "expo-router";
import { collection, getDocs, addDoc, Timestamp, query, where, updateDoc, doc, orderBy, deleteDoc, getDoc, writeBatch, increment, setDoc } from "firebase/firestore";
import { Task } from "@/types";
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BarChart, PieChart } from "react-native-chart-kit";
import TaskFilters from '@/components/TaskFilters';
import { Achievement } from '@/types';
import Achievements from '../../components/Achievements';
import { AchievementManager } from '../services/AchievementManager';
import MoodBasedTasks from '../../components/MoodBasedTasks';
import RecurringTaskForm from '@/components/RecurringTaskForm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoodBasedSuggestions from '@/components/MoodBasedSuggestions';
import MoodCheckup from '@/components/MoodCheckup';
import { useTheme } from '../context/ThemeContext';
import { useTaskContext } from '../context/TaskContext';
import RealtimeUpdateIndicator from '../../components/RealtimeUpdateIndicator';

const MOODS = [
  { id: 'happy', icon: '😊', label: 'Happy' },
  { id: 'neutral', icon: '😐', label: 'Neutral' },
  { id: 'tired', icon: '😫', label: 'Tired' },
  { id: 'stressed', icon: '😰', label: 'Stressed' },
  { id: 'productive', icon: '💪', label: 'Productive' }
];

const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

const HomeScreen = () => {
  const { theme, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < 375;
  
  // Use TaskContext for real-time data
  const { 
    tasks, 
    filteredTasks, 
    loading: tasksLoading, 
    refreshTasks, 
    updateTask,
    deleteTask,
    setSearchQuery,
    setStatusFilter,
    setSortKey
  } = useTaskContext();
  
  const [loading, setLoading] = useState(true);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [lastMoodSelectionDate, setLastMoodSelectionDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'analytics' | 'achievements'>('tasks');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [moodSelectionCount, setMoodSelectionCount] = useState(0);
  const [showMoodCheckup, setShowMoodCheckup] = useState(false);
  const [pomodoroSessions, setPomodoroSessions] = useState(0);
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  const [dataUpdating, setDataUpdating] = useState(false);
  
  // Monitor tasks loading state
  useEffect(() => {
    if (tasksLoading) {
      setDataUpdating(true);
    } else {
      // Add a slight delay before hiding the indicator for better UX
      const timer = setTimeout(() => {
        setDataUpdating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tasksLoading]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        // We don't need to call fetchTasks here anymore as TaskContext handles that
        fetchAchievements();
        checkDailyStreak();
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update achievements whenever tasks change (real-time)
    // But only after initial loading is complete and there are tasks
    if (tasks.length > 0 && !tasksLoading) {
      console.log("Tasks updated, checking achievements");
      handleTaskCompletion();
    }
  }, [tasks, tasksLoading]);

  useEffect(() => {
    const checkMoodSelection = async () => {
      try {
        const now = new Date();
        const today = now.toDateString();
        const lastSelection = await AsyncStorage.getItem('lastMoodSelectionTime');
        const count = await AsyncStorage.getItem('moodSelectionCount');
        
        if (lastSelection && !lastSelection.startsWith(today)) {
          await AsyncStorage.setItem('moodSelectionCount', '0');
          setMoodSelectionCount(0);
        }

        const currentCount = count ? parseInt(count) : 0;
        
        if (currentCount < 3) {
          setShowMoodPicker(true);
          await AsyncStorage.setItem('lastMoodSelectionTime', now.toISOString());
          await AsyncStorage.setItem('moodSelectionCount', (currentCount + 1).toString());
          setMoodSelectionCount(currentCount + 1);
        }
      } catch (error) {
        console.error('Error checking mood selection:', error);
      }
    };

    checkMoodSelection();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkForNewTasks = async () => {
        try {
          const taskCreated = await AsyncStorage.getItem('taskCreated');
          if (taskCreated === 'true') {
            // Clear the flag
            await AsyncStorage.removeItem('taskCreated');
            // Fetch the latest tasks
            refreshTasks();
          }
        } catch (error) {
          console.error('Error checking for new tasks:', error);
        }
      };

      checkForNewTasks();
    }, [])
  );

  const fetchAchievements = async () => {
    try {
      console.log('Fetching achievements...');
      const result = await AchievementManager.fetchAchievements();
      console.log('Fetch result:', result ? `Found ${result.achievements.length} achievements` : 'No achievements found');
      
      if (result) {
        setAchievements(result.achievements);
        setUserPoints(result.userPoints);
        console.log('Achievements data:', JSON.stringify(result.achievements.map(a => ({
          id: a.id,
          title: a.title,
          progress: a.progress,
          completed: a.completed
        }))));
      } else {
        // If no results, try initializing achievements
        console.log('No achievements found, initializing...');
        const userId = auth.currentUser?.uid;
        if (userId) {
          await AchievementManager.initializeAllAchievementsForUser(userId);
          // Try fetching again
          const retryResult = await AchievementManager.fetchAchievements();
          if (retryResult) {
            setAchievements(retryResult.achievements);
            setUserPoints(retryResult.userPoints);
            console.log('After initialization:', JSON.stringify(retryResult.achievements.map(a => ({
              id: a.id,
              title: a.title
            }))));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, currentStatus: string = TASK_STATUS.PENDING) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/(auth)/login');
        return;
      }

      let newStatus: 'pending' | 'in_progress' | 'completed';
      
      switch (currentStatus) {
        case TASK_STATUS.PENDING:
          newStatus = 'in_progress';
          break;
        case TASK_STATUS.IN_PROGRESS:
          newStatus = 'completed';
          break;
        case TASK_STATUS.COMPLETED:
          newStatus = 'pending';
          break;
        default:
          newStatus = 'pending';
      }

      await updateTask(taskId, {
        status: newStatus,
        completed: newStatus === TASK_STATUS.COMPLETED,
        completedAt: newStatus === TASK_STATUS.COMPLETED ? new Date() : undefined
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", "Failed to update task status. Please try again.");
    }
  };

  const getStatusIcon = (status: string = TASK_STATUS.PENDING) => {
    switch (status) {
      case TASK_STATUS.COMPLETED:
        return "check-circle";
      case TASK_STATUS.IN_PROGRESS:
        return "pending";
      default:
        return "radio-button-unchecked";
    }
  };

  const getStatusColor = (status: string = TASK_STATUS.PENDING) => {
    switch (status) {
      case TASK_STATUS.COMPLETED:
        return "#4CAF50";
      case TASK_STATUS.IN_PROGRESS:
        return "#FFC107";
      default:
        return "#757575";
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task. Please try again.");
    }
  };

  const categorizeTask = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('study') || lowerTitle.includes('learn') || lowerTitle.includes('read') || lowerTitle.includes('book')) {
      return 'Study';
    } else if (lowerTitle.includes('work') || lowerTitle.includes('project') || lowerTitle.includes('meeting') || lowerTitle.includes('call')) {
      return 'Work';
    } else if (lowerTitle.includes('gym') || lowerTitle.includes('exercise') || lowerTitle.includes('workout') || lowerTitle.includes('run') || lowerTitle.includes('jog')) {
      return 'Fitness';
    } else if (lowerTitle.includes('shop') || lowerTitle.includes('buy') || lowerTitle.includes('purchase') || lowerTitle.includes('store')) {
      return 'Shopping';
    } else if (lowerTitle.includes('clean') || lowerTitle.includes('wash') || lowerTitle.includes('laundry') || lowerTitle.includes('tidy')) {
      return 'Chores';
    } else {
      return 'Other';
    }
  };

  const handleClaimAchievement = async (achievementId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement || achievement.claimed || !achievement.completed) return;
      
      const userDocRef = doc(db, 'users', userId);
      const achievementRef = doc(db, `users/${userId}/achievements`, achievementId);
      
      // First check if the achievement document exists to avoid the error
      const achievementDoc = await getDoc(achievementRef);
      if (!achievementDoc.exists()) {
        console.log(`Achievement ${achievementId} does not exist, creating it first`);
        // Create the achievement document first if it doesn't exist
        await setDoc(achievementRef, {
          id: achievementId,
          title: achievement.title,
          description: achievement.description || '',
          progress: achievement.progress,
          target: achievement.progress, // Using progress as target since the achievement is completed
          completed: true,
          claimed: true,
          points: achievement.points,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      } else {
        // Update existing achievement
        const batch = writeBatch(db);
        
        // Update achievement in database
        batch.update(achievementRef, {
          claimed: true,
          updatedAt: Timestamp.now()
        });
        
        // Update user points in database
        batch.update(userDocRef, {
          'stats.points': increment(achievement.points),
          'stats.leaguePoints': increment(achievement.points) // Add points to league as well
        });
        
        await batch.commit();
      }
      
      // Update local state
      setAchievements(prev => 
        prev.map(a => 
          a.id === achievementId 
            ? { ...a, claimed: true }
            : a
        )
      );
      setUserPoints(prev => prev + achievement.points);
      
      Alert.alert(
        'Congratulations!',
        `You've earned ${achievement.points} points for completing "${achievement.title}"!`
      );
    } catch (error) {
      console.error('Error claiming achievement:', error);
      Alert.alert('Error', 'Failed to claim achievement. Please try again.');
    }
  };

  const handleRecurringTaskSubmit = async (taskData: any) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      setShowRecurringForm(false);
      await refreshTasks();
    } catch (error) {
      console.error("Error adding recurring task:", error);
      Alert.alert("Error", "Failed to add recurring task. Please try again.");
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleMoodSelect = (mood: string) => {
    setCurrentMood(mood);
    setShowMoodCheckup(false);
    
    // Use the AchievementManager to track mood selection
    AchievementManager.updateMoodTrackingAchievement();
  };

  // Use the AchievementManager's implementation instead
  const updatePomodoroAchievement = async (sessions: number) => {
    // Update local state
    setPomodoroSessions(sessions);
    
    // Use the AchievementManager to update Pomodoro achievements
    AchievementManager.updatePomodoroAchievement(sessions);
  };

  // Update achievement tracking based on completed tasks
  const handleTaskCompletion = async () => {
    try {
      // Only update achievements when there are tasks to evaluate
      if (tasks.length === 0) return;
      
      console.log(`Checking achievements for ${tasks.length} tasks (${tasks.filter(t => t.completed).length} completed)`);
      
      // Call handleUpdateAchievements with the current tasks to ensure achievements are updated
      const updateResult = await AchievementManager.handleUpdateAchievements(tasks);
      console.log(`Achievement update result: ${updateResult ? 'Success' : 'Failed'}`);
      
      // Get a fresh snapshot of achievements
      const result = await AchievementManager.fetchAchievements();
      if (result) {
        console.log(`Fetched ${result.achievements.length} achievements, ${result.achievements.filter(a => a.completed).length} completed`);
        setAchievements(result.achievements);
        setUserPoints(result.userPoints);
      }
    } catch (error) {
      console.error('Error updating achievements:', error);
    }
  };

  // Check and update daily streak
  const checkDailyStreak = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const stats = userData.stats || {};
        
        // Get current date and last active date
        const now = new Date();
        const today = now.toDateString();
        const lastActiveDate = stats.lastActiveDate ? new Date(stats.lastActiveDate.seconds * 1000).toDateString() : null;
        
        let currentStreak = stats.currentStreak || 0;
        let longestStreak = stats.longestStreak || 0;
        let streakUpdated = false;
        
        // Check if user completed at least one task today
        const tasksCompletedToday = tasks.filter(task => 
          task.completed && task.completedAt?.toDateString() === today
        ).length;
        
        const hasCompletedTaskToday = tasksCompletedToday > 0;
        
        // Track daily task count for Daily Grind achievement
        let consecutiveDaysWithFiveTasks = stats.consecutiveDaysWithFiveTasks || 0;
        
        if (tasksCompletedToday >= 5) {
          // If completed 5+ tasks today, increment the counter
          consecutiveDaysWithFiveTasks += 1;
        } else {
          // Reset the counter if didn't complete 5 tasks today
          consecutiveDaysWithFiveTasks = 0;
        }
        
        // If last active date was yesterday, increment streak
        if (lastActiveDate) {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          const yesterdayStr = yesterday.toDateString();
          
          if (lastActiveDate === yesterdayStr && hasCompletedTaskToday) {
            // User was active yesterday and completed at least one task today, increment streak
            currentStreak += 1;
            streakUpdated = true;
          } else if (lastActiveDate !== today && hasCompletedTaskToday) {
            // User wasn't active yesterday, but completed a task today, reset streak to 1
            currentStreak = 1;
            streakUpdated = true;
          } else if (lastActiveDate !== today && !hasCompletedTaskToday) {
            // User wasn't active yesterday and hasn't completed a task today, reset streak
            currentStreak = 0;
            streakUpdated = true;
          }
        } else if (hasCompletedTaskToday) {
          // First time tracking and completed a task, set streak to 1
          currentStreak = 1;
          streakUpdated = true;
        }
        
        // Update longest streak if needed
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
        
        // Update user document with new streak data
        if (streakUpdated || lastActiveDate !== today) {
          await updateDoc(userDocRef, {
            'stats.currentStreak': currentStreak,
            'stats.longestStreak': longestStreak,
            'stats.lastActiveDate': Timestamp.now(),
            'stats.consecutiveDaysWithFiveTasks': consecutiveDaysWithFiveTasks
          });
          
          // Use AchievementManager for streak achievements
          await AchievementManager.updateStreakAchievement(currentStreak);
          
          // Update Daily Grind achievement
          if (consecutiveDaysWithFiveTasks >= 3) {
            await AchievementManager.updateDailyGrindAchievement(consecutiveDaysWithFiveTasks);
          }
        }
      }
    } catch (error) {
      console.error('Error updating daily streak:', error);
    }
  };

  // Track goals for the Goal Setter achievement
  const trackGoalCompletion = async (goalId: string) => {
    // Use AchievementManager to track goal completion
    await AchievementManager.trackGoalCompletion();
    // Don't refresh achievements here - the real-time listener will handle updates
  };

  // Helper function to validate status filter values
  const isValidStatusFilter = (status: string): status is 'all' | 'pending' | 'in_progress' | 'completed' => {
    return ['all', 'pending', 'in_progress', 'completed'].includes(status);
  };
  
  // Update status filter in TaskContext
  const handleStatusFilterChange = (status: string) => {
    setStatusFilterValue(status);
    // Use type guard to ensure we only pass valid values
    if (isValidStatusFilter(status)) {
      setStatusFilter(status);
    }
  };

  const handleTaskComplete = async (task: Task) => {
    try {
      // Create a copy of the task with the updated completion status
      const updatedTask = {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : undefined,
        status: !task.completed ? 'completed' as const : 'pending' as const
      };
      
      // Log the task completion status for debugging
      console.log(`Updating task ${task.id} completion to: ${!task.completed}`, updatedTask);
      
      // Update the task in the database
      await updateTask(task.id, {
        completed: updatedTask.completed,
        completedAt: updatedTask.completedAt,
        status: updatedTask.status
      });
      
      // Only track achievement progress when a task is being marked as completed (not uncompleted)
      if (!task.completed) {
        console.log(`Task ${task.id} marked as completed, tracking for achievements`);
        
        // Wait for the task tracking to complete
        const trackResult = await AchievementManager.trackTaskCompletionRealtime(updatedTask);
        console.log(`Task tracking result: ${trackResult ? 'Success' : 'Failed'}`);
        
        // Refresh achievements to reflect the latest changes
        const achievementsResult = await AchievementManager.fetchAchievements();
        if (achievementsResult) {
          console.log(`Updated achievements after task completion, got ${achievementsResult.achievements.length} achievements`);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={[
      styles.taskItem,
      item.priority === 'high' && styles.highPriorityTask,
      item.priority === 'medium' && styles.mediumPriorityTask,
      item.priority === 'low' && styles.lowPriorityTask,
      { backgroundColor: currentThemeColors.background }
    ]}>
      <View style={styles.taskHeader}>
        <Text style={[
          styles.taskTitle,
          item.completed && styles.completedTaskTitle,
          { color: currentThemeColors.primary }
        ]}>
          {item.title}
        </Text>
        <View style={styles.taskActions}>
          <TouchableOpacity onPress={() => handleTaskComplete(item)}>
            <MaterialIcons
              name={item.completed ? "check-circle" : "radio-button-unchecked"}
              size={24}
              color={item.completed ? currentThemeColors.success : currentThemeColors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
            <MaterialIcons name="delete" size={24} color={currentThemeColors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      {item.description ? (
        <Text style={[styles.taskDescription, { color: currentThemeColors.text }]}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.taskFooter}>
        <View style={[styles.taskMeta, { backgroundColor: currentThemeColors.background }]}>
          <MaterialIcons name="event" size={16} color={currentThemeColors.primary} />
          <Text style={[styles.taskMetaText, { color: currentThemeColors.text }]}>
            {item.dueDate ? item.dueDate.toLocaleDateString() : 'No deadline'}
          </Text>
        </View>
        <View style={[styles.taskStatus, { backgroundColor: currentThemeColors.background }]}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: item.completed ? currentThemeColors.success : currentThemeColors.warning }
          ]} />
          <Text style={[styles.statusText, { color: currentThemeColors.text }]}>
            {item.completed ? "Completed" : "In Progress"}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAnalytics = () => {
    // Get current date and calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter tasks by time periods
    const weeklyTasks = tasks.filter(task => 
      task.createdAt && new Date(task.createdAt) >= startOfWeek
    );
    const monthlyTasks = tasks.filter(task => 
      task.createdAt && new Date(task.createdAt) >= startOfMonth
    );

    // Calculate completion rates
    const weeklyCompletionRate = weeklyTasks.length > 0 
      ? Math.round((weeklyTasks.filter(task => task.completed).length / weeklyTasks.length) * 100)
      : 0;
    const monthlyCompletionRate = monthlyTasks.length > 0 
      ? Math.round((monthlyTasks.filter(task => task.completed).length / monthlyTasks.length) * 100)
      : 0;

    // Use windowWidth from component scope (instead of calling useWindowDimensions hook again)
    const chartWidth = Math.min(windowWidth - 40, 600);
    const shouldAdjustFontSize = windowWidth < 360;

    // Calculate tasks by priority
    const priorityData = tasks.reduce((acc: { [key: string]: number }, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    // For displaying human-readable labels
    const priorityLabels: { [key: string]: string } = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High'
    };

    // Calculate tasks by status
    const statusData = tasks.reduce((acc: { [key: string]: number }, task) => {
      const status = task.completed ? 'completed' : (task.status || 'pending');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // For displaying human-readable labels
    const statusLabels: { [key: string]: string } = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed'
    };

    // Set up chart config that respects the current theme
    const chartConfig = {
      backgroundColor: currentThemeColors.background,
      backgroundGradientFrom: currentThemeColors.background,
      backgroundGradientTo: currentThemeColors.background,
      decimalPlaces: 0,
      color: (opacity = 1) => isDark 
        ? `rgba(255, 255, 255, ${opacity})` 
        : `rgba(0, 0, 0, ${opacity})`,
      labelColor: (opacity = 1) => isDark 
        ? `rgba(255, 255, 255, ${opacity})` 
        : `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: currentThemeColors.background,
      },
    };

    // Define colors based on theme
    const priorityColors = {
      high: isDark ? 'rgba(244, 67, 54, 0.8)' : 'rgba(244, 67, 54, 1)',
      medium: isDark ? 'rgba(255, 193, 7, 0.8)' : 'rgba(255, 193, 7, 1)',
      low: isDark ? 'rgba(76, 175, 80, 0.8)' : 'rgba(76, 175, 80, 1)'
    };

    const statusColors = {
      completed: isDark ? 'rgba(76, 175, 80, 0.8)' : 'rgba(76, 175, 80, 1)',
      in_progress: isDark ? 'rgba(255, 193, 7, 0.8)' : 'rgba(255, 193, 7, 1)', 
      pending: isDark ? 'rgba(150, 150, 150, 0.8)' : 'rgba(117, 117, 117, 1)'
    };

    if (tasksLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
        </View>
      );
    }

    if (tasks.length === 0) {
      return (
        <View style={styles.emptyTasksContainer}>
          <Text style={[styles.emptyTasksText, { color: currentThemeColors.text }]}>
            No tasks found. Create tasks to view analytics.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: currentThemeColors.background }}>
        <RealtimeUpdateIndicator isDark={isDark} />
        
        {/* Overall Task Statistics */}
        <Text style={[styles.chartTitle, { color: currentThemeColors.primary, marginTop: 16 }]}>
          Task Statistics
        </Text>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: currentThemeColors.buttonSecondary }]}>
            <Text style={[styles.statNumber, { color: currentThemeColors.primary }]}>
              {tasks.length}
            </Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>
              Total Tasks
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: currentThemeColors.buttonSecondary }]}>
            <Text style={[styles.statNumber, { color: currentThemeColors.primary }]}>
              {tasks.filter(t => t.completed).length}
            </Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>
              Completed
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: currentThemeColors.buttonSecondary }]}>
            <Text style={[styles.statNumber, { color: currentThemeColors.success }]}>
              {Math.round((tasks.filter(t => t.completed).length / (tasks.length || 1)) * 100)}%
            </Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>
              Completion Rate
            </Text>
          </View>
        </View>

        {/* Period Stats */}
        <Text style={[styles.chartTitle, { color: currentThemeColors.primary }]}>
          Time Period Analysis
        </Text>
        <View style={styles.periodStatsContainer}>
          <View style={[styles.periodCard, { backgroundColor: currentThemeColors.buttonSecondary }]}>
            <Text style={[styles.periodTitle, { color: currentThemeColors.primary }]}>This Week</Text>
            <Text style={[styles.periodNumber, { color: currentThemeColors.primary }]}>
              {weeklyTasks.length}
            </Text>
            <Text style={[styles.periodLabel, { color: currentThemeColors.text }]}>Tasks</Text>
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(100, 100, 100, 0.3)' : '#f0f0f0' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: currentThemeColors.success,
                    width: `${weeklyCompletionRate}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.completionRate, { color: currentThemeColors.text }]}>
              {weeklyCompletionRate}% Complete
            </Text>
          </View>

          <View style={[styles.periodCard, { backgroundColor: currentThemeColors.buttonSecondary }]}>
            <Text style={[styles.periodTitle, { color: currentThemeColors.primary }]}>This Month</Text>
            <Text style={[styles.periodNumber, { color: currentThemeColors.primary }]}>
              {monthlyTasks.length}
            </Text>
            <Text style={[styles.periodLabel, { color: currentThemeColors.text }]}>Tasks</Text>
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(100, 100, 100, 0.3)' : '#f0f0f0' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: currentThemeColors.success,
                    width: `${monthlyCompletionRate}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.completionRate, { color: currentThemeColors.text }]}>
              {monthlyCompletionRate}% Complete
            </Text>
          </View>
        </View>

        {/* Tasks by Priority Chart */}
        {Object.keys(priorityData).length > 0 && (
          <View style={[styles.chartContainer, { backgroundColor: currentThemeColors.buttonSecondary }]}>
            <Text style={[styles.chartTitle, { color: currentThemeColors.primary }]}>
              Tasks by Priority
            </Text>
            <PieChart
              data={[
                {
                  name: priorityLabels['high'] || 'High',
                  population: priorityData['high'] || 0,
                  color: priorityColors.high,
                  legendFontColor: currentThemeColors.text,
                  legendFontSize: 12
                },
                {
                  name: priorityLabels['medium'] || 'Medium',
                  population: priorityData['medium'] || 0,
                  color: priorityColors.medium,
                  legendFontColor: currentThemeColors.text,
                  legendFontSize: 12
                },
                {
                  name: priorityLabels['low'] || 'Low',
                  population: priorityData['low'] || 0,
                  color: priorityColors.low,
                  legendFontColor: currentThemeColors.text,
                  legendFontSize: 12
                }
              ].filter(item => item.population > 0)}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft={shouldAdjustFontSize ? "15" : "0"}
              center={[10, 0]}
              absolute
              style={styles.chart}
            />
          </View>
        )}

        {/* Tasks by Status Chart */}
        {Object.keys(statusData).length > 0 && (
          <View style={[styles.chartContainer, { backgroundColor: currentThemeColors.buttonSecondary }]}>
            <Text style={[styles.chartTitle, { color: currentThemeColors.primary }]}>
              Tasks by Status
            </Text>
            <PieChart
              data={[
                {
                  name: statusLabels['completed'] || 'Completed',
                  population: statusData['completed'] || 0,
                  color: statusColors.completed,
                  legendFontColor: currentThemeColors.text,
                  legendFontSize: 12
                },
                {
                  name: statusLabels['in_progress'] || 'In Progress',
                  population: statusData['in_progress'] || 0,
                  color: statusColors.in_progress,
                  legendFontColor: currentThemeColors.text,
                  legendFontSize: 12
                },
                {
                  name: statusLabels['pending'] || 'Pending',
                  population: statusData['pending'] || 0,
                  color: statusColors.pending,
                  legendFontColor: currentThemeColors.text,
                  legendFontSize: 12
                }
              ].filter(item => item.population > 0)}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft={shouldAdjustFontSize ? "15" : "0"}
              center={[10, 0]}
              absolute
              style={styles.chart}
            />
          </View>
        )}
      </View>
    );
  };

  const renderAchievementsSection = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
        </View>
      );
    }

    if (!achievements || achievements.length === 0) {
      return (
        <View style={styles.noAchievementsContainer}>
          <Text style={[styles.noAchievementsText, { color: currentThemeColors.text }]}>No achievements found. You may need to initialize your achievements.</Text>
          <TouchableOpacity
            style={[styles.initButton, { backgroundColor: currentThemeColors.success }]}
            onPress={async () => {
              const userId = auth.currentUser?.uid;
              if (userId) {
                await AchievementManager.initializeAllAchievementsForUser(userId);
                await fetchAchievements();
              }
            }}
          >
            <Text style={[styles.initButtonText, { color: currentThemeColors.background }]}>Initialize Achievements</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Return the Achievements component directly without wrapping it in a ScrollView
    return (
      <View style={{flex: 1}}>
        <RealtimeUpdateIndicator isDark={isDark} />
        <Achievements
          achievements={achievements}
          userPoints={userPoints}
          onClaimReward={handleClaimAchievement}
          tasks={tasks}
          isDark={isDark}
          onRefresh={async () => {
            try {
              // First, get all current tasks to evaluate achievement progress
              console.log("Refreshing achievements data...");
              
              // Update all achievements based on tasks
              await AchievementManager.handleUpdateAchievements(tasks);
              
              // Get fresh achievements data
              const result = await AchievementManager.fetchAchievements();
              if (result) {
                setAchievements(result.achievements);
                setUserPoints(result.userPoints);
                console.log(`Refreshed achievements data: ${result.achievements.length} achievements, ${result.userPoints} points`);
              }
            } catch (error) {
              console.error("Error in refresh:", error);
            }
          }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  const today = new Date();
  const todayTasks = filteredTasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: currentThemeColors.background,
        borderBottomColor: currentThemeColors.border
      }]}>
        <Text style={[styles.headerTitle, { color: currentThemeColors.primary }]}>Task Manager</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: currentThemeColors.primary }]}
            onPress={() => router.push("/(app)/store")}
          >
            <MaterialIcons name="store" size={24} color={currentThemeColors.background} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: currentThemeColors.primary }]}
            onPress={() => router.push("/(app)/settings")}
          >
            <MaterialIcons name="settings" size={24} color={currentThemeColors.background} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.content, { flex: 1, backgroundColor: currentThemeColors.background }]}>
        <View style={{ height: '50%' }}>
          <ScrollView 
            style={{ flex: 1, backgroundColor: currentThemeColors.background }} 
            contentContainerStyle={{ padding: 16 }}
          >
            <RealtimeUpdateIndicator isDark={isDark} />
            
            <MoodBasedSuggestions
              tasks={tasks}
              currentMood={currentMood}
              onSelectTask={handleTaskSelect}
              onOpenMoodCheckup={() => setShowMoodCheckup(true)}
              isDark={isDark}
            />

            {/* Quick Actions */}
            <View style={[styles.quickActionsCard, { backgroundColor: currentThemeColors.background }]}>
              <View style={[styles.quickActionsGrid, isSmallScreen && styles.quickActionsGridSmall]}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentThemeColors.primary }]}
                  onPress={() => router.push("/(app)/create-task")}>
                  <View style={[styles.actionIcon, { backgroundColor: currentThemeColors.success }]}>
                    <MaterialIcons name="add" size={isSmallScreen ? 20 : 24} color={currentThemeColors.background} />
                  </View>
                  <Text style={[styles.actionButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>New Task</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentThemeColors.primary }]}
                  onPress={() => router.push("/(app)/create-recurring-task")}>
                  <View style={[styles.actionIcon, { backgroundColor: currentThemeColors.primary }]}>
                    <MaterialIcons name="repeat" size={isSmallScreen ? 20 : 24} color={currentThemeColors.background} />
                  </View>
                  <Text style={[styles.actionButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>Recurring Task</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentThemeColors.primary }]}
                  onPress={() => router.push("/(app)/schedule")}>
                  <View style={[styles.actionIcon, { backgroundColor: currentThemeColors.warning }]}>
                    <MaterialIcons name="event" size={isSmallScreen ? 20 : 24} color={currentThemeColors.background} />
                  </View>
                  <Text style={[styles.actionButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentThemeColors.primary }]}
                  onPress={() => router.push("/(app)/chatbot")}>
                  <View style={[styles.actionIcon, { backgroundColor: currentThemeColors.error }]}>
                    <MaterialIcons name="chat" size={isSmallScreen ? 20 : 24} color={currentThemeColors.background} />
                  </View>
                  <Text style={[styles.actionButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>Chatbot</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentThemeColors.primary }]}
                  onPress={() => router.push("/(app)/pomodoro")}>
                  <View style={[styles.actionIcon, { backgroundColor: currentThemeColors.primary }]}>
                    <MaterialIcons name="timer" size={isSmallScreen ? 20 : 24} color={currentThemeColors.background} />
                    {pomodoroSessions > 0 && (
                      <View style={styles.sessionBadge}>
                        <Text style={styles.sessionBadgeText}>{pomodoroSessions}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.actionButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>Pomodoro</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Bottom half: Tabbed content */}
        <View style={[styles.mainContent, { 
          height: '50%',
          backgroundColor: currentThemeColors.background,
          borderColor: currentThemeColors.border,
          borderWidth: 1,
          borderBottomWidth: 0
        }]}>
          <View style={[styles.tabButtons, { backgroundColor: currentThemeColors.background }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'tasks' && [styles.activeTabButton, { backgroundColor: currentThemeColors.success }]
              ]}
              onPress={() => setActiveTab('tasks')}
            >
              <MaterialIcons 
                name="list" 
                size={isSmallScreen ? 20 : 24} 
                color={activeTab === 'tasks' ? currentThemeColors.background : currentThemeColors.primary} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'tasks' && { color: currentThemeColors.background },
                { color: isDark ? currentThemeColors.primary : '#000000' }
              ]}>
                Tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'analytics' && [styles.activeTabButton, { backgroundColor: currentThemeColors.success }]
              ]}
              onPress={() => setActiveTab('analytics')}
            >
              <MaterialIcons 
                name="analytics" 
                size={isSmallScreen ? 20 : 24} 
                color={activeTab === 'analytics' ? currentThemeColors.background : currentThemeColors.primary} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'analytics' && { color: currentThemeColors.background },
                { color: isDark ? currentThemeColors.primary : '#000000' }
              ]}>
                Analytics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'achievements' && [styles.activeTabButton, { backgroundColor: currentThemeColors.success }]
              ]}
              onPress={() => setActiveTab('achievements')}
            >
              <View style={styles.tabButtonContent}>
                <MaterialIcons 
                  name="emoji-events" 
                  size={isSmallScreen ? 20 : 24} 
                  color={activeTab === 'achievements' ? currentThemeColors.background : currentThemeColors.primary} 
                />
                <Text style={[
                  styles.tabButtonText, 
                  activeTab === 'achievements' && { color: currentThemeColors.background },
                  { color: isDark ? currentThemeColors.primary : '#000000' }
                ]}>
                  Achievements
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.tabContent, { flex: 1 }]}>
            {activeTab === 'tasks' && (
              <ScrollView 
                contentContainerStyle={{ padding: 16 }}
                nestedScrollEnabled={true}
                style={{ flex: 1 }}
              >
                <View style={[
                  styles.searchFiltersContainer, 
                  { 
                    backgroundColor: currentThemeColors.buttonSecondary,
                    borderWidth: 0,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12
                  }
                ]}>
                  <TaskFilters
                    onSearch={setSearchQuery}
                    onSort={setSortKey}
                    onFilter={handleStatusFilterChange}
                    isDark={isDark}
                    currentThemeColors={currentThemeColors}
                  />
                  <View style={[
                    styles.statusFilterContainer,
                    {
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: currentThemeColors.border
                    }
                  ]}>
                    <Text style={[
                      styles.filterLabel,
                      { color: currentThemeColors.secondary, marginBottom: 8 }
                    ]}>
                      Status:
                    </Text>
                    <View style={[
                      styles.filterContainer
                    ]}>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          { 
                            backgroundColor: statusFilterValue === 'all' 
                              ? currentThemeColors.success 
                              : currentThemeColors.primary
                          }
                        ]}
                        onPress={() => handleStatusFilterChange('all')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          { color: currentThemeColors.background }
                        ]}>All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          { 
                            backgroundColor: statusFilterValue === 'pending' 
                              ? currentThemeColors.success 
                              : currentThemeColors.primary
                          }
                        ]}
                        onPress={() => handleStatusFilterChange('pending')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          { color: currentThemeColors.background }
                        ]}>Active</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          { 
                            backgroundColor: statusFilterValue === 'completed' 
                              ? currentThemeColors.success 
                              : currentThemeColors.primary
                          }
                        ]}
                        onPress={() => handleStatusFilterChange('completed')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          { color: currentThemeColors.background }
                        ]}>Completed</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {tasksLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentThemeColors.primary} />
                  </View>
                ) : todayTasks.length === 0 ? (
                  <View style={styles.emptyTasksContainer}>
                    <Text style={[styles.emptyTasksText, { color: currentThemeColors.text }]}>
                      No tasks found. Create a new task to get started!
                    </Text>
                  </View>
                ) : (
                  <View>
                    {todayTasks.map(item => (
                      <React.Fragment key={item.id}>
                        {renderTaskItem({ item })}
                      </React.Fragment>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            {activeTab === 'analytics' && (
              <ScrollView 
                contentContainerStyle={{ padding: 16 }}
                nestedScrollEnabled={true}
              >
                {renderAnalytics()}
              </ScrollView>
            )}

            {activeTab === 'achievements' && (
              <View style={{ flex: 1 }}>
                {renderAchievementsSection()}
              </View>
            )}
          </View>
        </View>
      </View>

      {showRecurringForm && (
        <RecurringTaskForm
          onCreateTask={handleRecurringTaskSubmit}
          isDark={isDark}
        />
      )}

      <MoodCheckup
        visible={showMoodCheckup}
        onClose={() => setShowMoodCheckup(false)}
        onMoodSelect={handleMoodSelect}
        isDark={isDark}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  taskListContainer: {
    minHeight: 200,
  },
  quickActionsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  quickActionsGridSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  mainContent: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  tabButtons: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  activeTabButton: {},
  tabButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskList: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  analyticsContainer: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  periodStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  periodCard: {
    flex: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  periodNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  periodLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  completionRate: {
    fontSize: 12,
    marginTop: 4,
  },
  chartContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  },
  sessionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 12,
    padding: 2,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noAchievementsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noAchievementsText: {
    marginBottom: 16,
  },
  initButton: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  initButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  highPriorityTask: {
    borderLeftWidth: 4,
  },
  mediumPriorityTask: {
    borderLeftWidth: 4,
  },
  lowPriorityTask: {
    borderLeftWidth: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
    lineHeight: 22,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskMetaText: {
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  datePickerText: {
    fontSize: 16,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
  },
  completedTaskText: {},
  pomodoroModal: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  pomodoroStats: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
  },
  pomodoroStatsText: {
    fontSize: 14,
    marginBottom: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 24,
    borderRadius: 8,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  lowPriority: {},
  mediumPriority: {},
  highPriority: {},
  priorityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  lowPriorityText: {},
  mediumPriorityText: {},
  highPriorityText: {},
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {},
  saveButton: {},
  modalButton: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTasksContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTasksText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Added missing styles
  searchFiltersContainer: {
    marginBottom: 16,
  },
  statusFilterContainer: {
    flexDirection: 'column',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;

