import {
  ScrollView, Text, View, TouchableOpacity, TextInput,
  RefreshControl, Modal, Platform,
} from "react-native";
import { useState, useCallback, useRef } from "react";
import {
  Factory, ChevronRight, ChevronLeft, Users, Clock, AlertTriangle,
  CheckCircle2, Play, Pause, Square, Plus, Package, Barcode,
  Activity, Zap, RotateCcw, FlaskConical, PackageCheck,
  ShieldAlert, Check, X, Hash, Trash2,
} from "lucide-react-native";
import { C, F } from "../../constants/theme";
import HelpButton from "../../components/HelpButton";

// ── Types alignés ERP ─────────────────────────────────────────────────────────

type StatutOF = "EnAttenteComposants" | "Planifie" | "EnCours" | "ControleQualite" | "Dispo" | "Termine";
type StatutPicking = "AValider" | "Valide";
type EtatLigne = "EnProduction" | "EnPause" | "Arret" | "Reglage";
type MotifArret = "PanneMachine" | "ManqueComposants" | "PauseOperateur" | "Nettoyage" | "ReglageCalibrage" | "Autre";
type TypeEvenement = "Lancement" | "Declaration" | "Arret" | "Reprise" | "FinProd" | "Rebut" | "ClotureLot";
type RebutMotif = "CasseMecanique" | "DefautQualite" | "Deversement" | "ControlNC" | "Autre";

interface OF {
  id: string; numero: string; produitFini: string; sku: string;
  qty: number; realise: number; unite: string;
  lotPF: string | null; ligne: string; operateur: string | null;
  dateBesoin: string; debutPlanif: string;
  picking: StatutPicking; statut: StatutOF;
}

interface Composant {
  id: string; ofId: string; article: string; codeArticle: string;
  qteRequise: number; qtePrelevee: number; unite: string;
  lotStockDisponible: string; codeBarre: string; scanned: boolean;
}

interface Evenement {
  id: string; type: TypeEvenement; heure: string; detail: string; operateur: string;
}

// ── Config statuts ────────────────────────────────────────────────────────────

const STATUT_CFG: Record<StatutOF, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  EnAttenteComposants: { label: "En attente composants", color: "#C2410C", bg: "#FFF4E8", Icon: Package },
  Planifie:            { label: "Planifié",              color: C.primary,  bg: C.primarySoft, Icon: Clock },
  EnCours:             { label: "En cours",              color: "#BE123C",  bg: "#FFF1F2", Icon: Activity },
  ControleQualite:     { label: "Contrôle qualité",      color: C.warning,  bg: C.warningSoft, Icon: FlaskConical },
  Dispo:               { label: "Dispo",                 color: C.success,  bg: C.successSoft, Icon: CheckCircle2 },
  Termine:             { label: "Terminé",               color: C.textMuted,bg: C.bg, Icon: Check },
};

const TRANSITION_LABEL: Partial<Record<StatutOF, string>> = {
  EnAttenteComposants: "Valider le picking",
  Planifie:            "Lancer l'OF",
  EnCours:             "Terminer la production",
  ControleQualite:     "Libérer",
  Dispo:               "Archiver",
};

const ETAT_LIGNE_CFG: Record<EtatLigne, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  EnProduction: { label: "En production", color: "#BE123C", bg: "#FFF1F2", Icon: Activity },
  EnPause:      { label: "En pause",      color: C.warning,  bg: C.warningSoft, Icon: Pause },
  Arret:        { label: "Arrêt",         color: C.danger,   bg: C.dangerSoft,  Icon: Square },
  Reglage:      { label: "Réglage",       color: C.primary,  bg: C.primarySoft, Icon: Zap },
};

const MOTIF_LABELS: Record<MotifArret, string> = {
  PanneMachine:     "Panne machine",
  ManqueComposants: "Manque composants",
  PauseOperateur:   "Pause opérateur",
  Nettoyage:        "Nettoyage / CIP",
  ReglageCalibrage: "Réglage / Calibrage",
  Autre:            "Autre",
};

const REBUT_MOTIF_LABELS: Record<RebutMotif, string> = {
  CasseMecanique: "Casse mécanique",
  DefautQualite:  "Défaut qualité",
  Deversement:    "Déversement accidentel",
  ControlNC:      "Lot rejeté (CCP NC)",
  Autre:          "Autre",
};

