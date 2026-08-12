import React, { useState } from "react";
import { View, Text } from "@/src/tw";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";
import { KeyboardAvoidingView, Platform } from "react-native";
import { ScrollView } from "@/src/tw";

export default function LoginScreen() {
  const { login, loginWithOTP, error, isLoading, setError } = useAuthStore();
  const [isOTPMode, setIsOTPMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    setError(null);
    let success = false;
    if (isOTPMode) {
      success = await loginWithOTP(email);
    } else {
      success = await login(email, password);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView 
        className="flex-grow bg-background"
        contentContainerClassName="flex-grow justify-center px-6 py-12"
      >
        <View className="gap-8 max-w-md w-full self-center">
          {/* Logo / Brand */}
          <View className="items-center gap-3">
            <View className="w-16 h-16 bg-primary rounded-3xl items-center justify-center">
              <Text className="text-display-small text-on-primary font-bold">SL</Text>
            </View>
            <Text className="text-headline-large text-on-background font-bold tracking-tight">
              ShiftLoom
            </Text>
            <Text className="text-body-medium text-on-surface-variant text-center px-4">
              Configure your shifts and manage workers easily
            </Text>
          </View>

          {/* Form Fields */}
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

            {!isOTPMode && (
              <OutlinedInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                placeholder="Enter your password"
                secureTextEntry
              />
            )}

            {/* Error Message Display */}
            {error ? (
              <Text className="text-label-medium text-error text-center mt-1 px-2 font-medium">
                {error}
              </Text>
            ) : null}
          </View>

          {/* Action buttons */}
          <View className="gap-3 mt-2">
            <PrimaryButton
              label={isOTPMode ? "Send OTP" : "Log In"}
              onPress={handleLogin}
              loading={isLoading}
            />

            <SecondaryButton
              label={isOTPMode ? "Use Password Login" : "Log In with Email OTP"}
              onPress={() => {
                setIsOTPMode(!isOTPMode);
                setError(null);
              }}
            />
          </View>

          {/* Footer Info / Hints */}
          <View className="bg-surface-variant border border-outline rounded-2xl p-4 mt-4">
            <Text className="text-label-medium text-on-surface font-semibold text-center mb-1">
              Developer Login Hints:
            </Text>
            <Text className="text-body-small text-on-surface-variant text-center">
              • Email with "admin" (e.g. admin@shiftloom.com) logs in as **Admin**
            </Text>
            <Text className="text-body-small text-on-surface-variant text-center mt-0.5">
              • Any other email logs in as a standard **User**
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
