import "../global.css";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function RootLayout() {
  const [loaded] = useFonts({
    Figtree_400Regular:   require("../assets/fonts/Figtree_400Regular.ttf"),
    Figtree_500Medium:    require("../assets/fonts/Figtree_500Medium.ttf"),
    Figtree_600SemiBold:  require("../assets/fonts/Figtree_600SemiBold.ttf"),
    Figtree_700Bold:      require("../assets/fonts/Figtree_700Bold.ttf"),
    Figtree_800ExtraBold: require("../assets/fonts/Figtree_800ExtraBold.ttf"),
  });

  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F4F9" }}>
        <ActivityIndicator color="#0A4CE1" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
