import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<any, "FocusTimer">;

export function FocusTimerScreen({ route, navigation }: Props) {
  const params = (route.params as any) || {};
  const assignmentId: string = params.assignmentId ?? "";
  const title: string = params.title ?? "Untitled assignment";

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.assignmentLabel} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.timerPlaceholder}>
          <Text style={styles.timerText}>25:00</Text>
        </View>

        <Text style={styles.comingSoon}>
          Focus timer coming in S2-2
        </Text>

        {/* Hidden identifier for navigation verification */}
        {__DEV__ && (
          <Text style={styles.devHint} testID="focus-assignment-id">
            assignment_id: {assignmentId}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "500",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 24,
  },
  assignmentLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    lineHeight: 26,
  },
  timerPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "300",
    color: "#fff",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  comingSoon: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  devHint: {
    fontSize: 11,
    color: "#333",
    marginTop: 8,
  },
});
