import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/config";

type Props = {
  visible: boolean;
  message: string;
};

export default function ProcessingOverlay({ visible, message }: Props) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,15,35,0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  message: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 8,
  },
});
