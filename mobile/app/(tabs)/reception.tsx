import {
  ScrollView, Text, View, TouchableOpacity, TextInput, RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import {
  Truck, Search, ChevronRight, ChevronLeft, Package, Calendar,
  Hash, Wallet, CheckCircle2, AlertTriangle, Plus, Clock,
  MapPin, X, FileCheck2, Receipt, Ban,
} from "lucide-react-native";
import { C, F } from "../../constants/theme";
import HelpButton from "../../components/HelpButton";

// ── Types alignés ERP ─────────────────────────────────────────────────────────

type StatutReception = "DRAFT" | "VALIDATED" | "CANCELLED";
type QualiteStatut   = "Conforme" | "Reserve" | "NonJuge";
type TypeFournisseur = "Formel" | "Informel";
type StatutQC        = "EnControle" | "Libere" | "Bloque" | "NonConforme";
type PaymentMethod   = "CASH" | "WAVE" | "FLOOZ" | "ORANGE" | "OPEY";
type FluxType        = "BC" | "BA_PLANIFIE" | "BA_DIRECT";

interface ReceptionHeader {
  id: string; numero: string; date: string;
  deliveryNoteNumber: string | null; numeroBon: string | null;
  fournisseur: string; typeFournisseur: TypeFournisseur;
  statut: StatutReception; qualiteStatut: QualiteStatut;
  flux: FluxType;
}

interface ReceptionItem {
  id: string; headerId: string; article: string;
  quantite: number; unite: string;
  lot: string | null; lotFourn: string | null; dlc: string | null;
  humidite: number | null; statutLot: StatutQC | null;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_HEADERS: ReceptionHeader[] = [
  { id: "rh1", numero: "REC-2026-001", date: "2026-05-02", deliveryNoteNumber: "BL-GIE-2604-01", numeroBon: "BC-2406-001", fournisseur: "GIE Boundiali Anacarde",   typeFournisseur: "Formel",   statut: "VALIDATED", qualiteStatut: "Conforme", flux: "BC" },
  { id: "rh2", numero: "REC-2026-002", date: "2026-05-09", deliveryNoteNumber: "BL-COOP-0508",   numeroBon: "BA-2026-019", fournisseur: "Coopérative Korhogo Nord", typeFournisseur: "Informel", statut: "VALIDATED", qualiteStatut: "Reserve",  flux: "BA_PLANIFIE" },
  { id: "rh3", numero: "REC-2026-003", date: "2026-05-28", deliveryNoteNumber: null,             numeroBon: "BC-2406-003", fournisseur: "GIE Ferkessédougou",       typeFournisseur: "Formel",   statut: "DRAFT",     qualiteStatut: "NonJuge",  flux: "BC" },
  { id: "rh4", numero: "REC-2026-004", date: "2026-05-29", deliveryNoteNumber: null,             numeroBon: null,          fournisseur: "Moussa Koné",              typeFournisseur: "Informel", statut: "DRAFT",     qualiteStatut: "NonJuge",  flux: "BA_DIRECT" },
];

const MOCK_ITEMS: ReceptionItem[] = [
  { id: "ri1", headerId: "rh1", article: "Anacarde brut",   quantite: 8.2,  unite: "t", lot: "LOT-ANA-20260502-01", lotFourn: "GIE-001",     dlc: "2027-05-02", humidite: 9.8,  statutLot: "EnControle" },
  { id: "ri2", headerId: "rh2", article: "Coton graine",    quantite: 12.4, unite: "t", lot: "LOT-COT-20260509-01", lotFourn: "COOP-0508",   dlc: "2026-11-09", humidite: 16.2, statutLot: "Bloque" },
  { id: "ri3", headerId: "rh3", article: "Soja décortiqué", quantite: 0,    unite: "t", lot: null,                  lotFourn: null,          dlc: null,         humidite: null, statutLot: null },
  { id: "ri4", headerId: "rh4", article: "Coton graine",    quantite: 4.5,  unite: "t", lot: null,                  lotFourn: null,          dlc: null,         humidite: null, statutLot: null },
];

const BC_OUVERTS = [
  { id: "bc1", numero: "BC-2406-003", fournisseur: "GIE Ferkessédougou",   article: "Soja décortiqué", reste: 15,   unite: "t" },
  { id: "bc2", numero: "BC-2406-004", fournisseur: "Coop. Boundiali",       article: "Coton graine",   reste: 37.6, unite: "t" },
];

const BA_PLANIFIES = [
  { id: "ba1", numero: "BA-2026-020", fournisseur: "Kouyaté Mamadou",   article: "Anacarde brut",  reste: 5,  unite: "t" },
  { id: "ba2", numero: "BA-2026-021", fournisseur: "Groupement Tafiré", article: "Sésame brut",    reste: 3,  unite: "t" },
];

const ARTICLES_CATALOGUE = [
  { id: "a1", libelle: "Coton graine",       unite: "t" },
  { id: "a2", libelle: "Anacarde brut",       unite: "t" },
  { id: "a3", libelle: "Soja décortiqué",     unite: "t" },
  { id: "a4", libelle: "Sésame brut",         unite: "t" },
  { id: "a5", libelle: "Noix de cajou brute", unite: "t" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH",   label: "Espèces" },
  { value: "WAVE",   label: "Wave" },
  { value: "FLOOZ",  label: "Flooz" },
  { value: "ORANGE", label: "Orange" },
  { value: "OPEY",   label: "Opey" },
];

// ── Configs ───────────────────────────────────────────────────────────────────

const FLUX_CFG: Record<FluxType, { label: string; color: string; bg: string; facture: boolean }> = {
  BC:          { label: "BC",        color: C.primary,  bg: C.primarySoft, facture: true },
  BA_PLANIFIE: { label: "BA",        color: "#C2410C",  bg: "#FFF4E8",     facture: false },
  BA_DIRECT:   { label: "BA Direct", color: "#7C3AED",  bg: "#F5F3FF",     facture: false },
};

const STATUT_REC: Record<StatutReception, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  DRAFT:     { label: "En cours", color: C.warning,   bg: C.warningSoft, Icon: Clock },
  VALIDATED: { label: "Validée",  color: C.success,   bg: C.successSoft, Icon: CheckCircle2 },
  CANCELLED: { label: "Annulée",  color: C.textMuted, bg: C.bg,          Icon: X },
};

const QUALITE_CFG: Record<QualiteStatut, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  Conforme: { label: "Conforme",  color: C.success,   bg: C.successSoft, Icon: CheckCircle2 },
  Reserve:  { label: "Réserve",   color: C.warning,   bg: C.warningSoft, Icon: AlertTriangle },
  NonJuge:  { label: "Non jugée", color: C.textMuted, bg: C.bg,          Icon: Clock },
};

const STATUT_QC_CFG: Record<StatutQC, { label: string; color: string; bg: string }> = {
  EnControle:  { label: "En contrôle",  color: C.warning, bg: C.warningSoft },
  Libere:      { label: "Libéré",       color: C.success, bg: C.successSoft },
  Bloque:      { label: "Bloqué",       color: C.danger,  bg: C.dangerSoft },
  NonConforme: { label: "Non conforme", color: C.danger,  bg: C.dangerSoft },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
      <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 12 }}>{value}</Text>
    </View>
  );
}

