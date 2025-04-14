import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Image, Dimensions, FlatList, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '@/types';
import { AchievementManager } from '@/app/services/AchievementManager';
import { auth, rtdb } from '@/config/firebase';
import { ref, get, onValue } from 'firebase/database';

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
  const [fadeAnims] = useState(() => 
    achievements.map(() => new Animated.Value(0))
  );
  
  const [expandedAchievement, setExpandedAchievement] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentLeague, setCurrentLeague] = useState<string>('Bronze');
  const [nextLeague, setNextLeague] = useState<string>('Silver');
  const [pointsToNextLeague, setPointsToNextLeague] = useState<number>(100);

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
    if (onClaimReward) {
      onClaimReward(achievementId);
    }
  };

  const toggleExpandAchievement = (achievementId: string) => {
    setExpandedAchievement(
      expandedAchievement === achievementId ? null : achievementId
    );
  };

  const getProgressColor = (progress: number, total: number) => {
    const ratio = progress / total;
    if (ratio < 0.3) return isDark ? '#555' : '#e0e0e0';
    if (ratio < 0.7) return '#FFC107';
    return '#4CAF50';
  };

  const filterAchievements = () => {
    if (selectedCategory === 'all') {
      return achievements;
    } else if (selectedCategory === 'completed') {
      return achievements.filter(achievement => achievement.completed);
    } else if (selectedCategory === 'unclaimed') {
      return achievements.filter(achievement => achievement.completed && !achievement.claimed);
    } else {
      return achievements.filter(achievement => achievement.type === selectedCategory);
    }
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
      ? ['#2A2A2A', '#1A1A1A'] as const
      : ['#FFFFFF', '#F5F5F5'] as const;
    
    const iconGradientColors = achievement.completed
      ? ['#4CAF50', '#2E7D32'] as const
      : (isDark ? ['#444', '#333'] as const : ['#EEE', '#DDD'] as const);

    return (
      <Animated.View 
        key={achievement.id}
        style={[
          styles.achievementContainer,
          {
            opacity: fadeAnims[index],
            transform: [
              { 
                translateY: fadeAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          },
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
                    color={achievement.completed ? '#FFD700' : (isDark ? '#999' : '#666')}
                  />
                </LinearGradient>
              </View>
              
              <View style={styles.achievementInfo}>
                <Text style={[
                  styles.achievementTitle,
                  isDark && styles.textDark,
                  achievement.completed && styles.completedTitle
                ]}>
                  {achievement.title}
                </Text>
                
                <View style={styles.progressBarContainer}>
                  <View style={[
                    styles.progressBar,
                    { backgroundColor: isDark ? '#333' : '#eee' }
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
                    isDark && styles.textDark
                  ]}>
                    {achievement.progress}/{achievement.total}
                  </Text>
                </View>
              </View>

              <View style={styles.statusContainer}>
                {achievement.completed && !achievement.claimed ? (
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaimReward(achievement.id)}
                  >
                    <Text style={styles.claimButtonText}>Claim</Text>
                  </TouchableOpacity>
                ) : achievement.claimed ? (
                  <View style={styles.claimedBadge}>
                    <MaterialIcons name="verified" size={18} color="#4CAF50" />
                    <Text style={styles.claimedText}>Claimed</Text>
                  </View>
                ) : (
                  <MaterialIcons
                    name={isExpanded ? "expand-less" : "expand-more"}
                    size={24}
                    color={isDark ? "#999" : "#666"}
                  />
                )}
              </View>
            </View>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <Text style={[
                  styles.achievementDescription,
                  isDark && styles.textDark
                ]}>
                  {achievement.description}
                </Text>
                <View style={styles.achievementReward}>
                  <MaterialIcons name="stars" size={18} color="#FFD700" />
                  <Text style={[
                    styles.pointsText,
                    isDark && styles.textDark
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
  const filteredAchievements = filterAchievements().map(achievement => ({
    type: 'achievement' as const,
    id: achievement.id,
    data: achievement
  }));

  // Create the header components separately
  const HeaderComponent = () => (
    <>
      <View style={[styles.pointsSummaryCard, isDark && styles.darkPointsSummaryCard]}>
        <View style={styles.pointsHeader}>
          <Text style={[styles.pointsHeaderText, isDark && styles.darkText]}>
            Achievement Points
          </Text>
          <MaterialIcons name="emoji-events" size={24} color={isDark ? "#FFD700" : "#FFD700"} />
        </View>
        
        <Text style={[styles.pointsValue, isDark && styles.darkPointsValue]}>
          {userPoints}
        </Text>
        
        <View style={styles.pointsDescription}>
          <Text style={[styles.pointsDescriptionText, isDark && styles.darkText]}>
            {achievements.filter(a => a.completed && a.claimed).length} of {achievements.length} achievements
          </Text>
        </View>
      </View>

      <View style={[styles.leagueCard, isDark && styles.darkLeagueCard]}>
        <View style={styles.leagueHeader}>
          <Text style={[styles.leagueHeaderText, isDark && styles.darkText]}>
            League Status
          </Text>
          <Text style={[styles.leagueIcon]}>{getLeagueIcon(currentLeague)}</Text>
        </View>
        
        <View style={styles.leagueInfo}>
          <Text style={[styles.currentLeague, { color: getLeagueColor(currentLeague) }]}>
            {currentLeague} League
          </Text>
          <Text style={[styles.leaguePoints, isDark && styles.darkText]}>
            {userPoints} league points
          </Text>
        </View>
        
        <View style={styles.nextLeagueContainer}>
          <Text style={[styles.nextLeagueText, isDark && styles.darkText]}>
            {pointsToNextLeague} points to {nextLeague} League
          </Text>
          <View style={[styles.leagueProgressBar, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
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
                selectedCategory === category.id && styles.selectedCategoryButton,
                isDark && styles.darkCategoryButton,
                {marginRight: 10}
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryText, 
                selectedCategory === category.id && styles.selectedCategoryText,
                isDark && styles.darkText
              ]}>{category.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <FlatList
        data={filteredAchievements}
        ListHeaderComponent={HeaderComponent}
        renderItem={({ item }) => {
          if (item.type === 'achievement') {
            const achievement = item.data;
            if (achievement) {
              const index = achievements.findIndex(a => a.id === achievement.id);
              return renderAchievementItem(achievement, index);
            }
          }
          return null;
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.achievementsList}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkText: {
    color: '#fff',
  },
  textDark: {
    color: '#fff',
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