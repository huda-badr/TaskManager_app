import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs, addDoc, Timestamp, query, where, orderBy, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { Task } from '@/types';
import { router } from 'expo-router';

interface TaskContextType {
  tasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'userId' | 'dueDate'>) => Promise<Task>;
  updateTask: (taskId: string, taskData: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: 'all' | 'pending' | 'in_progress' | 'completed') => void;
  setSortKey: (key: 'deadline' | 'priority' | 'category') => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [sortKey, setSortKey] = useState<'deadline' | 'priority' | 'category'>('deadline');

  // Set up real-time listener for tasks
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setLoading(true);
        const userId = user.uid;
        const q = query(
          collection(db, `users/${userId}/tasks`),
          orderBy('createdAt', 'desc')
        );
        
        // Create real-time listener
        const unsubscribeTasks = onSnapshot(q, (querySnapshot) => {
          const fetchedTasks: Task[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              description: data.description,
              deadline: data.deadline,
              dueDate: data.deadline ? new Date(data.deadline.seconds * 1000) : undefined,
              priority: data.priority,
              category: data.category,
              createdAt: new Date(data.createdAt.seconds * 1000),
              completed: data.completed || false,
              status: data.status || 'pending',
              userId: data.userId,
              completedAt: data.completedAt ? new Date(data.completedAt.seconds * 1000) : undefined,
              isRecurring: data.isRecurring || false
            };
          });
          
          setTasks(fetchedTasks);
          setLoading(false);
        }, (error) => {
          console.error("Error setting up tasks listener:", error);
          setLoading(false);
        });
        
        return () => unsubscribeTasks();
      } else {
        setTasks([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Filter and sort tasks when dependencies change
  useEffect(() => {
    if (tasks.length > 0) {
      let filtered = [...tasks];

      if (searchQuery) {
        filtered = filtered.filter(
          task =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter(task => {
          switch (statusFilter) {
            case 'completed':
              return task.completed;
            case 'in_progress':
              return !task.completed && task.status === 'in_progress';
            case 'pending':
              return !task.completed && task.status === 'pending';
            default:
              return true;
          }
        });
      }

      filtered.sort((a, b) => {
        switch (sortKey) {
          case 'deadline':
            return (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);
          case 'priority':
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          case 'category':
            return (a.category ?? '').localeCompare(b.category ?? '');
          default:
            return 0;
        }
      });

      setFilteredTasks(filtered);
    } else {
      setFilteredTasks([]);
    }
  }, [tasks, searchQuery, statusFilter, sortKey]);

  const refreshTasks = async () => {
    // This function is now mostly redundant since we use onSnapshot,
    // but we'll keep it for backwards compatibility
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return;
      }

      setLoading(true);
      const q = query(
        collection(db, `users/${userId}/tasks`),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedTasks: Task[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          dueDate: data.deadline ? new Date(data.deadline.seconds * 1000) : undefined,
          priority: data.priority,
          category: data.category,
          createdAt: new Date(data.createdAt.seconds * 1000),
          completed: data.completed || false,
          status: data.status || 'pending',
          userId: data.userId,
          completedAt: data.completedAt ? new Date(data.completedAt.seconds * 1000) : undefined,
          isRecurring: data.isRecurring || false
        };
      });

      setTasks(fetchedTasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'userId' | 'dueDate'>) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/(auth)/login');
        throw new Error('User not logged in');
      }

      // Create the task in Firestore
      const docRef = await addDoc(collection(db, `users/${userId}/tasks`), {
        ...taskData,
        userId,
        createdAt: Timestamp.now(),
        deadline: taskData.deadline || Timestamp.now(),
        completed: taskData.completed || false,
        status: taskData.status || 'pending',
      });

      // Create a new task object to add to the local state
      const newTask: Task = {
        ...taskData,
        id: docRef.id,
        userId,
        createdAt: new Date(),
        dueDate: taskData.deadline ? 
          (taskData.deadline instanceof Timestamp ? 
            new Date(taskData.deadline.seconds * 1000) : 
            new Date(taskData.deadline as any)) : 
          undefined,
      };
      
      // Note: We don't need to update local state manually anymore
      // since the onSnapshot listener will handle that
      
      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/(auth)/login');
        throw new Error('User not logged in');
      }

      const taskRef = doc(db, `users/${userId}/tasks`, taskId);
      
      // Prepare update data for Firestore (convert deadline if provided)
      const updateData: any = { ...taskData };
      if (updateData.deadline && !(updateData.deadline instanceof Timestamp)) {
        updateData.deadline = Timestamp.fromDate(
          updateData.deadline instanceof Date ? updateData.deadline : new Date(updateData.deadline)
        );
      }
      
      await updateDoc(taskRef, updateData);

      // Note: We don't need to update local state manually anymore
      // since the onSnapshot listener will handle that
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/(auth)/login');
        throw new Error('User not logged in');
      }

      await deleteDoc(doc(db, `users/${userId}/tasks`, taskId));
      
      // Note: We don't need to update local state manually anymore
      // since the onSnapshot listener will handle that
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  return (
    <TaskContext.Provider 
      value={{ 
        tasks, 
        filteredTasks, 
        loading, 
        addTask, 
        updateTask, 
        deleteTask, 
        refreshTasks,
        setSearchQuery,
        setStatusFilter,
        setSortKey
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext; 