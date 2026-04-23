/**
 * @module components/SubheaderPill
 * Indigo summary pill shown below the Plan screen header.
 * Handles null budget gracefully by omitting the "· N min budget" clause.
 */

import { StyleSheet, Text, View } from "react-native";
import { C, F, R } from "../theme";

type Props = {
  allocatedMinutes: number;
  budgetMinutes: number | null;
};

/** Shows "{allocated} min · {budget} min budget" or just "{allocated} min". */
export function SubheaderPill({ allocatedMinutes, budgetMinutes }: Props) {
  const label =
    budgetMinutes != null
      ? `${allocatedMinutes} min · ${budgetMinutes} min budget`
      : `${allocatedMinutes} min`;

  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingVertical:   10,
    backgroundColor:   C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pill: {
    alignSelf:         "flex-start",
    backgroundColor:   C.indigoLight,
    borderRadius:      R.full,
    paddingHorizontal: 12,
    paddingVertical:   5,
  },
  text: {
    fontSize:   12,
    fontFamily: F.bold,
    color:      C.indigo,
  },
});
