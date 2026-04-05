import { useRef, useState, useEffect } from "react";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";

setAudioModeAsync({
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});

export function usePlayer() {
  const chunksRef     = useRef<string[]>([]);
  const chunkIndexRef = useRef<number>(0);
  const rateRef       = useRef<number>(1.0);

  const [currentUri,   setCurrentUri]   = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [chunkIndex,   setChunkIndex]   = useState(0);
  const [totalChunks,  setTotalChunks]  = useState(0);
  const [isLoading,    setIsLoading]    = useState(false);

  const player = useAudioPlayer(currentUri ? { uri: currentUri } : null);
  const status = useAudioPlayerStatus(player);

  // Auto-advance na další chunk po skončení
  useEffect(() => {
    if (!status.didJustFinish) return;
    const nextIndex = chunkIndexRef.current + 1;
    if (nextIndex < chunksRef.current.length) {
      chunkIndexRef.current = nextIndex;
      setChunkIndex(nextIndex);
      setIsLoading(true);
      setCurrentUri(chunksRef.current[nextIndex]);
    } else {
      // Konec všech chunků
      chunkIndexRef.current = 0;
      setChunkIndex(0);
    }
  }, [status.didJustFinish]);

  // Spusť přehrávání automaticky po načtení nového URI
  useEffect(() => {
    if (!currentUri) return;
    if (status.isLoaded) {
      player.seekTo(0);
      player.play();
      player.setRate(rateRef.current);
      setIsLoading(false);
    }
  }, [currentUri, status.isLoaded]);

  // ── Veřejné API ──────────────────────────────────────────────────────────

  async function loadAndPlay(audioUrl: string | string[], title: string) {
    const urls = Array.isArray(audioUrl) ? audioUrl : [audioUrl];
    chunksRef.current     = urls;
    chunkIndexRef.current = 0;
    setChunkIndex(0);
    setTotalChunks(urls.length);
    setCurrentTitle(title);
    setIsLoading(true);
    setCurrentUri(urls[0]);
  }

  function togglePlay() {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  function seekBy(ms: number) {
    const next = Math.max(0, Math.min(
      (status.currentTime * 1000) + ms,
      (status.duration ?? 0) * 1000
    ));
    player.seekTo(next / 1000);
  }

  function seekTo(ratio: number) {
    const duration = status.duration ?? 0;
    if (duration === 0) return;
    player.seekTo(ratio * duration);
  }

  function goToChunk(index: number) {
    if (index < 0 || index >= chunksRef.current.length) return;
    chunkIndexRef.current = index;
    setChunkIndex(index);
    setIsLoading(true);
    setCurrentUri(chunksRef.current[index]);
  }

  function setRate(rate: number) {
    rateRef.current = rate;
    player.setRate(rate);
  }

  function stop() {
    player.pause();
    player.seekTo(0);
    setCurrentUri(null);
    chunkIndexRef.current = 0;
    setChunkIndex(0);
  }

  useEffect(() => {
    return () => { player.pause(); };
  }, []);

  return {
    isPlaying:  status.playing ?? false,
    isLoading,
    positionMs: (status.currentTime ?? 0) * 1000,
    durationMs: (status.duration ?? 0) * 1000,
    currentTitle,
    chunkIndex,
    totalChunks,
    loadAndPlay, togglePlay,
    seekBy, seekTo,
    goToChunk, setRate, stop,
  };
}
