import {
  ScrollView, Text, View, TouchableOpacity, TextInput, Modal, FlatList,
} from "react-native";
import { useState, useMemo } from "react";
import {
  ShoppingBag, Plus, ChevronRight, ChevronLeft, TrendingUp,
  Clock, CheckCircle2, X, Trash2, Package, Calendar, FileText,
  Send, CheckCheck, RotateCcw, AlertCircle,
} from "lucide-react-native";
import { C, F } from "../../constants/theme";

// ── Types alignés ERP ─────────────────────────────────────────────────────────

type StatutCommande =
  | "DRAFT"
  | "CONFIRMED"
  | "IN_PREPARATION"
  | "SHIPPED"
  | "INVOICED"
  | "CANCELLED";

interface CommandeHeader {
  id:                     string;
  numero:                 string;
  date:                   string;
  client:                 string;
  clientId:               string | null;
  clientNonIdentifie?:    boolean;
  currency:               string;
  dateLivraisonSouhaitee: string;
  statut:                 StatutCommande;
  notes:                  string | null;
}

interface CommandeItem {
  id:           string;
  headerId:     string;
  itemPosition: number;
  article:      string;
  articleId:    string;
  quantite:     number;
  unite:        string;
  puHT:         number;
  remisePct:    number;
}

// ── Config statuts ─────────────────────────────────────────────────────────────

const STATUT_CFG: Record<StatutCommande, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  DRAFT:          { label: "Brouillon",      color: C.textMuted, bg: C.bg,          border: C.border,    Icon: FileText },
  CONFIRMED:      { label: "Confirmée",      color: C.primary,   bg: C.primarySoft, border: "#BFDBFE",   Icon: CheckCircle2 },
  IN_PREPARATION: { label: "En préparation", color: C.warning,   bg: C.warningSoft, border: "#FDE68A",   Icon: Clock },
  SHIPPED:        { label: "Expédiée",       color: "#7C3AED",   bg: "#F5F3FF",     border: "#DDD6FE",   Icon: Send },
  INVOICED:       { label: "Facturée",       color: C.success,   bg: C.successSoft, border: "#BBF7D0",   Icon: CheckCheck },
  CANCELLED:      { label: "Annulée",        color: C.danger,    bg: C.dangerSoft,  border: "#FECACA",   Icon: X },
};