type CCPKey = "pH" | "tempPast" | "brix" | "tempRefr";
const CCP_SPECS: Array<{ key: CCPKey; label: string; unit: string; spec: string; placeholder: string; validate: (n: number) => boolean }> = [
  { key: "pH",       label: "pH",                   unit: "",    spec: "2.8 – 3.8",   placeholder: "3.2",  validate: (n) => n >= 2.8 && n <= 3.8 },
  { key: "tempPast", label: "Temp. pasteurisation", unit: "°C",  spec: "≥ 85 °C",     placeholder: "90",   validate: (n) => n >= 85 },
  { key: "brix",     label: "Brix",                 unit: "°Bx", spec: "12.0 – 16.0", placeholder: "14.5", validate: (n) => n >= 12 && n <= 16 },
  { key: "tempRefr", label: "Temp. refroidissement",unit: "°C",  spec: "≤ 25 °C",     placeholder: "20",   validate: (n) => n <= 25 },
];

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_OFS: OF[] = [
  { id: "1", numero: "OF-2026-045", produitFini: "Huile de coton raffinée 5L", sku: "PF-HCR-005", qty: 500,  realise: 0,   unite: "bidon", lotPF: null,        ligne: "L1", operateur: null,        dateBesoin: "2026-05-30", debutPlanif: "2026-05-29", picking: "AValider", statut: "EnAttenteComposants" },
  { id: "2", numero: "OF-2026-044", produitFini: "Tourteau de coton 45% — 50kg", sku: "PF-TOU-050", qty: 200,  realise: 0,   unite: "sac",   lotPF: null,        ligne: "L2", operateur: "Kouamé A.", dateBesoin: "2026-05-29", debutPlanif: "2026-05-28", picking: "Valide",   statut: "Planifie" },
  { id: "3", numero: "OF-2026-043", produitFini: "Anacarde décortiqué W320",    sku: "PF-ANA-W32", qty: 180,  realise: 80,  unite: "kg",    lotPF: null,        ligne: "L1", operateur: "Ousmane B.",dateBesoin: "2026-05-29", debutPlanif: "2026-05-28", picking: "Valide",   statut: "EnCours" },
  { id: "4", numero: "OF-2026-042", produitFini: "Coton égrené fibre",          sku: "PF-COT-FIB", qty: 150,  realise: 150, unite: "t",     lotPF: "LOT-PF-042",ligne: "L2", operateur: "Fatou N.",  dateBesoin: "2026-05-28", debutPlanif: "2026-05-27", picking: "Valide",   statut: "ControleQualite" },
  { id: "5", numero: "OF-2026-041", produitFini: "Huile de coton brute",        sku: "PF-HCB-001", qty: 300,  realise: 300, unite: "L",     lotPF: "LOT-PF-041",ligne: "L1", operateur: "Mamadou D.",dateBesoin: "2026-05-25", debutPlanif: "2026-05-24", picking: "Valide",   statut: "Dispo" },
];

const MOCK_COMPOSANTS: Record<string, Composant[]> = {
  "1": [
    { id: "c1", ofId: "1", article: "Coton graine brut",   codeArticle: "MAT-001", qteRequise: 1200, qtePrelevee: 0, unite: "kg", lotStockDisponible: "LOT-COT-20260527-01", codeBarre: "3700123456789", scanned: false },
    { id: "c2", ofId: "1", article: "Solvant hexane",      codeArticle: "CHI-012", qteRequise: 80,   qtePrelevee: 0, unite: "L",  lotStockDisponible: "LOT-CHI-20260520-01", codeBarre: "3700987654321", scanned: false },
    { id: "c3", ofId: "1", article: "Bidon plastique 5L",  codeArticle: "PKG-050", qteRequise: 500,  qtePrelevee: 0, unite: "u",  lotStockDisponible: "LOT-PKG-20260515-01", codeBarre: "3701234567890", scanned: false },
  ],
  "2": [
    { id: "c4", ofId: "2", article: "Tourteau de coton brut", codeArticle: "MAT-002", qteRequise: 2000, qtePrelevee: 2000, unite: "kg", lotStockDisponible: "LOT-TOU-20260528-01", codeBarre: "3700111222333", scanned: true },
    { id: "c5", ofId: "2", article: "Sac PP 50kg",            codeArticle: "PKG-010", qteRequise: 200,  qtePrelevee: 200,  unite: "u",  lotStockDisponible: "LOT-PKG-20260515-01", codeBarre: "3700444555666", scanned: true },
  ],
};

const MOCK_JOURNAL: Evenement[] = [
  { id: "e4", type: "Declaration", heure: "09:30", detail: "+20 kg déclarés (cumul 80/180 kg)", operateur: "Ousmane B." },
  { id: "e3", type: "Arret",       heure: "09:00", detail: "Arrêt — Réglage / Calibrage (15 min)", operateur: "Ousmane B." },
  { id: "e2", type: "Lancement",   heure: "08:15", detail: "Lancement production — Anacarde décortiqué W320", operateur: "Ousmane B." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 99, height: 6 }}>
      <View style={{ backgroundColor: color, borderRadius: 99, height: 6, width: `${Math.min(value, 100)}%` }} />
    </View>
  );
}

