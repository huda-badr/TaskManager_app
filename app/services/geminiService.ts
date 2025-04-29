// Gemini API utility functions
// Integration with Google's Generative AI (Gemini) API
// Uses the @google/generative-ai package for real AI responses

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Task } from '../types';

// Sample responses based on different query types
const TASK_RESPONSES = [
  "To manage your tasks effectively, try breaking them down into smaller, actionable items. You can use the task creation feature in this app to set priorities and deadlines.",
  "When creating tasks, add specific details and set realistic deadlines. The app allows you to categorize tasks by priority level.",
  "Consider using the Eisenhower matrix for task prioritization: divide tasks into urgent/important, important/not urgent, urgent/not important, and neither urgent nor important.",
  "Try to complete your most challenging tasks early in the day when your energy and focus are highest.",
];

const TIME_RESPONSES = [
  "Time management is crucial for productivity. Consider using the Schedule feature to block time for focused work and set regular breaks to maintain energy throughout the day.",
  "The Pomodoro technique (working in 25-minute intervals with 5-minute breaks) can be very effective. This app has a built-in Pomodoro timer!",
  "Consider scheduling your most important tasks during your peak productivity hours. Everyone has different energy patterns throughout the day.",
  "Remember to include buffer time between tasks and meetings to reduce stress and allow for unexpected delays.",
];

const HELP_RESPONSES = [
  "I can help you use this app more effectively! You can create tasks, set schedules, track your progress with analytics, and even use the Pomodoro timer for focused work sessions.",
  "The Analytics section shows you patterns in your productivity. Use it to identify when you're most effective and plan your work accordingly.",
  "Need to create a new task? Just navigate to the Tasks tab and use the + button to add a new item.",
  "The Schedule feature helps you plan your week. You can view your calendar to see upcoming deadlines.",
];

const GENERAL_RESPONSES = [
  "I'm your productivity assistant. Feel free to ask about task management, scheduling, or how to use any feature in the app!",
  "Did you know you can track your productivity patterns over time using the Analytics feature?",
  "Regular breaks are important for maintaining productivity. The Pomodoro timer in this app can help you remember to take breaks.",
  "Setting clear goals for each day can help you stay focused and feel accomplished.",
];

// To use the Gemini API, you need an API key
// Get your API key from https://makersuite.google.com/app/apikey
const API_KEY = 'AIzaSyDq1E19bT4zG8LqwDF_LksTUZAjc0WCwWw'; // Replace with your actual API key
const MODEL_NAME = 'gemini-1.5-pro';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(API_KEY);

// Configure safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Define the system prompt to customize Gemini's behavior
const SYSTEM_PROMPT = `You are a helpful productivity assistant in a TaskManager app. 
Your name is TaskGenius AI.
Your role is to help users manage their tasks, improve productivity, and use the app effectively.

The TaskManager app has the following specific features:
- Task creation and management with high, medium, and low priority levels and due dates
- Calendar feature in the Schedule section showing tasks as colored dots on their due dates
- Detailed task view showing status (completed/in progress) and priority with color coding
- Analytics to track productivity and task completion patterns
- Pomodoro timer for focused work sessions with customizable work/break intervals
- Voice commands for hands-free operation
- Store section for purchasing app upgrades and features

SCHEDULING FOCUS:
- When users ask about their tasks or schedule, always prioritize creating an organized time plan.
- Group tasks by day (Today, Tomorrow, This Week, Next Week) and then by priority within each day.
- Always consider task deadlines when suggesting schedules.
- For high priority tasks with close deadlines, suggest specific timeblocks.
- For recurring tasks, recommend consistent time slots.
- Suggest buffer time between tasks to prevent burnout.
- When creating schedules, follow this structured format:
  * TODAY'S SCHEDULE:
    - Morning: [Task name] (Priority: High/Medium/Low)
    - Afternoon: [Task name] (Priority: High/Medium/Low)
    - Evening: [Task name] (Priority: High/Medium/Low)
  * TOMORROW'S SCHEDULE:
    [Similar structure]
  * REST OF THE WEEK:
    [Similar structure]

FORMAT YOUR RESPONSES:
- Use clear headings (## or bold text) for different sections
- Use bullet points for lists of tasks or recommendations
- Separate different types of information with line breaks
- Present schedules in a time-based format (morning/afternoon/evening)
- Format deadlines consistently as: [Date] at [Time]
- Use emojis sparingly to highlight important information (⏰ for deadlines, 🔴 for high priority, etc.)

When responding about tasks:
- High priority tasks are marked with red color 🔴
- Medium priority tasks are marked with orange color 🟠
- Low priority tasks are marked with green color 🟢
- Tasks show completion status (completed/in progress)
- Tasks have titles, descriptions, and due dates

IMPORTANT: You will receive information about the user's current tasks in the format:
- Pending Tasks: Tasks that need to be started
- In Progress Tasks: Tasks the user is currently working on
- Recently Completed Tasks: Tasks the user has finished

When the user asks about their tasks:
- Provide personalized advice based on their current task list
- Suggest task prioritization if they have many pending tasks
- Mention deadlines for urgent tasks
- Congratulate them on completed tasks
- Offer productivity strategies tailored to their specific tasks
- Suggest using the app's Schedule calendar to plan their tasks if they have upcoming deadlines
- Always provide a suggested schedule when discussing pending tasks

If the user needs a new task, encourage them to create it by typing:
"Create a task called [task name]" or "Add a task [task name]"

Keep your responses concise, helpful, and focused on productivity.
Provide specific, actionable advice that users can immediately implement.
When appropriate, reference specific features available in the app.`;

