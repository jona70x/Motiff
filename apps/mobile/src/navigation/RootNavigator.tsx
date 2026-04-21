import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuthSession } from "../lib/auth";
import { SignInScreen } from "../screens/SignInScreen";
import { CoursesScreen } from "../screens/CoursesScreen";
import { AddCourseScreen } from "../screens/AddCourseScreen";
import { CourseDetailScreen } from "../screens/CourseDetailScreen";
import { AddAssignmentScreen } from "../screens/AddAssignmentScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { AssignmentDetailScreen } from "../screens/AssignmentDetailScreen";
import { SyllabusUploadScreen } from "../screens/SyllabusUploadScreen";
import { SyllabusCandidatesScreen } from "../screens/SyllabusCandidatesScreen";
import { FocusTimerScreen } from "../screens/FocusTimerScreen";
import { ProgressScreen } from "../screens/ProgressScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#111",
        tabBarInactiveTintColor: "#999",
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="●" color={color} />,
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="▦" color={color} />,
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="▤" color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="▨" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 20 }}>{label}</Text>;
}

export function RootNavigator() {
  const { session, loading } = useAuthSession();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session === null ? (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Group screenOptions={{ presentation: "modal" }}>
              <Stack.Screen name="AddCourse">{(props) => <AddCourseScreen {...props} />}</Stack.Screen>
              <Stack.Screen name="AddAssignment">{(props) => <AddAssignmentScreen {...props} />}</Stack.Screen>
            </Stack.Group>
            <Stack.Screen name="CourseDetail">{(props) => <CourseDetailScreen {...props} />}</Stack.Screen>
            <Stack.Screen name="AssignmentDetail">{(props) => <AssignmentDetailScreen {...props} />}</Stack.Screen>
            <Stack.Screen name="SyllabusUpload">{(props) => <SyllabusUploadScreen {...props} />}</Stack.Screen>
            <Stack.Screen name="SyllabusCandidates">{(props) => <SyllabusCandidatesScreen {...props} />}</Stack.Screen>
            <Stack.Screen name="FocusTimer">{(props) => <FocusTimerScreen {...props} />}</Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
