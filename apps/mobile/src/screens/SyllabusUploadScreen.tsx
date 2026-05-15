import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { pickPdf, uploadSyllabus } from "../lib/api/uploads";
import { analytics } from "../lib/analytics";
import { C, F, R } from "../theme";

type Props = NativeStackScreenProps<any, "SyllabusUpload">;

export function SyllabusUploadScreen({ route, navigation }: Props) {
  const courseId: string = (route.params as any)?.courseId ?? "";
  const courseName: string = (route.params as any)?.courseName ?? "Course";

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);

  const handlePick = async () => {
    setError(null);
    const result = await pickPdf();
    if (!result.ok) {
      if (result.error !== "cancelled") setError(result.error);
      return;
    }
    setSelectedFile({ name: result.name, size: result.size });
    await handleUpload(result);
  };

  const handleUpload = async (file: {
    uri: string;
    name: string;
    mimeType: string;
    size: number;
  }) => {
    setUploading(true);
    setError(null);
    analytics.uploadStarted({ courseId, bytes: file.size });
    try {
      await uploadSyllabus(courseId, file);
      analytics.uploadSucceeded({ courseId, bytes: file.size });
      Alert.alert(
        "Uploaded",
        "Your syllabus has been uploaded. You'll be able to extract items from it shortly.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : "Upload failed";
      analytics.uploadFailed({ courseId, error });
      setError(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          {({ pressed }) => (
            <Text style={[styles.cancelText, pressed && styles.pressed]}>Cancel</Text>
          )}
        </Pressable>
        <Text style={styles.title}>Upload syllabus</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.courseLabel}>{courseName}</Text>
        <Text style={styles.instructions}>
          Select a PDF syllabus from your device. Text-only PDFs work best.
          Image-only scans are not supported yet.
        </Text>

        <View style={styles.constraintList}>
          <Text style={styles.constraint}>• PDF files only</Text>
          <Text style={styles.constraint}>• Maximum 10 MB</Text>
          <Text style={styles.constraint}>• Text-based PDFs only (no scanned images)</Text>
        </View>

        {selectedFile && !uploading && (
          <View style={styles.selectedFile}>
            <Text style={styles.selectedFileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text style={styles.selectedFileSize}>
              {(selectedFile.size / 1024).toFixed(0)} KB
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.pickButton,
            uploading && styles.pickButtonDisabled,
            pressed && !uploading && styles.pressed,
          ]}
          onPress={handlePick}
          disabled={uploading}
          accessibilityRole="button"
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={C.textInverse} />
              <Text style={styles.pickButtonText}>Uploading…</Text>
            </View>
          ) : (
            <Text style={styles.pickButtonText}>Choose PDF</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.indigo,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontFamily: F.bold,
    color: C.text,
  },
  body: {
    padding: 24,
    gap: 16,
  },
  courseLabel: {
    fontSize: 13,
    fontFamily: F.bold,
    color: C.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  instructions: {
    fontSize: 15,
    fontFamily: F.body,
    color: C.text,
    lineHeight: 22,
  },
  constraintList: {
    gap: 6,
  },
  constraint: {
    fontSize: 14,
    fontFamily: F.body,
    color: C.textSub,
  },
  selectedFile: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.medium,
    color: C.text,
  },
  selectedFileSize: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textMuted,
  },
  errorBox: {
    backgroundColor: C.errorBg,
    borderRadius: R.md,
    padding: 12,
  },
  errorText: {
    color: C.error,
    fontSize: 14,
    fontFamily: F.medium,
  },
  pickButton: {
    backgroundColor: C.ink,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  pickButtonDisabled: {
    opacity: 0.7,
  },
  pickButtonText: {
    color: C.textInverse,
    fontSize: 16,
    fontFamily: F.display,
    fontWeight: "800",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
