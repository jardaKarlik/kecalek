import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/config";
import { RecentItem } from "../lib/useRecentItems";

type Props = {
  item: RecentItem;
  onPress: () => void;
  onLongPress: () => void;
};

function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return `${diffD} days ago`;
}

export default function RecentItemCard({ item, onPress, onLongPress }: Props) {
  const isUrl = item.source === "url";
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconCircle, { backgroundColor: isUrl ? COLORS.accentDark : COLORS.success + "33" }]}>
        <Text style={styles.iconText}>{isUrl ? "🔗" : "📄"}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.siteName ?? item.originalInput}
        </Text>
        <Text style={styles.time}>{relativeTime(item.timestamp)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  sub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  time: {
    color: COLORS.textDim,
    fontSize: 11,
  },
});
