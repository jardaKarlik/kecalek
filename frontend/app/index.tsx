import { getDocumentAsync } from "expo-document-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ProcessingOverlay from "../components/ProcessingOverlay";
import RecentItemCard from "../components/RecentItemCard";
import VoiceChip from "../components/VoiceChip";
import { COLORS, VOICES } from "../constants/config";
import * as api from "../lib/api";
import { getClipboardUrl } from "../lib/clipboard";
import { RecentItem, useRecentItems } from "../lib/useRecentItems";

const PROCESSING_MESSAGES = [
  "Fetching article...",
  "Naturalizing text...",
  "Generating audio...",
];

export default function HomeScreen() {
  const [urlInput, setUrlInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("af_bella");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(PROCESSING_MESSAGES[0]);
  const [fileResult, setFileResult] = useState<{
    filename: string;
    uri: string;
    mimeType: string;
    chapterCount?: number;
  } | null>(null);
  const [bookSession, setBookSession] = useState<{
    sessionId: string;
    filename: string;
    totalChapters: number;
    currentChapter: number;
    chapters: { index: number; title: string; length: number }[];
  } | null>(null);

  const recentItems = useRecentItems();
  const msgTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const startProcessingMessages = () => {
    setProcessingMessage(PROCESSING_MESSAGES[0]);
    const t1 = setTimeout(() => setProcessingMessage(PROCESSING_MESSAGES[1]), 2000);
    const t2 = setTimeout(() => setProcessingMessage(PROCESSING_MESSAGES[2]), 4000);
    msgTimers.current = [t1, t2];
  };

  const clearProcessingMessages = () => {
    msgTimers.current.forEach(clearTimeout);
    msgTimers.current = [];
  };

  useEffect(() => () => clearProcessingMessages(), []);

  async function handleReadUrl() {
    if (!urlInput.startsWith("http")) {
      Alert.alert("Invalid URL", "URL must start with http or https.");
      return;
    }
    setIsProcessing(true);
    startProcessingMessages();
    try {
      const result = await api.extractUrl(urlInput, selectedVoice);
      const item: RecentItem = {
        id: Date.now().toString(),
        title: result.title,
        source: "url",
        originalInput: urlInput,
        audioUrl: result.audioUrl,
        naturalText: result.naturalText,
        timestamp: Date.now(),
        siteName: result.siteName,
        byline: result.byline,
        wordCount: result.wordCount,
      };
      await recentItems.addItem(item);
      router.push({
        pathname: "/player",
        params: {
          audioUrl: JSON.stringify(result.audioUrl),
          title: result.title,
          siteName: result.siteName ?? "",
          byline: result.byline ?? "",
          naturalText: result.naturalText,
        },
      });
      setUrlInput("");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong");
    } finally {
      clearProcessingMessages();
      setIsProcessing(false);
    }
  }

  async function handleFileImport() {
    const result = await getDocumentAsync({
      type: ["application/pdf", "application/epub+zip"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setIsProcessing(true);
    startProcessingMessages();
    try {
      const session = await api.loadBook(
        file.uri,
        file.name,
        file.mimeType ?? "application/octet-stream",
        selectedVoice
      );
      setBookSession({ ...session, currentChapter: 0 });
      setFileResult({
        filename: file.name,
        uri: file.uri,
        mimeType: file.mimeType ?? "application/octet-stream",
        chapterCount: session.totalChapters,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      clearProcessingMessages();
      setIsProcessing(false);
    }
  }

  async function handleReadFile() {
    if (!bookSession) return;
    setIsProcessing(true);
    startProcessingMessages();
    try {
      const result = await api.getChapter(bookSession.sessionId, bookSession.currentChapter);
      const item: RecentItem = {
        id: Date.now().toString(),
        title: result.chapterTitle,
        source: "file",
        originalInput: bookSession.filename,
        audioUrl: result.audioUrl,
        naturalText: result.naturalText,
        timestamp: Date.now(),
        siteName: `${bookSession.filename} · Ch. ${result.chapterIndex + 1}/${result.totalChapters}`,
      };
      await recentItems.addItem(item);
      console.log("sessionId passed to player:", bookSession.sessionId);
      router.push({
        pathname: "/player",
        params: {
          audioUrl: JSON.stringify(result.audioUrl),
          title: result.chapterTitle,
          siteName: `${bookSession.filename} · Ch. ${result.chapterIndex + 1}/${result.totalChapters}`,
          byline: "",
          naturalText: result.naturalText,
          sessionId: bookSession.sessionId,
          chapterIndex: String(result.chapterIndex),
          totalChapters: String(result.totalChapters),
        },
      });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong");
    } finally {
      clearProcessingMessages();
      setIsProcessing(false);
    }
  }

  function handleRecentPress(item: RecentItem) {
    router.push({
      pathname: "/player",
      params: {
        audioUrl: JSON.stringify(item.audioUrl),
        title: item.title,
        siteName: item.siteName ?? "",
        byline: item.byline ?? "",
        naturalText: item.naturalText,
      },
    });
  }

  function handleRecentLongPress(item: RecentItem) {
    Alert.alert(item.title, undefined, [
      {
        text: "Delete",
        style: "destructive",
        onPress: () => recentItems.removeItem(item.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* URL INPUT */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Read article</Text>
          <View style={styles.urlRow}>
            <TextInput
              style={styles.urlInput}
              placeholder="Paste URL here..."
              placeholderTextColor={COLORS.textDim}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={async () => {
                const val = await getClipboardUrl();
                if (val) setUrlInput(val);
                else Alert.alert("Clipboard", "No URL found in clipboard");
              }}
            >
              <Text style={styles.iconBtnText}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.readBtn, (!urlInput || isProcessing) && styles.readBtnDisabled]}
              onPress={handleReadUrl}
              disabled={!urlInput || isProcessing}
            >
              <Text style={styles.readBtnText}>▶ Read</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FILE IMPORT */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Read file</Text>
          <TouchableOpacity style={styles.importBtn} onPress={handleFileImport}>
            <Text style={styles.importBtnText}>📄 Import PDF or ePub</Text>
          </TouchableOpacity>
          {fileResult && (
            <View style={styles.filePreview}>
              <Text style={styles.filePreviewName}>{fileResult.filename}</Text>
              {fileResult.pageCount != null && (
                <Text style={styles.filePreviewMeta}>{fileResult.pageCount} pages</Text>
              )}
              {fileResult.chapterCount != null && (
                <Text style={styles.filePreviewMeta}>{fileResult.chapterCount} chapters</Text>
              )}
              <TouchableOpacity style={styles.readBtn} onPress={handleReadFile}>
                <Text style={styles.readBtnText}>▶ Read file</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* VOICE SELECTOR */}
        <View style={styles.voiceSection}>
          <Text style={styles.voiceLabel}>Voice</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceRow}>
            {VOICES.map((v) => (
              <VoiceChip
                key={v.id}
                voice={v}
                selected={selectedVoice === v.id}
                onPress={() => setSelectedVoice(v.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* RECENT ITEMS */}
        {recentItems.items.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent</Text>
              <TouchableOpacity onPress={recentItems.clearAll}>
                <Text style={styles.clearAll}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentItems.items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RecentItemCard
                  item={item}
                  onPress={() => handleRecentPress(item)}
                  onLongPress={() => handleRecentLongPress(item)}
                />
              )}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      <ProcessingOverlay visible={isProcessing} message={processingMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 12,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
  },
  iconBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 12,
  },
  iconBtnText: {
    fontSize: 18,
  },
  readBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readBtnDisabled: {
    opacity: 0.4,
  },
  readBtnText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },
  importBtn: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  importBtnText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  filePreview: {
    marginTop: 12,
    gap: 4,
  },
  filePreviewName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  filePreviewMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  voiceSection: {
    marginBottom: 12,
  },
  voiceLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  voiceRow: {
    paddingVertical: 4,
  },
  recentSection: {
    marginTop: 4,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recentTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  clearAll: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
