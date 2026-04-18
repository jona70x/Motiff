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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createCourse } from "../lib/api/courses";

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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.closeButton}>Cancel</Text>
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
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Course</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  closeButton: {
    fontSize: 16,
    color: "#3355cc",
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
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
    fontWeight: "600",
    color: "#111",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d6d6dc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: "#b00020",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
