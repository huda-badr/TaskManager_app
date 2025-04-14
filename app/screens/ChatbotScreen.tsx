import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { generateResponse, generateResponseWithTasks, resetChatHistory } from '../services/geminiService';
import { useTaskContext } from '../context/TaskContext';
import { Timestamp } from 'firebase/firestore';

// Message types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// Sample welcome messages
const welcomeMessages = [
  "Hello! I'm TaskGenius AI, your personal productivity assistant.",
  "I can now see your tasks and help you manage them more effectively. Ask me about your pending tasks or deadlines!",
  "Try asking me to suggest a schedule for your tasks, help with prioritization, or productivity techniques tailored to your workload."
];

const ChatbotScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Get tasks from the task context
  const { tasks, addTask } = useTaskContext();

  // Initialize with welcome message
  useEffect(() => {
    const initialMessages = welcomeMessages.map((text, index) => ({
      id: `welcome-${index}`,
      text,
      sender: 'bot' as const,
      timestamp: new Date(Date.now() + index * 500) // Stagger timestamps slightly
    }));
    
    setMessages(initialMessages);
    
    // Reset chat history when component unmounts
    return () => {
      resetChatHistory();
    };
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  // Function to send message to Gemini API
  const sendMessageToGemini = async (message: string) => {
    try {
      setIsLoading(true);
      
      // Get response from Gemini API utility with tasks
      const response = await generateResponseWithTasks(message, tasks);

      // Add bot response to messages
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "Sorry, I'm having trouble connecting at the moment. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      setIsLoading(false);
    }
  };

  // Helper function to create a task from chatbot
  const createTaskFromChat = async (title: string, priority: 'low' | 'medium' | 'high' = 'medium', dueDate?: Date) => {
    try {
      const newTask = await addTask({
        title,
        description: 'Created via TaskGenius AI',
        priority,
        deadline: dueDate ? Timestamp.fromDate(dueDate) : Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // Default to 1 week from now
        status: 'pending',
        completed: false,
      });
      
      // Add a confirmation message
      const confirmationMessage: Message = {
        id: `system-${Date.now()}`,
        text: `✅ Task created: "${title}"`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, confirmationMessage]);
      
      return newTask;
    } catch (error) {
      console.error('Error creating task from chat:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "Sorry, I couldn't create that task. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      return null;
    }
  };

  // Function to parse the message for task creation intent
  const checkForTaskCreationIntent = (message: string): boolean => {
    const taskCreationPatterns = [
      /create\s+(?:a\s+)?task/i,
      /add\s+(?:a\s+)?task/i,
      /make\s+(?:a\s+)?task/i,
      /add\s+to\s+(?:my\s+)?tasks?/i,
      /new\s+task/i
    ];
    
    return taskCreationPatterns.some(pattern => pattern.test(message));
  };
  
  // Handle a potential task creation request
  const handlePotentialTaskCreation = (message: string) => {
    if (checkForTaskCreationIntent(message)) {
      // Try to extract the task title - everything after "create/add task" or similar
      let taskTitle = '';
      
      // Extract text after "create task", "add task", etc.
      const match = message.match(/(?:create|add|make|new)\s+(?:a\s+)?task\s+(?:to\s+)?(?:called|named|titled|:)?\s*["']?([^"']+)["']?/i);
      
      if (match && match[1]) {
        taskTitle = match[1].trim();
        
        // Ask for confirmation before creating
        Alert.alert(
          'Create Task',
          `Do you want to create a task: "${taskTitle}"?`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Create',
              onPress: () => createTaskFromChat(taskTitle)
            }
          ]
        );
        
        return true;
      }
    }
    
    return false;
  };

  // Modify handleSendMessage to check for task creation intent
  const handleSendMessage = () => {
    if (inputText.trim() === '') return;
    
    // Create and add the user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Check if this is a task creation request
    const isTaskCreation = handlePotentialTaskCreation(inputText);
    
    // Get the message to send and clear input
    const messageToSend = inputText;
    setInputText('');
    
    // Only send to Gemini if not a direct task creation
    // (if it was a task creation, we've already handled it)
    if (!isTaskCreation) {
      sendMessageToGemini(messageToSend);
    }
  };

  // Message bubble component
  const MessageBubble = ({ message }: { message: Message }) => {
    const isUserMessage = message.sender === 'user';
    
    return (
      <View style={[
        styles.messageBubble,
        isUserMessage ? styles.userBubble : styles.botBubble,
        isDark && (isUserMessage ? styles.darkUserBubble : styles.darkBotBubble)
      ]}>
        <Text style={[
          styles.messageText,
          isUserMessage ? styles.userText : styles.botText,
          isDark && styles.darkText
        ]}>
          {message.text}
        </Text>
        <Text style={[
          styles.timestamp,
          isUserMessage ? styles.userTimestamp : styles.botTimestamp,
          isDark && styles.darkTimestamp
        ]}>
          {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
      </View>
    );
  };

  // Render loading indicator
  const renderLoading = () => {
    if (!isLoading) return null;
    
    return (
      <View style={[
        styles.loadingContainer,
        isDark && styles.darkLoadingContainer
      ]}>
        <View style={[
          styles.loadingIndicator,
          isDark && styles.darkLoadingIndicator
        ]}>
          <ActivityIndicator size="small" color={isDark ? "#64B5F6" : "#2196F3"} />
          <Text style={[styles.loadingText, isDark && styles.darkLoadingText]}>Thinking...</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDark && styles.darkContainer]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, isDark && styles.darkButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>TaskGenius AI</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {renderLoading()}
      </ScrollView>

      <View style={[styles.poweredByContainer, isDark && styles.darkPoweredByContainer]}>
        <Text style={[styles.poweredByText, isDark && styles.darkPoweredByText]}>
          Powered by Google Gemini
        </Text>
      </View>

      <View style={[styles.inputContainer, isDark && styles.darkInputContainer]}>
        <TextInput
          style={[styles.input, isDark && styles.darkInput]}
          placeholder="Type a message..."
          placeholderTextColor={isDark ? "#888" : "#999"}
          value={inputText}
          onChangeText={setInputText}
          multiline
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity 
          style={[styles.sendButton, inputText.trim() === '' && styles.disabledSendButton]} 
          onPress={handleSendMessage}
          disabled={inputText.trim() === ''}
        >
          <MaterialIcons
            name="send"
            size={24}
            color={inputText.trim() === '' ? (isDark ? '#555' : '#ccc') : (isDark ? '#64B5F6' : '#2196F3')}
          />
        </TouchableOpacity>
      </View>

      {/* Suggested questions */}
      <View style={[styles.suggestionsContainer, isDark && styles.darkSuggestionsContainer]}>
        <Text style={[styles.suggestionsTitle, isDark && styles.darkText]}>Try asking:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
          <TouchableOpacity 
            style={[styles.suggestionChip, isDark && styles.darkSuggestionChip]}
            onPress={() => {
              const text = "What tasks should I focus on today?";
              setInputText(text);
              
              // We need to manually create and send the message since handleSendMessage relies on inputText state
              const userMessage: Message = {
                id: `user-${Date.now()}`,
                text: text,
                sender: 'user',
                timestamp: new Date()
              };
              
              setMessages(prevMessages => [...prevMessages, userMessage]);
              sendMessageToGemini(text);
            }}
          >
            <Text style={[styles.suggestionText, isDark && styles.darkSuggestionText]}>
              What tasks should I focus on today?
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.suggestionChip, isDark && styles.darkSuggestionChip]}
            onPress={() => {
              const text = "Suggest a schedule for my pending tasks";
              setInputText(text);
              
              // We need to manually create and send the message since handleSendMessage relies on inputText state
              const userMessage: Message = {
                id: `user-${Date.now()}`,
                text: text,
                sender: 'user',
                timestamp: new Date()
              };
              
              setMessages(prevMessages => [...prevMessages, userMessage]);
              sendMessageToGemini(text);
            }}
          >
            <Text style={[styles.suggestionText, isDark && styles.darkSuggestionText]}>
              Suggest a schedule for my pending tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.suggestionChip, isDark && styles.darkSuggestionChip]}
            onPress={() => {
              const text = "Help me prioritize my tasks";
              setInputText(text);
              
              // We need to manually create and send the message since handleSendMessage relies on inputText state
              const userMessage: Message = {
                id: `user-${Date.now()}`,
                text: text,
                sender: 'user',
                timestamp: new Date()
              };
              
              setMessages(prevMessages => [...prevMessages, userMessage]);
              sendMessageToGemini(text);
            }}
          >
            <Text style={[styles.suggestionText, isDark && styles.darkSuggestionText]}>
              Help me prioritize my tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.suggestionChip, isDark && styles.darkSuggestionChip]}
            onPress={() => {
              const text = "How can I be more productive?";
              setInputText(text);
              
              // We need to manually create and send the message since handleSendMessage relies on inputText state
              const userMessage: Message = {
                id: `user-${Date.now()}`,
                text: text,
                sender: 'user',
                timestamp: new Date()
              };
              
              setMessages(prevMessages => [...prevMessages, userMessage]);
              sendMessageToGemini(text);
            }}
          >
            <Text style={[styles.suggestionText, isDark && styles.darkSuggestionText]}>
              How can I be more productive?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.suggestionChip, isDark && styles.darkSuggestionChip]}
            onPress={() => {
              const text = "Create a task called Check emails";
              setInputText(text);
              
              // We need to manually create and send the message since handleSendMessage relies on inputText state
              const userMessage: Message = {
                id: `user-${Date.now()}`,
                text: text,
                sender: 'user',
                timestamp: new Date()
              };
              
              setMessages(prevMessages => [...prevMessages, userMessage]);
              // This will be caught by handlePotentialTaskCreation
              handlePotentialTaskCreation(text);
            }}
          >
            <Text style={[styles.suggestionText, isDark && styles.darkSuggestionText]}>
              Create a task
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  darkButton: {
    backgroundColor: '#333',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  
  // Messages container
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  
  // Message bubbles
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 12,
    minHeight: 42,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  darkUserBubble: {
    backgroundColor: '#1976D2',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  darkBotBubble: {
    backgroundColor: '#2C2C2C',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  botTimestamp: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  darkTimestamp: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  
  // Loading indicator
  loadingContainer: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  darkLoadingContainer: {
    backgroundColor: 'transparent',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  darkLoadingIndicator: {
    backgroundColor: '#2C2C2C',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  darkLoadingText: {
    color: '#ccc',
  },
  
  // Input container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  darkInputContainer: {
    backgroundColor: '#1E1E1E',
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  darkInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderColor: '#444',
  },
  sendButton: {
    marginLeft: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    opacity: 0.6,
  },
  poweredByContainer: {
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  darkPoweredByContainer: {
    backgroundColor: '#1A1A1A',
    borderTopColor: '#333',
  },
  poweredByText: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  darkPoweredByText: {
    color: '#888',
  },
  
  // Suggestions
  suggestionsContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  darkSuggestionsContainer: {
    backgroundColor: '#1E1E1E',
    borderTopColor: '#333',
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  suggestionsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  suggestionChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  darkSuggestionChip: {
    backgroundColor: '#333',
  },
  suggestionText: {
    fontSize: 14,
    color: '#2196F3',
  },
  darkSuggestionText: {
    color: '#64B5F6',
  },
});

export default ChatbotScreen; 