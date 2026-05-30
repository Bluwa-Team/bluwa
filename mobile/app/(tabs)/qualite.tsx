import { ScrollView, Text, View, TouchableOpacity, TextInput, Image, Alert, FlatList } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  FlaskConical, ChevronLeft, Clock, CheckCircle2, AlertTriangle,
  Droplets, Filter, ShieldCheck, Camera, X, XCircle, ImagePlus, Trash2,
} from "lucide-react-native";
import { C, F } from "../../constants/theme";
import HelpButton from "../../components/HelpButton";

// ── Types DB-aligned ──────────────────────────────────────────────────────────

type InspectionStatus  = "PENDING" | "RELEASED" | "REJECTED";
type DefectType        = "HUMIDITY_TOO_HIGH" | "FOREIGN_BODY" | "DAMAGED_PACKAGING" | "EXPIRED";
type DispositionAction = "UNDER_REVIEW" | "RETURN_TO_SUPPLIER" | "DESTROYED" | "ACCEPTED_WITH_DISCOUNT";

type InspectionLot = {
  id:                  string;
  batchNumber:         string;
  supplierBatchNumber?: string;
  article:             string;
  fournisseur:         string;
  quantityToInspect:   number;
  unite:               string;
  status:              InspectionStatus;
  laboratoryResults: {
    humidity_pct?:    number;
    impuretes_pct?:   number;
    granulometrie_mm?: number;
  };
  expirationDate: string;
  receivedAt:     string;
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const LOTS: InspectionLot[] = [
  {
    id: "lot-1", batchNumber: "LOT-COT-20260529-01", supplierBatchNumber: "2026-05-29",
    article: "Coton graine", fournisseur: "Coopérative Korhogo", quantityToInspect: 12.4, unite: "t",
    status: "PENDING", laboratoryResults: {}, expirationDate: "2026-11-29", receivedAt: "2026-05-29",
  },
  {
    id: "lot-2", batchNumber: "LOT-ANA-20260529-01", supplierBatchNumber: "LOT-GIE-001",
    article: "Anacarde brut", fournisseur: "GIE Boundiali", quantityToInspect: 8.2, unite: "t",
    status: "PENDING", laboratoryResults: { humidity_pct: 9.8 }, expirationDate: "2027-05-29", receivedAt: "2026-05-29",
  },
  {
    id: "lot-3", batchNumber: "LOT-SOJ-20260528-01", supplierBatchNumber: "2026-05-28",
    article: "Soja décortiqué", fournisseur: "GIE Ferkessédougou", quantityToInspect: 6.8, unite: "t",
    status: "RELEASED", laboratoryResults: { humidity_pct: 11.2, impuretes_pct: 1.8 }, expirationDate: "2026-11-28", receivedAt: "2026-05-28",
  },
  {
    id: "lot-4", batchNumber: "LOT-COT-20260528-02", supplierBatchNumber: "2026-05-28",
    article: "Coton graine", fournisseur: "Coop. Boundiali", quantityToInspect: 9.5, unite: "t",
    status: "REJECTED", laboratoryResults: { humidity_pct: 16.2, impuretes_pct: 4.1 }, expirationDate: "2026-11-28", receivedAt: "2026-05-28",
  },
  {
    id: "lot-5", batchNumber: "LOT-ANA-20260527-01",
    article: "Anacarde brut", fournisseur: "SOPROCO", quantityToInspect: 15.0, unite: "t",
    status: "RELEASED", laboratoryResults: { humidity_pct: 8.5, impuretes_pct: 1.2 }, expirationDate: "2027-05-27", receivedAt: "2026-05-27",
  },
];

// ── Configs ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<InspectionStatus, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  PENDING:  { label: "En attente", color: C.warning, bg: C.warningSoft, Icon: Clock },
  RELEASED: { label: "Libéré",     color: C.success, bg: C.successSoft, Icon: CheckCircle2 },
  REJECTED: { label: "Bloqué",     color: C.danger,  bg: C.dangerSoft,  Icon: XCircle },
};

const DEFECT_TYPES: { value: DefectType; label: string }[] = [
  { value: "HUMIDITY_TOO_HIGH",    label: "Humidité hors norme" },
  { value: "FOREIGN_BODY",         label: "Corps étranger" },
  { value: "DAMAGED_PACKAGING",    label: "Emballage endommagé" },
  { value: "EXPIRED",              label: "Produit périmé" },
];

