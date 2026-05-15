import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createCourse } from "../lib/api/courses";
import { C, F, R } from "../theme";

type Props = NativeStackScreenProps<any, "AddCourse">;

export function AddCourseScreen({ navigation }: Props) {
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = loading || title.trim().length === 0;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      await createCourse({
        title: title.trim(),
        term: term.trim() || undefined,
      });
      Alert.alert("Success", "Course created", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          {({ pressed }) => (
            <Text style={[styles.closeButton, pressed && styles.pressed]}>Cancel</Text>
          )}
        </Pressable>
        <Text style={styles.title}>New Course</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Course Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Math 101"
            placeholderTextColor={C.textMuted}
            value={title}
            onChangeText={setTitle}
            editable={!loading}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Term (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Fall 2025"
            placeholderTextColor={C.textMuted}
            value={term}
            onChangeText={setTerm}
            editable={!loading}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.submitButton, disabled && styles.buttonDisabled]}
          disabled={disabled}
          onPress={handleSubmit}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={C.textInverse} />
          ) : (
            <Text style={styles.submitText}>Create Course</Text>
          )}
        </Pressable>
      </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safeArea: {
    flex: 1,
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
  closeButton: {
    fontSize: 16,
    fontFamily: F.medium,
    color: C.indigo,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontFamily: F.bold,
    color: C.text,
  },
  form: {
    padding: 20,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: F.bold,
    color: C.text,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: F.body,
    color: C.text,
  },
  error: {
    color: C.error,
    fontSize: 14,
    fontFamily: F.medium,
  },
  submitButton: {
    backgroundColor: C.ink,
    borderRadius: R.lg,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: C.textInverse,
    fontSize: 16,
    fontFamily: F.display,
    fontWeight: "800",
  },
});
