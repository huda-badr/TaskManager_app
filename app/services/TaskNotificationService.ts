import * as Notifications from 'expo-notifications';
import { Task } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function scheduleTaskReminder(task: { id: string, title: string, dueDate: Date }) {
  if (!task.dueDate) return;

  const dueDate = new Date(task.dueDate);
  const reminderTime = new Date(dueDate.getTime() - 10 * 60 * 1000); // 10 minutes before dueDate

  if (reminderTime > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task Reminder',
        body: `Reminder: ${task.title} is due soon!`,
        data: { taskId: task.id },
      },
      trigger: { date: reminderTime }, // Simplified trigger format
    });
  }
}

export async function cancelTaskReminder(taskId: string) {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  const taskNotifications = notifications.filter(
    (notification) => notification.content.data?.taskId === taskId
  );

  for (const notification of taskNotifications) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }
}

export async function notifyOverdueTasks(tasks: Task[]) {
  const now = new Date();

  for (const task of tasks) {
    if (task.dueDate && new Date(task.dueDate) < now && !task.completed) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Overdue Task',
          body: `The task "${task.title}" is overdue! Please complete it as soon as possible.`,
          data: { taskId: task.id },
        },
        trigger: null, // Trigger immediately
      });
    }
  }
}

export async function scheduleDailyNotifications() {
  // Notification at 8 AM for task summary
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Task Summary',
      body: 'Check out your tasks for today!',
    },
    trigger: {
      hour: 8,
      minute: 0,
      repeats: true,
    },
  });

  // Notification at 5 PM if no tasks are completed
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Task Reminder',
      body: 'You haven’t completed any tasks today. Let’s get started!',
    },
    trigger: {
      hour: 17,
      minute: 0,
      repeats: true,
    },
  });
}

export default { scheduleTaskReminder, scheduleDailyNotifications, notifyOverdueTasks };