function EventIcon({ type }: { type: TypeEvenement }) {
  const cfg: Record<TypeEvenement, { Icon: React.ElementType; color: string }> = {
    Lancement:   { Icon: Play,         color: C.primary },
    Declaration: { Icon: Plus,         color: C.success },
    Arret:       { Icon: Square,       color: C.danger },
    Reprise:     { Icon: RotateCcw,    color: C.warning },
    FinProd:     { Icon: CheckCircle2, color: C.success },
    Rebut:       { Icon: Trash2,       color: C.danger },
    ClotureLot:  { Icon: PackageCheck, color: "#7C3AED" },
  };
  const { Icon, color } = cfg[type];
  return (
    <View style={{ width: 28, height: 28, borderRadius: 99, backgroundColor: color + "20", alignItems: "center", justifyContent: "center" }}>
      <Icon size={13} color={color} strokeWidth={2} />
    </View>
  );
}

// ── Screen principal ──────────────────────────────────────────────────────────

type Screen = "list" | "detail" | "picking" | "mes";

export default function OFScreen() {
  const [ofs, setOfs]           = useState<OF[]>(MOCK_OFS);
  const [composants, setComposants] = useState(MOCK_COMPOSANTS);
  const [screen, setScreen]     = useState<Screen>("list");
  const [selected, setSelected] = useState<OF | null>(null);
  const [filter, setFilter]     = useState<"all" | StatutOF>("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }, []);

  function advanceStatut(of: OF) {
    const next: Partial<Record<StatutOF, StatutOF>> = {
      EnAttenteComposants: "Planifie",
      Planifie:            "EnCours",
      EnCours:             "ControleQualite",
      ControleQualite:     "Dispo",
      Dispo:               "Termine",
    };
    const nextStatut = next[of.statut];
    if (!nextStatut) return;
    setOfs((prev) => prev.map((o) => o.id === of.id ? { ...o, statut: nextStatut, picking: nextStatut !== "EnAttenteComposants" ? "Valide" : o.picking } : o));
    if (selected?.id === of.id) setSelected((prev) => prev ? { ...prev, statut: nextStatut } : prev);
  }

  if (screen === "detail" && selected) {
    return (
      <OFDetail
        of={selected}
        onBack={() => setScreen("list")}
        onPicking={() => setScreen("picking")}
        onMES={() => setScreen("mes")}
        onAdvance={() => advanceStatut(selected)}
      />
    );
  }
  if (screen === "picking" && selected) {
    return (
      <PickingScreen
        of={selected}
        composants={composants[selected.id] ?? []}
        onUpdate={(updated) => setComposants((prev) => ({ ...prev, [selected.id]: updated }))}
        onBack={() => setScreen("detail")}
        onValidate={() => { advanceStatut(selected); setScreen("detail"); }}
      />
    );
  }
  if (screen === "mes" && selected) {
    return <MESScreen of={selected} onBack={() => setScreen("detail")} onFinish={() => { advanceStatut(selected); setScreen("detail"); }} />;
  }

  const filtered = ofs.filter((o) => filter === "all" || o.statut === filter);

  const stats = {
    enCours:  ofs.filter((o) => o.statut === "EnCours").length,
    picking:  ofs.filter((o) => o.picking === "AValider" && o.statut !== "Termine").length,
    qualite:  ofs.filter((o) => o.statut === "ControleQualite").length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Factory size={20} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 22 }}>Production</Text>
          </View>
          <HelpButton helpKey="of_liste" />
        </View>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          {stats.enCours} en cours · {stats.picking} picking à valider · {stats.qualite} en QC
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* KPIs */}
        <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
          {[
            { label: "En cours",    value: stats.enCours, color: "#BE123C", bg: "#FFF1F2" },
            { label: "Picking",     value: stats.picking, color: "#C2410C", bg: "#FFF4E8" },
            { label: "Contrôle QC", value: stats.qualite, color: C.warning, bg: C.warningSoft },
          ].map((k) => (
            <View key={k.label} style={{ flex: 1, backgroundColor: k.bg, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extraBold, color: k.color, fontSize: 22 }}>{k.value}</Text>
              <Text style={{ fontFamily: F.medium, color: k.color, fontSize: 11, marginTop: 2, textAlign: "center" }}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Filtres statut */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, marginBottom: 12 }}>
          {([
            { key: "all",                label: "Tous" },
            { key: "EnAttenteComposants",label: "Composants" },
            { key: "Planifie",           label: "Planifié" },
            { key: "EnCours",            label: "En cours" },
            { key: "ControleQualite",    label: "QC" },
            { key: "Dispo",              label: "Dispo" },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity key={key} onPress={() => setFilter(key)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: filter === key ? C.header : C.surface, borderWidth: 1, borderColor: filter === key ? C.header : C.border }}>
              <Text style={{ fontFamily: F.semiBold, fontSize: 12, color: filter === key ? "#fff" : C.textMuted }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Liste OF */}
        <View style={{ paddingHorizontal: 12 }}>
          {filtered.map((of) => {
            const s   = STATUT_CFG[of.statut];
            const pct = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0;
            return (
              <TouchableOpacity key={of.id} onPress={() => { setSelected(of); setScreen("detail"); }} activeOpacity={0.85}
                style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{of.numero}</Text>
                    <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 15, marginTop: 2 }} numberOfLines={1}>{of.produitFini}</Text>
                  </View>
                  <ChevronRight size={15} color={C.textMuted} strokeWidth={2} style={{ marginTop: 4 }} />
                </View>

                <View style={{ flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: s.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <s.Icon size={10} color={s.color} strokeWidth={2} />
                    <Text style={{ fontFamily: F.semiBold, color: s.color, fontSize: 11 }}>{s.label}</Text>
                  </View>
                  {of.picking === "AValider" && of.statut !== "Termine" && (
                    <View style={{ backgroundColor: "#FFF4E8", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: F.semiBold, color: "#C2410C", fontSize: 11 }}>Picking à valider</Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: C.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{of.ligne}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>
                    {of.realise} / {of.qty} {of.unite}
                  </Text>
                  <Text style={{ fontFamily: F.semiBold, color: s.color, fontSize: 12 }}>{pct} %</Text>
                </View>
                <ProgressBar value={pct} color={s.color} />

                {of.operateur && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
                    <Users size={11} color={C.textMuted} strokeWidth={2} />
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{of.operateur} · Besoin : {of.dateBesoin}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Détail OF ─────────────────────────────────────────────────────────────────

function OFDetail({ of, onBack, onPicking, onMES, onAdvance }: {
  of: OF; onBack: () => void; onPicking: () => void; onMES: () => void; onAdvance: () => void;
}) {
  const s   = STATUT_CFG[of.statut];
  const pct = of.qty > 0 ? Math.round((of.realise / of.qty) * 100) : 0;
  const nextLabel = TRANSITION_LABEL[of.statut];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: s.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
            <s.Icon size={10} color={s.color} strokeWidth={2} />
            <Text style={{ fontFamily: F.semiBold, color: s.color, fontSize: 11 }}>{s.label}</Text>
          </View>
          <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{of.numero}</Text>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18 }}>{of.produitFini}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
          <Factory size={12} color="rgba(255,255,255,0.4)" strokeWidth={2} />
          <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{of.ligne} · {of.operateur ?? "Opérateur non assigné"}</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* Progression */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Progression</SectionLabel>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: F.regular, color: C.textSub, fontSize: 13 }}>Réalisé</Text>
            <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 15 }}>{of.realise} / {of.qty} {of.unite}</Text>
          </View>
          <ProgressBar value={pct} color={s.color} />
          <Text style={{ fontFamily: F.medium, color: C.textMuted, fontSize: 12, textAlign: "right", marginTop: 5 }}>{pct} %</Text>
        </View>

        {/* Infos */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Informations</SectionLabel>
          {[
            { label: "SKU", value: of.sku },
            { label: "Ligne", value: of.ligne },
            { label: "Début planifié", value: of.debutPlanif },
            { label: "Date besoin", value: of.dateBesoin },
            { label: "Lot PF", value: of.lotPF ?? "—" },
            { label: "Picking", value: of.picking === "Valide" ? "✓ Validé" : "⚠ À valider" },
          ].map(({ label, value }) => (
            <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 13 }}>{label}</Text>
              <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 13 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Actions contextuelles */}
        {of.statut === "EnAttenteComposants" && (
          <TouchableOpacity onPress={onPicking} activeOpacity={0.85}
            style={{ backgroundColor: "#C2410C", borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <Barcode size={17} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Préparer les composants (Picking)</Text>
          </TouchableOpacity>
        )}

        {(of.statut === "Planifie" || of.statut === "EnCours") && (
          <TouchableOpacity onPress={onMES} activeOpacity={0.85}
            style={{ backgroundColor: "#BE123C", borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <Activity size={17} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Tableau de bord MES</Text>
          </TouchableOpacity>
        )}

        {nextLabel && of.statut !== "EnAttenteComposants" && of.statut !== "Planifie" && of.statut !== "EnCours" && (
          <TouchableOpacity onPress={onAdvance} activeOpacity={0.85}
            style={{ backgroundColor: C.success, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <CheckCircle2 size={17} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>{nextLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// ── Picking — préparation des composants ──────────────────────────────────────

function PickingScreen({ of, composants, onUpdate, onBack, onValidate }: {
  of: OF; composants: Composant[]; onUpdate: (c: Composant[]) => void;
  onBack: () => void; onValidate: () => void;
}) {
  const [items, setItems]       = useState<Composant[]>(composants);
  const [scanInput, setScanInput]   = useState("");
  const [scanTarget, setScanTarget] = useState<string | null>(null);
  const [scanError, setScanError]   = useState(false);
  const [qteInputs, setQteInputs]   = useState<Record<string, string>>({});

  const allScanned   = items.every((c) => c.scanned);
  const allPrelevees = items.every((c) => c.qtePrelevee >= c.qteRequise);

  function handleScan(composantId: string, barcode: string) {
    const c = items.find((i) => i.id === composantId);
    if (!c) return;
    if (barcode.trim() === c.codeBarre) {
      setScanError(false);
      setItems((prev) => prev.map((i) => i.id === composantId ? { ...i, scanned: true } : i));
      setScanTarget(null);
      setScanInput("");
    } else {
      setScanError(true);
    }
  }

  function updateQte(composantId: string, value: string) {
    setQteInputs((prev) => ({ ...prev, [composantId]: value }));
    const val = parseFloat(value.replace(",", "."));
    if (!isNaN(val)) {
      setItems((prev) => prev.map((i) => i.id === composantId ? { ...i, qtePrelevee: val } : i));
    }
  }

  function handleValidate() {
    onUpdate(items);
    onValidate();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
          </TouchableOpacity>
          <HelpButton helpKey="of_picking" />
        </View>
        <View style={{ backgroundColor: "#FFF4E8", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6 }}>
          <Text style={{ fontFamily: F.bold, color: "#C2410C", fontSize: 11 }}>Picking · {of.numero}</Text>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18 }}>{of.produitFini}</Text>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>
          {items.filter((c) => c.scanned).length} / {items.length} composants scannés
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        {/* Barre de progression picking */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 12 }}>Avancement picking</Text>
            <Text style={{ fontFamily: F.bold, color: C.primary, fontSize: 12 }}>
              {items.filter((c) => c.scanned && c.qtePrelevee >= c.qteRequise).length} / {items.length}
            </Text>
          </View>
          <ProgressBar
            value={(items.filter((c) => c.scanned && c.qtePrelevee >= c.qteRequise).length / Math.max(items.length, 1)) * 100}
            color={C.primary}
          />
        </View>

        {/* Composants */}
        {items.map((c) => {
          const done      = c.scanned && c.qtePrelevee >= c.qteRequise;
          const scanning  = scanTarget === c.id;
          return (
            <View key={c.id} style={{
              backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 10,
              borderWidth: 1, borderColor: done ? "#A7F3D0" : scanning ? C.primary : C.border,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{c.codeArticle}</Text>
                  <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 15 }}>{c.article}</Text>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                    Lot stock : {c.lotStockDisponible}
                  </Text>
                </View>
                {done
                  ? <View style={{ backgroundColor: C.successSoft, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <CheckCircle2 size={14} color={C.success} strokeWidth={2} />
                    </View>
                  : <View style={{ backgroundColor: "#FFF4E8", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: F.semiBold, color: "#C2410C", fontSize: 11 }}>À prélever</Text>
                    </View>
                }
              </View>

              {/* Quantité */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>Quantité requise</Text>
                  <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 16 }}>{c.qteRequise} {c.unite}</Text>
                </View>
                <View>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>Prélevé</Text>
                  <TextInput
                    style={{
                      fontFamily: F.bold, color: c.qtePrelevee >= c.qteRequise ? C.success : C.text,
                      fontSize: 16, textAlign: "right", borderBottomWidth: 1,
                      borderBottomColor: c.qtePrelevee >= c.qteRequise ? C.success : C.border,
                      paddingBottom: 2, minWidth: 70,
                    }}
                    placeholder="0"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    value={qteInputs[c.id] ?? c.qtePrelevee.toString()}
                    onChangeText={(v) => updateQte(c.id, v)}
                  />
                </View>
              </View>

              {/* Scan */}
              {!c.scanned ? (
                scanning ? (
                  <View>
                    <View style={{
                      flexDirection: "row", alignItems: "center", borderWidth: 1,
                      borderColor: scanError ? C.danger : C.primary, borderRadius: 10,
                      backgroundColor: C.bg, paddingHorizontal: 12, marginBottom: 6,
                    }}>
                      <Barcode size={14} color={C.primary} strokeWidth={2} style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontFamily: F.regular, color: C.text, fontSize: 14, paddingVertical: 11 }}
                        placeholder={`Code-barres : ${c.codeBarre}`}
                        placeholderTextColor={C.textMuted}
                        value={scanInput}
                        onChangeText={(v) => { setScanInput(v); setScanError(false); }}
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => { setScanTarget(null); setScanInput(""); setScanError(false); }}>
                        <X size={14} color={C.textMuted} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    {scanError && (
                      <Text style={{ fontFamily: F.regular, color: C.danger, fontSize: 11, marginBottom: 6 }}>
                        Code-barres incorrect. Réessayer.
                      </Text>
                    )}
                    <TouchableOpacity onPress={() => handleScan(c.id, scanInput)} activeOpacity={0.85}
                      style={{ backgroundColor: C.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                      <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 13 }}>Valider le scan</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => { setScanTarget(c.id); setScanInput(""); setScanError(false); }} activeOpacity={0.85}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 10, backgroundColor: C.bg }}>
                    <Barcode size={15} color={C.textSub} strokeWidth={2} />
                    <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 13 }}>Scanner le code-barres</Text>
                  </TouchableOpacity>
                )
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={13} color={C.success} strokeWidth={2} />
                  <Text style={{ fontFamily: F.medium, color: C.success, fontSize: 12 }}>Lot scanné : {c.codeBarre}</Text>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          onPress={handleValidate}
          disabled={!allScanned || !allPrelevees}
          activeOpacity={0.85}
          style={{
            backgroundColor: allScanned && allPrelevees ? C.success : C.border,
            borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8,
          }}
        >
          <Text style={{ fontFamily: F.bold, color: allScanned && allPrelevees ? "#fff" : C.textMuted, fontSize: 15 }}>
            {allScanned && allPrelevees ? "Valider le picking" : `Encore ${items.filter((c) => !c.scanned).length} composant(s) à scanner`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── MES — Manufacturing Execution System ──────────────────────────────────────

function MESScreen({ of, onBack, onFinish }: { of: OF; onBack: () => void; onFinish: () => void }) {
  const [etat, setEtat]           = useState<EtatLigne>(of.statut === "EnCours" ? "EnProduction" : "Arret");
  const [realise, setRealise]     = useState(of.realise);
  const [journal, setJournal]     = useState<Evenement[]>(of.statut === "EnCours" ? MOCK_JOURNAL : []);
  const [modal, setModal]         = useState<"declaration" | "arret" | "rebut" | "cloture" | null>(null);

  // Declaration
  const [declQte, setDeclQte]     = useState("");
  // Arrêt
  const [motifArret, setMotifArret] = useState<MotifArret>("PanneMachine");
  // Rebut
  const [rebutQte, setRebutQte]   = useState("");
  const [rebutMotif, setRebutMotif] = useState<RebutMotif>("CasseMecanique");
  // CCP
  const [ccpForm, setCcpForm]     = useState<Record<CCPKey, string>>({ pH: "", tempPast: "", brix: "", tempRefr: "" });

  const pct = of.qty > 0 ? Math.round((realise / of.qty) * 100) : 0;
  const etatCfg = ETAT_LIGNE_CFG[etat];

  function now() { return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }

  function addEvent(type: TypeEvenement, detail: string) {
    setJournal((prev) => [{ id: String(Date.now()), type, heure: now(), detail, operateur: of.operateur ?? "Opérateur" }, ...prev]);
  }

  function handleDeclaration() {
    const q = parseFloat(declQte.replace(",", "."));
    if (isNaN(q) || q <= 0) return;
    const newRealise = realise + q;
    setRealise(newRealise);
    addEvent("Declaration", `+${q} ${of.unite} déclarés (cumul ${newRealise}/${of.qty})`);
    setDeclQte("");
    setModal(null);
    setEtat("EnProduction");
  }

  function handleArret() {
    addEvent("Arret", `Arrêt — ${MOTIF_LABELS[motifArret]}`);
    setEtat("Arret");
    setModal(null);
  }

  function handleReprise() {
    addEvent("Reprise", "Reprise de production");
    setEtat("EnProduction");
  }

  function handleRebut() {
    const q = parseFloat(rebutQte.replace(",", "."));
    if (isNaN(q) || q <= 0) return;
    addEvent("Rebut", `${q} ${of.unite} en rebut — ${REBUT_MOTIF_LABELS[rebutMotif]}`);
    setRebutQte("");
    setModal(null);
  }

  function allCCPValid() {
    return CCP_SPECS.every((s) => {
      const n = parseFloat(ccpForm[s.key]);
      return !isNaN(n) && s.validate(n);
    });
  }

  function handleCloture() {
    if (!allCCPValid()) return;
    addEvent("ClotureLot", `Clôture lot — CCP validés · Lot PF généré`);
    setModal(null);
    onFinish();
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header MES */}
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
          </TouchableOpacity>
          <HelpButton helpKey="of_mes" />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: etatCfg.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
            <etatCfg.Icon size={10} color={etatCfg.color} strokeWidth={2} />
            <Text style={{ fontFamily: F.semiBold, color: etatCfg.color, fontSize: 11 }}>{etatCfg.label}</Text>
          </View>
          <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{of.numero} · {of.ligne}</Text>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 17 }} numberOfLines={1}>{of.produitFini}</Text>

        {/* Progress inline */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
            <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{realise} / {of.qty} {of.unite}</Text>
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 12 }}>{pct} %</Text>
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 99, height: 6 }}>
            <View style={{ backgroundColor: pct >= 100 ? "#34D399" : "#fff", borderRadius: 99, height: 6, width: `${Math.min(pct, 100)}%` }} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Actions MES */}
        <SectionLabel>Actions</SectionLabel>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setModal("declaration")} activeOpacity={0.85}
            style={{ flex: 1, backgroundColor: C.success, borderRadius: 12, paddingVertical: 14, alignItems: "center", gap: 4 }}>
            <Plus size={20} color="#fff" strokeWidth={2.5} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 12 }}>Déclarer</Text>
          </TouchableOpacity>

          {etat === "EnProduction" || etat === "Reglage" ? (
            <TouchableOpacity onPress={() => setModal("arret")} activeOpacity={0.85}
              style={{ flex: 1, backgroundColor: C.dangerSoft, borderRadius: 12, paddingVertical: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#FECACA" }}>
              <Square size={20} color={C.danger} strokeWidth={2} />
              <Text style={{ fontFamily: F.bold, color: C.danger, fontSize: 12 }}>Arrêt</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleReprise} activeOpacity={0.85}
              style={{ flex: 1, backgroundColor: C.primarySoft, borderRadius: 12, paddingVertical: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: C.primary }}>
              <Play size={20} color={C.primary} strokeWidth={2} />
              <Text style={{ fontFamily: F.bold, color: C.primary, fontSize: 12 }}>Reprendre</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setModal("rebut")} activeOpacity={0.85}
            style={{ flex: 1, backgroundColor: C.warningSoft, borderRadius: 12, paddingVertical: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#FDE68A" }}>
            <Trash2 size={20} color={C.warning} strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: C.warning, fontSize: 12 }}>Rebut</Text>
          </TouchableOpacity>
        </View>

        {/* Clôture lot */}
        <TouchableOpacity onPress={() => setModal("cloture")} activeOpacity={0.85}
          style={{ backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <ShieldAlert size={17} color="#fff" strokeWidth={2} />
          <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 14 }}>Clôturer le lot (CCP HACCP)</Text>
        </TouchableOpacity>

        {/* Journal */}
        <SectionLabel>Journal des événements</SectionLabel>
        {journal.length === 0 ? (
          <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 20 }}>Aucun événement pour cet OF.</Text>
        ) : journal.map((e) => (
          <View key={e.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <EventIcon type={e.type} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 13 }}>{e.type}</Text>
                <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>{e.heure}</Text>
              </View>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, marginTop: 2 }}>{e.detail}</Text>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 1 }}>— {e.operateur}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Modals ── */}

      {/* Déclaration */}
      <Modal visible={modal === "declaration"} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 18, marginBottom: 6 }}>Déclaration de production</Text>
            <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 13, marginBottom: 20 }}>Cumul actuel : {realise} / {of.qty} {of.unite}</Text>
            <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 13, marginBottom: 8 }}>Quantité produite ({of.unite})</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: C.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontFamily: F.bold, color: C.text, fontSize: 22, backgroundColor: C.bg, textAlign: "center", marginBottom: 16 }}
              placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" autoFocus value={declQte} onChangeText={setDeclQte}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => { setModal(null); setDeclQte(""); }} style={{ flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 15 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeclaration} style={{ flex: 2, backgroundColor: C.success, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Arrêt */}
      <Modal visible={modal === "arret"} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 18, marginBottom: 16 }}>Signaler un arrêt</Text>
            {(Object.keys(MOTIF_LABELS) as MotifArret[]).map((m) => (
              <TouchableOpacity key={m} onPress={() => setMotifArret(m)} activeOpacity={0.8}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: motifArret === m ? C.dangerSoft : C.bg, borderWidth: 1, borderColor: motifArret === m ? "#FECACA" : C.border }}>
                <View style={{ width: 16, height: 16, borderRadius: 99, borderWidth: 2, borderColor: motifArret === m ? C.danger : C.border, backgroundColor: motifArret === m ? C.danger : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {motifArret === m && <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: "#fff" }} />}
                </View>
                <Text style={{ fontFamily: F.semiBold, color: motifArret === m ? C.danger : C.textSub, fontSize: 14 }}>{MOTIF_LABELS[m]}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity onPress={() => setModal(null)} style={{ flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 15 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleArret} style={{ flex: 2, backgroundColor: C.danger, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Confirmer l'arrêt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rebut */}
      <Modal visible={modal === "rebut"} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 18, marginBottom: 16 }}>Déclarer des rebuts</Text>
            <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 13, marginBottom: 8 }}>Quantité rebut ({of.unite})</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: C.warning, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: F.bold, color: C.text, fontSize: 20, backgroundColor: C.bg, textAlign: "center", marginBottom: 14 }}
              placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={rebutQte} onChangeText={setRebutQte}
            />
            <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 13, marginBottom: 8 }}>Motif</Text>
            {(Object.keys(REBUT_MOTIF_LABELS) as RebutMotif[]).map((m) => (
              <TouchableOpacity key={m} onPress={() => setRebutMotif(m)} activeOpacity={0.8}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 5, backgroundColor: rebutMotif === m ? C.warningSoft : C.bg, borderWidth: 1, borderColor: rebutMotif === m ? "#FDE68A" : C.border }}>
                <View style={{ width: 14, height: 14, borderRadius: 99, borderWidth: 2, borderColor: rebutMotif === m ? C.warning : C.border, backgroundColor: rebutMotif === m ? C.warning : "transparent" }} />
                <Text style={{ fontFamily: F.semiBold, color: rebutMotif === m ? C.warning : C.textSub, fontSize: 13 }}>{REBUT_MOTIF_LABELS[m]}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={() => { setModal(null); setRebutQte(""); }} style={{ flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 15 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRebut} style={{ flex: 2, backgroundColor: C.warning, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clôture CCP */}
      <Modal visible={modal === "cloture"} transparent animationType="slide">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: "flex-end", flexGrow: 1 }}>
          <View style={{ backgroundColor: "rgba(0,0,0,0.4)", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={18} color="#7C3AED" strokeWidth={2} />
                <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 18 }}>Clôture lot — CCP HACCP</Text>
              </View>
              <HelpButton helpKey="of_ccp" color={C.textMuted} />
            </View>
            <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
              Tous les CCPs doivent être validés avant de clôturer le lot.
            </Text>
            {CCP_SPECS.map((spec) => {
              const val = parseFloat(ccpForm[spec.key]);
              const valid = ccpForm[spec.key] ? (!isNaN(val) && spec.validate(val)) : null;
              return (
                <View key={spec.key} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                    <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 13 }}>{spec.label} {spec.unit && `(${spec.unit})`}</Text>
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Spec : {spec.spec}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      style={{
                        flex: 1, borderWidth: 1,
                        borderColor: valid === true ? C.success : valid === false ? C.danger : C.border,
                        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                        fontFamily: F.bold, color: C.text, fontSize: 16, backgroundColor: C.bg,
                      }}
                      placeholder={spec.placeholder} placeholderTextColor={C.textMuted} keyboardType="numeric"
                      value={ccpForm[spec.key]}
                      onChangeText={(v) => setCcpForm((prev) => ({ ...prev, [spec.key]: v }))}
                    />
                    {valid === true && <CheckCircle2 size={20} color={C.success} strokeWidth={2} />}
                    {valid === false && <AlertTriangle size={20} color={C.danger} strokeWidth={2} />}
                  </View>
                  {valid === false && (
                    <Text style={{ fontFamily: F.regular, color: C.danger, fontSize: 11, marginTop: 4 }}>
                      Valeur hors spécification ({spec.spec})
                    </Text>
                  )}
                </View>
              );
            })}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setModal(null)} style={{ flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 15 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCloture} disabled={!allCCPValid()}
                style={{ flex: 2, backgroundColor: allCCPValid() ? "#7C3AED" : C.border, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.bold, color: allCCPValid() ? "#fff" : C.textMuted, fontSize: 15 }}>Clôturer le lot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}
