import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, FlatList,
} from "react-native";
import { useState, useMemo } from "react";
import {
  ClipboardList, Plus, ChevronRight, CheckCircle2,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  X, Save, Send, Search,
} from "lucide-react-native";
import { C, F } from "../../constants/theme";

// ── Types ──────────────────────────────────────────────────────────────────────

type InventoryStatus = "PROPOSED" | "COUNTED" | "POSTED";

interface InvItem {
  id:                 string;
  articleCode:        string;
  articleDesignation: string;
  batchNumber:        string | null;
  bookQuantity:       number;
  countedQuantity:    number | null;
  differenceQuantity: number | null;
  unite:              string;
}

interface InvDoc {
  id:             string;
  documentNumber: string;
  status:         InventoryStatus;
  createdAt:      string;
  postedAt:       string | null;
  itemCount:      number;
  countedCount:   number;
  ecartTotal:     number | null;
}

// ── Config statut ──────────────────────────────────────────────────────────────

const STATUT_CFG: Record<InventoryStatus, { label: string; bg: string; text: string; border: string }> = {
  PROPOSED: { label: "Proposé",  bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  COUNTED:  { label: "Compté",   bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  POSTED:   { label: "Validé",   bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_ITEMS: Record<string, InvItem[]> = {
  "inv-001": [
    { id: "i1", articleCode: "MAT-001", articleDesignation: "Coton graine",       batchNumber: "LOT-2026-042", bookQuantity: 48.2,  countedQuantity: 47.8,  differenceQuantity: -0.4,  unite: "t" },
    { id: "i2", articleCode: "MAT-002", articleDesignation: "Anacarde brut",      batchNumber: "LOT-2026-038", bookQuantity: 22.5,  countedQuantity: 22.5,  differenceQuantity: 0,     unite: "t" },
    { id: "i3", articleCode: "PKG-010", articleDesignation: "Sacs PP 50 kg",      batchNumber: null,           bookQuantity: 1200,  countedQuantity: 1180,  differenceQuantity: -20,   unite: "u" },
    { id: "i4", articleCode: "LUB-001", articleDesignation: "Huile moteur 15W40", batchNumber: null,           bookQuantity: 120,   countedQuantity: null,  differenceQuantity: null,  unite: "L" },
  ],
  "inv-002": [
    { id: "i5", articleCode: "MAT-003", articleDesignation: "Soja décortiqué",    batchNumber: "LOT-2026-031", bookQuantity: 15.0,  countedQuantity: 15.2,  differenceQuantity: 0.2,   unite: "t" },
    { id: "i6", articleCode: "PKG-011", articleDesignation: "Palettes bois",      batchNumber: null,           bookQuantity: 80,    countedQuantity: 78,    differenceQuantity: -2,    unite: "u" },
  ],
  "inv-003": [
    { id: "i7", articleCode: "MAT-001", articleDesignation: "Coton graine",       batchNumber: "LOT-2026-028", bookQuantity: 30.0,  countedQuantity: 30.0,  differenceQuantity: 0,     unite: "t" },
    { id: "i8", articleCode: "MAT-004", articleDesignation: "Karité brut",        batchNumber: "LOT-2026-027", bookQuantity: 12.5,  countedQuantity: 12.5,  differenceQuantity: 0,     unite: "t" },
  ],
};

const MOCK_DOCS: InvDoc[] = [
  { id: "inv-001", documentNumber: "INV-2026-003", status: "COUNTED",  createdAt: "2026-05-27", postedAt: null,         itemCount: 4, countedCount: 3, ecartTotal: -20.4 },
  { id: "inv-002", documentNumber: "INV-2026-002", status: "PROPOSED", createdAt: "2026-05-20", postedAt: null,         itemCount: 2, countedCount: 0, ecartTotal: null  },
  { id: "inv-003", documentNumber: "INV-2026-001", status: "POSTED",   createdAt: "2026-05-10", postedAt: "2026-05-12", itemCount: 2, countedCount: 2, ecartTotal: 0     },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtNum(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
}

// ── Composants ─────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: InventoryStatus }) {
  const cfg = STATUT_CFG[status];
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 99, borderWidth: 1, borderColor: cfg.border, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: F.semiBold, fontSize: 11, color: cfg.text }}>{cfg.label}</Text>
    </View>
  );
}

function DiffChip({ diff }: { diff: number | null }) {
  if (diff === null) return <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>—</Text>;
  if (diff === 0) return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Minus size={11} color={C.textMuted} strokeWidth={2.5} />
      <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 12 }}>0</Text>
    </View>
  );
  const pos = diff > 0;
  const color = pos ? C.success : C.danger;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {pos
        ? <TrendingUp size={11} color={color} strokeWidth={2.5} />
        : <TrendingDown size={11} color={color} strokeWidth={2.5} />}
      <Text style={{ fontFamily: F.semiBold, color, fontSize: 12 }}>{pos ? "+" : ""}{fmtNum(diff)}</Text>
    </View>
  );
}