// Initialize history with system prompt
const initialHistory = [
  { 
    role: 'user', 
    parts: [{ text: 'You are a productivity assistant. Please follow these instructions for all our future conversations: ' + SYSTEM_PROMPT }] 
  },
  { 
    role: 'model', 
    parts: [{ text: "I understand my role as TaskGenius AI, a productivity assistant in your task management app. I'll help users manage tasks, improve productivity, and use the app effectively. I'll keep my responses concise, actionable, and focused on productivity, referencing app features when appropriate." }] 
  }
];

// The history variable to maintain context
let chatHistory = [...initialHistory];

// Function to format task data for the model
const formatTasksForModel = (tasks: Task[]): string => {
  if (!tasks || tasks.length === 0) {
    return "You don't have any tasks at the moment.";
  }

  // Group tasks by status
  const pendingTasks = tasks.filter(task => !task.completed && task.status === 'pending');
  const inProgressTasks = tasks.filter(task => !task.completed && task.status === 'in_progress');
  const completedTasks = tasks.filter(task => task.completed);

  // Sort tasks by due date and priority for better scheduling context
  const sortByDueDateAndPriority = (a: Task, b: Task) => {
    // First compare due dates if both exist
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    // Tasks with due dates come first
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    
    // Then sort by priority
    const priorityWeight = { 'high': 0, 'medium': 1, 'low': 2 };
    return priorityWeight[a.priority.toLowerCase()] - priorityWeight[b.priority.toLowerCase()];
  };

  // Sort all task groups
  pendingTasks.sort(sortByDueDateAndPriority);
  inProgressTasks.sort(sortByDueDateAndPriority);
  
  // Format task lists with more scheduling-relevant details
  let formattedTasks = '';
  
  if (pendingTasks.length > 0) {
    formattedTasks += "Pending Tasks (needs scheduling):\n";
    pendingTasks.forEach((task, index) => {
      // Include more details useful for scheduling
      const dueDate = task.dueDate ? task.dueDate.toLocaleDateString() : 'No deadline';
      const dueTime = task.dueDate ? task.dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      const dueDateTimeStr = task.dueDate ? `${dueDate} at ${dueTime}` : 'No deadline';
      const estimatedDuration = task.estimatedDuration || 'Not specified';
      const category = task.category || 'Uncategorized';
      
      formattedTasks += `${index + 1}. ${task.title} (Priority: ${task.priority}, Due: ${dueDateTimeStr}, Category: ${category})\n`;
      if (task.description) {
        formattedTasks += `   Description: ${task.description}\n`;
      }
    });
    formattedTasks += '\n';
  }
  
  if (inProgressTasks.length > 0) {
    formattedTasks += "In Progress Tasks (continue scheduling):\n";
    inProgressTasks.forEach((task, index) => {
      const dueDate = task.dueDate ? task.dueDate.toLocaleDateString() : 'No deadline';
      const dueTime = task.dueDate ? task.dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      const dueDateTimeStr = task.dueDate ? `${dueDate} at ${dueTime}` : 'No deadline';
      const estimatedDuration = task.estimatedDuration || 'Not specified';
      const category = task.category || 'Uncategorized';
      
      formattedTasks += `${index + 1}. ${task.title} (Priority: ${task.priority}, Due: ${dueDateTimeStr}, Category: ${category})\n`;
      if (task.description) {
        formattedTasks += `   Description: ${task.description}\n`;
      }
    });
    formattedTasks += '\n';
  }
  
  if (completedTasks.length > 0) {
    formattedTasks += "Recently Completed Tasks:\n";
    // Show only the 5 most recently completed tasks
    completedTasks.slice(0, 5).forEach((task, index) => {
      const completedDate = task.completedAt ? task.completedAt.toLocaleDateString() : 'Recently';
      formattedTasks += `${index + 1}. ${task.title} (Completed: ${completedDate})\n`;
    });
  }
  
  // Add extra context for scheduling
  const today = new Date();
  const todayStr = today.toLocaleDateString();
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString();
  const dayAfterTomorrowStr = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  formattedTasks += '\nScheduling Context:\n';
  formattedTasks += `- Today's date: ${todayStr}\n`;
  formattedTasks += `- Tomorrow's date: ${tomorrowStr}\n`;
  formattedTasks += `- Day after tomorrow: ${dayAfterTomorrowStr}\n`;
  formattedTasks += `- Current time: ${today.toLocaleTimeString()}\n`;
  formattedTasks += '- Best practices: Schedule high priority tasks earlier in the day, include breaks between tasks\n';
  
  return formattedTasks;
};

