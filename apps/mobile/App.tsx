import * as Sentry from "@sentry/react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";

Sentry.init({
  dsn: "https://ec7b622acac9764292588e1c4db2bfb3@o4511239288324096.ingest.us.sentry.io/4511239392722944",
  tracesSampleRate: 0.2,
  // eslint-disable-next-line no-undef
  environment: __DEV__ ? "development" : "production",
});

function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