// ── Modal détail / comptage ────────────────────────────────────────────────────

function DetailModal({ doc, onClose }: { doc: InvDoc; onClose: () => void }) {
  const items = MOCK_ITEMS[doc.id] ?? [];
  const editable = doc.status !== "POSTED";

  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.countedQuantity !== null ? String(i.countedQuantity) : ""]))
  );

  const parsed: Record<string, number | null> = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, v === "" ? null : parseFloat(v.replace(",", "."))])
  );

  const allCounted = items.length > 0 && items.every((i) => parsed[i.id] !== null && !isNaN(parsed[i.id] as number));
  const totalEcart = items.reduce((s, i) => {
    const cnt = parsed[i.id];
    if (cnt === null || isNaN(cnt as number)) return s;
    return s + (cnt - i.bookQuantity);
  }, 0);

  const notCounted = items.filter((i) => parsed[i.id] === null || isNaN(parsed[i.id] as number)).length;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", flex: 1, marginTop: 60 }}>

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.divider }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 17 }}>{doc.documentNumber}</Text>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                Créé le {fmtDate(doc.createdAt)}{doc.postedAt ? ` · Validé le ${fmtDate(doc.postedAt)}` : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <StatusChip status={doc.status} />
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <X size={20} color={C.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Lines */}
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
            ListEmptyComponent={
              <Text style={{ fontFamily: F.regular, color: C.textMuted, textAlign: "center", marginTop: 32, fontSize: 14 }}>
                Aucune ligne dans ce document.
              </Text>
            }
            renderItem={({ item }) => {
              const cnt  = parsed[item.id];
              const diff = cnt !== null && !isNaN(cnt) ? cnt - item.bookQuantity : null;
              const hasEcart = diff !== null && diff !== 0;

              return (
                <View style={{
                  backgroundColor: hasEcart
                    ? (diff! > 0 ? "#F0FDF4" : "#FFF5F5")
                    : C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: hasEcart ? (diff! > 0 ? "#BBF7D0" : "#FECACA") : C.border,
                  padding: 14,
                  marginBottom: 10,
                }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 14 }}>{item.articleDesignation}</Text>
                      <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                        {item.articleCode}{item.batchNumber ? ` · ${item.batchNumber}` : " · Sans lot"}
                      </Text>
                    </View>
                    <DiffChip diff={diff} />
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                    <View>
                      <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>Qté système</Text>
                      <Text style={{ fontFamily: F.bold, color: C.textSub, fontSize: 14 }}>
                        {fmtNum(item.bookQuantity)} {item.unite}
                      </Text>
                    </View>

                    {editable ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginRight: 4 }}>Compté :</Text>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: counts[item.id] ? C.primary : C.border,
                            borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
                            fontFamily: F.bold, color: C.text, width: 80,
                            textAlign: "center", fontSize: 14, backgroundColor: C.bg,
                          }}
                          keyboardType="numeric"
                          value={counts[item.id]}
                          onChangeText={(v) => setCounts((p) => ({ ...p, [item.id]: v }))}
                          placeholder="—"
                          placeholderTextColor={C.textMuted}
                        />
                        <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>{item.unite}</Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>Qté comptée</Text>
                        <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 14 }}>
                          {item.countedQuantity !== null ? `${fmtNum(item.countedQuantity)} ${item.unite}` : "—"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />

          {/* Footer */}
          {editable && (
            <View style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              backgroundColor: C.surface,
              borderTopWidth: 1, borderTopColor: C.divider,
              paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28,
            }}>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
                {allCounted
                  ? `Toutes les lignes comptées · Écart : ${totalEcart > 0 ? "+" : ""}${fmtNum(totalEcart)}`
                  : `${notCounted} ligne(s) non comptée(s)`}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }}
                  activeOpacity={0.8}
                >
                  <Save size={16} color={C.textSub} strokeWidth={2} />
                  <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 14 }}>Sauvegarder</Text>
                </TouchableOpacity>
                {allCounted && (
                  <TouchableOpacity
                    style={{ flex: 1.2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 13, backgroundColor: C.success }}
                    activeOpacity={0.8}
                  >
                    <Send size={16} color="#fff" strokeWidth={2} />
                    <Text style={{ fontFamily: F.semiBold, color: "#fff", fontSize: 14 }}>Valider les écarts</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Screen principal ───────────────────────────────────────────────────────────

type FilterKey = "ALL" | InventoryStatus;

export default function InventaireScreen() {
  const [docs] = useState<InvDoc[]>(MOCK_DOCS);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const proposed  = docs.filter((d) => d.status === "PROPOSED").length;
    const counted   = docs.filter((d) => d.status === "COUNTED").length;
    const posted    = docs.filter((d) => d.status === "POSTED").length;
    const totalEcart = docs.reduce((s, d) => s + (d.ecartTotal ?? 0), 0);
    return { total: docs.length, proposed, counted, posted, totalEcart };
  }, [docs]);

  const filtered = useMemo(() => {
    let list = filter === "ALL" ? docs : docs.filter((d) => d.status === filter);
    if (search.trim()) list = list.filter((d) => d.documentNumber.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [docs, filter, search]);

  const FILTER_TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: "ALL",      label: "Tous",    count: kpis.total    },
    { key: "PROPOSED", label: "Proposé", count: kpis.proposed },
    { key: "COUNTED",  label: "Compté",  count: kpis.counted  },
    { key: "POSTED",   label: "Validé",  count: kpis.posted   },
  ];

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ClipboardList size={20} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 22 }}>Inventaires</Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#fff" strokeWidth={2.5} />
            <Text style={{ fontFamily: F.semiBold, color: "#fff", fontSize: 13 }}>Nouveau</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>
          Comptage physique · Écarts imputés en stock INV_ADJ
        </Text>
      </View>

      {/* KPI strip */}
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        {[
          { label: "Documents",   value: String(kpis.total),    color: C.primary, soft: "#EFF6FF" },
          { label: "En attente",  value: String(kpis.proposed), color: C.primary, soft: "#EFF6FF" },
          { label: "À valider",   value: String(kpis.counted),  color: C.warning, soft: C.warningSoft },
          {
            label: "Écart cumulé",
            value: kpis.totalEcart === 0 ? "0" : `${kpis.totalEcart > 0 ? "+" : ""}${fmtNum(kpis.totalEcart)}`,
            color: kpis.totalEcart !== 0 ? C.danger : C.success,
            soft:  kpis.totalEcart !== 0 ? "#FFF5F5" : C.successSoft,
          },
        ].map((k, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: k.soft, borderRadius: 12, padding: 10 }}>
            <Text style={{ fontFamily: F.bold, color: k.color, fontSize: 18 }}>{k.value}</Text>
            <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 2 }}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border }}>
          <Search size={14} color={C.textMuted} strokeWidth={2} style={{ marginRight: 8 }} />
          <TextInput style={{ flex: 1, fontFamily: F.regular, color: C.text, fontSize: 14 }} placeholder="Rechercher un document…" placeholderTextColor={C.textMuted} value={search} onChangeText={setSearch} />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 6, marginBottom: 10 }}>
        {FILTER_TABS.map((t) => {
          const active = filter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setFilter(t.key)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 5,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
                backgroundColor: active ? C.primary : C.surface,
                borderWidth: 1, borderColor: active ? C.primary : C.border,
              }}
            >
              <Text style={{ fontFamily: F.semiBold, fontSize: 12, color: active ? "#fff" : C.textSub }}>{t.label}</Text>
              <View style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : C.bg, borderRadius: 99, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 10, color: active ? "#fff" : C.textMuted }}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Document list */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}>
        {filtered.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <ClipboardList size={36} color={C.textMuted} strokeWidth={1.5} />
            <Text style={{ fontFamily: F.semiBold, color: C.textMuted, marginTop: 12, fontSize: 14 }}>Aucun document</Text>
          </View>
        )}
        {filtered.map((doc) => {
          const hasEcart = doc.ecartTotal !== null && doc.ecartTotal !== 0;
          const cfg = STATUT_CFG[doc.status];
          return (
            <TouchableOpacity
              key={doc.id}
              onPress={() => setSelectedId(doc.id)}
              activeOpacity={0.8}
              style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: doc.status === "COUNTED" ? "#FDE68A" : C.border,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 15 }}>{doc.documentNumber}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <StatusChip status={doc.status} />
                  <ChevronRight size={16} color={C.textMuted} strokeWidth={2} />
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Créé le {fmtDate(doc.createdAt)}</Text>
                  {doc.postedAt && (
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>Validé le {fmtDate(doc.postedAt)}</Text>
                  )}
                </View>

                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {/* Ligne comptée */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {doc.countedCount === doc.itemCount && doc.itemCount > 0
                      ? <CheckCircle2 size={12} color={C.success} strokeWidth={2.5} />
                      : <AlertTriangle size={12} color={C.warning} strokeWidth={2.5} />}
                    <Text style={{
                      fontFamily: F.semiBold, fontSize: 12,
                      color: doc.countedCount === doc.itemCount && doc.itemCount > 0 ? C.success : C.warning,
                    }}>
                      {doc.countedCount} / {doc.itemCount} lignes
                    </Text>
                  </View>

                  {/* Écart */}
                  {doc.ecartTotal !== null && <DiffChip diff={doc.ecartTotal} />}
                </View>
              </View>

              {/* Alerte COUNTED */}
              {doc.status === "COUNTED" && (
                <View style={{ marginTop: 10, backgroundColor: "#FFFBEB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#FDE68A" }}>
                  <Text style={{ fontFamily: F.semiBold, color: "#B45309", fontSize: 12 }}>
                    Toutes les lignes comptées — en attente de validation
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedDoc && <DetailModal doc={selectedDoc} onClose={() => setSelectedId(null)} />}
    </View>
  );
}
