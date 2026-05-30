import { ScrollView, Text, View, TouchableOpacity, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { AlertTriangle, Truck, FlaskConical, Factory, ClipboardList, ChevronRight, Bell, TrendingUp } from "lucide-react-native";
import BluwaLogo from "../../components/BluwaLogo";
import { C, F } from "../../constants/theme";

// ── KPI Card ─────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: number;
  unit?: string;
  Icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  onPress?: () => void;
};

function KpiCard({ label, value, unit, Icon, iconColor, iconBg, onPress }: KpiCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: C.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={{ fontFamily: F.extraBold, fontSize: 28, color: C.text, lineHeight: 32 }}>{value}</Text>
      {unit && <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.textMuted, marginTop: 1 }}>{unit}</Text>}
      <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.textSub, marginTop: 6, lineHeight: 16 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Alert Row ─────────────────────────────────────────────────────────────────

type AlertType = "danger" | "warning" | "info";

const ALERT_CFG: Record<AlertType, { border: string; bg: string; Icon: React.ElementType; iconColor: string }> = {
  danger:  { border: "#FECACA", bg: "#FEF7F7", Icon: AlertTriangle, iconColor: C.danger },
  warning: { border: "#FDE68A", bg: "#FFFBF0", Icon: AlertTriangle, iconColor: C.warning },
  info:    { border: "#BFDBFE", bg: "#F5F8FF", Icon: Bell,          iconColor: C.primary },
};

function AlertRow({ message, time, type }: { message: string; time: string; type: AlertType }) {
  const cfg = ALERT_CFG[type];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <cfg.Icon size={14} color={cfg.iconColor} strokeWidth={2} style={{ marginTop: 1, marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.medium, color: C.text, fontSize: 13 }}>{message}</Text>
        <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 2 }}>{time}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const ALERTS: { message: string; time: string; type: AlertType }[] = [
  { message: "Lot #L-2406 : humidité hors norme (16,2 %)", time: "il y a 12 min", type: "danger" },
  { message: "Réception BC-2406-001 en attente de saisie", time: "il y a 28 min", type: "warning" },
  { message: "OF-2401 — Huile de coton assigné à Équipe A", time: "il y a 1 h", type: "info" },
];

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      {/* Header */}
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <BluwaLogo size={24} />
          <Text style={{ fontFamily: F.extraBold, color: "#fff", fontSize: 14, marginLeft: 10, letterSpacing: 1.2 }}>BLUWA</Text>
        </View>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 12, textTransform: "capitalize", marginBottom: 4 }}>{dateStr}</Text>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 24 }}>Tableau de bord</Text>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 2 }}>Usine principale · Abidjan</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>

        {/* KPIs */}
        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          <KpiCard
            label="BC / BA en attente" value={3} Icon={Truck}
            iconColor={C.primary} iconBg={C.primarySoft}
            onPress={() => router.push("/(tabs)/reception")}
          />
          <KpiCard
            label="Lots en attente QC" value={8} Icon={FlaskConical}
            iconColor={C.danger} iconBg={C.dangerSoft}
            onPress={() => router.push("/(tabs)/qualite")}
          />
        </View>
        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          <KpiCard
            label="OF en cours" value={5} Icon={Factory}
            iconColor={C.success} iconBg={C.successSoft}
            onPress={() => router.push("/(tabs)/of")}
          />
          <KpiCard
            label="Écarts inventaire" value={3} Icon={TrendingUp}
            iconColor={C.warning} iconBg={C.warningSoft}
            onPress={() => router.push("/(tabs)/inventaire")}
          />
        </View>

        {/* Actions rapides */}
        <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 14, marginBottom: 12 }}>Actions rapides</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 28 }}>
          {[
            { label: "Nouvelle\nréception", Icon: Truck, route: "/(tabs)/reception" },
            { label: "Saisie\nqualité",    Icon: FlaskConical, route: "/(tabs)/qualite" },
            { label: "Pointage\nOF",       Icon: Factory, route: "/(tabs)/of" },
          ].map((a) => (
            <TouchableOpacity
              key={a.route}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
              style={{
                flex: 1, alignItems: "center", backgroundColor: C.surface,
                borderRadius: 14, paddingVertical: 14,
                borderWidth: 1, borderColor: C.border,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <a.Icon size={19} color={C.primary} strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 11, textAlign: "center", lineHeight: 15 }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alertes */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 14 }}>Alertes récentes</Text>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Text style={{ fontFamily: F.semiBold, color: C.primary, fontSize: 12 }}>Voir tout</Text>
            <ChevronRight size={13} color={C.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        {ALERTS.map((a, i) => <AlertRow key={i} {...a} />)}
      </View>
    </ScrollView>
  );
}
