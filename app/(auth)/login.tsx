import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { router } from "expo-router";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }
    
    setLoading(true);
    
    try {
      // Sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Check if user document exists
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userDocRef, {
          email: email,
          createdAt: Timestamp.now(),
          stats: {
            totalTasks: 0,
            completedTasks: 0,
            currentStreak: 0,
            longestStreak: 0,
            points: 0
          },
          settings: {
            theme: 'light',
            notifications: true,
            soundEffects: true
          }
        });
      }
      
      // Navigate to home screen
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Error", error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Text style={[styles.title, { color: currentThemeColors.text }]}>Welcome Back!</Text>
      <TextInput
        style={[
          styles.input, 
          { 
            borderColor: currentThemeColors.border || '#ddd',
            backgroundColor: isDark ? '#1E1E1E' : '#fff',
            color: currentThemeColors.text 
          }
        ]}
        placeholder="Email"
        placeholderTextColor={isDark ? "#aaa" : "#666"}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[
          styles.input, 
          { 
            borderColor: currentThemeColors.border || '#ddd',
            backgroundColor: isDark ? '#1E1E1E' : '#fff',
            color: currentThemeColors.text 
          }
        ]}
        placeholder="Password"
        placeholderTextColor={isDark ? "#aaa" : "#666"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity 
        style={[
          styles.loginButton, 
          { backgroundColor: currentThemeColors.primary }
        ]} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={currentThemeColors.background} />
        ) : (
          <Text style={[styles.loginButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>Login</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
        <Text style={[styles.forgotPasswordText, { color: currentThemeColors.primary }]}>Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
        <Text style={[styles.signupButtonText, { color: currentThemeColors.primary }]}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
  },
});