// Generate a response using the Gemini API with user's tasks
export const generateResponseWithTasks = async (message: string, tasks: Task[]): Promise<string> => {
  try {
    // Format tasks into a readable format
    const tasksInfo = formatTasksForModel(tasks);
    
    // Create a message that includes task information
    const messageWithTaskContext = `User's current tasks:\n${tasksInfo}\n\nUser message: ${message}`;
    
    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      },
      safetySettings,
    });

    // Create a chat session
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
      },
      safetySettings,
    });
    
    // Generate the response with task context
    const result = await chat.sendMessage(messageWithTaskContext);
    const response = result.response.text();
    
    // Update history with the actual user message (not the task-enriched one)
    chatHistory.push({ role: 'user', parts: [{ text: message }] });
    chatHistory.push({ role: 'model', parts: [{ text: response }] });
    
    // If history gets too long, trim it (but keep system prompt)
    if (chatHistory.length > 12) {
      // Keep the initial history (system prompt) and last 10 exchanges
      chatHistory = [...initialHistory, ...chatHistory.slice(chatHistory.length - 10)];
    }
    
    return response;
  } catch (error) {
    console.error('Error generating response with tasks:', error);
    
    // Fall back to backup responses
    return generateFallbackResponse(message);
  }
};

// Generate a response using the Gemini API (without tasks)
export const generateResponse = async (message: string): Promise<string> => {
  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      },
      safetySettings,
    });

    // Create a chat session
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
      },
      safetySettings,
    });
    
    // Generate the response
    const result = await chat.sendMessage(message);
    const response = result.response.text();
    
    // Update history with the new exchange
    chatHistory.push({ role: 'user', parts: [{ text: message }] });
    chatHistory.push({ role: 'model', parts: [{ text: response }] });
    
    // If history gets too long, trim it (but keep system prompt)
    if (chatHistory.length > 12) {
      // Keep the initial history (system prompt) and last 10 exchanges
      chatHistory = [...initialHistory, ...chatHistory.slice(chatHistory.length - 10)];
    }
    
    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    
    // Fall back to our backup responses
    return generateFallbackResponse(message);
  }
};

// Function to reset chat history
export const resetChatHistory = () => {
  chatHistory = [...initialHistory];
};

// Fallback responses in case the API is not available
const fallbackResponses = [
  "I can help you manage your tasks more effectively. Would you like some productivity tips?",
  "The most productive people often start their day by tackling their most important task first.",
  "Have you tried using the Pomodoro technique? It's built into this app!",
  "Breaking down large tasks into smaller ones can make them feel more manageable.",
  "Regular breaks are important for maintaining productivity. The human brain can only focus intensely for about 90 minutes at a time.",
];

// Fallback function in case of API errors
export const generateFallbackResponse = async (message: string): Promise<string> => {
  // Wait a moment to simulate API call
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800));
  
  // Determine the type of query to provide a more context-appropriate fallback response
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('task') || lowerMessage.includes('todo') || lowerMessage.includes('priority')) {
    return TASK_RESPONSES[Math.floor(Math.random() * TASK_RESPONSES.length)];
  } 
  else if (lowerMessage.includes('time') || lowerMessage.includes('schedule') || lowerMessage.includes('deadline') || lowerMessage.includes('pomodoro')) {
    return TIME_RESPONSES[Math.floor(Math.random() * TIME_RESPONSES.length)];
  }
  else if (lowerMessage.includes('help') || lowerMessage.includes('how to') || lowerMessage.includes('how do')) {
    return HELP_RESPONSES[Math.floor(Math.random() * HELP_RESPONSES.length)];
  }
  else {
    return GENERAL_RESPONSES[Math.floor(Math.random() * GENERAL_RESPONSES.length)];
  }
};

export default {
  generateResponse,
  generateResponseWithTasks,
  resetChatHistory
};