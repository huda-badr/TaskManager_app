import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Image, Dimensions, FlatList, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '@/types';
import { AchievementManager } from '@/app/services/AchievementManager';
import { auth, rtdb } from '@/config/firebase';
import { ref, get, onValue } from 'firebase/database';
import { useTheme } from '@/app/context/ThemeContext';

// Add the missing blue color constant
const blueColor = '#3498db';

// League tiers
const LEAGUE_TIERS = [
  { name: 'Bronze', threshold: 0, color: '#CD7F32', icon: '🥉' },
  { name: 'Silver', threshold: 100, color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold', threshold: 250, color: '#FFD700', icon: '🥇' },
  { name: 'Platinum', threshold: 500, color: '#E5E4E2', icon: '💎' },
  { name: 'Diamond', threshold: 1000, color: '#B9F2FF', icon: '💎' },
  { name: 'Master', threshold: 2000, color: '#9370DB', icon: '👑' }
];

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  total: number;
  completed: boolean;
  points: number;
  claimed: boolean;
  docId?: string; // Document ID in Firestore (optional)
  type?: 'task' | 'time' | 'streak'; // Type of achievement
  resetPeriod?: 'daily' | 'weekly' | 'monthly' | null; // When progress should reset
  lastReset?: any; // Timestamp of last reset
  nextReset?: any; // Timestamp of next scheduled reset
  createdAt?: any; // Creation timestamp
  updatedAt?: any; // Last update timestamp
}

interface AchievementsProps {
  achievements: Achievement[];
  userPoints: number;
  onClaimReward?: (achievementId: string) => void;
  tasks?: Task[];
  isDark?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

// Moved from HomeScreen.tsx to centralize achievement definitions
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'task_starter',
    title: 'Task Starter',
    description: 'Get started with your task management journey by completing your first task!',
    icon: 'play-arrow',
    progress: 0,
    total: 1,
    completed: false,
    claimed: false,
    points: 10,
  },
  {
    id: 'task_master',
    title: 'Task Master',
    description: 'You\'ve crossed the 10-task milestone. Keep up the great work!',
    icon: 'stars',
    progress: 0,
    total: 10,
    completed: false,
    claimed: false,
    points: 30,
  },
  {
    id: 'consistency_is_key',
    title: 'Consistency is Key',
    description: 'Completing multiple tasks in one day? You\'re on fire!',
    icon: 'whatshot',
    progress: 0,
    total: 5,
    completed: false,
    claimed: false,
    points: 40,
  },
  {
    id: 'daily_grind',
    title: 'Daily Grind',
    description: 'Keeping the momentum going—great consistency!',
    icon: 'bolt',
    progress: 0,
    total: 15, // 5 tasks per day for 3 days
    completed: false,
    claimed: false,
    points: 50,
  },
  {
    id: 'efficiency_expert',
    title: 'Efficiency Expert',
    description: 'You\'ve been productive this week—keep up the pace!',
    icon: 'speed',
    progress: 0,
    total: 15,
    completed: false,
    claimed: false,
    points: 60,
  },
  {
    id: 'task_streak',
    title: 'Task Streak',
    description: 'You\'ve maintained a steady streak. Keep building that momentum!',
    icon: 'local-fire-department',
    progress: 0,
    total: 7,
    completed: false,
    claimed: false,
    points: 70,
  },
  {
    id: 'urgency_pro',
    title: 'Urgency Pro',
    description: 'You\'ve mastered handling urgent tasks—well done!',
    icon: 'priority-high',
    progress: 0,
    total: 5,
    completed: false,
    claimed: false,
    points: 50,
  },
  {
    id: 'task_collector',
    title: 'Task Collector',
    description: 'You\'ve reached 50 completed tasks. A big milestone!',
    icon: 'collections',
    progress: 0,
    total: 50,
    completed: false,
    claimed: false,
    points: 100,
  },
  {
    id: 'procrastination_slayer',
    title: 'Procrastination Slayer',
    description: 'Overcoming procrastination like a pro!',
    icon: 'alarm-off',
    progress: 0,
    total: 3,
    completed: false,
    claimed: false,
    points: 60,
  },
  {
    id: 'multi_tasking_genius',
    title: 'Multi-Tasking Genius',
    description: 'You\'ve managed multiple tasks like a true multitasker!',
    icon: 'view-carousel',
    progress: 0,
    total: 3,
    completed: false,
    claimed: false,
    points: 70,
  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Weekends don\'t stop you—you get stuff done!',
    icon: 'weekend',
    progress: 0,
    total: 10,
    completed: false,
    claimed: false,
    points: 80,
  },
  {
    id: 'master_scheduler',
    title: 'Master Scheduler',
    description: 'Deadlines? You\'ve nailed it!',
    icon: 'schedule',
    progress: 0,
    total: 5,
    completed: false,
    claimed: false,
    points: 50,
  },
  {
    id: 'power_hour',
    title: 'Power Hour',
    description: 'You\'ve got your time management down to an art!',
    icon: 'hourglass-top',
    progress: 0,
    total: 3,
    completed: false,
    claimed: false,
    points: 40,
  },
  {
    id: 'task_champion',
    title: 'Task Champion',
    description: '100 tasks completed—you\'re a true task champion!',
    icon: 'emoji-events',
    progress: 0,
    total: 100,
    completed: false,
    claimed: false,
    points: 150,
  },
  {
    id: 'stress_free',
    title: 'Stress-Free',
    description: 'You\'ve handled stress like a professional!',
    icon: 'spa',
    progress: 0,
    total: 1,
    completed: false,
    claimed: false,
    points: 50,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Waking up early pays off! You\'ve got a head start on your day.',
    icon: 'wb-morning',
    progress: 0,
    total: 5,
    completed: false,
    claimed: false,
    points: 60,
  },
  {
    id: 'task_diversifier',
    title: 'Task Diversifier',
    description: 'You\'ve managed to balance different task types effectively.',
    icon: 'category',
    progress: 0,
    total: 5, // One for each category
    completed: false,
    claimed: false,
    points: 50,
  },
  {
    id: 'perfect_timing',
    title: 'Perfect Timing',
    description: 'You\'ve hit the deadline perfectly. Well done!',
    icon: 'timer',
    progress: 0,
    total: 1,
    completed: false,
    claimed: false,
    points: 40,
  },
  {
    id: 'task_commander',
    title: 'Task Commander',
    description: 'You\'ve reached 200 tasks—an incredible feat of productivity!',
    icon: 'military-tech',
    progress: 0,
    total: 200,
    completed: false,
    claimed: false,
    points: 200,
  },
  {
    id: 'goal_setter',
    title: 'Goal Setter',
    description: 'You\'ve set goals and crushed them. Nice work!',
    icon: 'flag',
    progress: 0,
    total: 10,
    completed: false,
    claimed: false,
    points: 80,
  }
];

