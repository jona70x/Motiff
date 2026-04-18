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
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
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
          style={[styles.pickButton, uploading && styles.pickButtonDisabled]}
          onPress={handlePick}
          disabled={uploading}
          accessibilityRole="button"
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#fff" />
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
    backgroundColor: "#f6f6f8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e6",
  },
  cancelText: {
    fontSize: 16,
    color: "#3355cc",
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  body: {
    padding: 24,
    gap: 16,
  },
  courseLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  instructions: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  constraintList: {
    gap: 6,
  },
  constraint: {
    fontSize: 14,
    color: "#666",
  },
  selectedFile: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d6d6dc",
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
    fontWeight: "500",
    color: "#111",
  },
  selectedFileSize: {
    fontSize: 13,
    color: "#777",
  },
  errorBox: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: "#b00020",
    fontSize: 14,
  },
  pickButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  pickButtonDisabled: {
    opacity: 0.6,
  },
  pickButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
