import { View, PanResponder, StyleSheet } from "react-native";
import { useRef } from "react";
import { COLORS } from "../constants/config";

type Props = {
  value: number;        // 0 až 1
  onSeek: (ratio: number) => void;
};

export function ProgressBar({ value, onSeek }: Props) {
  const barWidth = useRef(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (barWidth.current === 0) return;
      const ratio = Math.max(0, Math.min(1,
        e.nativeEvent.locationX / barWidth.current
      ));
      onSeek(ratio);
    },
    onPanResponderMove: (e) => {
      if (barWidth.current === 0) return;
      const ratio = Math.max(0, Math.min(1,
        e.nativeEvent.locationX / barWidth.current
      ));
      onSeek(ratio);
    },
  });

  return (
    <View
      style={styles.container}
      onLayout={(e) => { barWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
        <View style={[styles.thumb, { left: `${Math.max(0, Math.min(1, value)) * 100}%` as any }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  track: {
    height: 3,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    position: "relative",
  },
  fill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    top: -5.5,
    marginLeft: -7,
  },
});
