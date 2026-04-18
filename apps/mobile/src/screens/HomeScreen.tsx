import type { Session } from "@supabase/supabase-js";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

type Props = { session: Session };

export function HomeScreen({ session }: Props) {
  const email = session.user.email ?? "(no email)";

  async function onSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>You're signed in.</Text>
      <Text style={styles.email}>{email}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.signOutButton}
        onPress={onSignOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: "600",
  },
  email: {
    fontSize: 16,
    color: "#555",
    marginBottom: 16,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});