const ACHIEVEMENT_LEVELS = {
  BRONZE: { color: '#CD7F32', label: 'Bronze' },
  SILVER: { color: '#C0C0C0', label: 'Silver' },
  GOLD: { color: '#FFD700', label: 'Gold' },
};

// Add a type for our section items
interface SectionItem {
  type: 'header' | 'league' | 'filter' | 'achievement';
  id: string;
  data?: Achievement;
}

export const Achievements: React.FC<AchievementsProps> = ({
  achievements,
  userPoints,
  onClaimReward,
  tasks = [],
  isDark = false,
  onRefresh,
  refreshing,
}) => {
  const { currentThemeColors } = useTheme();
  const [fadeAnims] = useState(() => 
    achievements.map(() => new Animated.Value(0))
  );
  
  const [expandedAchievement, setExpandedAchievement] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentLeague, setCurrentLeague] = useState<string>('Bronze');
  const [nextLeague, setNextLeague] = useState<string>('Silver');
  const [pointsToNextLeague, setPointsToNextLeague] = useState<number>(100);
  const [searchText, setSearchText] = useState<string>('');
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // When achievements load, animate them in sequence
    fadeAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, index * 100);
    });
  }, []);

  // Calculate league status whenever userPoints changes
  useEffect(() => {
    // Determine current league tier based on user points
    let currentTier = LEAGUE_TIERS[0];
    let nextTier = LEAGUE_TIERS[1];
    
    for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
      if (userPoints >= LEAGUE_TIERS[i].threshold) {
        currentTier = LEAGUE_TIERS[i];
        nextTier = LEAGUE_TIERS[i + 1] || LEAGUE_TIERS[i];
        break;
      }
    }
    
    setCurrentLeague(currentTier.name);
    setNextLeague(nextTier.name);
    setPointsToNextLeague(nextTier.threshold - userPoints);
  }, [userPoints]);

  const getAchievementLevel = (points: number) => {
    if (points < 100) return { level: 'Bronze', color: '#CD7F32' };
    if (points < 300) return { level: 'Silver', color: '#C0C0C0' };
    if (points < 600) return { level: 'Gold', color: '#FFD700' };
    if (points < 1000) return { level: 'Platinum', color: '#E5E4E2' };
    return { level: 'Diamond', color: '#B9F2FF' };
  };

  const userLevel = getAchievementLevel(userPoints);

  const handleClaimReward = async (achievementId: string) => {
    try {
      // Check if the achievement is already claimed - if so, don't proceed
      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement) {
        console.error(`[CLAIM] Achievement ${achievementId} not found in component state`);
        Alert.alert("Error", "Achievement not found");
        return;
      }
      
      if (achievement.claimed) {
        console.log(`[CLAIM] Achievement ${achievementId} is already claimed - preventing duplicate claim`);
        Alert.alert(
          "Already Claimed",
          "You've already claimed this achievement reward!"
        );
        return;
      }
      
      if (!achievement.completed) {
        console.log(`[CLAIM] Achievement ${achievementId} is not completed yet - preventing claim`);
        Alert.alert(
          "Not Completed",
          "You need to complete this achievement before claiming it."
        );
        return;
      }

      console.log(`[CLAIM] Attempting to claim achievement: ${achievementId}`);
      
      // Call the AchievementManager's function to handle the claim in the database
      await AchievementManager.handleClaimRealtimeAchievement(achievementId);
      
      // If there's a parent callback, also call it (for screen refresh)
      if (onClaimReward) {
        console.log(`[CLAIM] Calling parent onClaimReward callback for achievement: ${achievementId}`);
        onClaimReward(achievementId);
      }
    } catch (error) {
      console.error('[CLAIM] Error in handleClaimReward:', error);
      Alert.alert("Error", "There was a problem claiming your achievement. Please try again.");
    }
  };

  const toggleExpandAchievement = (achievementId: string) => {
    setExpandedAchievement(
      expandedAchievement === achievementId ? null : achievementId
    );
  };

  const getProgressColor = (progress: number, total: number) => {
    const ratio = progress / total;
    if (ratio < 0.3) return isDark ? currentThemeColors.border : currentThemeColors.buttonSecondary;
    if (ratio < 0.7) return currentThemeColors.warning;
    return currentThemeColors.success;
  };

  const filterAchievements = () => {
    let filtered = achievements;
    
    // Filter by category
    if (selectedCategory === 'completed') {
      filtered = filtered.filter(achievement => achievement.completed);
    } else if (selectedCategory === 'unclaimed') {
      filtered = filtered.filter(achievement => achievement.completed && !achievement.claimed);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(achievement => achievement.type === selectedCategory);
    }
    
    // Filter by search text if any
    if (searchText) {
      const lowerCaseSearch = searchText.toLowerCase();
      filtered = filtered.filter(achievement => 
        achievement.title.toLowerCase().includes(lowerCaseSearch) || 
        achievement.description.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    return filtered;
  };

  const getLeagueColor = (league: string): string => {
    const tier = LEAGUE_TIERS.find(t => t.name === league);
    return tier ? tier.color : '#CD7F32';
  };
  
  const getLeagueIcon = (league: string): string => {
    const tier = LEAGUE_TIERS.find(t => t.name === league);
    return tier ? tier.icon : '🥉';
  };
  
  const calculateProgress = (achievement: Achievement): number => {
    return Math.min(Math.round((achievement.progress / achievement.total) * 100), 100);
  };

  const renderAchievementItem = (achievement: Achievement, index: number) => {
    const isExpanded = expandedAchievement === achievement.id;
    const progressRatio = achievement.progress / achievement.total;
    const progressPercentage = Math.min(progressRatio * 100, 100);
    const progressColor = getProgressColor(achievement.progress, achievement.total);
    
    const gradientColors = isDark 
      ? [currentThemeColors.buttonSecondary, currentThemeColors.background] as const
      : [currentThemeColors.background, currentThemeColors.buttonPrimary] as const;
    
    const iconGradientColors = achievement.completed
      ? ['#FFD700', '#FFC107'] as const
      : [blueColor, '#3498db'] as const;
    
    // Determine if the achievement is claimable: must be completed AND not claimed
    const isClaimable = achievement.completed && !achievement.claimed;

    return (
      <Animated.View
        style={[
          styles.achievementContainer,
          isDark && styles.achievementContainerDark
        ]}
      >
        <TouchableOpacity
          style={styles.achievementCard}
          onPress={() => toggleExpandAchievement(achievement.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={gradientColors}
            style={[
              styles.achievementGradient,
              isExpanded && styles.expandedGradient
            ]}
          >
            <View style={styles.achievementHeader}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={iconGradientColors}
                  style={styles.iconGradient}
                >
                  <MaterialIcons
                    name={achievement.icon as any}
                    size={28}
                    color={achievement.completed ? '#FFD700' : blueColor}
                  />
                </LinearGradient>
              </View>
              
              <View style={styles.achievementInfo}>
                <Text style={[
                  styles.achievementTitle,
                  { color: currentThemeColors.primary },
                  achievement.completed && styles.completedTitle
                ]}>
                  {achievement.title}
                </Text>
                
                <View style={styles.progressBarContainer}>
                  <View style={[
                    styles.progressBar,
                    { backgroundColor: isDark ? currentThemeColors.border : currentThemeColors.buttonSecondary }
                  ]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progressPercentage}%`, backgroundColor: progressColor }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.progressText,
                    { color: currentThemeColors.text }
                  ]}>
                    {achievement.progress}/{achievement.total}
                  </Text>
                </View>
              </View>

              <View style={styles.statusContainer}>
                {isClaimable ? (
                  <TouchableOpacity
                    style={[styles.claimButton, { backgroundColor: currentThemeColors.success }]}
                    onPress={() => handleClaimReward(achievement.id)}
                  >
                    <Text style={styles.claimButtonText}>Claim</Text>
                  </TouchableOpacity>
                ) : achievement.claimed ? (
                  <View style={[styles.claimedBadge, { backgroundColor: `${currentThemeColors.border}50` }]}>
                    <MaterialIcons name="verified" size={18} color={currentThemeColors.success} />
                    <Text style={[styles.claimedText, { color: currentThemeColors.success }]}>Claimed</Text>
                  </View>
                ) : (
                  <MaterialIcons
                    name={isExpanded ? "expand-less" : "expand-more"}
                    size={24}
                    color={currentThemeColors.text}
                  />
                )}
              </View>
            </View>

            {isExpanded && (
              <View style={[styles.expandedContent, { borderTopColor: currentThemeColors.border }]}>
                <Text style={[
                  styles.achievementDescription,
                  { color: blueColor }
                ]}>
                  {achievement.description}
                </Text>
                <View style={styles.achievementReward}>
                  <MaterialIcons name="stars" size={18} color="#FFD700" />
                  <Text style={[
                    styles.pointsText,
                    { color: currentThemeColors.text }
                  ]}>
                    {achievement.points} points
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const completedCount = achievements.filter(a => a.completed).length;
  const claimedCount = achievements.filter(a => a.claimed).length;
  const totalCount = achievements.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  // Create sections for our list
  const filteredAchievements = filterAchievements();

  // Component for search and filters - now part of the scrollable content
  const SearchAndFilters = () => (
    <View>
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: currentThemeColors.buttonSecondary }]}>
          <MaterialIcons name="search" size={20} color={currentThemeColors.text} />
          <TextInput
            style={[
              styles.searchInput, 
              { 
                color: isDark ? currentThemeColors.text : '#000000',
                fontWeight: '500'  
              }
            ]}
            placeholder="Search achievements..."
            placeholderTextColor={currentThemeColors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialIcons name="close" size={20} color={currentThemeColors.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.categoryFilterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterContent}
          data={[
            { id: 'all', label: 'All' },
            { id: 'completed', label: 'Completed' },
            { id: 'unclaimed', label: 'Unclaimed' },
            { id: 'task', label: 'Tasks' }
          ]}
          keyExtractor={(category) => category.id}
          renderItem={({ item: category }) => (
            <TouchableOpacity 
              style={[
                styles.categoryButton, 
                { borderColor: currentThemeColors.text },
                selectedCategory === category.id && { borderColor: currentThemeColors.success },
                {marginRight: 10}
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryText, 
                { color: currentThemeColors.text },
                selectedCategory === category.id && { color: currentThemeColors.success }
              ]}>{category.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );

  // Stats header component for stats at the top
  const StatsHeader = () => (
    <View>
      <SearchAndFilters />
      <View style={[styles.pointsSummaryCard, { backgroundColor: currentThemeColors.buttonSecondary }]}>
        <View style={styles.pointsHeader}>
          <Text style={[styles.pointsHeaderText, { color: currentThemeColors.primary }]}>
            Achievement Points
          </Text>
          <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
        </View>
        
        <Text style={[styles.pointsValue, { color: currentThemeColors.success }]}>
          {userPoints}
        </Text>
        
        <View style={styles.pointsDescription}>
          <Text style={[styles.pointsDescriptionText, { color: currentThemeColors.text }]}>
            {achievements.filter(a => a.completed && a.claimed).length} of {achievements.length} achievements
          </Text>
        </View>
      </View>

      <View style={[styles.leagueCard, { backgroundColor: currentThemeColors.buttonSecondary }]}>
        <View style={styles.leagueHeader}>
          <Text style={[styles.leagueHeaderText, { color: currentThemeColors.primary }]}>
            League Status
          </Text>
          <Text style={[styles.leagueIcon]}>{getLeagueIcon(currentLeague)}</Text>
        </View>
        
        <View style={styles.leagueInfo}>
          <Text style={[styles.currentLeague, { color: getLeagueColor(currentLeague) }]}>
            {currentLeague} League
          </Text>
          <Text style={[styles.leaguePoints, { color: currentThemeColors.text }]}>
            {userPoints} league points
          </Text>
        </View>
        
        <View style={styles.nextLeagueContainer}>
          <Text style={[styles.nextLeagueText, { color: currentThemeColors.text }]}>
            {pointsToNextLeague} points to {nextLeague} League
          </Text>
          <View style={[styles.leagueProgressBar, { backgroundColor: isDark ? currentThemeColors.border : '#E0E0E0' }]}>
            <View 
              style={[
                styles.leagueProgressFill, 
                { 
                  width: `${Math.min(100, (userPoints / (userPoints + pointsToNextLeague)) * 100)}%`,
                  backgroundColor: getLeagueColor(currentLeague)
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Animated.FlatList
        contentContainerStyle={styles.achievementsList}
        data={filteredAchievements}
        ListHeaderComponent={StatsHeader}
        renderItem={({ item, index }) => renderAchievementItem(item, index)}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        refreshing={refreshing === true}
        onRefresh={onRefresh}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    height: 60,
    width: 60,
    marginRight: 16,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  levelGradient: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsInfo: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsProgressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statsProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  pointsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: '48%',
  },
  pointsCardDark: {
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  darkPointsValue: {
    color: '#81C784',  
  },
  pointsLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  achievementContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementContainerDark: {
    shadowOpacity: 0,
    elevation: 0,
  },
  achievementCard: {
    width: '100%',
  },
  achievementGradient: {
    padding: 16,
    borderRadius: 12,
  },
  expandedGradient: {
    paddingBottom: 20,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  completedTitle: {
    color: '#4CAF50',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    width: 40,
  },
  statusContainer: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  claimedText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#4CAF50',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  achievementReward: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pointsText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  secondaryTextDark: {
    color: '#aaa',
  },
  pointsSummaryCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkPointsSummaryCard: {
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointsHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  pointsDescription: {
    marginTop: 8,
  },
  pointsDescriptionText: {
    fontSize: 14,
    color: '#666',
  },
  leagueCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkLeagueCard: {
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leagueHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  leagueIcon: {
    fontSize: 24,
  },
  leagueInfo: {
    marginBottom: 8,
  },
  currentLeague: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaguePoints: {
    fontSize: 14,
    color: '#666',
  },
  nextLeagueContainer: {
    marginTop: 8,
  },
  nextLeagueText: {
    fontSize: 14,
    color: '#666',
  },
  leagueProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  leagueProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  categoryFilterContainer: {
    margin: 16,
    marginBottom: 8,
  },
  categoryFilterContent: {
    padding: 8,
  },
  categoryButton: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 16,
  },
  selectedCategoryButton: {
    borderColor: '#4CAF50',
  },
  darkCategoryButton: {
    borderColor: '#aaa',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedCategoryText: {
    color: '#4CAF50',
  },
  achievementsList: {
    padding: 16,
  },
});

export default Achievements;