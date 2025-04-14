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
import VoiceCommandButton from '@/components/VoiceCommandButton';
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
  const { theme } = useTheme();
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
  const [showVoiceInput, setShowVoiceInput] = useState(false);
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

  const handleVoiceCommand = (taskData: Partial<Task>) => {
    // Handle voice command
    console.log('Voice command task:', taskData);
    // Update voice command achievement
    updateVoiceCommandAchievement();
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

  // Use the AchievementManager's implementation instead
  const updateVoiceCommandAchievement = async () => {
    // Use the AchievementManager to update voice command achievements
    AchievementManager.updateVoiceCommandAchievement();
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
      isDark && styles.darkTaskItem
    ]}>
      <View style={styles.taskHeader}>
        <Text style={[
          styles.taskTitle,
          item.completed && styles.completedTaskTitle,
          isDark && styles.darkText
        ]}>
          {item.title}
        </Text>
        <View style={styles.taskActions}>
          <TouchableOpacity onPress={() => handleTaskComplete(item)}>
            <MaterialIcons
              name={item.completed ? "check-circle" : "radio-button-unchecked"}
              size={24}
              color={isDark ? (item.completed ? "#4CAF50" : "#666") : (item.completed ? "#4CAF50" : "#333")}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
            <MaterialIcons name="delete" size={24} color={isDark ? "#666" : "#333"} />
          </TouchableOpacity>
        </View>
      </View>
      {item.description ? (
        <Text style={[styles.taskDescription, isDark && styles.darkText]}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.taskFooter}>
        <View style={[styles.taskMeta, isDark && styles.darkTaskMeta]}>
          <MaterialIcons name="event" size={16} color={isDark ? "#666" : "#333"} />
          <Text style={[styles.taskMetaText, isDark && styles.darkText]}>
            {item.dueDate ? item.dueDate.toLocaleDateString() : 'No deadline'}
          </Text>
        </View>
        <View style={[styles.taskStatus, isDark && styles.darkTaskStatus]}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: item.completed ? "#4CAF50" : "#FFC107" }
          ]} />
          <Text style={[styles.statusText, isDark && styles.darkText]}>
            {item.completed ? "Completed" : "In Progress"}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAnalytics = (isDark: boolean) => {
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
      ? (weeklyTasks.filter(task => task.completed).length / weeklyTasks.length) * 100 
      : 0;
    const monthlyCompletionRate = monthlyTasks.length > 0 
      ? (monthlyTasks.filter(task => task.completed).length / monthlyTasks.length) * 100 
      : 0;

    // Use windowWidth from component scope (instead of calling useWindowDimensions hook again)
    const chartWidth = Math.min(windowWidth - 40, 600);
    const shouldAdjustFontSize = windowWidth < 360;

    // Group tasks by category
    const categoryData = tasks.reduce((acc: { [key: string]: number }, task) => {
      acc[task.category ?? 'other'] = (acc[task.category ?? 'other'] || 0) + 1;
      return acc;
    }, {});

    // Prepare chart data
    const categoryChartData = {
      labels: Object.keys(categoryData).map(label => 
        shouldAdjustFontSize && label.length > 6 ? label.substring(0, 6) + '...' : label
      ),
      datasets: [{
        data: Object.values(categoryData) as number[]
      }]
    };

    // Calculate tasks by priority
    const priorityData = tasks.reduce((acc: { [key: string]: number }, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const priorityChartData = {
      labels: Object.keys(priorityData),
      datasets: [{
        data: Object.values(priorityData) as number[]
      }]
    };

    return (
      <ScrollView 
        style={[styles.analyticsContainer, isDark && styles.darkAnalyticsContainer]}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        <RealtimeUpdateIndicator isDark={isDark} />
        <View style={[styles.statsContainer, { width: '100%', maxWidth: 800 }]}>
          <View style={[styles.statCard, isDark && styles.darkStatCard]}>
            <Text style={[styles.statNumber, isDark && styles.darkStatNumber]}>{tasks.length}</Text>
            <Text style={[styles.statLabel, isDark && styles.darkText]}>Total Tasks</Text>
          </View>
          <View style={[styles.statCard, isDark && styles.darkStatCard]}>
            <Text style={[styles.statNumber, isDark && styles.darkStatNumber]}>
              {tasks.filter(task => task.completed).length}
            </Text>
            <Text style={[styles.statLabel, isDark && styles.darkText]}>Completed</Text>
          </View>
          <View style={[styles.statCard, isDark && styles.darkStatCard]}>
            <Text style={[styles.statNumber, isDark && styles.darkStatNumber]}>
              {tasks.filter(task => !task.completed).length}
            </Text>
            <Text style={[styles.statLabel, isDark && styles.darkText]}>In Progress</Text>
          </View>
        </View>

        <View style={[styles.periodStatsContainer, { width: '100%', maxWidth: 800 }]}>
          <View style={[styles.periodCard, isDark && styles.darkPeriodCard]}>
            <Text style={[styles.periodTitle, isDark && styles.darkText]}>This Week</Text>
            <Text style={[styles.periodNumber, isDark && styles.darkStatNumber]}>{weeklyTasks.length}</Text>
            <Text style={[styles.periodLabel, isDark && styles.darkText]}>Tasks</Text>
            <View style={[styles.progressBar, isDark && styles.darkProgressBar]}>
              <View style={[styles.progressFill, { width: `${weeklyCompletionRate}%` }]} />
            </View>
            <Text style={[styles.completionRate, isDark && styles.darkText]}>{weeklyCompletionRate.toFixed(1)}% Complete</Text>
          </View>
          <View style={[styles.periodCard, isDark && styles.darkPeriodCard]}>
            <Text style={[styles.periodTitle, isDark && styles.darkText]}>This Month</Text>
            <Text style={[styles.periodNumber, isDark && styles.darkStatNumber]}>{monthlyTasks.length}</Text>
            <Text style={[styles.periodLabel, isDark && styles.darkText]}>Tasks</Text>
            <View style={[styles.progressBar, isDark && styles.darkProgressBar]}>
              <View style={[styles.progressFill, { width: `${monthlyCompletionRate}%` }]} />
            </View>
            <Text style={[styles.completionRate, isDark && styles.darkText]}>{monthlyCompletionRate.toFixed(1)}% Complete</Text>
          </View>
        </View>

        <View style={[styles.chartContainer, isDark && styles.darkChartContainer, { width: '100%', maxWidth: 800 }]}>
          <Text style={[styles.chartTitle, isDark && styles.darkText]}>Tasks by Category</Text>
          <BarChart
            data={categoryChartData}
            width={chartWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" tasks"
            chartConfig={{
              backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
              backgroundGradientFrom: isDark ? '#1E1E1E' : '#ffffff',
              backgroundGradientTo: isDark ? '#1E1E1E' : '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              barPercentage: 0.8,
              propsForLabels: {
                fontSize: shouldAdjustFontSize ? 10 : 12,
              }
            }}
            style={styles.chart}
          />
        </View>

        <View style={[styles.chartContainer, isDark && styles.darkChartContainer, { width: '100%', maxWidth: 800 }]}>
          <Text style={[styles.chartTitle, isDark && styles.darkText]}>Tasks by Priority</Text>
          <PieChart
            data={Object.entries(priorityData).map(([priority, count]) => ({
              name: priority.charAt(0).toUpperCase() + priority.slice(1),
              count,
              color: priority === 'high' ? '#FF6B6B' : 
                     priority === 'medium' ? '#FFD93D' : '#6BCB77',
              legendFontColor: isDark ? '#fff' : '#7F7F7F',
              legendFontSize: shouldAdjustFontSize ? 10 : 12,
            }))}
            width={chartWidth}
            height={220}
            chartConfig={{
              color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={styles.chart}
          />
        </View>
      </ScrollView>
    );
  };

  const renderAchievementsSection = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      );
    }

    console.log('Rendering achievements section:', 
      JSON.stringify({
        achievementsCount: achievements.length,
        userPoints: userPoints,
        firstThreeAchievements: achievements.slice(0, 3).map(a => a.title)
      })
    );

    // Add a button to manually initialize achievements if the array is empty
    if (!achievements || achievements.length === 0) {
      return (
        <View style={styles.noAchievementsContainer}>
          <Text style={[styles.noAchievementsText, isDark && styles.darkText]}>
            No achievements found. You may need to initialize your achievements.
          </Text>
          <TouchableOpacity
            style={styles.initButton}
            onPress={async () => {
              const userId = auth.currentUser?.uid;
              if (userId) {
                await AchievementManager.initializeAllAchievementsForUser(userId);
                await fetchAchievements();
              }
            }}
          >
            <Text style={styles.initButtonText}>Initialize Achievements</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <Achievements 
          achievements={achievements} 
          userPoints={userPoints}
          onClaimReward={handleClaimAchievement}
          tasks={tasks}
          isDark={isDark}
        />
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Task Manager</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, isDark && styles.darkHeaderButton]}
            onPress={() => router.push("/store")}
          >
            <MaterialIcons name="store" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, isDark && styles.darkHeaderButton]}
            onPress={() => router.push("/settings")}
          >
            <MaterialIcons name="settings" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.content, isDark && styles.darkContent]} contentContainerStyle={[styles.contentContainer, isDark && styles.darkContent]}>
        <RealtimeUpdateIndicator isDark={isDark} />
        
        <MoodBasedSuggestions
          tasks={tasks}
          currentMood={currentMood}
          onSelectTask={handleTaskSelect}
          onOpenMoodCheckup={() => setShowMoodCheckup(true)}
          isDark={isDark}
        />

        {/* Quick Actions */}
        <View style={[styles.quickActionsCard, isDark && styles.darkCard]}>
          <View style={[styles.quickActionsGrid, isSmallScreen && styles.quickActionsGridSmall]}>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton, isSmallScreen && styles.actionButtonSmall]}
              onPress={() => router.push('/create-task')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#E8F5E9' }]}>
                <MaterialIcons name="add" size={isSmallScreen ? 20 : 24} color={isDark ? '#4CAF50' : '#4CAF50'} />
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText, isSmallScreen && styles.actionButtonTextSmall]}>New Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton, isSmallScreen && styles.actionButtonSmall]}
              onPress={() => router.push('/create-recurring-task')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#E3F2FD' }]}>
                <MaterialIcons name="repeat" size={isSmallScreen ? 20 : 24} color={isDark ? '#2196F3' : '#2196F3'} />
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText, isSmallScreen && styles.actionButtonTextSmall]}>Recurring Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton, isSmallScreen && styles.actionButtonSmall]}
              onPress={() => router.push('/schedule')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#F3E5F5' }]}>
                <MaterialIcons name="event" size={isSmallScreen ? 20 : 24} color={isDark ? '#9C27B0' : '#9C27B0'} />
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText, isSmallScreen && styles.actionButtonTextSmall]}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton, isSmallScreen && styles.actionButtonSmall]}
              onPress={() => router.push('/chatbot')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#FFF3E0' }]}>
                <MaterialIcons name="chat" size={isSmallScreen ? 20 : 24} color={isDark ? '#FF9800' : '#FF9800'} />
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText, isSmallScreen && styles.actionButtonTextSmall]}>Chatbot</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton, isSmallScreen && styles.actionButtonSmall]}
              onPress={() => router.push('/pomodoro')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#F3E5F5' }]}>
                <MaterialIcons name="timer" size={isSmallScreen ? 20 : 24} color={isDark ? '#9C27B0' : '#9C27B0'} />
                {pomodoroSessions > 0 && (
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>{pomodoroSessions}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText, isSmallScreen && styles.actionButtonTextSmall]}>Pomodoro</Text>
            </TouchableOpacity>
            <View style={[styles.actionButton, isDark && styles.darkActionButton, isSmallScreen && styles.actionButtonSmall]}>
              <VoiceCommandButton onTaskCreated={handleVoiceCommand} isDark={isDark} />
            </View>
          </View>
        </View>

        {/* Main Content Tabs */}
        <View style={[styles.mainContent, isDark && styles.darkCard]}>
          <View style={[styles.tabButtons, isDark && styles.darkTabButtons]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'tasks' && [styles.activeTabButton, isDark && { backgroundColor: '#333' }]
              ]}
              onPress={() => setActiveTab('tasks')}
            >
              <MaterialIcons 
                name="list" 
                size={isSmallScreen ? 20 : 24} 
                color={activeTab === 'tasks' ? '#4CAF50' : (isDark ? '#666' : '#666')} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'tasks' && styles.activeTabButtonText,
                isDark && styles.darkText,
                isSmallScreen && styles.tabButtonTextSmall
              ]}>
                Tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'analytics' && [styles.activeTabButton, isDark && { backgroundColor: '#333' }]
              ]}
              onPress={() => setActiveTab('analytics')}
            >
              <MaterialIcons 
                name="analytics" 
                size={isSmallScreen ? 20 : 24} 
                color={activeTab === 'analytics' ? '#4CAF50' : (isDark ? '#666' : '#666')} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'analytics' && styles.activeTabButtonText,
                isDark && styles.darkText,
                isSmallScreen && styles.tabButtonTextSmall
              ]}>
                Analytics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'achievements' && [styles.activeTabButton, isDark && { backgroundColor: '#333' }]
              ]}
              onPress={() => setActiveTab('achievements')}
            >
              <MaterialIcons 
                name="emoji-events" 
                size={isSmallScreen ? 20 : 24} 
                color={activeTab === 'achievements' ? '#4CAF50' : (isDark ? '#666' : '#666')} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'achievements' && styles.activeTabButtonText,
                isDark && styles.darkText,
                isSmallScreen && styles.tabButtonTextSmall
              ]}>
                Achievements
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'tasks' && (
              <>
                <TaskFilters
                  onSearch={setSearchQuery}
                  onSort={setSortKey}
                  onFilter={handleStatusFilterChange}
                  isDark={isDark}
                />
                <View style={styles.filterContainer}>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      isDark && styles.darkFilterButton,
                      statusFilterValue === 'all' && styles.filterButtonActive
                    ]}
                    onPress={() => handleStatusFilterChange('all')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isDark && styles.darkText,
                      statusFilterValue === 'all' && styles.filterButtonTextActive
                    ]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      isDark && styles.darkFilterButton,
                      statusFilterValue === 'pending' && styles.filterButtonActive
                    ]}
                    onPress={() => handleStatusFilterChange('pending')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isDark && styles.darkText,
                      statusFilterValue === 'pending' && styles.filterButtonTextActive
                    ]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      isDark && styles.darkFilterButton,
                      statusFilterValue === 'completed' && styles.filterButtonActive
                    ]}
                    onPress={() => handleStatusFilterChange('completed')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isDark && styles.darkText,
                      statusFilterValue === 'completed' && styles.filterButtonTextActive
                    ]}>Completed</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.taskListContainer}>
                  {tasksLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#2196F3" />
                    </View>
                  ) : filteredTasks.length === 0 ? (
                    <View style={styles.emptyTasksContainer}>
                      <Text style={[styles.emptyTasksText, isDark && styles.darkText]}>
                        No tasks found. Create a new task to get started!
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredTasks}
                      renderItem={renderTaskItem}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={styles.taskList}
                      nestedScrollEnabled
                      scrollEnabled={false}
                    />
                  )}
                </View>
              </>
            )}

            {activeTab === 'analytics' && renderAnalytics(isDark)}

            {activeTab === 'achievements' && renderAchievementsSection()}
          </View>
        </View>
      </ScrollView>

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
    backgroundColor: '#F5F6F8',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  darkHeader: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  darkHeaderButton: {
    backgroundColor: '#2C2C2C',
  },
  darkButton: {
    backgroundColor: '#333',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#F5F6F8',
  },
  darkContent: {
    backgroundColor: '#121212',
  },
  darkText: {
    color: '#fff',
  },
  taskListContainer: {
    minHeight: 200,
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkCard: {
    backgroundColor: '#1E1E1E',
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
  darkActionButton: {
    backgroundColor: '#1E1E1E',
  },
  actionButtonSmall: {
    width: '45%',
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
  darkActionIcon: {
    backgroundColor: '#1E1E1E',
    elevation: 0,
    shadowColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButtonTextSmall: {
    fontSize: 12,
  },
  mainContent: {
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  darkTabButtons: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#E8F5E9',
  },
  tabButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabButtonTextSmall: {
    fontSize: 12,
    marginLeft: 4,
  },
  activeTabButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
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
  darkAnalyticsContainer: {
    backgroundColor: '#121212',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  darkStatCard: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  darkStatNumber: {
    color: '#64B5F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  darkPeriodCard: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  periodNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  periodLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  darkProgressBar: {
    backgroundColor: '#333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  completionRate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  darkChartContainer: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 2,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  noAchievementsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noAchievementsText: {
    color: '#666',
    marginBottom: 16,
  },
  initButton: {
    padding: 12,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  initButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskItem: {
    backgroundColor: '#fff',
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
  darkTaskItem: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  highPriorityTask: {
    borderLeftColor: '#f44336',
    borderLeftWidth: 4,
  },
  mediumPriorityTask: {
    borderLeftColor: '#ff9800',
    borderLeftWidth: 4,
  },
  lowPriorityTask: {
    borderLeftColor: '#4caf50',
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
    color: '#333',
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
    color: '#666',
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
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkTaskMeta: {
    backgroundColor: '#333',
  },
  taskMetaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkTaskStatus: {
    backgroundColor: '#333',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  completedTaskText: {
    color: '#888',
  },
  pomodoroModal: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  pomodoroStatsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderColor: '#ddd',
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
  lowPriority: {
    backgroundColor: '#e8f5e9',
  },
  mediumPriority: {
    backgroundColor: '#fff3e0',
  },
  highPriority: {
    backgroundColor: '#ffebee',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  lowPriorityText: {
    color: '#4caf50',
  },
  mediumPriorityText: {
    color: '#ff9800',
  },
  highPriorityText: {
    color: '#f44336',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButton: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
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
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  darkFilterButton: {
    backgroundColor: '#2C2C2C',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  emptyTasksContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTasksText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;

