import { Stack } from "expo-router";
import { COLORS } from "../constants/config";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Kecálek" }} />
      <Stack.Screen name="player" options={{ headerShown: false }} />
    </Stack>
  );
}
