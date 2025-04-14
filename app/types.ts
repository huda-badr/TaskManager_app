export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: {
    seconds: number;
    nanoseconds: number;
  };
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  userId: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  category?: string;
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
  docId?: string;
  type?: 'task' | 'time' | 'streak';
  resetPeriod?: 'daily' | 'weekly' | 'monthly' | null;
  lastReset?: any;
  nextReset?: any;
  createdAt?: any;
  updatedAt?: any;
}

const Types = {
  Task: {} as Task,
  Achievement: {} as Achievement
};

export default Types; 