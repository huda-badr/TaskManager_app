import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getDatabase, ref, onValue, get, serverTimestamp, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: "https://taskmanagerapp-b2bc7-default-rtdb.firebaseio.com" // Hardcoded for testing
};

// Initialize Firebase - check if it's already initialized
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // If already initialized, use that one
}

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Realtime Database
const rtdb = getDatabase(app);

// Test Realtime Database connection
const testRTDBConnection = async () => {
  try {
    // Check if user is authenticated
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('RTDB Connection Test: FAIL ❌ - No authenticated user');
      return false;
    }

    // First try the test path which is allowed in rules
    try {
      // Try to write to a diagnostic location
      const testRef = ref(rtdb, 'test/connection_test');
      await set(testRef, {
        timestamp: new Date().toISOString(),
        userId: userId,
        status: 'connected'
      });
      
      // Try to read from the same location
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        console.log('RTDB Test Path: SUCCESS ✅ - Read/write working properly');
      } else {
        console.error('RTDB Test Path: FAIL ❌ - Write succeeded but read failed');
        return false;
      }
    } catch (error) {
      console.error('RTDB Test Path Error:', error);
      return false;
    }
    
    // Now try the user-specific path
    try {
      const userTestRef = ref(rtdb, `users/${userId}/connection_test`);
      await set(userTestRef, {
        timestamp: new Date().toISOString(),
        status: 'connected'
      });
      
      // Try to read from the same location
      const userSnapshot = await get(userTestRef);
      if (userSnapshot.exists()) {
        console.log('RTDB User Path: SUCCESS ✅ - Read/write working properly');
        return true;
      } else {
        console.error('RTDB User Path: FAIL ❌ - Write succeeded but read failed');
        return false;
      }
    } catch (error) {
      console.error('RTDB User Path Error:', error);
      return false;
    }
  } catch (error) {
    console.error('RTDB Connection Test: ERROR ❌ - Failed to connect to Realtime Database:', error);
    return false;
  }
};

// Setup connection monitoring
const setupConnectionMonitoring = () => {
  const connectedRef = ref(rtdb, '.info/connected');
  
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      console.log('RTDB: Connected to Firebase Realtime Database ✓');
    } else {
      console.warn('RTDB: Disconnected from Firebase Realtime Database ✗');
    }
  });
};

// Run the connection test after a short delay to make sure auth is initialized
setTimeout(() => {
  if (auth.currentUser?.uid) {
    console.log('Running initial RTDB connection test...');
    testRTDBConnection().then(isConnected => {
      if (isConnected) {
        setupConnectionMonitoring();
      } else {
        console.error('Failed to establish initial connection to Realtime Database.');
      }
    });
  } else {
    console.log('Skipping initial RTDB connection test - no user signed in');
  }
}, 2000);

// Try to enable offline persistence if not already enabled
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('The current browser doesn\'t support persistence');
    }
  });
} catch (error) {
  console.log('IndexedDB persistence already enabled or error:', error);
}

export { auth, db, rtdb, testRTDBConnection };
export default app;