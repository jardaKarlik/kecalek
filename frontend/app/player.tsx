import Slider from "@react-native-community/slider";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/config";
import { usePlayer } from "../lib/player";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function PlayerScreen() {
  const params = useLocalSearchParams<{
    audioUrl: string;
    title: string;
    siteName: string;
    byline: string;
    naturalText: string;
  }>();

  const player = usePlayer();
  const [speed, setSpeed] = useState(1);

  const audioUrl: string | string[] = params.audioUrl ? JSON.parse(params.audioUrl) : "";
  const title = params.title ?? "Article";
  const siteName = params.siteName ?? "";
  const byline = params.byline ?? "";
  const naturalText = params.naturalText ?? "";

  useEffect(() => {
    if (audioUrl) {
      player.loadAndPlay(audioUrl, title);
    }
    return () => {
      player.stop();
    };
  }, []);

  async function handleSpeedChange(rate: number) {
    setSpeed(rate);
    await player.setRate(rate);
  }

  const progress =
    player.durationMs > 0 ? player.positionMs / player.durationMs : 0;

  return (
    <SafeAreaView style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerSite} numberOfLines={1}>
          {siteName || "Article"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* TITLE */}
      <View style={styles.titleSection}>
        <Text style={styles.title} numberOfLines={3}>{title}</Text>
        {!!byline && <Text style={styles.byline}>{byline}</Text>}
      </View>

      {/* COVER ART */}
      <View style={styles.coverContainer}>
        <View style={styles.cover}>
          <Text style={styles.coverEmoji}>🎧</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI Enhanced</Text>
          </View>
        </View>
      </View>

      {/* PROGRESS */}
      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          value={progress}
          onSlidingComplete={(val) => player.seekTo(val)}
          minimumTrackTintColor={COLORS.accent}
          maximumTrackTintColor={COLORS.cardBorder}
          thumbTintColor={COLORS.accent}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(player.positionMs)}</Text>
          <Text style={styles.timeText}>{formatTime(player.durationMs)}</Text>
        </View>
        {player.totalChunks > 1 && (
          <View style={{ flexDirection: "row", justifyContent: "center",
                         alignItems: "center", gap: 8, marginTop: 8 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              Part {player.chunkIndex + 1} / {player.totalChunks}
            </Text>
            {Array.from({ length: player.totalChunks }).map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => player.goToChunk(i)}
                style={{
                  width: i === player.chunkIndex ? 16 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === player.chunkIndex
                    ? COLORS.accent : COLORS.cardBorder,
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* CONTROLS */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => player.seekBy(-15000)} style={styles.seekBtn}>
          <Text style={styles.seekBtnText}>−15s</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => player.seekBy(-60000)} style={styles.seekBtn}>
          <Text style={styles.seekBtnText}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={player.togglePlay} style={styles.playBtn}>
          {player.isLoading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.playBtnText}>{player.isPlaying ? "⏸" : "▶"}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => player.seekBy(60000)} style={styles.seekBtn}>
          <Text style={styles.seekBtnText}>⏭</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => player.seekBy(30000)} style={styles.seekBtn}>
          <Text style={styles.seekBtnText}>+30s</Text>
        </TouchableOpacity>
      </View>

      {/* SPEED */}
      <View style={styles.speedRow}>
        {SPEEDS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => handleSpeedChange(s)}
            style={[styles.speedChip, speed === s && styles.speedChipSelected]}
          >
            <Text style={[styles.speedText, speed === s && styles.speedTextSelected]}>
              {s}×
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TRANSCRIPT */}
      <View style={styles.transcript}>
        <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.transcriptText}>{naturalText}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    color: COLORS.text,
    fontSize: 22,
  },
  headerSite: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "500",
  },
  byline: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
  },
  coverContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  cover: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: COLORS.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 64,
  },
  badge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.success + "33",
  },
  badgeText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "600",
  },
  progressSection: {
    paddingHorizontal: 16,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
    paddingHorizontal: 4,
  },
  timeText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    gap: 12,
  },
  seekBtn: {
    padding: 10,
  },
  seekBtnText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnText: {
    color: COLORS.text,
    fontSize: 28,
  },
  speedRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  speedChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
  },
  speedChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  speedText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  speedTextSelected: {
    color: COLORS.text,
    fontWeight: "600",
  },
  transcript: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  transcriptLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  transcriptText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
});
