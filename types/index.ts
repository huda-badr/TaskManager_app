export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  status: 'pending' | 'in_progress' | 'completed';
  userId: string;
  createdAt: Date;
  completed: boolean;
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly';
  recurringInterval?: number;
  recurringEndDate?: Date | null;
  dueDate: Date | null;
  mood?: string | null;
} 