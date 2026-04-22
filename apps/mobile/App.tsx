import * as Sentry from "@sentry/react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";

Sentry.init({
  dsn: "https://ec7b622acac9764292588e1c4db2bfb3@o4511239288324096.ingest.us.sentry.io/4511239392722944",
  tracesSampleRate: 0.2,
  // eslint-disable-next-line no-undef
  environment: __DEV__ ? "development" : "production",
});

function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    BricolageGrotesque_700Bold,
  });

  // Hold the splash screen until fonts are ready. In a production EAS build
  // the native splash stays visible while this returns null; in dev there is
  // a brief blank frame which is acceptable.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
