import React from 'react';
import { View, Text } from 'react-native';

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-background p-6">
      <Text className="text-body-large text-on-surface-variant">No new notifications</Text>
    </View>
  );
}
