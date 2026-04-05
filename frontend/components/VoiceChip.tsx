import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS, VOICES } from "../constants/config";

type Props = {
  voice: (typeof VOICES)[0];
  selected: boolean;
  onPress: () => void;
};

export default function VoiceChip({ voice, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
        {voice.accent} {voice.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  unselected: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
  },
  label: {
    fontSize: 13,
  },
  labelSelected: {
    color: COLORS.text,
    fontWeight: "600",
  },
  labelUnselected: {
    color: COLORS.textMuted,
  },
});
