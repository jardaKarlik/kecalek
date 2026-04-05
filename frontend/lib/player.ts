import { useEffect, useRef, useState } from "react";
import {
  Audio,
  AVPlaybackStatus,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";

Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  shouldPlayThroughEarpieceAndroid: false,
});

export function usePlayer() {
  const playerRef = useRef<Audio.Sound | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef<number>(0);
  const rateRef = useRef<number>(1.0);
  const isPlayingRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [currentTitle, setCurrentTitle] = useState("");
  const [chunkIndex, setChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function getStatus(): Promise<AVPlaybackStatus | null> {
    try {
      return playerRef.current ? await playerRef.current.getStatusAsync() : null;
    } catch {
      return null;
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const status = await getStatus();
      if (!status || !status.isLoaded) return;

      const playing = status.isPlaying;
      isPlayingRef.current = playing;
      setIsPlaying(playing);
      setPositionMs(status.positionMillis ?? 0);
      setDurationMs(status.durationMillis ?? 0);

      if (status.didJustFinish && !status.isLooping) {
        const nextIndex = chunkIndexRef.current + 1;
        if (nextIndex < chunksRef.current.length) {
          _loadChunk(chunksRef.current[nextIndex], nextIndex, true);
        } else {
          stopPolling();
          setIsPlaying(false);
          setPositionMs(0);
          chunkIndexRef.current = 0;
          setChunkIndex(0);
        }
      }
    }, 500);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function unloadCurrent() {
    if (!playerRef.current) return;
    try {
      await playerRef.current.unloadAsync();
    } catch {
      // ignore
    }
    playerRef.current = null;
  }

  async function _loadChunk(url: string, index: number, autoPlay: boolean) {
    setIsLoading(true);
    setPositionMs(0);
    setDurationMs(0);

    await unloadCurrent();

    chunkIndexRef.current = index;
    setChunkIndex(index);

    const player = new Audio.Sound();
    playerRef.current = player;

    const status = await player.loadAsync(
      { uri: url },
      {
        shouldPlay: autoPlay,
        rate: rateRef.current,
        shouldCorrectPitch: true,
      },
      false
    );

    setPositionMs(status.positionMillis ?? 0);
    setDurationMs(status.durationMillis ?? 0);
    const playing = status.isPlaying ?? false;
    isPlayingRef.current = playing;
    setIsPlaying(playing);
    setIsLoading(false);
    startPolling();
  }

  async function loadAndPlay(audioUrl: string | string[], title: string) {
    const urls = Array.isArray(audioUrl) ? audioUrl : [audioUrl];
    chunksRef.current = urls;
    setTotalChunks(urls.length);
    setCurrentTitle(title);
    await _loadChunk(urls[0], 0, true);
  }

  async function togglePlay() {
    const player = playerRef.current;
    if (!player) return;

    const status = await getStatus();
    if (!status || !status.isLoaded) return;

    if (status.isPlaying) {
      await player.pauseAsync();
      setIsPlaying(false);
    } else {
      await player.playAsync();
      setIsPlaying(true);
    }
  }

  async function seekBy(ms: number) {
    const player = playerRef.current;
    if (!player) return;

    const status = await getStatus();
    if (!status || !status.isLoaded || status.durationMillis == null) return;

    const next = Math.max(0, Math.min(status.positionMillis + ms, status.durationMillis));
    await player.setPositionAsync(next);
  }

  async function seekTo(ratio: number) {
    const player = playerRef.current;
    if (!player) return;

    const status = await getStatus();
    if (!status || !status.isLoaded || status.durationMillis == null) return;

    await player.setPositionAsync(Math.floor(ratio * status.durationMillis));
  }

  async function goToChunk(index: number) {
    if (index < 0 || index >= chunksRef.current.length) return;
    await _loadChunk(chunksRef.current[index], index, isPlayingRef.current);
  }

  async function setRate(rate: number) {
    rateRef.current = rate;
    if (!playerRef.current) return;
    try {
      await playerRef.current.setRateAsync(rate, true);
    } catch {
      // ignore
    }
  }

  async function stop() {
    stopPolling();
    if (playerRef.current) {
      try {
        await playerRef.current.stopAsync();
        await playerRef.current.unloadAsync();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
    setPositionMs(0);
    setDurationMs(0);
    chunkIndexRef.current = 0;
    setChunkIndex(0);
  }

  useEffect(() => {
    return () => {
      void stop();
    };
  }, []);

  return {
    isPlaying,
    isLoading,
    positionMs,
    durationMs,
    currentTitle,
    chunkIndex,
    totalChunks,
    loadAndPlay,
    togglePlay,
    seekBy,
    seekTo,
    goToChunk,
    setRate,
    stop,
  };
}
