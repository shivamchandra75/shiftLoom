import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";

import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function LoginScreen() {
  const { login, loginWithOTP, error, isLoading, setError } = useAuthStore();
  const [isOTPMode, setIsOTPMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

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
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-center px-6 py-12"
      keyboardShouldPersistTaps='handled'
      enableOnAndroid={true}
    >
      <View className="gap-8 max-w-md w-full self-center">
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

          <Pressable
            onPress={() => {
              setError(null);
              router.replace("/(auth)/signup");
            }}
            className="items-center mt-2"
          >
            <Text className="text-body-medium text-primary font-bold">
              Don't have an account? Sign Up
            </Text>
          </Pressable>
        </View>

      </View>
    </KeyboardAwareScrollView>

  );
}
