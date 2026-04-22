/**
 * @module navigation/RootNavigator
 * Root navigation tree for Motiff.
 *
 * Auth routing logic:
 *   - `loading`      → full-screen spinner (resolving initial session)
 *   - `recoveryMode` → ResetPasswordScreen only (user opened a password-reset link)
 *   - `session null` → SignInScreen + ForgotPasswordScreen
 *   - `session set`  → MainTabs + all app stack screens
 *
 * Deep-link handling lives in useAuthSession (lib/auth.ts); this component
 * only reacts to the state that hook exposes.
 */

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { useAuthSession } from "../lib/auth";
import { useOnboarding } from "../lib/onboarding";
import { TabBar } from "./TabBar";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { SignInScreen } from "../screens/SignInScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
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
import { SettingsScreen } from "../screens/SettingsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { C } from "../theme";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Main tab navigator (authenticated users) ───────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Extra padding so scroll content clears the floating tab bar + FAB
        sceneStyle: { paddingBottom: 130 },
      }}
    >
      <Tab.Screen name="Today"    component={TodayScreen}    />
      <Tab.Screen name="Plan"     component={PlanScreen}     />
      <Tab.Screen name="Courses"  component={CoursesScreen}  />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}

// ── Root navigator ─────────────────────────────────────────────────────────────

export function RootNavigator() {
  const { session, loading, recoveryMode } = useAuthSession();
  const { onboardingChecked, onboardingDone, completeOnboarding } = useOnboarding(
    session?.user.id ?? null
  );

  // Wait for both the session and the onboarding flag before rendering anything.
  if (loading || !onboardingChecked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.indigo} />
      </View>
    );
  }

  // Onboarding is shown only to authenticated users who haven't seen the carousel.
  // Users sign up first (via invite), then see onboarding on first open.
  if (session && !onboardingDone) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {recoveryMode ? (
          /*
           * Password recovery mode: the user arrived via a reset-email deep link.
           * Show only the reset screen. Navigating anywhere else is blocked until
           * the user sets a new password or cancels (signs out).
           */
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : session === null ? (
          /*
           * Unauthenticated: show sign-in and forgot-password screens.
           * ForgotPassword is reachable from the "Forgot password?" link on SignIn.
           */
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          /*
           * Authenticated: full app.
           */
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
            <Stack.Screen name="Settings">{(props) => <SettingsScreen {...props} />}</Stack.Screen>
            <Stack.Screen name="Profile">{(props) => <ProfileScreen {...props} />}</Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
