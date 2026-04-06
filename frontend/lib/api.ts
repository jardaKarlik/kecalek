import { API_BASE } from "../constants/config";

export async function extractUrl(
  url: string,
  voice: string
): Promise<{
  title: string;
  siteName: string;
  byline: string;
  audioUrl: string | string[];
  naturalText: string;
  wordCount: number;
}> {
  const res = await fetch(`${API_BASE}/extract-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, voice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export async function processChapter(
  text: string,
  chapterId: string,
  voice: string
): Promise<{ chapterId: string; audioUrl: string | string[]; naturalText: string }> {
  const res = await fetch(`${API_BASE}/process-chapter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, chapterId, voice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export async function extractFile(
  fileUri: string,
  filename: string,
  mimeType: string
): Promise<{ filename: string; text: string; pageCount?: number; chapterCount?: number }> {
  const formData = new FormData();
  formData.append("file", { uri: fileUri, name: filename, type: mimeType } as any);

  const res = await fetch(`${API_BASE}/extract-file`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export async function processFile(
  fileUri: string,
  filename: string,
  mimeType: string,
  voice: string,
  chapterIndex: number = 0
): Promise<{
  filename: string;
  chapterIndex: number;
  chapterTitle: string;
  totalChapters: number;
  audioUrl: string | string[];
  naturalText: string;
}> {
  const formData = new FormData();
  formData.append("file", { uri: fileUri, name: filename, type: mimeType } as any);
  formData.append("voice", voice);
  formData.append("chapterIndex", String(chapterIndex));

  const res = await fetch(`${API_BASE}/process-file`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "File processing failed");
  }
  return res.json();
}

export async function loadBook(
  fileUri: string,
  filename: string,
  mimeType: string,
  voice: string
): Promise<{
  sessionId: string;
  filename: string;
  totalChapters: number;
  chapters: { index: number; title: string; length: number }[];
}> {
  const formData = new FormData();
  formData.append("file", { uri: fileUri, name: filename, type: mimeType } as any);
  formData.append("voice", voice);
  const res = await fetch(`${API_BASE}/book/load`, { method: "POST", body: formData });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getChapter(
  sessionId: string,
  chapterIndex: number
): Promise<{
  chapterIndex: number;
  chapterTitle: string;
  totalChapters: number;
  audioUrl: string | string[];
  naturalText: string;
  filename: string;
}> {
  const res = await fetch(`${API_BASE}/book/${sessionId}/chapter/${chapterIndex}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
