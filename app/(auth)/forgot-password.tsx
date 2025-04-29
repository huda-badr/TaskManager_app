import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/config/firebase";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme, currentThemeColors } = useTheme();
  const isDark = theme === 'dark';

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Validate email format using a simple regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password Reset Email Sent", 
        "Check your email for instructions to reset your password.",
        [{ text: "OK", onPress: () => router.push("/(auth)/login") }]
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      // Handle different Firebase auth error codes
      let errorMessage = "Failed to send password reset email. Please try again.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "The email address is not valid.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Text style={[styles.title, { color: currentThemeColors.text }]}>Forgot Password</Text>
      <Text style={[styles.subtitle, { color: currentThemeColors.text }]}>
        Enter your email address and we'll send you a link to reset your password.
      </Text>
      
      <TextInput
        style={[
          styles.input, 
          { 
            borderColor: currentThemeColors.border || '#ddd',
            backgroundColor: isDark ? '#1E1E1E' : '#fff',
            color: currentThemeColors.text 
          }
        ]}
        placeholder="Enter your email"
        placeholderTextColor={isDark ? "#aaa" : "#666"}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isLoading}
      />
      
      <TouchableOpacity 
        style={[
          styles.resetButton, 
          { backgroundColor: currentThemeColors.primary },
          isLoading && { opacity: 0.7 }
        ]} 
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={isDark ? currentThemeColors.background : '#000000'} />
        ) : (
          <Text style={[styles.resetButtonText, { color: isDark ? currentThemeColors.background : '#000000' }]}>
            Reset Password
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.backToLogin}
        onPress={() => router.push("/(auth)/login")}
      >
        <Text style={[styles.backToLoginText, { color: currentThemeColors.primary }]}>
          Back to Login
        </Text>
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
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
  resetButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  backToLogin: {
    marginTop: 20,
    padding: 10,
  },
  backToLoginText: {
    fontSize: 16,
  }
});