function InputField({ label, icon, placeholder, value, onChange, numeric }: {
  label: string; icon: React.ReactNode; placeholder: string;
  value: string; onChange: (v: string) => void; numeric?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 }}>
        {icon}
        <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 12 }}>{label}</Text>
      </View>
      <TextInput
        style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontFamily: F.semiBold, color: C.text, fontSize: 14, backgroundColor: C.bg }}
        placeholder={placeholder} placeholderTextColor={C.textMuted}
        keyboardType={numeric ? "numeric" : "default"}
        value={value} onChangeText={onChange}
      />
    </View>
  );
}

function PaymentSelector({ value, onChange }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {PAYMENT_OPTIONS.map(({ value: v, label }) => {
        const active = value === v;
        return (
          <TouchableOpacity key={v} onPress={() => onChange(v)} activeOpacity={0.8}
            style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: active ? C.primarySoft : C.bg, borderWidth: 1, borderColor: active ? C.primary : C.border }}>
            <Text style={{ fontFamily: F.semiBold, fontSize: 13, color: active ? C.primary : C.textMuted }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function FactureBanner({ hasFacture }: { hasFacture: boolean }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 10, marginBottom: 16,
      backgroundColor: hasFacture ? C.successSoft : "#F5F3FF",
      borderWidth: 1, borderColor: hasFacture ? "#A7F3D0" : "#DDD6FE",
    }}>
      {hasFacture
        ? <Receipt size={14} color={C.success} strokeWidth={2} />
        : <Ban size={14} color="#7C3AED" strokeWidth={2} />}
      <Text style={{ fontFamily: F.medium, fontSize: 12, color: hasFacture ? C.success : "#7C3AED", flex: 1 }}>
        {hasFacture
          ? "Ce flux génère une facture fournisseur à valider."
          : "Pas de facture — règlement direct par paiement mobile ou espèces."}
      </Text>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

type Screen = "list" | "detail" | "new_bc" | "new_ba_planifie" | "new_ba_direct";

export default function ReceptionScreen() {
  const [screen, setScreen]         = useState<Screen>("list");
  const [selected, setSelected]     = useState<ReceptionHeader | null>(null);
  const [search, setSearch]         = useState("");
  const [fluxFilter, setFluxFilter] = useState<"all" | FluxType>("all");
  const [statFilter, setStatFilter] = useState<"all" | StatutReception>("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }, []);

  if (screen === "detail" && selected) {
    const items = MOCK_ITEMS.filter((i) => i.headerId === selected.id);
    return <ReceptionDetail header={selected} items={items} onBack={() => setScreen("list")} />;
  }
  if (screen === "new_bc")          return <BCForm          onBack={() => setScreen("list")} />;
  if (screen === "new_ba_planifie") return <BAPlanifieForm  onBack={() => setScreen("list")} />;
  if (screen === "new_ba_direct")   return <BADirectForm    onBack={() => setScreen("list")} />;

  const filtered = MOCK_HEADERS.filter((h) => {
    if (fluxFilter !== "all" && h.flux !== fluxFilter) return false;
    if (statFilter !== "all" && h.statut !== statFilter) return false;
    const q = search.toLowerCase();
    return !q || h.fournisseur.toLowerCase().includes(q) || h.numero.toLowerCase().includes(q) || (h.numeroBon?.toLowerCase().includes(q) ?? false);
  });

  const stats = {
    enCours:   MOCK_HEADERS.filter((h) => h.statut === "DRAFT").length,
    conformes: MOCK_HEADERS.filter((h) => h.qualiteStatut === "Conforme").length,
    reserve:   MOCK_HEADERS.filter((h) => h.qualiteStatut === "Reserve").length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Truck size={20} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 22 }}>Réceptions</Text>
          </View>
          <HelpButton helpKey="reception_liste" />
        </View>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          BC · BA planifié · BA direct
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* KPIs */}
        <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
          {[
            { label: "En cours",  value: stats.enCours,   color: C.warning, bg: C.warningSoft },
            { label: "Conformes", value: stats.conformes, color: C.success, bg: C.successSoft },
            { label: "Réserve",   value: stats.reserve,   color: C.danger,  bg: C.dangerSoft },
          ].map((k) => (
            <View key={k.label} style={{ flex: 1, backgroundColor: k.bg, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extraBold, color: k.color, fontSize: 22 }}>{k.value}</Text>
              <Text style={{ fontFamily: F.medium, color: k.color, fontSize: 11, marginTop: 2 }}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* 3 boutons flux */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
            Nouvelle réception
          </Text>
          <View style={{ gap: 8 }}>

            {/* BC */}
            <TouchableOpacity onPress={() => setScreen("new_bc")} activeOpacity={0.85}
              style={{ backgroundColor: C.surface, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Text style={{ fontFamily: F.extraBold, color: C.primary, fontSize: 13 }}>BC</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 14 }}>Sur Bon de Commande</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                  <Receipt size={11} color={C.success} strokeWidth={2} />
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Fournisseur formel · Avec facture</Text>
                </View>
              </View>
              <ChevronRight size={15} color={C.textMuted} strokeWidth={2} />
            </TouchableOpacity>

            {/* BA planifié */}
            <TouchableOpacity onPress={() => setScreen("new_ba_planifie")} activeOpacity={0.85}
              style={{ backgroundColor: C.surface, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#FFF4E8", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Text style={{ fontFamily: F.extraBold, color: "#C2410C", fontSize: 13 }}>BA</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 14 }}>Sur Bon d'Achat planifié</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                  <Ban size={11} color="#7C3AED" strokeWidth={2} />
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Producteur informel · Sans facture</Text>
                </View>
              </View>
              <ChevronRight size={15} color={C.textMuted} strokeWidth={2} />
            </TouchableOpacity>

            {/* BA direct */}
            <TouchableOpacity onPress={() => setScreen("new_ba_direct")} activeOpacity={0.85}
              style={{ backgroundColor: C.surface, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Plus size={18} color="#7C3AED" strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 14 }}>Achat direct (BA auto)</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                  <Ban size={11} color="#7C3AED" strokeWidth={2} />
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Spontané · Prix du jour · Sans facture</Text>
                </View>
              </View>
              <ChevronRight size={15} color={C.textMuted} strokeWidth={2} />
            </TouchableOpacity>

          </View>
        </View>

        {/* Filtres */}
        <View style={{ paddingHorizontal: 12, marginBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.border, marginBottom: 8 }}>
            <Search size={14} color={C.textMuted} strokeWidth={2} style={{ marginRight: 8 }} />
            <TextInput style={{ flex: 1, fontFamily: F.regular, color: C.text, fontSize: 14 }}
              placeholder="N°, fournisseur, bon…" placeholderTextColor={C.textMuted}
              value={search} onChangeText={setSearch} />
            {search ? <TouchableOpacity onPress={() => setSearch("")}><X size={14} color={C.textMuted} strokeWidth={2} /></TouchableOpacity> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {([
              { key: "all",         label: "Tous" },
              { key: "BC",          label: "BC" },
              { key: "BA_PLANIFIE", label: "BA planifié" },
              { key: "BA_DIRECT",   label: "BA direct" },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity key={key} onPress={() => setFluxFilter(key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: fluxFilter === key ? C.header : C.surface, borderWidth: 1, borderColor: fluxFilter === key ? C.header : C.border }}>
                <Text style={{ fontFamily: F.semiBold, fontSize: 12, color: fluxFilter === key ? "#fff" : C.textMuted }}>{label}</Text>
              </TouchableOpacity>
            ))}
            {(["DRAFT", "VALIDATED"] as const).map((v) => (
              <TouchableOpacity key={v} onPress={() => setStatFilter(statFilter === v ? "all" : v)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: statFilter === v ? C.header : C.surface, borderWidth: 1, borderColor: statFilter === v ? C.header : C.border }}>
                <Text style={{ fontFamily: F.semiBold, fontSize: 12, color: statFilter === v ? "#fff" : C.textMuted }}>
                  {v === "DRAFT" ? "En cours" : "Validées"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Liste */}
        <View style={{ padding: 12 }}>
          <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
            {filtered.length} réception{filtered.length !== 1 ? "s" : ""}
          </Text>
          {filtered.map((h) => {
            const s  = STATUT_REC[h.statut];
            const q  = QUALITE_CFG[h.qualiteStatut];
            const fl = FLUX_CFG[h.flux];
            return (
              <TouchableOpacity key={h.id} onPress={() => { setSelected(h); setScreen("detail"); }} activeOpacity={0.85}
                style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: h.qualiteStatut === "Reserve" ? "#FED7AA" : C.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{h.numero} · {h.date}</Text>
                    <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 15, marginTop: 2 }}>{h.fournisseur}</Text>
                  </View>
                  <ChevronRight size={15} color={C.textMuted} strokeWidth={2} style={{ marginTop: 4 }} />
                </View>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                  <View style={{ backgroundColor: fl.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.bold, color: fl.color, fontSize: 11 }}>{h.numeroBon ?? fl.label}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: s.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <s.Icon size={10} color={s.color} strokeWidth={2} />
                    <Text style={{ fontFamily: F.semiBold, color: s.color, fontSize: 11 }}>{s.label}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: q.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <q.Icon size={10} color={q.color} strokeWidth={2} />
                    <Text style={{ fontFamily: F.semiBold, color: q.color, fontSize: 11 }}>{q.label}</Text>
                  </View>
                  {!fl.facture && (
                    <View style={{ backgroundColor: "#F5F3FF", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: F.semiBold, color: "#7C3AED", fontSize: 11 }}>Sans facture</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Détail réception ──────────────────────────────────────────────────────────

function ReceptionDetail({ header, items, onBack }: { header: ReceptionHeader; items: ReceptionItem[]; onBack: () => void }) {
  const s  = STATUT_REC[header.statut];
  const q  = QUALITE_CFG[header.qualiteStatut];
  const fl = FLUX_CFG[header.flux];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{header.numero} · {header.date}</Text>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18, marginTop: 2 }}>{header.fournisseur}</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <View style={{ backgroundColor: fl.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontFamily: F.bold, color: fl.color, fontSize: 11 }}>{fl.label}{fl.facture ? " · Avec facture" : " · Sans facture"}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: s.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
            <s.Icon size={10} color={s.color} strokeWidth={2} />
            <Text style={{ fontFamily: F.semiBold, color: s.color, fontSize: 11 }}>{s.label}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: q.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
            <q.Icon size={10} color={q.color} strokeWidth={2} />
            <Text style={{ fontFamily: F.semiBold, color: q.color, fontSize: 11 }}>{q.label}</Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Informations</SectionLabel>
          <FieldRow label="Type fournisseur"      value={header.typeFournisseur} />
          <FieldRow label="Document lié"           value={header.numeroBon} />
          <FieldRow label="Bordereau de livraison" value={header.deliveryNoteNumber} />
        </View>

        {items.map((item) => {
          const qc = item.statutLot ? STATUT_QC_CFG[item.statutLot] : null;
          return (
            <View key={item.id} style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: item.statutLot === "Bloque" ? "#FCA5A5" : C.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 15, flex: 1 }}>{item.article}</Text>
                {qc && (
                  <View style={{ backgroundColor: qc.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.semiBold, color: qc.color, fontSize: 11 }}>{qc.label}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 24, marginBottom: 10 }}>
                <View>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>Quantité reçue</Text>
                  <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 16 }}>{item.quantite} {item.unite}</Text>
                </View>
                {item.humidite !== null && (
                  <View>
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>Humidité</Text>
                    <Text style={{ fontFamily: F.bold, color: item.humidite > 14 ? C.danger : C.text, fontSize: 16 }}>{item.humidite} %</Text>
                  </View>
                )}
              </View>
              <FieldRow label="Lot Bluwa"        value={item.lot} />
              <FieldRow label="Lot fournisseur"  value={item.lotFourn} />
              <FieldRow label="DLC"              value={item.dlc} />
            </View>
          );
        })}

        {header.statut === "DRAFT" && (
          <>
            <TouchableOpacity activeOpacity={0.85} style={{ backgroundColor: C.success, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
              <FileCheck2 size={17} color="#fff" strokeWidth={2} />
              <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Valider la réception</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={{ backgroundColor: C.dangerSoft, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FECACA" }}>
              <AlertTriangle size={15} color={C.danger} strokeWidth={2} />
              <Text style={{ fontFamily: F.semiBold, color: C.danger, fontSize: 14 }}>Signaler une réserve</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ── Flux 1 : BC (Bon de Commande — avec facture) ──────────────────────────────

function BCForm({ onBack }: { onBack: () => void }) {
  const [selectedBC, setSelectedBC] = useState(BC_OUVERTS[0]);
  const [quantite, setQuantite]     = useState("");
  const [lotFourn, setLotFourn]     = useState("");
  const [dlc, setDlc]               = useState("");
  const [blNumber, setBlNumber]     = useState("");
  const [carrier, setCarrier]       = useState("");
  const [qualite, setQualite]       = useState<QualiteStatut>("NonJuge");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
          </TouchableOpacity>
          <HelpButton helpKey="reception_bc" />
        </View>
        <View style={{ backgroundColor: C.primarySoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6 }}>
          <Text style={{ fontFamily: F.bold, color: C.primary, fontSize: 11 }}>BC · Formel</Text>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18 }}>Réception sur BC</Text>
      </View>

      <View style={{ padding: 16 }}>
        <FactureBanner hasFacture={true} />

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Sélectionner le bon de commande</SectionLabel>
          {BC_OUVERTS.map((bc) => {
            const active = selectedBC.id === bc.id;
            return (
              <TouchableOpacity key={bc.id} onPress={() => setSelectedBC(bc)} activeOpacity={0.8}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6, backgroundColor: active ? C.primarySoft : C.bg, borderWidth: 1, borderColor: active ? C.primary : C.border }}>
                <View style={{ width: 16, height: 16, borderRadius: 99, borderWidth: 2, borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {active && <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: "#fff" }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semiBold, color: active ? C.primary : C.text, fontSize: 13 }}>{bc.numero} — {bc.fournisseur}</Text>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{bc.article} · Reste : {bc.reste} {bc.unite}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Réception physique</SectionLabel>
          <InputField label={`Quantité reçue (${selectedBC.unite})`} icon={<Package size={13} color={C.textMuted} strokeWidth={2} />} placeholder={`0,000 ${selectedBC.unite}`} value={quantite} onChange={setQuantite} numeric />
          <InputField label="N° lot fournisseur" icon={<Hash size={13} color={C.textMuted} strokeWidth={2} />} placeholder="LOT-XXXX" value={lotFourn} onChange={setLotFourn} />
          <InputField label="DLC" icon={<Calendar size={13} color={C.textMuted} strokeWidth={2} />} placeholder="AAAA-MM-JJ" value={dlc} onChange={setDlc} />
          <InputField label="N° bordereau de livraison" icon={<Hash size={13} color={C.textMuted} strokeWidth={2} />} placeholder="BL-XXXX" value={blNumber} onChange={setBlNumber} />
          <InputField label="Chauffeur / Immatriculation" icon={<MapPin size={13} color={C.textMuted} strokeWidth={2} />} placeholder="Nom · AB-1234-CI" value={carrier} onChange={setCarrier} />
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Appréciation qualité</SectionLabel>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["NonJuge", "Conforme", "Reserve"] as QualiteStatut[]).map((v) => {
              const active = qualite === v;
              const cfg = QUALITE_CFG[v];
              return (
                <TouchableOpacity key={v} onPress={() => setQualite(v)} activeOpacity={0.8}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: active ? cfg.bg : C.bg, borderWidth: 1, borderColor: active ? cfg.color : C.border }}>
                  <cfg.Icon size={12} color={active ? cfg.color : C.textMuted} strokeWidth={2} />
                  <Text style={{ fontFamily: F.semiBold, fontSize: 11, color: active ? cfg.color : C.textMuted }}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Valider la réception</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: C.primarySoft, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <CheckCircle2 size={14} color={C.primary} strokeWidth={2} style={{ marginTop: 1 }} />
          <Text style={{ fontFamily: F.regular, color: C.primary, fontSize: 12, flex: 1 }}>
            Un lot qualité (En contrôle) sera automatiquement créé. La facture fournisseur sera générée dans l'ERP.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Flux 2 : BA planifié (sans facture) ───────────────────────────────────────

function BAPlanifieForm({ onBack }: { onBack: () => void }) {
  const [selectedBA, setSelectedBA] = useState(BA_PLANIFIES[0]);
  const [quantite, setQuantite]     = useState("");
  const [lotFourn, setLotFourn]     = useState("");
  const [carrier, setCarrier]       = useState("");
  const [payment, setPayment]       = useState<PaymentMethod>("CASH");
  const [qualite, setQualite]       = useState<QualiteStatut>("NonJuge");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
          </TouchableOpacity>
          <HelpButton helpKey="reception_ba_planifie" />
        </View>
        <View style={{ backgroundColor: "#FFF4E8", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6 }}>
          <Text style={{ fontFamily: F.bold, color: "#C2410C", fontSize: 11 }}>BA · Planifié</Text>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18 }}>Réception sur BA planifié</Text>
      </View>

      <View style={{ padding: 16 }}>
        <FactureBanner hasFacture={false} />

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Sélectionner le bon d'achat</SectionLabel>
          {BA_PLANIFIES.map((ba) => {
            const active = selectedBA.id === ba.id;
            return (
              <TouchableOpacity key={ba.id} onPress={() => setSelectedBA(ba)} activeOpacity={0.8}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6, backgroundColor: active ? "#FFF4E8" : C.bg, borderWidth: 1, borderColor: active ? "#C2410C" : C.border }}>
                <View style={{ width: 16, height: 16, borderRadius: 99, borderWidth: 2, borderColor: active ? "#C2410C" : C.border, backgroundColor: active ? "#C2410C" : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {active && <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: "#fff" }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semiBold, color: active ? "#C2410C" : C.text, fontSize: 13 }}>{ba.numero} — {ba.fournisseur}</Text>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{ba.article} · Reste : {ba.reste} {ba.unite}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Réception physique</SectionLabel>
          <InputField label={`Quantité reçue (${selectedBA.unite})`} icon={<Package size={13} color={C.textMuted} strokeWidth={2} />} placeholder={`0,000 ${selectedBA.unite}`} value={quantite} onChange={setQuantite} numeric />
          <InputField label="N° lot / date du jour" icon={<Hash size={13} color={C.textMuted} strokeWidth={2} />} placeholder="2026-05-29" value={lotFourn} onChange={setLotFourn} />
          <InputField label="Chauffeur / Immatriculation" icon={<MapPin size={13} color={C.textMuted} strokeWidth={2} />} placeholder="Nom · AB-1234-CI" value={carrier} onChange={setCarrier} />
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Moyen de paiement</SectionLabel>
          <PaymentSelector value={payment} onChange={setPayment} />
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Appréciation qualité</SectionLabel>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["NonJuge", "Conforme", "Reserve"] as QualiteStatut[]).map((v) => {
              const active = qualite === v;
              const cfg = QUALITE_CFG[v];
              return (
                <TouchableOpacity key={v} onPress={() => setQualite(v)} activeOpacity={0.8}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: active ? cfg.bg : C.bg, borderWidth: 1, borderColor: active ? cfg.color : C.border }}>
                  <cfg.Icon size={12} color={active ? cfg.color : C.textMuted} strokeWidth={2} />
                  <Text style={{ fontFamily: F.semiBold, fontSize: 11, color: active ? cfg.color : C.textMuted }}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={{ backgroundColor: "#C2410C", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Valider la réception</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: "#FFF4E8", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <CheckCircle2 size={14} color="#C2410C" strokeWidth={2} style={{ marginTop: 1 }} />
          <Text style={{ fontFamily: F.regular, color: "#C2410C", fontSize: 12, flex: 1 }}>
            Un paiement {payment} + un lot qualité (En contrôle) seront créés. Aucune facture générée.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Flux 3 : BA direct / spontané (sans facture) ──────────────────────────────

function BADirectForm({ onBack }: { onBack: () => void }) {
  const [articleId, setArticleId]       = useState(ARTICLES_CATALOGUE[0].id);
  const [quantite, setQuantite]         = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [carrier, setCarrier]           = useState("");
  const [payment, setPayment]           = useState<PaymentMethod>("CASH");

  const article = ARTICLES_CATALOGUE.find((a) => a.id === articleId)!;
  const total   = (() => {
    const q = parseFloat(quantite.replace(",", "."));
    const p = parseFloat(prixUnitaire.replace(",", "."));
    return !isNaN(q) && !isNaN(p) ? (q * p).toLocaleString("fr-FR") + " FCFA" : null;
  })();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
          </TouchableOpacity>
          <HelpButton helpKey="reception_ba_direct" />
        </View>
        <View style={{ backgroundColor: "#F5F3FF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6 }}>
          <Text style={{ fontFamily: F.bold, color: "#7C3AED", fontSize: 11 }}>BA · Direct</Text>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18 }}>Achat direct spontané</Text>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>
          Le BA est généré automatiquement à la validation
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        <FactureBanner hasFacture={false} />

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Producteur / Fournisseur</SectionLabel>
          <InputField label="Nom du producteur" icon={<Package size={13} color={C.textMuted} strokeWidth={2} />} placeholder="Nom ou groupement" value={supplierName} onChange={setSupplierName} />
          <InputField label="Chauffeur / Immatriculation" icon={<MapPin size={13} color={C.textMuted} strokeWidth={2} />} placeholder="Nom · AB-1234-CI" value={carrier} onChange={setCarrier} />
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Moyen de paiement</SectionLabel>
          <PaymentSelector value={payment} onChange={setPayment} />
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Matière première</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 16 }}>
            {ARTICLES_CATALOGUE.map((a) => {
              const active = articleId === a.id;
              return (
                <TouchableOpacity key={a.id} onPress={() => setArticleId(a.id)} activeOpacity={0.8}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: active ? "#7C3AED" : C.bg, borderWidth: 1, borderColor: active ? "#7C3AED" : C.border }}>
                  <Text style={{ fontFamily: F.semiBold, fontSize: 12, color: active ? "#fff" : C.textSub }}>{a.libelle}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <InputField label={`Quantité (${article.unite})`} icon={<Package size={13} color={C.textMuted} strokeWidth={2} />} placeholder={`0,000 ${article.unite}`} value={quantite} onChange={setQuantite} numeric />
          <InputField label="Prix unitaire (FCFA / t)" icon={<Wallet size={13} color={C.textMuted} strokeWidth={2} />} placeholder="0" value={prixUnitaire} onChange={setPrixUnitaire} numeric />
          {total && (
            <View style={{ backgroundColor: "#F5F3FF", borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: F.regular, color: "#7C3AED", fontSize: 13 }}>Montant total</Text>
              <Text style={{ fontFamily: F.extraBold, color: "#7C3AED", fontSize: 18 }}>{total}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity activeOpacity={0.85} style={{ backgroundColor: "#7C3AED", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Valider l'achat direct</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: "#F5F3FF", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <CheckCircle2 size={14} color="#7C3AED" strokeWidth={2} style={{ marginTop: 1 }} />
          <Text style={{ fontFamily: F.regular, color: "#7C3AED", fontSize: 12, flex: 1 }}>
            BA (AUTO_APPROVED) + paiement {payment} + lot qualité (En contrôle) générés automatiquement. Aucune facture.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