const DISPOSITION_ACTIONS: { value: DispositionAction; label: string; color: string; bg: string }[] = [
  { value: "UNDER_REVIEW",           label: "En cours d'examen",  color: C.warning, bg: C.warningSoft },
  { value: "RETURN_TO_SUPPLIER",     label: "Retour fournisseur", color: C.primary, bg: C.primarySoft },
  { value: "DESTROYED",              label: "Destruction",         color: C.danger,  bg: C.dangerSoft },
  { value: "ACCEPTED_WITH_DISCOUNT", label: "Accepté avec remise",color: C.success, bg: C.successSoft },
];

const FILTERS: { key: "ALL" | InspectionStatus; label: string }[] = [
  { key: "ALL",      label: "Tous" },
  { key: "PENDING",  label: "En attente" },
  { key: "RELEASED", label: "Libérés" },
  { key: "REJECTED", label: "Bloqués" },
];

// ── Composants partagés ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function ParamField({ label, seuil, icon, value, onChange, alert, alertMsg, editable = true }: {
  label: string; seuil?: string; icon: React.ReactNode;
  value: string; onChange: (v: string) => void;
  alert: boolean; alertMsg?: string; editable?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 }}>
        {icon}
        <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 12 }}>{label}</Text>
        {seuil ? <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginLeft: 4 }}>— {seuil}</Text> : null}
      </View>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: alert ? "#FCA5A5" : value ? C.primary : C.border,
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
          fontFamily: F.bold, color: C.text, fontSize: 15,
          backgroundColor: alert ? C.dangerSoft : C.bg,
        }}
        placeholder="—"
        placeholderTextColor={C.textMuted}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        editable={editable}
      />
      {alert && alertMsg && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
          <AlertTriangle size={11} color={C.danger} strokeWidth={2} />
          <Text style={{ fontFamily: F.regular, color: C.danger, fontSize: 11 }}>{alertMsg}</Text>
        </View>
      )}
    </View>
  );
}

// ── Photo picker ──────────────────────────────────────────────────────────────

function PhotoSection({ photos, onChange, label = "Ajouter des photos (preuves)" }: {
  photos: string[];
  onChange: (p: string[]) => void;
  label?: string;
}) {
  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "L'accès à la caméra est nécessaire pour prendre des photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      onChange([...photos, result.assets[0].uri]);
    }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "L'accès à la galerie est nécessaire.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => a.uri)]);
    }
  }

  function removePhoto(uri: string) {
    onChange(photos.filter((p) => p !== uri));
  }

  function showPicker() {
    Alert.alert("Ajouter une photo", "Choisir la source", [
      { text: "Caméra", onPress: pickFromCamera },
      { text: "Galerie", onPress: pickFromLibrary },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  return (
    <View style={{ marginTop: 14 }}>
      <SectionLabel>Photos / Preuves</SectionLabel>

      {photos.length > 0 && (
        <FlatList
          data={photos}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri) => uri}
          contentContainerStyle={{ gap: 8, marginBottom: 10 }}
          renderItem={({ item: uri }) => (
            <View style={{ position: "relative" }}>
              <Image
                source={{ uri }}
                style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: C.border }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removePhoto(uri)}
                style={{
                  position: "absolute", top: -6, right: -6,
                  backgroundColor: C.danger, borderRadius: 99,
                  width: 20, height: 20, alignItems: "center", justifyContent: "center",
                  borderWidth: 2, borderColor: C.bg,
                }}
              >
                <X size={10} color="#fff" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          onPress={pickFromCamera}
          activeOpacity={0.8}
          style={{
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
            borderWidth: 1, borderColor: C.border, borderRadius: 10, borderStyle: "dashed",
            paddingVertical: 12, backgroundColor: C.bg,
          }}
        >
          <Camera size={15} color={C.textMuted} strokeWidth={2} />
          <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 13 }}>Caméra</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickFromLibrary}
          activeOpacity={0.8}
          style={{
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
            borderWidth: 1, borderColor: C.border, borderRadius: 10, borderStyle: "dashed",
            paddingVertical: 12, backgroundColor: C.bg,
          }}
        >
          <ImagePlus size={15} color={C.textMuted} strokeWidth={2} />
          <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 13 }}>Galerie</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 && (
        <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 6 }}>
          {photos.length} photo{photos.length > 1 ? "s" : ""} ajoutée{photos.length > 1 ? "s" : ""}
        </Text>
      )}
    </View>
  );
}

