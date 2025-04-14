import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function AppLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
        },
        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="create-task"
        options={{
          title: 'Create Task',
        }}
      />
      <Stack.Screen
        name="create-recurring-task"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="pomodoro"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="store"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="chatbot"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 