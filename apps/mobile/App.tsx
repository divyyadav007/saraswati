import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./constants/theme";

// Types
export type RootStackParamList = {
  MainTabs: undefined;
  ProductDetail: { slug: string; title?: string };
  Checkout: undefined;
  OrderTracking: { orderId: string };
};

export type BottomTabParamList = {
  Home: undefined;
  Browse: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

// Screen Components
function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.badge}>Phase 0 Foundation</Text>
      <Text style={styles.title}>Saraswati Sweets</Text>
      <Text style={styles.subtitle}>Premium Indian mithai crafted in Barabanki</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("ProductDetail", { slug: "kaju-katli", title: "Kaju Katli" })}
      >
        <Text style={styles.primaryButtonText}>View Sample Product</Text>
      </TouchableOpacity>
    </View>
  );
}

function BrowseScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>Browse Categories</Text>
      <Text style={styles.subtitle}>Sweets, Hampers, Snacks & Special Occasions</Text>
    </View>
  );
}

function CartScreen({ navigation }: any) {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>Your Cart</Text>
      <Text style={styles.subtitle}>Empty cart (Phase 0)</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Checkout")}
      >
        <Text style={styles.primaryButtonText}>Go to Checkout</Text>
      </TouchableOpacity>
    </View>
  );
}

function OrdersScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>Your Orders</Text>
      <Text style={styles.subtitle}>Order history will appear here in Phase 5</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>Profile & Settings</Text>
      <Text style={styles.subtitle}>Customer authentication coming in Phase 1</Text>
    </View>
  );
}

function ProductDetailScreen({ route }: any) {
  const { title = "Product Detail" } = route.params || {};
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Product catalogue and variants in Phase 2</Text>
    </View>
  );
}

function CheckoutScreen() {
  const [step, setStep] = React.useState<"cart" | "auth" | "otp" | "address" | "done">("cart");
  const [phone, setPhone] = React.useState("");

  if (step === "cart") {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.subtitle}>Unauthenticated user has items in cart</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("auth")}>
          <Text style={styles.primaryButtonText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "auth") {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.title}>Customer Verification</Text>
        <Text style={styles.subtitle}>Please enter your email address</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("otp")}>
          <Text style={styles.primaryButtonText}>Send OTP to Email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "otp") {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter 6-digit OTP to authenticate and keep cart</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("address")}>
          <Text style={styles.primaryButtonText}>Verify & Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "address") {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.title}>Delivery Details</Text>
        <Text style={styles.subtitle}>You are now authenticated. Select address & payment.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("done")}>
          <Text style={styles.primaryButtonText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.subtitle}>Thank you for your order.</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.primary,
          fontWeight: "700",
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Browse" component={BrowseScreen} options={{ title: "Browse" }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: "Cart" }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: "Orders" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.primary,
            headerTitleStyle: {
              fontWeight: "600",
            },
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={({ route }: any) => ({
              title: route.params?.title || "Product Details",
            })}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{ title: "Checkout" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  badge: {
    backgroundColor: colors.accentGold,
    color: colors.accentGoldForeground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontWeight: "600",
    fontSize: 15,
  },
});
