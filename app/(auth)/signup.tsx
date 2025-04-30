import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { AchievementManager } from '@/app/services/AchievementManager';
import { doc, setDoc, Timestamp } from "firebase/firestore";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userId);
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

      // Initialize achievements in Realtime Database
      await AchievementManager.initializeAllAchievementsForUser(userId);
      
      console.log("User created and achievements initialized successfully");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Text style={[styles.title, { color: currentThemeColors.text }]}>Create Account</Text>
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
        editable={!isSubmitting}
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
        editable={!isSubmitting}
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
        placeholder="Confirm Password"
        placeholderTextColor={isDark ? "#aaa" : "#666"}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!isSubmitting}
      />
      <TouchableOpacity 
        style={[
          styles.signupButton, 
          { backgroundColor: currentThemeColors.primary }
        ]} 
        onPress={handleSignUp}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={isDark ? currentThemeColors.background : '#000000'} />
        ) : (
          <Text style={[styles.signupButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>Sign Up</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(auth)/login")} disabled={isSubmitting}>
        <Text style={[styles.loginButtonText, { color: currentThemeColors.primary }]}>Already have an account? Login</Text>
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
  signupButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
  },
});