import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuthSession } from "../lib/auth";
import { SignInScreen } from "../screens/SignInScreen";
import { CoursesScreen } from "../screens/CoursesScreen";
import { AddCourseScreen } from "../screens/AddCourseScreen";
import { CourseDetailScreen } from "../screens/CourseDetailScreen";
import { AddAssignmentScreen } from "../screens/AddAssignmentScreen";

const Stack = createNativeStackNavigator();

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
            <Stack.Screen name="Courses">{(props) => <CoursesScreen {...props} />}</Stack.Screen>
            <Stack.Group screenOptions={{ presentation: "modal" }}>
              <Stack.Screen name="AddCourse">{(props) => <AddCourseScreen {...props} />}</Stack.Screen>
              <Stack.Screen name="AddAssignment">{(props) => <AddAssignmentScreen {...props} />}</Stack.Screen>
            </Stack.Group>
            <Stack.Screen name="CourseDetail">{(props) => <CourseDetailScreen {...props} />}</Stack.Screen>
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
