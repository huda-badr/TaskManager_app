export type RootStackParamList = {
    Login: undefined; 
    Signup: undefined; 
    Home: undefined; 
  };

  export interface Task {
    id: string;
    title: string;
    completed: boolean;
    createdAt: Date;
    userId: string;
    priority: 'low' | 'medium' | 'high';
    category?: string;
    dueDate?: Date;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed';
    completedAt?: Date;
    isRecurring?: boolean;
  }

  export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    progress: number;
    total: number;
    completed: boolean;
    claimed: boolean;
    points: number;
    docId?: string; // Document ID in Firestore (optional)
    type?: 'task' | 'time' | 'streak'; // Type of achievement
    resetPeriod?: 'daily' | 'weekly' | 'monthly' | null; // When progress should reset
    lastReset?: any; // Timestamp of last reset
    nextReset?: any; // Timestamp of next scheduled reset
    createdAt?: any; // Creation timestamp
    updatedAt?: any; // Last update timestamp
  }

  export interface User {
    id: string;
    email: string;
    displayName?: string;
    achievements: Achievement[];
    totalPoints: number;
    createdAt: Date;
    lastLogin: Date;
  }

  export interface Mood {
    id: string;
    userId: string;
    mood: 'happy' | 'neutral' | 'tired' | 'stressed' | 'productive';
    timestamp: Date;
    notes?: string;
  }

  export interface PomodoroSession {
    id: string;
    userId: string;
    taskId?: string;
    startTime: Date;
    endTime?: Date;
    duration: number; // in minutes
    completed: boolean;
    type: 'work' | 'break' | 'longBreak';
  }