// ── Screen principal ──────────────────────────────────────────────────────────

type Screen = "list" | "detail" | "nc_form";

export default function QualiteScreen() {
  const [screen, setScreen]       = useState<Screen>("list");
  const [filter, setFilter]       = useState<"ALL" | InspectionStatus>("ALL");
  const [selectedLot, setSelectedLot] = useState<InspectionLot | null>(null);

  if (screen === "nc_form" && selectedLot) {
    return <NCForm lot={selectedLot} onBack={() => setScreen("detail")} />;
  }
  if (screen === "detail" && selectedLot) {
    return <ControleDetail lot={selectedLot} onBack={() => setScreen("list")} onOpenNC={() => setScreen("nc_form")} />;
  }

  const filtered = LOTS.filter((l) => filter === "ALL" || l.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <FlaskConical size={20} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 22 }}>Contrôle qualité</Text>
          </View>
          <HelpButton helpKey="qualite_liste" />
        </View>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          {LOTS.filter((l) => l.status === "PENDING").length} en attente · {LOTS.filter((l) => l.status === "REJECTED").length} bloqués
        </Text>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.divider, flexGrow: 0 }}
        contentContainerStyle={{ padding: 12, gap: 8 }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
              backgroundColor: filter === f.key ? C.header : C.bg,
              borderWidth: 1, borderColor: filter === f.key ? C.header : C.border,
            }}
          >
            <Text style={{ fontFamily: F.semiBold, fontSize: 13, color: filter === f.key ? "#fff" : C.textMuted }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {filtered.map((lot) => {
          const s   = STATUS_CFG[lot.status];
          const hum = lot.laboratoryResults.humidity_pct;
          const imp = lot.laboratoryResults.impuretes_pct;
          return (
            <TouchableOpacity
              key={lot.id}
              onPress={() => { setSelectedLot(lot); setScreen("detail"); }}
              activeOpacity={0.85}
              style={{
                backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 10,
                borderWidth: 1, borderColor: lot.status === "REJECTED" ? "#FCA5A5" : C.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{lot.batchNumber}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: s.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <s.Icon size={10} color={s.color} strokeWidth={2} />
                  <Text style={{ fontFamily: F.semiBold, color: s.color, fontSize: 11 }}>{s.label}</Text>
                </View>
              </View>

              <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 15 }}>{lot.article}</Text>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, marginTop: 2 }}>{lot.fournisseur}</Text>

              <View style={{ flexDirection: "row", gap: 16, marginTop: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: F.bold, color: C.textSub, fontSize: 13 }}>{lot.quantityToInspect} {lot.unite}</Text>
                {hum !== undefined && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Droplets size={12} color={hum > 14 ? C.danger : C.textMuted} strokeWidth={2} />
                    <Text style={{ fontFamily: F.semiBold, color: hum > 14 ? C.danger : C.textSub, fontSize: 12 }}>{hum} %</Text>
                  </View>
                )}
                {imp !== undefined && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Filter size={12} color={imp > 3 ? C.danger : C.textMuted} strokeWidth={2} />
                    <Text style={{ fontFamily: F.semiBold, color: imp > 3 ? C.danger : C.textSub, fontSize: 12 }}>{imp} %</Text>
                  </View>
                )}
                {lot.status === "PENDING" && (
                  <View style={{ marginLeft: "auto", backgroundColor: C.warningSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.semiBold, color: C.warning, fontSize: 10 }}>À analyser</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Détail contrôle ───────────────────────────────────────────────────────────

function ControleDetail({ lot, onBack, onOpenNC }: { lot: InspectionLot; onBack: () => void; onOpenNC: () => void }) {
  const [humidity,      setHumidity]      = useState(lot.laboratoryResults.humidity_pct?.toString() ?? "");
  const [impuretes,     setImpuretes]     = useState(lot.laboratoryResults.impuretes_pct?.toString() ?? "");
  const [granulometrie, setGranulometrie] = useState(lot.laboratoryResults.granulometrie_mm?.toString() ?? "");
  const [observations,  setObservations]  = useState("");
  const [photos,        setPhotos]        = useState<string[]>([]);

  const humVal   = parseFloat(humidity.replace(",", "."));
  const impVal   = parseFloat(impuretes.replace(",", "."));
  const humAlert = !isNaN(humVal) && humVal > 14;
  const impAlert = !isNaN(impVal) && impVal > 3;
  const s        = STATUS_CFG[lot.status];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
          </TouchableOpacity>
          <HelpButton helpKey="qualite_controle" />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <View style={{ backgroundColor: s.bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <s.Icon size={10} color={s.color} strokeWidth={2} />
            <Text style={{ fontFamily: F.semiBold, color: s.color, fontSize: 11 }}>{s.label}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18 }}>{lot.article}</Text>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
          {lot.fournisseur} · {lot.quantityToInspect} {lot.unite}
        </Text>
      </View>

      <View style={{ padding: 16 }}>

        {/* Identification lot */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Identification du lot</SectionLabel>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Lot Bluwa</Text>
            <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 12 }}>{lot.batchNumber}</Text>
          </View>
          {lot.supplierBatchNumber && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Lot fournisseur</Text>
              <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 12 }}>{lot.supplierBatchNumber}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>DLC calculée</Text>
            <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 12 }}>{lot.expirationDate}</Text>
          </View>
        </View>

        {/* Résultats laboratoire */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Résultats laboratoire</SectionLabel>
          <ParamField
            label="Humidité (%)" seuil="seuil : ≤ 14 %"
            icon={<Droplets size={14} color={humAlert ? C.danger : C.textMuted} strokeWidth={2} />}
            value={humidity} onChange={setHumidity} alert={humAlert} alertMsg="Humidité hors norme — lot à bloquer"
            editable={lot.status === "PENDING"}
          />
          <ParamField
            label="Impuretés (%)" seuil="seuil : ≤ 3 %"
            icon={<Filter size={14} color={impAlert ? C.danger : C.textMuted} strokeWidth={2} />}
            value={impuretes} onChange={setImpuretes} alert={impAlert} alertMsg="Taux d'impuretés hors norme"
            editable={lot.status === "PENDING"}
          />
          <ParamField
            label="Granulométrie (mm)"
            icon={<ShieldCheck size={14} color={C.textMuted} strokeWidth={2} />}
            value={granulometrie} onChange={setGranulometrie} alert={false}
            editable={lot.status === "PENDING"}
          />
        </View>

        {/* Observations + photos */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Observations</SectionLabel>
          <TextInput
            style={{
              borderWidth: 1, borderColor: C.border, borderRadius: 10,
              paddingHorizontal: 14, paddingVertical: 10, fontFamily: F.regular,
              color: C.text, height: 90, textAlignVertical: "top", backgroundColor: C.bg,
            }}
            placeholder="Aspect visuel, odeur, texture, remarques…"
            placeholderTextColor={C.textMuted}
            multiline
            value={observations}
            onChangeText={setObservations}
            editable={lot.status === "PENDING"}
          />

          <PhotoSection photos={photos} onChange={setPhotos} />
        </View>

        {/* Décision */}
        {lot.status === "PENDING" && (
          <>
            <SectionLabel>Décision</SectionLabel>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ backgroundColor: C.success, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
            >
              <CheckCircle2 size={17} color="#fff" strokeWidth={2} />
              <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Libérer le lot (RELEASED)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onOpenNC}
              activeOpacity={0.85}
              style={{ backgroundColor: C.dangerSoft, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10, borderWidth: 1, borderColor: "#FECACA" }}
            >
              <AlertTriangle size={15} color={C.danger} strokeWidth={2} />
              <Text style={{ fontFamily: F.semiBold, color: C.danger, fontSize: 14 }}>Bloquer + Ouvrir une NC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ backgroundColor: C.bg, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 14 }}>Enregistrer brouillon</Text>
            </TouchableOpacity>
          </>
        )}

        {lot.status === "REJECTED" && (
          <TouchableOpacity
            onPress={onOpenNC}
            activeOpacity={0.85}
            style={{ backgroundColor: C.dangerSoft, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FECACA" }}
          >
            <AlertTriangle size={15} color={C.danger} strokeWidth={2} />
            <Text style={{ fontFamily: F.semiBold, color: C.danger, fontSize: 14 }}>Voir / modifier la NC</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// ── Fiche Non-Conformité ──────────────────────────────────────────────────────

function NCForm({ lot, onBack }: { lot: InspectionLot; onBack: () => void }) {
  const [defectType,     setDefectType]     = useState<DefectType>("HUMIDITY_TOO_HIGH");
  const [disposition,    setDisposition]    = useState<DispositionAction>("UNDER_REVIEW");
  const [financialClaim, setFinancialClaim] = useState("");
  const [description,    setDescription]    = useState("");
  const [photos,         setPhotos]         = useState<string[]>([]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour au contrôle</Text>
          </TouchableOpacity>
          <HelpButton helpKey="qualite_nc" />
        </View>
        <View style={{ backgroundColor: C.dangerSoft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6 }}>
          <Text style={{ fontFamily: F.semiBold, color: C.danger, fontSize: 11 }}>Non-Conformité</Text>
        </View>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 18 }}>{lot.article}</Text>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
          {lot.batchNumber} · {lot.fournisseur}
        </Text>
      </View>

      <View style={{ padding: 16 }}>

        {/* Type de défaut */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Type de défaut</SectionLabel>
          {DEFECT_TYPES.map(({ value, label }) => {
            const active = defectType === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setDefectType(value)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 10,
                  paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6,
                  backgroundColor: active ? C.dangerSoft : C.bg,
                  borderWidth: 1, borderColor: active ? "#FECACA" : C.border,
                }}
              >
                <View style={{
                  width: 16, height: 16, borderRadius: 99, borderWidth: 2,
                  borderColor: active ? C.danger : C.border,
                  backgroundColor: active ? C.danger : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {active && <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: "#fff" }} />}
                </View>
                <Text style={{ fontFamily: F.semiBold, color: active ? C.danger : C.textSub, fontSize: 13 }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description + photos */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Description du problème</SectionLabel>
          <TextInput
            style={{
              borderWidth: 1, borderColor: C.border, borderRadius: 10,
              paddingHorizontal: 14, paddingVertical: 10, fontFamily: F.regular,
              color: C.text, height: 100, textAlignVertical: "top", backgroundColor: C.bg,
            }}
            placeholder="Détails du problème constaté, conditions d'observation…"
            placeholderTextColor={C.textMuted}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <PhotoSection photos={photos} onChange={setPhotos} label="Ajouter des photos (preuves NC)" />
        </View>

        {/* Action corrective */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Action corrective</SectionLabel>
          {DISPOSITION_ACTIONS.map(({ value, label, color, bg }) => {
            const active = disposition === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setDisposition(value)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 10,
                  paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6,
                  backgroundColor: active ? bg : C.bg,
                  borderWidth: 1, borderColor: active ? color : C.border,
                }}
              >
                <View style={{
                  width: 16, height: 16, borderRadius: 99, borderWidth: 2,
                  borderColor: active ? color : C.border,
                  backgroundColor: active ? color : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {active && <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: "#fff" }} />}
                </View>
                <Text style={{ fontFamily: F.semiBold, color: active ? color : C.textSub, fontSize: 13 }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Réclamation financière */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Réclamation financière</SectionLabel>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10 }}>
            <TextInput
              style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 10, fontFamily: F.bold, color: C.text, fontSize: 15 }}
              placeholder="0"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={financialClaim}
              onChangeText={setFinancialClaim}
            />
            <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 13, paddingRight: 14 }}>FCFA</Text>
          </View>
          <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 6 }}>
            Montant du litige réclamé au fournisseur. Laisser à 0 si aucune réclamation.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={{ backgroundColor: C.danger, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
        >
          <XCircle size={17} color="#fff" strokeWidth={2} />
          <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Bloquer le lot + Enregistrer NC</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={{ backgroundColor: C.bg, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border }}
        >
          <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 14 }}>Enregistrer brouillon</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
