import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecentItem = {
  id: string;
  title: string;
  source: "url" | "file";
  originalInput: string;
  audioUrl: string | string[];
  naturalText: string;
  timestamp: number;
  siteName?: string;
  byline?: string;
  wordCount?: number;
};

const STORAGE_KEY = "@kecalek:recent";
const MAX_ITEMS = 20;

export function useRecentItems() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setItems(JSON.parse(raw));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback(async (next: RecentItem[]) => {
    setItems(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addItem = useCallback(
    async (item: RecentItem) => {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.originalInput !== item.originalInput);
        const next = [item, ...filtered].slice(0, MAX_ITEMS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removeItem = useCallback(
    async (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const clearAll = useCallback(async () => {
    await persist([]);
  }, [persist]);

  return { items, addItem, removeItem, clearAll, isLoading };
}
