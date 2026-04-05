import * as Clipboard from "expo-clipboard";

export async function getClipboardUrl(): Promise<string | null> {
  const text = await Clipboard.getStringAsync();
  if (text && text.trim().startsWith("http")) {
    return text.trim();
  }
  return null;
}
