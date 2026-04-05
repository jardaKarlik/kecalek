import { useEffect, useRef, useState } from "react";
import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
} from "expo-audio";

// Nastav audio mode jednou globálně
setAudioModeAsync({
  shouldPlayInBackground: true,
  playsInSilentMode: true,
  interruptionMode: "duckOthers",
  shouldRouteThroughEarpiece: false,
});

export function usePlayer() {
  const playerRef      = useRef<AudioPlayer | null>(null);
  const chunksRef      = useRef<string[]>([]);
  const chunkIndexRef  = useRef<number>(0);
  const rateRef        = useRef<number>(1.0);
  const isPlayingRef   = useRef<boolean>(false);

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [positionMs,   setPositionMs]   = useState(0);
  const [durationMs,   setDurationMs]   = useState(0);
  const [currentTitle, setCurrentTitle] = useState("");
  const [chunkIndex,   setChunkIndex]   = useState(0);
  const [totalChunks,  setTotalChunks]  = useState(0);

  // Polling pro position update (expo-audio nemá onPlaybackStatusUpdate)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        setPositionMs(Math.round(p.currentTime * 1000));
        setDurationMs(Math.round((p.duration ?? 0) * 1000));
        const playing = p.playing;
        isPlayingRef.current = playing;
        setIsPlaying(playing);

        // Auto-advance: přehráno do konce
        if (p.currentTime > 0 && p.duration > 0 &&
            p.currentTime >= p.duration - 0.3 && !playing) {
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
      } catch (_) {}
    }, 500);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function _loadChunk(url: string, index: number, autoPlay: boolean) {
    setIsLoading(true);
    setPositionMs(0);
    setDurationMs(0);

    // Zruš starý player
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch (_) {}
      playerRef.current = null;
    }

    chunkIndexRef.current = index;
    setChunkIndex(index);

    // Vytvoř nový player
    const player = createAudioPlayer({ uri: url });
    playerRef.current = player;

    // Počkej na načtení (polling)
    let waited = 0;
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        waited += 100;
        if ((player.duration ?? 0) > 0 || waited > 8000) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    player.rate = rateRef.current;

    if (autoPlay) {
      player.play();
    }

    setIsLoading(false);
    startPolling();
  }

  // ── Veřejné API ──────────────────────────────────────────────────────────

  async function loadAndPlay(audioUrl: string | string[], title: string) {
    const urls = Array.isArray(audioUrl) ? audioUrl : [audioUrl];
    chunksRef.current = urls;
    setTotalChunks(urls.length);
    setCurrentTitle(title);
    await _loadChunk(urls[0], 0, true);
  }

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (p.playing) {
      p.pause();
      setIsPlaying(false);
    } else {
      p.play();
      setIsPlaying(true);
    }
  }

  function seekBy(ms: number) {
    const p = playerRef.current;
    if (!p) return;
    const next = Math.max(0, Math.min(
      p.currentTime + ms / 1000,
      p.duration ?? 0
    ));
    p.seekTo(next);
  }

  function seekTo(ratio: number) {
    const p = playerRef.current;
    if (!p || (p.duration ?? 0) === 0) return;
    p.seekTo(ratio * (p.duration ?? 0));
  }

  async function goToChunk(index: number) {
    if (index < 0 || index >= chunksRef.current.length) return;
    await _loadChunk(chunksRef.current[index], index, isPlayingRef.current);
  }

  function setRate(rate: number) {
    rateRef.current = rate;
    if (playerRef.current) {
      playerRef.current.rate = rate;
    }
  }

  function stop() {
    stopPolling();
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch (_) {}
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
    return () => { stop(); };
  }, []);

  return {
    isPlaying, isLoading,
    positionMs, durationMs,
    currentTitle,
    chunkIndex, totalChunks,
    loadAndPlay, togglePlay,
    seekBy, seekTo,
    goToChunk, setRate, stop,
  };
}
