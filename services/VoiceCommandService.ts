import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Task } from '@/types';

// Mock API endpoint - in a real app, this would be a speech-to-text service endpoint
const VOICE_API_ENDPOINT = 'https://api.example.com/voice-to-text';

interface VoiceRecognitionResult {
  text: string;
  confidence: number;
}

class VoiceCommandService {
  private recording: Audio.Recording | null = null;
  private audioUri: string | null = null;

  // Start recording voice
  async startRecording(): Promise<void> {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      throw err;
    }
  }

  // Stop recording and process the voice command
  async stopRecording(): Promise<VoiceRecognitionResult> {
    console.log('Stopping recording..');
    if (!this.recording) {
      throw new Error('No active recording found');
    }
    
    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.audioUri = uri;
    this.recording = null;
    
    if (!uri) {
      throw new Error('Recording failed to save');
    }
    
    console.log('Recording stopped and stored at', uri);
    
    // Process the voice command
    return this.processVoiceCommand(uri);
  }

  // Process the voice recording - in a real app, this would send the audio to a speech-to-text API
  private async processVoiceCommand(audioUri: string): Promise<VoiceRecognitionResult> {
    try {
      console.log('Processing voice command...');
      
      // In a real implementation, we would upload the audio file to a speech-to-text API
      // This is a mock implementation for demonstration purposes
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, we'll return a mock result
      return {
        text: "Add a task to buy groceries tomorrow with high priority",
        confidence: 0.95
      };
      
      /* Real implementation would look like this:
      
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file not found');
      }
      
      // Create form data for the API request
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      
      // Send the audio to the speech-to-text API
      const response = await fetch(VOICE_API_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
      */
      
    } catch (error) {
      console.error('Error processing voice command:', error);
      throw error;
    }
  }

  // Parse the recognized text into a task object
  parseTaskFromVoiceCommand(text: string): Partial<Task> | null {
    try {
      console.log('Parsing voice command:', text);
      
      // Example command: "Add a task to buy groceries tomorrow with high priority"
      // Simple parsing logic - in a real app, this would use NLP or AI
      
      const lowercaseText = text.toLowerCase();
      
      // Extract task title (assuming it comes after "to" or "called")
      let title = '';
      const toMatch = lowercaseText.match(/(?:to|called)\s+(.*?)(?:with|tomorrow|today|on|by|$)/);
      if (toMatch && toMatch[1]) {
        title = toMatch[1].trim();
      } else {
        // Fallback - try to get text after "task" or "add"
        const taskMatch = lowercaseText.match(/(?:task|add)\s+(.*?)(?:with|tomorrow|today|on|by|$)/);
        if (taskMatch && taskMatch[1]) {
          title = taskMatch[1].trim();
        }
      }
      
      if (!title) return null;
      
      // Extract priority
      let priority: 'low' | 'medium' | 'high' = 'medium';
      if (lowercaseText.includes('high priority')) {
        priority = 'high';
      } else if (lowercaseText.includes('low priority')) {
        priority = 'low';
      }
      
      // Extract due date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      
      let dueDate = tomorrow;
      if (lowercaseText.includes('today')) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        dueDate = today;
      }
      
      return {
        title,
        description: `Created via voice command: "${text}"`,
        priority,
        dueDate,
        completed: false,
      };
    } catch (error) {
      console.error('Error parsing voice command:', error);
      return null;
    }
  }

  // Clean up resources
  cleanUp() {
    if (this.audioUri) {
      FileSystem.deleteAsync(this.audioUri).catch(error => 
        console.error('Error cleaning up audio file:', error)
      );
    }
  }
}

export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService; 