const STATUT_NEXT: Partial<Record<StatutCommande, { statut: StatutCommande; label: string }>> = {
  DRAFT:          { statut: "CONFIRMED",      label: "Confirmer" },
  CONFIRMED:      { statut: "IN_PREPARATION", label: "Lancer la préparation" },
  IN_PREPARATION: { statut: "SHIPPED",        label: "Marquer expédiée" },
  SHIPPED:        { statut: "INVOICED",        label: "Marquer facturée" },
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CLIENTS = [
  { id: "c1", nom: "Dist. Kaolack" },
  { id: "c2", nom: "Supermarché Avenir" },
  { id: "c3", nom: "ONG Santé Dakar" },
  { id: "c4", nom: "Export Lomé" },
  { id: "c5", nom: "Pharmacie Centrale Abidjan" },
];

const MOCK_ARTICLES = [
  { id: "a1", libelle: "Bissap Pourpre Original 1L",  unite: "btl", puHT: 1500 },
  { id: "a2", libelle: "Bissap Pourpre Vanille 1L",   unite: "btl", puHT: 1650 },
  { id: "a3", libelle: "Bissap Pourpre Gingembre 1L", unite: "btl", puHT: 1600 },
  { id: "a4", libelle: "Jus Bissap 5L",               unite: "can", puHT: 6500 },
  { id: "a5", libelle: "Extrait Bissap 500mL",        unite: "btl", puHT: 3200 },
];

const MOCK_HEADERS: CommandeHeader[] = [
  { id: "co1", numero: "CO-2026-0004", date: "2026-05-26", client: "Dist. Kaolack",      clientId: "c1", currency: "XOF", dateLivraisonSouhaitee: "2026-06-10", statut: "CONFIRMED",      notes: null },
  { id: "co2", numero: "CO-2026-0003", date: "2026-05-20", client: "Supermarché Avenir", clientId: "c2", currency: "XOF", dateLivraisonSouhaitee: "2026-06-05", statut: "IN_PREPARATION", notes: null },
  { id: "co3", numero: "CO-2026-0002", date: "2026-05-10", client: "ONG Santé Dakar",    clientId: "c3", currency: "XOF", dateLivraisonSouhaitee: "2026-05-28", statut: "SHIPPED",        notes: "Livraison urgente" },
  { id: "co4", numero: "CO-2026-0001", date: "2026-05-01", client: "Export Lomé",        clientId: "c4", currency: "EUR", dateLivraisonSouhaitee: "2026-05-20", statut: "INVOICED",       notes: null },
];

const MOCK_ITEMS: CommandeItem[] = [
  { id: "ci1", headerId: "co1", itemPosition: 1, article: "Bissap Pourpre Original 1L",  articleId: "a1", quantite: 500,  unite: "btl", puHT: 1500, remisePct: 5  },
  { id: "ci2", headerId: "co1", itemPosition: 2, article: "Bissap Pourpre Gingembre 1L", articleId: "a3", quantite: 200,  unite: "btl", puHT: 1600, remisePct: 5  },
  { id: "ci3", headerId: "co2", itemPosition: 1, article: "Bissap Pourpre Vanille 1L",   articleId: "a2", quantite: 300,  unite: "btl", puHT: 1650, remisePct: 0  },
  { id: "ci4", headerId: "co3", itemPosition: 1, article: "Bissap Pourpre Original 1L",  articleId: "a1", quantite: 1200, unite: "btl", puHT: 1500, remisePct: 10 },
  { id: "ci5", headerId: "co4", itemPosition: 1, article: "Bissap Pourpre Original 1L",  articleId: "a1", quantite: 2000, unite: "btl", puHT: 1500, remisePct: 0  },
  { id: "ci6", headerId: "co4", itemPosition: 2, article: "Bissap Pourpre Vanille 1L",   articleId: "a2", quantite: 1000, unite: "btl", puHT: 1650, remisePct: 0  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function caCommande(items: CommandeItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.quantite * i.puHT * (1 - i.remisePct / 100), 0));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMontant(n: number, currency = "XOF") {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M ${currency}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} k ${currency}`;
  return `${n.toLocaleString("fr-FR")} ${currency}`;
}

// ── Composants partagés ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function StatutBadge({ statut }: { statut: StatutCommande }) {
  const cfg = STATUT_CFG[statut];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: cfg.bg, borderRadius: 99, borderWidth: 1, borderColor: cfg.border, paddingHorizontal: 8, paddingVertical: 3 }}>
      <cfg.Icon size={10} color={cfg.color} strokeWidth={2} />
      <Text style={{ fontFamily: F.semiBold, fontSize: 11, color: cfg.color }}>{cfg.label}</Text>
    </View>
  );
}

// ── Écran liste ───────────────────────────────────────────────────────────────

type Screen = "list" | "detail" | "new";
type FilterKey = "ALL" | StatutCommande;

export default function VentesScreen() {
  const [screen,   setScreen]   = useState<Screen>("list");
  const [selected, setSelected] = useState<CommandeHeader | null>(null);
  const [filter,   setFilter]   = useState<FilterKey>("ALL");
  const [search,   setSearch]   = useState("");
  const [headers,  setHeaders]  = useState<CommandeHeader[]>(MOCK_HEADERS);
  const [items,    setItems]    = useState<CommandeItem[]>(MOCK_ITEMS);

  if (screen === "detail" && selected) {
    const cmdItems = items.filter((i) => i.headerId === selected.id);
    return (
      <CommandeDetail
        header={selected}
        items={cmdItems}
        onBack={() => setScreen("list")}
        onAdvance={(next) => {
          setHeaders((prev) => prev.map((h) => h.id === selected.id ? { ...h, statut: next } : h));
          setSelected((h) => h ? { ...h, statut: next } : h);
        }}
      />
    );
  }

  if (screen === "new") {
    return (
      <NewCommandeForm
        onBack={() => setScreen("list")}
        onSave={(header, newItems) => {
          setHeaders((prev) => [header, ...prev]);
          setItems((prev) => [...prev, ...newItems]);
          setScreen("list");
        }}
      />
    );
  }

  const kpis = {
    enCours:   headers.filter((h) => ["DRAFT", "CONFIRMED", "IN_PREPARATION"].includes(h.statut)).length,
    aExpedier: headers.filter((h) => ["CONFIRMED", "IN_PREPARATION"].includes(h.statut)).length,
    facturees: headers.filter((h) => ["INVOICED", "SHIPPED"].includes(h.statut)).length,
    caTotal:   headers.reduce((s, h) => s + caCommande(items.filter((i) => i.headerId === h.id)), 0),
  };

  const FILTER_TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: "ALL",          label: "Toutes",    count: headers.length },
    { key: "DRAFT",        label: "Brouillon", count: headers.filter((h) => h.statut === "DRAFT").length },
    { key: "CONFIRMED",    label: "Confirmées",count: headers.filter((h) => h.statut === "CONFIRMED").length },
    { key: "IN_PREPARATION",label: "En prép.", count: headers.filter((h) => h.statut === "IN_PREPARATION").length },
    { key: "SHIPPED",      label: "Expédiées", count: headers.filter((h) => h.statut === "SHIPPED").length },
    { key: "INVOICED",     label: "Facturées", count: headers.filter((h) => h.statut === "INVOICED").length },
  ];

  const filtered = headers.filter((h) => {
    if (filter !== "ALL" && h.statut !== filter) return false;
    const q = search.toLowerCase();
    return !q || h.client.toLowerCase().includes(q) || h.numero.toLowerCase().includes(q);
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ShoppingBag size={20} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 22 }}>Ventes</Text>
          </View>
          <TouchableOpacity
            onPress={() => setScreen("new")}
            activeOpacity={0.8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
          >
            <Plus size={14} color="#fff" strokeWidth={2.5} />
            <Text style={{ fontFamily: F.semiBold, color: "#fff", fontSize: 13 }}>Nouvelle</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>
          Commandes clients · Suivi · CA prévisionnel
        </Text>
      </View>

      {/* KPI strip */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 }}>
        {[
          { label: "En cours",   value: kpis.enCours,   color: C.primary, soft: C.primarySoft },
          { label: "À expédier", value: kpis.aExpedier, color: C.warning, soft: C.warningSoft },
          { label: "Livrées",    value: kpis.facturees, color: C.success, soft: C.successSoft },
        ].map((k) => (
          <View key={k.label} style={{ flex: 1, backgroundColor: k.soft, borderRadius: 12, padding: 10 }}>
            <Text style={{ fontFamily: F.extraBold, color: k.color, fontSize: 20 }}>{k.value}</Text>
            <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 2 }}>{k.label}</Text>
          </View>
        ))}
        <View style={{ flex: 1.4, backgroundColor: "#F5F3FF", borderRadius: 12, padding: 10 }}>
          <Text style={{ fontFamily: F.extraBold, color: "#7C3AED", fontSize: 14 }} numberOfLines={1}>{fmtMontant(kpis.caTotal)}</Text>
          <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11, marginTop: 2 }}>CA HT total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border }}>
          <TextInput
            style={{ flex: 1, fontFamily: F.regular, color: C.text, fontSize: 14 }}
            placeholder="Client, N° commande…"
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <X size={14} color={C.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 6, marginBottom: 10 }}
      >
        {FILTER_TABS.map((t) => {
          const active = filter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setFilter(t.key)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 5,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
                backgroundColor: active ? C.header : C.surface,
                borderWidth: 1, borderColor: active ? C.header : C.border,
              }}
            >
              <Text style={{ fontFamily: F.semiBold, fontSize: 12, color: active ? "#fff" : C.textSub }}>{t.label}</Text>
              {t.count > 0 && (
                <View style={{ backgroundColor: active ? "rgba(255,255,255,0.2)" : C.bg, borderRadius: 99, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 10, color: active ? "#fff" : C.textMuted }}>{t.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 80 }}>
        {filtered.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <ShoppingBag size={36} color={C.textMuted} strokeWidth={1.5} />
            <Text style={{ fontFamily: F.semiBold, color: C.textMuted, marginTop: 12, fontSize: 14 }}>Aucune commande</Text>
          </View>
        )}
        {filtered.map((h) => {
          const cmdItems = items.filter((i) => i.headerId === h.id);
          const ca       = caCommande(cmdItems);
          const cfg      = STATUT_CFG[h.statut];
          const livrAgo  = new Date(h.dateLivraisonSouhaitee) < new Date() && !["SHIPPED","INVOICED","CANCELLED"].includes(h.statut);

          return (
            <TouchableOpacity
              key={h.id}
              onPress={() => { setSelected(h); setScreen("detail"); }}
              activeOpacity={0.85}
              style={{
                backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 10,
                borderWidth: 1, borderColor: livrAgo ? "#FCA5A5" : h.statut === "IN_PREPARATION" ? "#FDE68A" : C.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 11 }}>{h.numero} · {fmtDate(h.date)}</Text>
                  <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 16, marginTop: 2 }}>{h.client}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <StatutBadge statut={h.statut} />
                  <ChevronRight size={14} color={C.textMuted} strokeWidth={2} />
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>
                    {cmdItems.length} article{cmdItems.length > 1 ? "s" : ""} commandé{cmdItems.length > 1 ? "s" : ""}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Calendar size={11} color={livrAgo ? C.danger : C.textMuted} strokeWidth={2} />
                    <Text style={{ fontFamily: F.regular, fontSize: 12, color: livrAgo ? C.danger : C.textMuted }}>
                      Livraison : {fmtDate(h.dateLivraisonSouhaitee)}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: F.extraBold, color: cfg.color, fontSize: 15 }}>
                  {fmtMontant(ca, h.currency)}
                </Text>
              </View>

              {livrAgo && (
                <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.dangerSoft, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#FECACA" }}>
                  <AlertCircle size={12} color={C.danger} strokeWidth={2} />
                  <Text style={{ fontFamily: F.semiBold, color: C.danger, fontSize: 12 }}>Date de livraison dépassée</Text>
                </View>
              )}
              {h.clientNonIdentifie && h.statut === "DRAFT" && (
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFBEB", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#FDE68A" }}>
                  <AlertCircle size={12} color={C.warning} strokeWidth={2} />
                  <Text style={{ fontFamily: F.semiBold, color: "#92400E", fontSize: 12 }}>Client à rattacher dans l'ERP</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Détail commande ───────────────────────────────────────────────────────────

function CommandeDetail({ header, items, onBack, onAdvance }: {
  header:    CommandeHeader;
  items:     CommandeItem[];
  onBack:    () => void;
  onAdvance: (next: StatutCommande) => void;
}) {
  const cfg      = STATUT_CFG[header.statut];
  const ca       = caCommande(items);
  const nextStep = STATUT_NEXT[header.statut];
  const [statut, setStatut] = useState(header.statut);

  const STEPS: StatutCommande[] = ["DRAFT", "CONFIRMED", "IN_PREPARATION", "SHIPPED", "INVOICED"];
  const currentIdx = STEPS.indexOf(statut);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{header.numero} · {fmtDate(header.date)}</Text>
        <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 20, marginTop: 2 }}>{header.client}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
          <StatutBadge statut={statut} />
          <Text style={{ fontFamily: F.extraBold, color: "#fff", fontSize: 16 }}>{fmtMontant(ca, header.currency)}</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>

        {/* Progression */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Progression</SectionLabel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 0 }}>
            {STEPS.map((s, i) => {
              const done    = i < currentIdx;
              const current = i === currentIdx;
              const scfg    = STATUT_CFG[s];
              return (
                <View key={s} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
                    {i > 0 && (
                      <View style={{ flex: 1, height: 2, backgroundColor: done || current ? C.primary : C.border }} />
                    )}
                    <View style={{
                      width: 22, height: 22, borderRadius: 99,
                      backgroundColor: done ? C.primary : current ? C.primarySoft : C.bg,
                      borderWidth: 2, borderColor: done || current ? C.primary : C.border,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {done && <CheckCircle2 size={12} color="#fff" strokeWidth={2.5} />}
                      {current && <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: C.primary }} />}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={{ flex: 1, height: 2, backgroundColor: done ? C.primary : C.border }} />
                    )}
                  </View>
                  <Text style={{ fontFamily: F.regular, color: current ? C.primary : C.textMuted, fontSize: 9, marginTop: 5, textAlign: "center" }}>
                    {STATUT_CFG[s].label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Infos */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Informations</SectionLabel>
          {[
            { label: "Livraison souhaitée", value: fmtDate(header.dateLivraisonSouhaitee) },
            { label: "Devise",              value: header.currency },
            { label: "Notes",               value: header.notes },
          ].filter((r) => r.value).map((r) => (
            <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }}>
              <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12 }}>{r.label}</Text>
              <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 12, flex: 1, textAlign: "right" }}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Lignes articles */}
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <SectionLabel>Articles commandés</SectionLabel>
          {items.map((item, idx) => {
            const montant = Math.round(item.quantite * item.puHT * (1 - item.remisePct / 100));
            return (
              <View key={item.id} style={{ paddingVertical: 10, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: C.divider }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 14 }}>{item.article}</Text>
                    <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                      {item.quantite.toLocaleString("fr-FR")} {item.unite}
                      {" · "}{item.puHT.toLocaleString("fr-FR")} {header.currency}/{item.unite}
                      {item.remisePct > 0 ? ` · -${item.remisePct}%` : ""}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 14 }}>
                    {montant.toLocaleString("fr-FR")}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: C.border }}>
            <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 14 }}>Total HT</Text>
            <Text style={{ fontFamily: F.extraBold, color: C.primary, fontSize: 16 }}>
              {ca.toLocaleString("fr-FR")} {header.currency}
            </Text>
          </View>
        </View>

        {/* Action progression */}
        {nextStep && statut !== "CANCELLED" && (
          <TouchableOpacity
            onPress={() => { setStatut(nextStep.statut); onAdvance(nextStep.statut); }}
            activeOpacity={0.85}
            style={{ backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
          >
            <RotateCcw size={16} color="#fff" strokeWidth={2} />
            <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>{nextStep.label}</Text>
          </TouchableOpacity>
        )}

        {!["SHIPPED", "INVOICED", "CANCELLED"].includes(statut) && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={{ backgroundColor: C.bg, borderRadius: 14, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "#FECACA" }}
          >
            <Text style={{ fontFamily: F.semiBold, color: C.danger, fontSize: 14 }}>Annuler la commande</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// ── Nouvelle commande ─────────────────────────────────────────────────────────

type ItemForm = {
  _key:      string;
  articleId: string;
  article:   string;
  quantite:  string;
  unite:     string;
  puHT:      string;
  remisePct: string;
};

function emptyItem(): ItemForm {
  return { _key: Math.random().toString(36).slice(2), articleId: "", article: "", quantite: "", unite: "", puHT: "", remisePct: "0" };
}

function NewCommandeForm({ onBack, onSave }: {
  onBack: () => void;
  onSave: (header: CommandeHeader, items: CommandeItem[]) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  const [clientMode,    setClientMode]    = useState<"existing" | "new">("existing");
  const [clientId,      setClientId]      = useState("");
  const [newClientNom,  setNewClientNom]  = useState("");
  const [newClientTel,  setNewClientTel]  = useState("");
  const [newClientVille,setNewClientVille]= useState("");
  const [livraison, setLivraison] = useState("");
  const [currency,  setCurrency]  = useState("XOF");
  const [notes,     setNotes]     = useState("");
  const [itemForms, setItemForms] = useState<ItemForm[]>([emptyItem()]);
  const [clientModal, setClientModal] = useState(false);
  const [articleModal, setArticleModal] = useState<string | null>(null); // _key de la ligne

  const selectedClient = MOCK_CLIENTS.find((c) => c.id === clientId);

  const caTotal = itemForms.reduce((s, f) => {
    const q = parseFloat(f.quantite.replace(",", ".")) || 0;
    const p = parseFloat(f.puHT.replace(",", "."))     || 0;
    const r = parseFloat(f.remisePct)                  || 0;
    return s + q * p * (1 - r / 100);
  }, 0);

  const clientValid = clientMode === "existing" ? !!clientId : newClientNom.trim().length > 0;
  const isValid = clientValid && livraison && itemForms.length > 0 && itemForms.every(
    (f) => f.articleId && f.quantite && f.puHT
  );

  function setItemField(key: string, field: keyof ItemForm, value: string) {
    setItemForms((prev) => prev.map((i) => i._key === key ? { ...i, [field]: value } : i));
  }

  function selectArticle(key: string, art: typeof MOCK_ARTICLES[0]) {
    setItemForms((prev) => prev.map((i) =>
      i._key === key ? { ...i, articleId: art.id, article: art.libelle, unite: art.unite, puHT: String(art.puHT) } : i
    ));
    setArticleModal(null);
  }

  function handleSave() {
    if (!isValid) return;
    const id = `co-${Date.now()}`;
    const num = `CO-2026-${String(MOCK_HEADERS.length + 1).padStart(4, "0")}`;
    const header: CommandeHeader = clientMode === "existing"
      ? { id, numero: num, date: today, client: selectedClient!.nom, clientId, currency, dateLivraisonSouhaitee: livraison, statut: "DRAFT", notes: notes.trim() || null }
      : { id, numero: num, date: today, client: newClientNom.trim(), clientId: null, clientNonIdentifie: true, currency, dateLivraisonSouhaitee: livraison, statut: "DRAFT", notes: notes.trim() || null };
    const items: CommandeItem[] = itemForms.map((f, idx) => ({
      id:           `ci-${Date.now()}-${idx}`,
      headerId:     id,
      itemPosition: idx + 1,
      article:      f.article,
      articleId:    f.articleId,
      quantite:     parseFloat(f.quantite.replace(",", ".")) || 0,
      unite:        f.unite,
      puHT:         parseFloat(f.puHT.replace(",", ".")) || 0,
      remisePct:    parseFloat(f.remisePct) || 0,
    }));
    onSave(header, items);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ backgroundColor: C.header, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <ChevronLeft size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={{ fontFamily: F.medium, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Retour</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 20 }}>Nouvelle commande</Text>
          <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>
            Prise de commande terrain · Statut DRAFT
          </Text>
        </View>

        <View style={{ padding: 16 }}>

          {/* ① Client */}
          <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <SectionLabel>① Client</SectionLabel>

            {/* Toggle mode */}
            <View style={{ flexDirection: "row", backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: "hidden" }}>
              {(["existing", "new"] as const).map((mode) => {
                const active = clientMode === mode;
                const label  = mode === "existing" ? "Client existant" : "Nouveau client";
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => { setClientMode(mode); setClientId(""); setNewClientNom(""); setNewClientTel(""); setNewClientVille(""); }}
                    activeOpacity={0.8}
                    style={{ flex: 1, paddingVertical: 9, alignItems: "center", backgroundColor: active ? C.header : "transparent" }}
                  >
                    <Text style={{ fontFamily: F.semiBold, fontSize: 12, color: active ? "#fff" : C.textMuted }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {clientMode === "existing" ? (
              <TouchableOpacity
                onPress={() => setClientModal(true)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  borderWidth: 1, borderColor: clientId ? C.primary : C.border,
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
                  backgroundColor: clientId ? C.primarySoft : C.bg,
                }}
              >
                <Text style={{ fontFamily: clientId ? F.semiBold : F.regular, color: clientId ? C.primary : C.textMuted, fontSize: 14 }}>
                  {selectedClient?.nom ?? "Sélectionner un client…"}
                </Text>
                <ChevronRight size={15} color={clientId ? C.primary : C.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={{ backgroundColor: "#FFFBEB", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#FDE68A", flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={13} color={C.warning} strokeWidth={2} />
                  <Text style={{ fontFamily: F.regular, color: "#92400E", fontSize: 12, flex: 1 }}>
                    Ce client sera à rattacher depuis l'ERP avant confirmation.
                  </Text>
                </View>
                <TextInput
                  style={{ borderWidth: 1, borderColor: newClientNom.trim() ? C.primary : C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semiBold, color: C.text, fontSize: 14, backgroundColor: C.bg }}
                  placeholder="Nom du client ou groupement *"
                  placeholderTextColor={C.textMuted}
                  value={newClientNom}
                  onChangeText={setNewClientNom}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontFamily: F.regular, color: C.text, fontSize: 13, backgroundColor: C.bg }}
                    placeholder="Téléphone"
                    placeholderTextColor={C.textMuted}
                    keyboardType="phone-pad"
                    value={newClientTel}
                    onChangeText={setNewClientTel}
                  />
                  <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontFamily: F.regular, color: C.text, fontSize: 13, backgroundColor: C.bg }}
                    placeholder="Ville"
                    placeholderTextColor={C.textMuted}
                    value={newClientVille}
                    onChangeText={setNewClientVille}
                  />
                </View>
              </View>
            )}
          </View>

          {/* ② Dates & devise */}
          <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <SectionLabel>② Dates & devise</SectionLabel>

            <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 12, marginBottom: 6 }}>Date de commande</Text>
            <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, backgroundColor: C.bg }}>
              <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 14 }}>{fmtDate(today)}</Text>
            </View>

            <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 12, marginBottom: 6 }}>Date de livraison souhaitée</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: livraison ? C.primary : C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semiBold, color: C.text, fontSize: 14, backgroundColor: C.bg, marginBottom: 12 }}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={C.textMuted}
              value={livraison}
              onChangeText={setLivraison}
            />

            <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 12, marginBottom: 6 }}>Devise</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["XOF", "EUR", "USD"].map((cur) => (
                <TouchableOpacity
                  key={cur}
                  onPress={() => setCurrency(cur)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                    backgroundColor: currency === cur ? C.primary : C.bg,
                    borderWidth: 1, borderColor: currency === cur ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: currency === cur ? "#fff" : C.textSub }}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ③ Articles */}
          <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <SectionLabel>③ Articles commandés</SectionLabel>
              <TouchableOpacity
                onPress={() => setItemForms((p) => [...p, emptyItem()])}
                style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.primarySoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
              >
                <Plus size={12} color={C.primary} strokeWidth={2.5} />
                <Text style={{ fontFamily: F.semiBold, color: C.primary, fontSize: 12 }}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {itemForms.map((f, idx) => {
              const montant = Math.round((parseFloat(f.quantite.replace(",",".")) || 0) * (parseFloat(f.puHT.replace(",",".")) || 0) * (1 - (parseFloat(f.remisePct) || 0) / 100));
              return (
                <View key={f._key} style={{ borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: C.divider, paddingTop: idx > 0 ? 14 : 0, marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ backgroundColor: C.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: F.semiBold, color: C.textMuted, fontSize: 10 }}>Ligne {idx + 1}</Text>
                    </View>
                    {itemForms.length > 1 && (
                      <TouchableOpacity onPress={() => setItemForms((p) => p.filter((i) => i._key !== f._key))} hitSlop={8}>
                        <Trash2 size={14} color={C.danger} strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Article selector */}
                  <TouchableOpacity
                    onPress={() => setArticleModal(f._key)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      borderWidth: 1, borderColor: f.articleId ? C.primary : C.border,
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
                      backgroundColor: f.articleId ? C.primarySoft : C.bg, marginBottom: 10,
                    }}
                  >
                    <Text style={{ fontFamily: f.articleId ? F.semiBold : F.regular, color: f.articleId ? C.primary : C.textMuted, fontSize: 13 }} numberOfLines={1}>
                      {f.article || "Sélectionner un article…"}
                    </Text>
                    <Package size={14} color={f.articleId ? C.primary : C.textMuted} strokeWidth={2} />
                  </TouchableOpacity>

                  {/* Qté + PU HT */}
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 11, marginBottom: 5 }}>Quantité</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: C.bg }}>
                        <TextInput
                          style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.bold, color: C.text, fontSize: 14 }}
                          placeholder="0"
                          placeholderTextColor={C.textMuted}
                          keyboardType="numeric"
                          value={f.quantite}
                          onChangeText={(v) => setItemField(f._key, "quantite", v)}
                        />
                        <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, paddingRight: 10 }}>{f.unite || "u"}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 11, marginBottom: 5 }}>PU HT ({currency})</Text>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.bold, color: C.text, fontSize: 14, backgroundColor: C.bg }}
                        placeholder="0"
                        placeholderTextColor={C.textMuted}
                        keyboardType="numeric"
                        value={f.puHT}
                        onChangeText={(v) => setItemField(f._key, "puHT", v)}
                      />
                    </View>
                  </View>

                  {/* Remise */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 11, marginBottom: 5 }}>Remise (%)</Text>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.bold, color: C.text, fontSize: 14, backgroundColor: C.bg }}
                        placeholder="0"
                        placeholderTextColor={C.textMuted}
                        keyboardType="numeric"
                        value={f.remisePct}
                        onChangeText={(v) => setItemField(f._key, "remisePct", v)}
                      />
                    </View>
                    {montant > 0 && (
                      <View style={{ flex: 1.2, backgroundColor: C.primarySoft, borderRadius: 10, padding: 10, alignItems: "flex-end" }}>
                        <Text style={{ fontFamily: F.regular, color: C.primary, fontSize: 11 }}>Montant HT</Text>
                        <Text style={{ fontFamily: F.extraBold, color: C.primary, fontSize: 15 }}>
                          {montant.toLocaleString("fr-FR")}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* ④ Notes */}
          <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <SectionLabel>④ Notes</SectionLabel>
            <TextInput
              style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: F.regular, color: C.text, height: 80, textAlignVertical: "top", backgroundColor: C.bg }}
              placeholder="Instructions particulières, conditions spéciales…"
              placeholderTextColor={C.textMuted}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

        </View>
      </ScrollView>

      {/* Footer sticky */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.divider,
        paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28,
      }}>
        {caTotal > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 13 }}>CA HT prévisionnel</Text>
            <Text style={{ fontFamily: F.extraBold, color: C.primary, fontSize: 18 }}>
              {Math.round(caTotal).toLocaleString("fr-FR")} {currency}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!isValid}
          style={{
            backgroundColor: isValid ? C.primary : C.border,
            borderRadius: 14, paddingVertical: 15,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <FileText size={16} color="#fff" strokeWidth={2} />
          <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 15 }}>Créer la commande (DRAFT)</Text>
        </TouchableOpacity>
      </View>

      {/* Modal client */}
      <Modal visible={clientModal} animationType="slide" transparent onRequestClose={() => setClientModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "60%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.divider }}>
              <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 17 }}>Sélectionner un client</Text>
              <TouchableOpacity onPress={() => setClientModal(false)} hitSlop={8}>
                <X size={20} color={C.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MOCK_CLIENTS}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item: c }) => (
                <TouchableOpacity
                  onPress={() => { setClientId(c.id); setClientModal(false); }}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6,
                    backgroundColor: clientId === c.id ? C.primarySoft : C.surface,
                    borderWidth: 1, borderColor: clientId === c.id ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontFamily: F.semiBold, color: clientId === c.id ? C.primary : C.text, fontSize: 14 }}>{c.nom}</Text>
                  {clientId === c.id && <CheckCircle2 size={16} color={C.primary} strokeWidth={2} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal article */}
      <Modal visible={!!articleModal} animationType="slide" transparent onRequestClose={() => setArticleModal(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.divider }}>
              <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 17 }}>Sélectionner un article</Text>
              <TouchableOpacity onPress={() => setArticleModal(null)} hitSlop={8}>
                <X size={20} color={C.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MOCK_ARTICLES}
              keyExtractor={(a) => a.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item: art }) => {
                const currentItem = articleModal ? itemForms.find((f) => f._key === articleModal) : null;
                const active = currentItem?.articleId === art.id;
                return (
                  <TouchableOpacity
                    onPress={() => articleModal && selectArticle(articleModal, art)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6,
                      backgroundColor: active ? C.primarySoft : C.surface,
                      borderWidth: 1, borderColor: active ? C.primary : C.border,
                    }}
                  >
                    <View>
                      <Text style={{ fontFamily: F.semiBold, color: active ? C.primary : C.text, fontSize: 14 }}>{art.libelle}</Text>
                      <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                        {art.puHT.toLocaleString("fr-FR")} XOF / {art.unite}
                      </Text>
                    </View>
                    {active && <CheckCircle2 size={16} color={C.primary} strokeWidth={2} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
