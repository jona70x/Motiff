import { StyleSheet, Text, View } from "react-native";
import type { DayBar } from "../../../../packages/domain/progress/summary";

type Props = {
  days: DayBar[];
};

const BAR_MAX_HEIGHT = 100;

export function WeekBarChart({ days }: Props) {
  const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const barHeight = Math.max(4, Math.round((day.minutes / maxMinutes) * BAR_MAX_HEIGHT));
        return (
          <View key={day.date} style={styles.column}>
            <Text style={styles.minuteLabel}>
              {day.minutes > 0 ? String(day.minutes) : ""}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: barHeight },
                  day.isToday ? styles.barToday : styles.barDefault,
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
              {day.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingVertical: 8,
  },
  column: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  minuteLabel: {
    fontSize: 10,
    color: "#999",
    height: 14,
    textAlign: "center",
  },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "80%",
    borderRadius: 4,
  },
  barDefault: {
    backgroundColor: "#ddd",
  },
  barToday: {
    backgroundColor: "#111",
  },
  dayLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  dayLabelToday: {
    color: "#111",
    fontWeight: "700",
  },
});
