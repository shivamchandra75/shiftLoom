import React, { useState } from "react";
import { View, Text  } from "react-native";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";
import {KeyboardAwareScrollView} from "react-native-keyboard-aware-scroll-view"

import { useRouter } from "expo-router";

export default function SignupScreen() {
  const { signup, error, isLoading, setError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleSignup = async () => {
    setError(null);
    if (!email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const success = await signup(email, password);
    if (success) {
      // Upon successful signup:
      // If email confirmation is disabled in Supabase, the user is auto-logged in,
      // and RootLayout's NavigationGuard automatically redirects to tabs/onboarding.
      // If email confirmation is enabled, we notify them.
      alert("Account created successfully! Please verify your email if confirmation is required.");
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-center px-6 py-12"
      keyboardShouldPersistTaps='handled'
      enableOnAndroid={true}
    >
      <View className="gap-8 max-w-md w-full self-center">
        {/* Header */}
        <View className="items-center gap-3">
          <View className="w-16 h-16 bg-primary rounded-3xl items-center justify-center">
            <Text className="text-display-small text-on-primary font-bold">SL</Text>
          </View>
          <Text className="text-headline-large text-on-background font-bold tracking-tight">
            Create Account
          </Text>
          <Text className="text-body-medium text-on-surface-variant text-center px-4">
            Join ShiftLoom to find shifts and manage your schedule
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <OutlinedInput
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
          />

          <OutlinedInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            placeholder="Create a password"
            secureTextEntry
          />

          <OutlinedInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError(null);
            }}
            placeholder="Confirm your password"
            secureTextEntry
          />

          {/* Error Message */}
          {error ? (
            <Text className="text-label-medium text-error text-center mt-1 px-2 font-medium">
              {error}
            </Text>
          ) : null}
        </View>

        {/* Actions */}
        <View className="gap-3 mt-2">
          <PrimaryButton
            label="Sign Up"
            onPress={handleSignup}
            loading={isLoading}
          />

          <SecondaryButton
            label="Already have an account? Log In"
            onPress={() => {
              setError(null);
              router.replace("/(auth)/login");
            }}
          />
        </View>
      </View>

    </KeyboardAwareScrollView>
  );
}
