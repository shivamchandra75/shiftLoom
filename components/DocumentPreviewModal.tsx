import React, { useEffect, useState } from "react";
import { View, Modal, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import { WebView } from "react-native-webview";
import { colors } from "@/src/theme/tokens";
import { getDocumentUrl } from "@/src/services/verificationService";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/button";

export interface PreviewableDocument {
  id: string;
  title: string;
  fileName: string;
  /** Storage path of an uploaded file. Ignored when localUri is set. */
  filePath: string;
  mimeType: string;
  /** A file picked on this device that hasn't been sent yet. */
  localUri?: string;
  /** Line under the title, e.g. "culinary-degree.pdf, 1.2 MB, not sent yet". Defaults to the file name. */
  subtitle?: string;
}

// pdf.js renders every page to a canvas; the PDF bytes are injected as base64 so the private file
// never goes to a third-party viewer and there are no CORS issues.
const PDF_JS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";
const pdfHtml = (base64: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<style>body{margin:0;background:${colors["surface-container-high"]}}canvas{display:block;width:100%;height:auto;margin:0 0 8px;background:#fff}</style>
<script src="${PDF_JS}/pdf.min.js"></script></head><body><script>
const post = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "${PDF_JS}/pdf.worker.min.js";
  const raw = atob("${base64}");
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  pdfjsLib.getDocument({ data: bytes }).promise.then(async (pdf) => {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      document.body.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      if (n === 1) post({ type: "loaded", pages: pdf.numPages });
    }
  }).catch((e) => post({ type: "error", message: String(e && e.message || e) }));
} catch (e) { post({ type: "error", message: String(e && e.message || e) }); }
</script></body></html>`;

type Source = { kind: "image"; uri: string } | { kind: "pdf"; html: string };

// Document preview (Figma 268:2989). Before sending: pass onChooseAnother/onKeep for the bottom bar.
// Uploaded: pass status (e.g. a StatusChip) to show the review state.
export function DocumentPreviewModal({
  doc,
  onClose,
  status,
  onChooseAnother,
  onKeep,
}: {
  doc: PreviewableDocument | null;
  onClose: () => void;
  status?: React.ReactNode;
  onChooseAnother?: () => void;
  onKeep?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    let tmp: File | null = null;
    setSource(null);
    setError("");
    setRendering(true);

    (async () => {
      try {
        const isPdf = doc.mimeType === "application/pdf";
        if (doc.localUri) {
          const html = isPdf ? pdfHtml(await new File(doc.localUri).base64()) : null;
          if (!cancelled) setSource(html ? { kind: "pdf", html } : { kind: "image", uri: doc.localUri });
          return;
        }
        const url = await getDocumentUrl(doc.filePath);
        if (!isPdf) {
          if (!cancelled) setSource({ kind: "image", uri: url });
          return;
        }
        const file = new File(Paths.cache, `preview-${doc.id}.pdf`);
        tmp = file;
        await File.downloadFileAsync(url, file, { idempotent: true });
        const base64 = await file.base64();
        if (!cancelled) setSource({ kind: "pdf", html: pdfHtml(base64) });
      } catch (e: any) {
        if (!cancelled) setError(e?.message === "Network request failed" ? "No internet connection." : e?.message || "Couldn't load this document.");
      } finally {
        // The private file only needs to live long enough to be read
        try {
          tmp?.delete();
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, attempt]);

  const hasActions = !!onChooseAnother && !!onKeep;

  return (
    <Modal visible={!!doc} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-1 px-4 py-2">
          <IconButton icon="close" accessibilityLabel="Close preview" onPress={onClose} />
          <View className="flex-1">
            <Text variant="title-medium" numberOfLines={1}>{doc?.title}</Text>
            <Text variant="body-small" color="on-surface-variant" numberOfLines={1}>{doc?.subtitle ?? doc?.fileName}</Text>
          </View>
          {status}
        </View>

        <View className="flex-1 bg-surface-container-high" style={hasActions ? undefined : { paddingBottom: insets.bottom }}>
          {error ? (
            <View className="flex-1 items-center justify-center gap-3 px-8">
              <Icon name="error" size={40} color="error" />
              <Text variant="body-medium" className="text-center">{error}</Text>
              <Button variant="text" label="Retry" onPress={() => setAttempt((a) => a + 1)} />
            </View>
          ) : source?.kind === "image" ? (
            // ScrollView zoom gives pinch-to-zoom on iOS; Android shows the image fitted to the screen
            <ScrollView maximumZoomScale={4} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1 }}>
              <Image
                source={{ uri: source.uri }}
                contentFit="contain"
                style={{ flex: 1, minHeight: 400 }}
                onLoad={() => setRendering(false)}
                onError={() => setError("Couldn't display this image.")}
                accessibilityLabel={doc?.title}
              />
            </ScrollView>
          ) : source?.kind === "pdf" ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html: source.html }}
              onMessage={(e) => {
                const msg = JSON.parse(e.nativeEvent.data);
                if (msg.type === "loaded") setRendering(false);
                else if (msg.type === "error") setError(`Couldn't display this PDF. ${msg.message}`);
              }}
              style={{ flex: 1, backgroundColor: colors["surface-container-high"] }}
            />
          ) : null}

          {!error && rendering && (
            <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>

        {hasActions && (
          <View className="flex-row gap-2 bg-surface px-4 pt-4" style={{ paddingBottom: 16 + insets.bottom }}>
            <Button variant="outlined" label="Choose another file" onPress={onChooseAnother} className="flex-1" />
            <Button label="Keep file" onPress={onKeep} className="flex-1" />
          </View>
        )}
      </View>
    </Modal>
  );
}
