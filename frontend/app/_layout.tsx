import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { COLORS } from "../constants/config";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}>
        <Stack.Screen name="index" options={{ title: "Kecálek" }} />
        <Stack.Screen name="player" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
