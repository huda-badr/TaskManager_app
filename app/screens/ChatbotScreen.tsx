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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { AchievementManager } from '../services/AchievementManager';

// Message types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// Sample welcome messages
const welcomeMessages = [
  "Hello! I'm TaskGenius AI, your personal productivity assistant. I can now see your tasks and help you organize them into an effective schedule. Try asking me to create a schedule for your pending tasks based on their deadlines and priorities. I can also suggest the best time blocks for focused work and breaks throughout your day!",
];

const ChatbotScreen = () => {
  const { theme, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Voice recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Get tasks from the task context
  const { tasks, addTask } = useTaskContext();
  
  // Voice recording functions
  const startRecording = async () => {
    try {
      // Request permissions if we don't have them yet
      if (hasPermission !== true) {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant microphone permissions to use voice commands'
          );
          return;
        }
      }
      
      setIsRecording(true);
      
      // Prepare the recorder
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      
      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start voice recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      setIsTranscribing(true);
      
      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      
      // Get the recording URI
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);
      
      // In a real implementation, we would send this audio file to a speech-to-text service
      // Since we don't have a working speech recognition service at the moment,
      // we'll fall back to a manual input prompt
      simulateSpeechToText();
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process voice recording');
      setIsTranscribing(false);
    } finally {
      setRecording(null);
    }
  };
  
  // Simulate speech-to-text conversion with user input
  const simulateSpeechToText = () => {
    // Display a more clear message explaining what's happening
    Alert.prompt(
      'Voice Input',
      'Please type what you just said into the microphone. This will be sent to the chatbot.',
      [
        {
          text: 'Cancel',
          onPress: () => {
            setIsTranscribing(false);
          },
          style: 'cancel'
        },
        {
          text: 'Send to Chatbot',
          onPress: (text = '') => {
            if (text.trim() !== '') {
              setTranscribedText(text);
              setIsTranscribing(false);
              
              // Update the voice command usage achievement
              AchievementManager.updateVoiceCommandAchievement();
              
              // Process the command immediately
              handleVoiceCommand(text);
              
              // Show a short toast or feedback that the message was sent
              console.log('Voice input sent to chatbot:', text);
            } else {
              setIsTranscribing(false);
              Alert.alert('Error', 'Please enter some text or try again.');
            }
          }
        }
      ],
      'plain-text',
      '' // Default input text
    );
  };

  const handleVoiceCommand = (text: string) => {
    // Create and add the user message
    const userMessage: Message = {
      id: `user-voice-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Check if this is a task creation request
    const isTaskCreation = handlePotentialTaskCreation(text);
    
    // Only send to Gemini if not a direct task creation
    if (!isTaskCreation) {
      sendMessageToGemini(text);
    }
  };

  // Initialize with welcome message
  useEffect(() => {
    const initialMessages = welcomeMessages.map((text, index) => ({
      id: `welcome-${index}`,
      text,
      sender: 'bot' as const,
      timestamp: new Date(Date.now() + index * 500) // Stagger timestamps slightly
    }));
    
    setMessages(initialMessages);
    
    // Request audio recording permissions
    const getPermission = async () => {
      console.log('Requesting microphone permissions');
      try {
        const { status } = await Audio.requestPermissionsAsync();
        console.log('Microphone permission status:', status);
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            'Microphone Permission Required',
            'Voice commands need microphone access. Please grant permission in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Request Again', 
                onPress: () => getPermission() 
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting microphone permission:', error);
      }
    };
    
    // Run setup
    getPermission();
    
    // Cleanup function
    return () => {
      // Reset chat history
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
        
        // Ask for confirmation before redirecting to the task creation form
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
              onPress: async () => {
                // Store the task title in AsyncStorage so the form can use it
                await AsyncStorage.setItem('chatbot_task_title', taskTitle);
                
                // Add a message indicating we're redirecting to the form
                const redirectMessage: Message = {
                  id: `system-${Date.now()}`,
                  text: `Taking you to the task creation form to create "${taskTitle}"...`,
                  sender: 'bot',
                  timestamp: new Date()
                };
                
                setMessages(prevMessages => [...prevMessages, redirectMessage]);
                
                // Short delay before navigation for better UX
                setTimeout(() => {
                  // Navigate to the task creation form
                  router.push("/(app)/create-task");
                }, 800);
              }
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
        isUserMessage ? 
          { backgroundColor: currentThemeColors.primary, borderBottomRightRadius: 4 } : 
          { backgroundColor: currentThemeColors.buttonSecondary, borderBottomLeftRadius: 4 },
        { alignSelf: isUserMessage ? 'flex-end' : 'flex-start' }
      ]}>
        <Text style={[

          styles.messageText,
          { 
            color: isUserMessage ? 
              (isDark ? currentThemeColors.background : '#000000') : 
              // Changed the task description text color to be more visible
              isDark ? '#E0E0E0' : currentThemeColors.text 
          }
        ]}>
          {message.text}
        </Text>
        <Text style={[

          styles.timestamp,
          { 
            color: isUserMessage ? 
              (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)') : 
              currentThemeColors.secondary 
          }
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
      <View style={styles.loadingContainer}>
        <View style={[

          styles.loadingIndicator,
          { backgroundColor: currentThemeColors.buttonSecondary }
        ]}>
          <ActivityIndicator size="small" color={currentThemeColors.primary} />
          <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>Thinking...</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: currentThemeColors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[

        styles.header, 
        { 
          backgroundColor: currentThemeColors.background,
          borderBottomColor: currentThemeColors.border 
        }
      ]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, { backgroundColor: currentThemeColors.buttonSecondary }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentThemeColors.primary }]}>TaskGenius AI</Text>
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

      <View style={[

        styles.poweredByContainer, 
        { 
          backgroundColor: currentThemeColors.buttonSecondary,
          borderTopColor: currentThemeColors.border 
        }
      ]}>
        <Text style={[styles.poweredByText, { color: currentThemeColors.secondary }]}>
          Powered by Google Gemini
        </Text>
      </View>

      <View style={[

        styles.inputContainer, 
        { 
          backgroundColor: currentThemeColors.background,
          borderTopColor: currentThemeColors.border 
        }
      ]}>
        <TextInput
          style={[

            styles.input, 
            { 
              backgroundColor: currentThemeColors.buttonSecondary,
              color: currentThemeColors.text 
            }
          ]}
          placeholder="Type a message..."
          placeholderTextColor={isDark ? "#888" : "#999"}
          value={inputText}
          onChangeText={setInputText}
          multiline
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        
        {/* Voice Recording Button */}
        <TouchableOpacity 
          style={[

            styles.voiceButton,
            isRecording ? { backgroundColor: currentThemeColors.error } : { backgroundColor: currentThemeColors.buttonSecondary }
          ]}
          onPress={() => {
            if (!isRecording) {
              startRecording();
            } else {
              stopRecording();
            }
          }}
          disabled={isTranscribing}
        >
          {isTranscribing ? (
            <ActivityIndicator size="small" color={currentThemeColors.text} />
          ) : (
            <MaterialIcons
              name={isRecording ? "mic" : "mic-none"}
              size={24}
              color={isRecording ? "#FFFFFF" : currentThemeColors.primary}
            />
          )}
        </TouchableOpacity>
        
        {/* Send Button */}
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={handleSendMessage}
          disabled={inputText.trim() === ''}
        >
          <MaterialIcons
            name="send"
            size={24}
            color={inputText.trim() === '' ? currentThemeColors.buttonSecondary : currentThemeColors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Suggested questions */}
      <View style={[

        styles.suggestionsContainer, 
        { 
          backgroundColor: currentThemeColors.background,
          borderTopColor: currentThemeColors.border 
        }
      ]}>
        <Text style={[styles.suggestionsTitle, { color: currentThemeColors.text }]}>Try asking:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
          <TouchableOpacity 
            style={[styles.suggestionChip, { backgroundColor: currentThemeColors.buttonSecondary }]}
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
            <Text style={[styles.suggestionText, { color: currentThemeColors.primary }]}>
              What tasks should I focus on today?
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.suggestionChip, { backgroundColor: currentThemeColors.buttonSecondary }]}
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
            <Text style={[styles.suggestionText, { color: currentThemeColors.primary }]}>
              Suggest a schedule for my pending tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.suggestionChip, { backgroundColor: currentThemeColors.buttonSecondary }]}
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
            <Text style={[styles.suggestionText, { color: currentThemeColors.primary }]}>
              Help me prioritize my tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.suggestionChip, { backgroundColor: currentThemeColors.buttonSecondary }]}
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
            <Text style={[styles.suggestionText, { color: currentThemeColors.primary }]}>
              How can I be more productive?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.suggestionChip, { backgroundColor: currentThemeColors.buttonSecondary }]}
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
            <Text style={[styles.suggestionText, { color: currentThemeColors.primary }]}>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
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
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  
  // Loading indicator
  loadingContainer: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Input container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  voiceButton: {
    marginLeft: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    marginLeft: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poweredByContainer: {
    paddingVertical: 4,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  poweredByText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  // Suggestions
  suggestionsContainer: {
    padding: 12,
    borderTopWidth: 1,
  },
  suggestionsTitle: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  suggestionsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
  },
});

export default ChatbotScreen;