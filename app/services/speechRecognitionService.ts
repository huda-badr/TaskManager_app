// Speech recognition service using Wit.ai (free speech-to-text API)
import { WIT_AI_TOKEN } from '@/config/keys';
import * as FileSystem from 'expo-file-system';

/**
 * Transcribe audio to text using Wit.ai's free speech-to-text API
 * 
 * @param audioUri URI of the recorded audio file
 * @returns Transcribed text or error message
 */
export const transcribeAudio = async (audioUri: string): Promise<string> => {
  // Check if token is available
  if (!WIT_AI_TOKEN) {
    console.log('No Wit.ai token provided for speech recognition');
    throw new Error('MISSING_API_KEY');
  }
  
  try {
    console.log('Starting transcription for audio file:', audioUri);
    
    // For debugging, log file info
    try {
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('File info:', fileInfo);
    } catch (e) {
      console.log('Could not get file info');
    }
    
    // Use Expo FileSystem for direct upload instead of FormData
    const response = await FileSystem.uploadAsync(
      'https://api.wit.ai/speech',
      audioUri,
      {
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        fieldName: 'file',
        mimeType: 'audio/wav',
        parameters: {
          v: '20230215' // API version
        },
        headers: {
          'Authorization': `Bearer ${WIT_AI_TOKEN}`,
          'Content-Type': 'audio/wav',
        }
      }
    );
    
    console.log('Transcription response status:', response.status);
    
    // Check for errors
    if (response.status !== 200) {
      console.error('API Response error:', response.body);
      if (response.status === 401) {
        throw new Error('AUTHENTICATION_ERROR');
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    // Debug: Log the raw response body
    console.log('Raw response body:', response.body);
    
    // Handle the specific Wit.ai response format (multiple JSON objects)
    let extractedText = "";
    
    // Try to parse each JSON object separately
    if (typeof response.body === 'string') {
      try {
        // Split by closing and opening braces with potential whitespace between them
        const jsonObjects = response.body.split(/}\s*{/);
        
        for (let i = 0; i < jsonObjects.length; i++) {
          // Add back the braces except for the first and last object
          let jsonStr = jsonObjects[i];
          if (i > 0) jsonStr = '{' + jsonStr;
          if (i < jsonObjects.length - 1) jsonStr = jsonStr + '}';
          
          try {
            const obj = JSON.parse(jsonStr);
            if (obj && obj.text !== undefined) {
              if (obj.text) {
                extractedText = obj.text;
                console.log('Found text in JSON object:', extractedText);
              }
            }
          } catch (e) {
            console.log('Could not parse individual JSON object:', e);
          }
        }
      } catch (e) {
        console.log('Error processing multiple JSON objects:', e);
      }
    }
    
    if (extractedText) {
      return extractedText;
    }
    
    // If we couldn't extract any text, try simpler methods
    try {
      // Use regex to find all text fields
      const textMatches = response.body.match(/"text"\s*:\s*"([^"]*)"/g);
      if (textMatches && textMatches.length > 0) {
        // Look for non-empty text
        for (const match of textMatches) {
          const textContent = match.match(/"text"\s*:\s*"([^"]*)"/);
          if (textContent && textContent[1] && textContent[1].trim()) {
            extractedText = textContent[1];
            console.log('Extracted text via regex:', extractedText);
            return extractedText;
          }
        }
      }
    } catch (e) {
      console.log('Error in regex extraction:', e);
    }
    
    // If we got here, no text was found in the response
    console.log('No speech detected or empty transcription returned');
    return "I couldn't hear what you said. Please try again or speak more clearly.";
    
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Check specific error types
    if (error instanceof Error) {
      if (error.message === 'AUTHENTICATION_ERROR') {
        throw error;
      }
    }
    
    // Generic error
    throw new Error('TRANSCRIPTION_FAILED');
  }
};

export default { transcribeAudio };