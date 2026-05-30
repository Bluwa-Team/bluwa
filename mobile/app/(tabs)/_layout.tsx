import { Tabs } from "expo-router";
import { View } from "react-native";
import { Home, Truck, ClipboardList, Factory, FlaskConical, ShoppingBag } from "lucide-react-native";
import { C, F } from "../../constants/theme";

function TabIcon({ Icon, focused }: { Icon: React.ElementType; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
      <Icon
        size={21}
        color={focused ? C.primary : C.textMuted}
        strokeWidth={focused ? 2.25 : 1.75}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: F.semiBold,
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Accueil",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reception"
        options={{
          title: "Réception",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Truck} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventaire"
        options={{
          title: "Inventaire",
          tabBarIcon: ({ focused }) => <TabIcon Icon={ClipboardList} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="of"
        options={{
          title: "Production",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Factory} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="qualite"
        options={{
          title: "Qualité",
          tabBarIcon: ({ focused }) => <TabIcon Icon={FlaskConical} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ventes"
        options={{
          title: "Ventes",
          tabBarIcon: ({ focused }) => <TabIcon Icon={ShoppingBag} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
