import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Saraswati Sweets",
  slug: "saraswati-sweets",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.saraswatisweets.app",
  },
  android: {
    package: "com.saraswatisweets.app",
    adaptiveIcon: {
      backgroundColor: "#8A1538",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://pdovuxqbymgqzvaxcwuk.supabase.co",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "",
  },
});
