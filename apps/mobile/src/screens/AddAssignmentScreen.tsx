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
import { createAssignment } from "../lib/api/assignments";

type Props = NativeStackScreenProps<any, "AddAssignment">;

export function AddAssignmentScreen({ route, navigation }: Props) {
  const courseId = (route.params as any)?.courseId || "";
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [kind, setKind] = useState("");
  const [estMinutes, setEstMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = loading || title.trim().length === 0;

  const parseDueAt = (): string | undefined => {
    if (!dueDate) return undefined;
    try {
      const dateParts = dueDate.split("-");
      const timeParts = dueTime ? dueTime.split(":") : ["23", "59"];
      const year = parseInt(dateParts[0] || "2025");
      const month = parseInt(dateParts[1] || "1") - 1;
      const day = parseInt(dateParts[2] || "1");
      const hours = parseInt(timeParts[0] || "23");
      const minutes = parseInt(timeParts[1] || "59");
      const dt = new Date(year, month, day, hours, minutes);
      return dt.toISOString();
    } catch {
      return undefined;
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      await createAssignment(courseId, {
        title: title.trim(),
        due_at: parseDueAt(),
        kind: kind.trim() || undefined,
        est_minutes: estMinutes ? parseInt(estMinutes) : undefined,
      });
      Alert.alert("Success", "Assignment created", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment");
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
        <Text style={styles.title}>New Assignment</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Chapter 5 Homework"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Due Date (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
            editable={!loading}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Due Time (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:mm (24-hour)"
            value={dueTime}
            onChangeText={setDueTime}
            editable={!loading}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Type (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., homework, quiz, project"
            value={kind}
            onChangeText={setKind}
            editable={!loading}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Estimated Minutes (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 60"
            value={estMinutes}
            onChangeText={setEstMinutes}
            editable={!loading}
            keyboardType="number-pad"
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
            <Text style={styles.submitText}>Create Assignment</Text>
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
