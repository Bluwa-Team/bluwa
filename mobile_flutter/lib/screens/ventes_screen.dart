import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme.dart';
import '../widgets/help_button.dart';
import '../widgets/shared.dart';

// ── Types alignés ERP ─────────────────────────────────────────────────────────

enum StatutCommande {
  draft,
  confirmed,
  inPreparation,
  shipped,
  invoiced,
  cancelled,
}

class CommandeHeader {
  CommandeHeader({
    required this.id,
    required this.numero,
    required this.date,
    required this.client,
    required this.clientId,
    this.clientNonIdentifie = false,
    required this.currency,
    required this.dateLivraisonSouhaitee,
    required this.statut,
    this.notes,
  });

  final String id;
  final String numero;
  final String date;
  final String client;
  final String? clientId;
  final bool clientNonIdentifie;
  final String currency;
  final String dateLivraisonSouhaitee;
  StatutCommande statut;
  final String? notes;
}

class CommandeItem {
  CommandeItem({
    required this.id,
    required this.headerId,
    required this.itemPosition,
    required this.article,
    required this.articleId,
    required this.quantite,
    required this.unite,
    required this.puHT,
    required this.remisePct,
  });

  final String id;
  final String headerId;
  final int itemPosition;
  final String article;
  final String articleId;
  final double quantite;
  final String unite;
  final double puHT;
  final double remisePct;
}

// ── Config statuts ────────────────────────────────────────────────────────────

class _StatutCfg {
  const _StatutCfg(this.label, this.color, this.bg, this.border, this.icon);
  final String label;
  final Color color;
  final Color bg;
  final Color border;
  final IconData icon;
}

const _statutCfg = {
  StatutCommande.draft: _StatutCfg('Brouillon', C.textMuted, C.bg, C.border,
      Icons.description_outlined),
  StatutCommande.confirmed: _StatutCfg('Confirmée', C.primary, C.primarySoft,
      Color(0xFFBFDBFE), Icons.check_circle_outline),
  StatutCommande.inPreparation: _StatutCfg('En préparation', C.warning,
      C.warningSoft, Color(0xFFFDE68A), Icons.schedule),
  StatutCommande.shipped: _StatutCfg(
      'Expédiée', C.violet, C.violetSoft, Color(0xFFDDD6FE), Icons.send_outlined),
  StatutCommande.invoiced: _StatutCfg('Facturée', C.success, C.successSoft,
      Color(0xFFBBF7D0), Icons.done_all),
  StatutCommande.cancelled: _StatutCfg(
      'Annulée', C.danger, C.dangerSoft, Color(0xFFFECACA), Icons.close),
};

const _statutNext = {
  StatutCommande.draft: (StatutCommande.confirmed, 'Confirmer'),
  StatutCommande.confirmed: (
    StatutCommande.inPreparation,
    'Lancer la préparation'
  ),
  StatutCommande.inPreparation: (StatutCommande.shipped, 'Marquer expédiée'),
  StatutCommande.shipped: (StatutCommande.invoiced, 'Marquer facturée'),
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const _mockClients = [
  ('c1', 'Dist. Kaolack'),
  ('c2', 'Supermarché Avenir'),
  ('c3', 'ONG Santé Dakar'),
  ('c4', 'Export Lomé'),
  ('c5', 'Pharmacie Centrale Abidjan'),
];

const _mockArticles = [
  ('a1', 'Bissap Pourpre Original 1L', 'btl', 1500.0),
  ('a2', 'Bissap Pourpre Vanille 1L', 'btl', 1650.0),
  ('a3', 'Bissap Pourpre Gingembre 1L', 'btl', 1600.0),
  ('a4', 'Jus Bissap 5L', 'can', 6500.0),
  ('a5', 'Extrait Bissap 500mL', 'btl', 3200.0),
];

final _mockHeaders = [
  CommandeHeader(id: 'co1', numero: 'CO-2026-0004', date: '2026-05-26', client: 'Dist. Kaolack', clientId: 'c1', currency: 'XOF', dateLivraisonSouhaitee: '2026-06-10', statut: StatutCommande.confirmed),
  CommandeHeader(id: 'co2', numero: 'CO-2026-0003', date: '2026-05-20', client: 'Supermarché Avenir', clientId: 'c2', currency: 'XOF', dateLivraisonSouhaitee: '2026-06-05', statut: StatutCommande.inPreparation),
  CommandeHeader(id: 'co3', numero: 'CO-2026-0002', date: '2026-05-10', client: 'ONG Santé Dakar', clientId: 'c3', currency: 'XOF', dateLivraisonSouhaitee: '2026-05-28', statut: StatutCommande.shipped, notes: 'Livraison urgente'),
  CommandeHeader(id: 'co4', numero: 'CO-2026-0001', date: '2026-05-01', client: 'Export Lomé', clientId: 'c4', currency: 'EUR', dateLivraisonSouhaitee: '2026-05-20', statut: StatutCommande.invoiced),
];

final _mockItems = [
  CommandeItem(id: 'ci1', headerId: 'co1', itemPosition: 1, article: 'Bissap Pourpre Original 1L', articleId: 'a1', quantite: 500, unite: 'btl', puHT: 1500, remisePct: 5),
  CommandeItem(id: 'ci2', headerId: 'co1', itemPosition: 2, article: 'Bissap Pourpre Gingembre 1L', articleId: 'a3', quantite: 200, unite: 'btl', puHT: 1600, remisePct: 5),
  CommandeItem(id: 'ci3', headerId: 'co2', itemPosition: 1, article: 'Bissap Pourpre Vanille 1L', articleId: 'a2', quantite: 300, unite: 'btl', puHT: 1650, remisePct: 0),
  CommandeItem(id: 'ci4', headerId: 'co3', itemPosition: 1, article: 'Bissap Pourpre Original 1L', articleId: 'a1', quantite: 1200, unite: 'btl', puHT: 1500, remisePct: 10),
  CommandeItem(id: 'ci5', headerId: 'co4', itemPosition: 1, article: 'Bissap Pourpre Original 1L', articleId: 'a1', quantite: 2000, unite: 'btl', puHT: 1500, remisePct: 0),
  CommandeItem(id: 'ci6', headerId: 'co4', itemPosition: 2, article: 'Bissap Pourpre Vanille 1L', articleId: 'a2', quantite: 1000, unite: 'btl', puHT: 1650, remisePct: 0),
];

double _caCommande(Iterable<CommandeItem> items) => items
    .fold<double>(0, (s, i) => s + i.quantite * i.puHT * (1 - i.remisePct / 100))
    .roundToDouble();

// ── Écran liste ───────────────────────────────────────────────────────────────

class VentesScreen extends StatefulWidget {
  const VentesScreen({super.key});

  @override
  State<VentesScreen> createState() => _VentesScreenState();
}

class _VentesScreenState extends State<VentesScreen> {
  final List<CommandeHeader> _headers = _mockHeaders;
  final List<CommandeItem> _items = _mockItems;
  StatutCommande? _filter;
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<CommandeItem> _itemsOf(String headerId) =>
      _items.where((i) => i.headerId == headerId).toList();

  @override
  Widget build(BuildContext context) {
    final enCours = _headers
        .where((h) => const [
              StatutCommande.draft,
              StatutCommande.confirmed,
              StatutCommande.inPreparation
            ].contains(h.statut))
        .length;
    final aExpedier = _headers
        .where((h) => const [
              StatutCommande.confirmed,
              StatutCommande.inPreparation
            ].contains(h.statut))
        .length;
    final facturees = _headers
        .where((h) => const [StatutCommande.invoiced, StatutCommande.shipped]
            .contains(h.statut))
        .length;
    final caTotal = _headers.fold<double>(
        0, (s, h) => s + _caCommande(_itemsOf(h.id)));

    final q = _search.text.toLowerCase();
    final filtered = _headers.where((h) {
      if (_filter != null && h.statut != _filter) return false;
      return q.isEmpty ||
          h.client.toLowerCase().contains(q) ||
          h.numero.toLowerCase().contains(q);
    }).toList();

    return Column(children: [
      DarkHeader(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [
              const Icon(Icons.shopping_bag_outlined,
                  size: 20, color: Colors.white),
              const SizedBox(width: 10),
              Text('Ventes', style: ts(22, F.bold, Colors.white)),
            ]),
            GestureDetector(
              onTap: () async {
                final result = await Navigator.of(context).push<
                        (CommandeHeader, List<CommandeItem>)>(
                    MaterialPageRoute(
                        builder: (_) => NewCommandeScreen(
                            nextNumero:
                                'CO-2026-${'${_headers.length + 1}'.padLeft(4, '0')}')));
                if (result != null) {
                  setState(() {
                    _headers.insert(0, result.$1);
                    _items.addAll(result.$2);
                  });
                }
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(children: [
                  const Icon(Icons.add, size: 14, color: Colors.white),
                  const SizedBox(width: 6),
                  Text('Nouvelle', style: ts(13, F.semiBold, Colors.white)),
                ]),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text('Commandes clients · Suivi · CA prévisionnel',
            style: ts(13, F.regular, Colors.white.withValues(alpha: 0.5))),
      ]),

      // KPI strip
      Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
        child: Row(children: [
          Expanded(
              child: KpiTile(
                  label: 'En cours',
                  value: '$enCours',
                  color: C.primary,
                  bg: C.primarySoft)),
          const SizedBox(width: 8),
          Expanded(
              child: KpiTile(
                  label: 'À expédier',
                  value: '$aExpedier',
                  color: C.warning,
                  bg: C.warningSoft)),
          const SizedBox(width: 8),
          Expanded(
              child: KpiTile(
                  label: 'Livrées',
                  value: '$facturees',
                  color: C.success,
                  bg: C.successSoft)),
          const SizedBox(width: 8),
          Expanded(
            flex: 14,
            child: KpiTile(
                label: 'CA HT total',
                value: fmtMontant(caTotal),
                color: C.violet,
                bg: C.violetSoft),
          ),
        ]),
      ),

      // Search
      Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
        child: AppTextInput(
          controller: _search,
          placeholder: 'Client, N° commande…',
          fillColor: C.surface,
          onChanged: (_) => setState(() {}),
        ),
      ),

      // Filter tabs
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Row(children: [
          FilterPill(
              label: 'Toutes',
              count: _headers.length,
              active: _filter == null,
              onTap: () => setState(() => _filter = null)),
          const SizedBox(width: 6),
          for (final (s, label) in const [
            (StatutCommande.draft, 'Brouillon'),
            (StatutCommande.confirmed, 'Confirmées'),
            (StatutCommande.inPreparation, 'En prép.'),
            (StatutCommande.shipped, 'Expédiées'),
            (StatutCommande.invoiced, 'Facturées'),
          ]) ...[
            FilterPill(
                label: label,
                count: _headers.where((h) => h.statut == s).length,
                active: _filter == s,
                onTap: () => setState(() => _filter = s)),
            const SizedBox(width: 6),
          ],
        ]),
      ),
      const SizedBox(height: 10),

      // Liste
      Expanded(
        child: filtered.isEmpty
            ? Column(children: [
                const SizedBox(height: 60),
                const Icon(Icons.shopping_bag_outlined,
                    size: 36, color: C.textMuted),
                const SizedBox(height: 12),
                Text('Aucune commande',
                    style: ts(14, F.semiBold, C.textMuted)),
              ])
            : ListView(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
                children: [for (final h in filtered) _commandeCard(h)],
              ),
      ),
    ]);
  }

  Widget _commandeCard(CommandeHeader h) {
    final cmdItems = _itemsOf(h.id);
    final ca = _caCommande(cmdItems);
    final cfg = _statutCfg[h.statut]!;
    final enRetard = DateTime.parse(h.dateLivraisonSouhaitee)
            .isBefore(DateTime.now()) &&
        !const [
          StatutCommande.shipped,
          StatutCommande.invoiced,
          StatutCommande.cancelled
        ].contains(h.statut);

    return GestureDetector(
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute(
            builder: (_) =>
                CommandeDetailScreen(header: h, items: cmdItems)));
        setState(() {});
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: enRetard
                  ? const Color(0xFFFCA5A5)
                  : h.statut == StatutCommande.inPreparation
                      ? const Color(0xFFFDE68A)
                      : C.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${h.numero} · ${fmtDate(h.date)}',
                        style: ts(11, F.regular, C.textMuted)),
                    const SizedBox(height: 2),
                    Text(h.client, style: ts(16, F.bold, C.text)),
                  ],
                ),
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                StatusPill(
                    label: cfg.label,
                    color: cfg.color,
                    bg: cfg.bg,
                    border: cfg.border,
                    icon: cfg.icon),
                const SizedBox(height: 4),
                const Icon(Icons.chevron_right, size: 14, color: C.textMuted),
              ]),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  '${cmdItems.length} article${cmdItems.length > 1 ? 's' : ''} commandé${cmdItems.length > 1 ? 's' : ''}',
                  style: ts(12, F.regular, C.textMuted),
                ),
                const SizedBox(height: 2),
                Row(children: [
                  Icon(Icons.calendar_today_outlined,
                      size: 11, color: enRetard ? C.danger : C.textMuted),
                  const SizedBox(width: 4),
                  Text('Livraison : ${fmtDate(h.dateLivraisonSouhaitee)}',
                      style: ts(12, F.regular,
                          enRetard ? C.danger : C.textMuted)),
                ]),
              ]),
              Text(fmtMontant(ca, h.currency),
                  style: ts(15, F.extraBold, cfg.color)),
            ],
          ),
          if (enRetard)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: C.dangerSoft,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(children: [
                const Icon(Icons.error_outline, size: 12, color: C.danger),
                const SizedBox(width: 6),
                Text('Date de livraison dépassée',
                    style: ts(12, F.semiBold, C.danger)),
              ]),
            ),
          if (h.clientNonIdentifie && h.statut == StatutCommande.draft)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(children: [
                const Icon(Icons.error_outline, size: 12, color: C.warning),
                const SizedBox(width: 6),
                Text("Client à rattacher dans l'ERP",
                    style: ts(12, F.semiBold, const Color(0xFF92400E))),
              ]),
            ),
        ]),
      ),
    );
  }
}

// ── Détail commande ───────────────────────────────────────────────────────────

class CommandeDetailScreen extends StatefulWidget {
  const CommandeDetailScreen(
      {super.key, required this.header, required this.items});

  final CommandeHeader header;
  final List<CommandeItem> items;

  @override
  State<CommandeDetailScreen> createState() => _CommandeDetailScreenState();
}

class _CommandeDetailScreenState extends State<CommandeDetailScreen> {
  static const _steps = [
    StatutCommande.draft,
    StatutCommande.confirmed,
    StatutCommande.inPreparation,
    StatutCommande.shipped,
    StatutCommande.invoiced,
  ];

  CommandeHeader get header => widget.header;

  @override
  Widget build(BuildContext context) {
    final ca = _caCommande(widget.items);
    final next = _statutNext[header.statut];
    final currentIdx = _steps.indexOf(header.statut);

    return Scaffold(
      backgroundColor: C.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          DarkHeader(children: [
            HeaderBackButton(onTap: () => Navigator.pop(context)),
            const SizedBox(height: 14),
            Text('${header.numero} · ${fmtDate(header.date)}',
                style:
                    ts(12, F.regular, Colors.white.withValues(alpha: 0.45))),
            const SizedBox(height: 2),
            Text(header.client, style: ts(20, F.bold, Colors.white)),
            const SizedBox(height: 10),
            Row(children: [
              StatusPill(
                  label: _statutCfg[header.statut]!.label,
                  color: _statutCfg[header.statut]!.color,
                  bg: _statutCfg[header.statut]!.bg,
                  border: _statutCfg[header.statut]!.border,
                  icon: _statutCfg[header.statut]!.icon),
              const SizedBox(width: 8),
              Text(fmtMontant(ca, header.currency),
                  style: ts(16, F.extraBold, Colors.white)),
            ]),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              // Progression
              SectionCard(
                label: 'Progression',
                child: Row(children: [
                  for (final (i, s) in _steps.indexed)
                    Expanded(
                      child: Column(children: [
                        Row(children: [
                          Expanded(
                            child: i > 0
                                ? Container(
                                    height: 2,
                                    color: i <= currentIdx
                                        ? C.primary
                                        : C.border)
                                : const SizedBox(height: 2),
                          ),
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: i < currentIdx
                                  ? C.primary
                                  : i == currentIdx
                                      ? C.primarySoft
                                      : C.bg,
                              border: Border.all(
                                  color: i <= currentIdx
                                      ? C.primary
                                      : C.border,
                                  width: 2),
                            ),
                            child: i < currentIdx
                                ? const Icon(Icons.check,
                                    size: 12, color: Colors.white)
                                : i == currentIdx
                                    ? Center(
                                        child: Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: C.primary),
                                        ),
                                      )
                                    : null,
                          ),
                          Expanded(
                            child: i < _steps.length - 1
                                ? Container(
                                    height: 2,
                                    color: i < currentIdx
                                        ? C.primary
                                        : C.border)
                                : const SizedBox(height: 2),
                          ),
                        ]),
                        const SizedBox(height: 5),
                        Text(
                          _statutCfg[s]!.label,
                          textAlign: TextAlign.center,
                          style: ts(
                              9,
                              F.regular,
                              i == currentIdx ? C.primary : C.textMuted),
                        ),
                      ]),
                    ),
                ]),
              ),

              // Infos
              SectionCard(
                label: 'Informations',
                child: Column(children: [
                  FieldRow('Livraison souhaitée',
                      fmtDate(header.dateLivraisonSouhaitee)),
                  FieldRow('Devise', header.currency),
                  FieldRow('Notes', header.notes),
                ]),
              ),

              // Lignes articles
              SectionCard(
                label: 'Articles commandés',
                child: Column(children: [
                  for (final (idx, item) in widget.items.indexed)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        border: idx > 0
                            ? const Border(
                                top: BorderSide(color: C.divider))
                            : null,
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.article,
                                    style: ts(14, F.semiBold, C.text)),
                                const SizedBox(height: 2),
                                Text(
                                  '${fmtInt(item.quantite)} ${item.unite} · ${fmtInt(item.puHT)} ${header.currency}/${item.unite}'
                                  '${item.remisePct > 0 ? ' · -${fmtNum(item.remisePct)}%' : ''}',
                                  style: ts(12, F.regular, C.textMuted),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            fmtInt(item.quantite *
                                item.puHT *
                                (1 - item.remisePct / 100)),
                            style: ts(14, F.bold, C.text),
                          ),
                        ],
                      ),
                    ),
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    padding: const EdgeInsets.only(top: 12),
                    decoration: const BoxDecoration(
                      border: Border(
                          top: BorderSide(color: C.border, width: 2)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total HT', style: ts(14, F.bold, C.text)),
                        Text('${fmtInt(ca)} ${header.currency}',
                            style: ts(16, F.extraBold, C.primary)),
                      ],
                    ),
                  ),
                ]),
              ),

              // Action progression
              if (next != null && header.statut != StatutCommande.cancelled)
                BigButton(
                  label: next.$2,
                  icon: Icons.restart_alt,
                  onTap: () => setState(() => header.statut = next.$1),
                ),
              if (!const [
                StatutCommande.shipped,
                StatutCommande.invoiced,
                StatutCommande.cancelled
              ].contains(header.statut))
                BigButton(
                  label: 'Annuler la commande',
                  outlined: true,
                  textColor: C.danger,
                  borderColor: const Color(0xFFFECACA),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  onTap: () {},
                ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ── Nouvelle commande ─────────────────────────────────────────────────────────

class _ItemForm {
  _ItemForm();
  String articleId = '';
  String article = '';
  String unite = '';
  final quantite = TextEditingController();
  final puHT = TextEditingController();
  final remisePct = TextEditingController(text: '0');

  void dispose() {
    quantite.dispose();
    puHT.dispose();
    remisePct.dispose();
  }

  double get montant {
    final q = parseNum(quantite.text) ?? 0;
    final p = parseNum(puHT.text) ?? 0;
    final r = parseNum(remisePct.text) ?? 0;
    return q * p * (1 - r / 100);
  }

  bool get valid =>
      articleId.isNotEmpty &&
      quantite.text.isNotEmpty &&
      puHT.text.isNotEmpty;
}

class NewCommandeScreen extends StatefulWidget {
  const NewCommandeScreen({super.key, required this.nextNumero});
  final String nextNumero;

  @override
  State<NewCommandeScreen> createState() => _NewCommandeScreenState();
}

class _NewCommandeScreenState extends State<NewCommandeScreen> {
  bool _newClient = false;
  String _clientId = '';
  final _newClientNom = TextEditingController();
  final _newClientTel = TextEditingController();
  final _newClientVille = TextEditingController();
  final _livraison = TextEditingController();
  final _notes = TextEditingController();
  String _currency = 'XOF';
  final List<_ItemForm> _itemForms = [_ItemForm()];

  @override
  void dispose() {
    for (final c in [
      _newClientNom,
      _newClientTel,
      _newClientVille,
      _livraison,
      _notes
    ]) {
      c.dispose();
    }
    for (final f in _itemForms) {
      f.dispose();
    }
    super.dispose();
  }

  String? get _selectedClientNom => _mockClients
      .where((c) => c.$1 == _clientId)
      .map((c) => c.$2)
      .firstOrNull;

  double get _caTotal =>
      _itemForms.fold<double>(0, (s, f) => s + f.montant);

  bool get _isValid {
    final clientValid =
        _newClient ? _newClientNom.text.trim().isNotEmpty : _clientId.isNotEmpty;
    return clientValid &&
        _livraison.text.isNotEmpty &&
        _itemForms.isNotEmpty &&
        _itemForms.every((f) => f.valid);
  }

  void _save() {
    if (!_isValid) return;
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final id = 'co-${DateTime.now().millisecondsSinceEpoch}';
    final header = CommandeHeader(
      id: id,
      numero: widget.nextNumero,
      date: today,
      client: _newClient ? _newClientNom.text.trim() : _selectedClientNom!,
      clientId: _newClient ? null : _clientId,
      clientNonIdentifie: _newClient,
      currency: _currency,
      dateLivraisonSouhaitee: _livraison.text,
      statut: StatutCommande.draft,
      notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
    );
    final items = [
      for (final (idx, f) in _itemForms.indexed)
        CommandeItem(
          id: 'ci-$id-$idx',
          headerId: id,
          itemPosition: idx + 1,
          article: f.article,
          articleId: f.articleId,
          quantite: parseNum(f.quantite.text) ?? 0,
          unite: f.unite,
          puHT: parseNum(f.puHT.text) ?? 0,
          remisePct: parseNum(f.remisePct.text) ?? 0,
        ),
    ];
    Navigator.pop(context, (header, items));
  }

  Future<void> _pickClient() async {
    await showAppSheet(
      context,
      Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: C.divider))),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Sélectionner un client', style: ts(17, F.bold, C.text)),
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const Icon(Icons.close, size: 20, color: C.textMuted),
              ),
            ],
          ),
        ),
        Flexible(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(16),
            children: [
              for (final c in _mockClients)
                RadioRow(
                  active: _clientId == c.$1,
                  onTap: () {
                    setState(() => _clientId = c.$1);
                    Navigator.pop(context);
                  },
                  label: c.$2,
                ),
            ],
          ),
        ),
      ]),
    );
  }

  Future<void> _pickArticle(_ItemForm form) async {
    await showAppSheet(
      context,
      Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: C.divider))),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Sélectionner un article', style: ts(17, F.bold, C.text)),
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const Icon(Icons.close, size: 20, color: C.textMuted),
              ),
            ],
          ),
        ),
        Flexible(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(16),
            children: [
              for (final a in _mockArticles)
                RadioRow(
                  active: form.articleId == a.$1,
                  onTap: () {
                    setState(() {
                      form.articleId = a.$1;
                      form.article = a.$2;
                      form.unite = a.$3;
                      form.puHT.text = fmtRawNum(a.$4);
                    });
                    Navigator.pop(context);
                  },
                  label: a.$2,
                  sublabel: '${fmtInt(a.$4)} XOF / ${a.$3}',
                ),
            ],
          ),
        ),
      ]),
    );
  }

  static String fmtRawNum(double v) =>
      v == v.roundToDouble() ? '${v.round()}' : '$v';

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();

    return Scaffold(
      backgroundColor: C.bg,
      body: Column(children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              DarkHeader(children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    HeaderBackButton(onTap: () => Navigator.pop(context)),
                    const HelpButton(helpKey: 'ventes_new'),
                  ],
                ),
                const SizedBox(height: 14),
                Text('Nouvelle commande', style: ts(20, F.bold, Colors.white)),
                const SizedBox(height: 2),
                Text('Prise de commande terrain · Statut DRAFT',
                    style: ts(
                        12, F.regular, Colors.white.withValues(alpha: 0.45))),
              ]),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  // ① Client
                  SectionCard(
                    label: '① Client',
                    child: Column(children: [
                      // Toggle mode
                      Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: C.bg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: C.border),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Row(children: [
                          for (final (isNew, label) in const [
                            (false, 'Client existant'),
                            (true, 'Nouveau client'),
                          ])
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setState(() {
                                  _newClient = isNew;
                                  _clientId = '';
                                  _newClientNom.clear();
                                  _newClientTel.clear();
                                  _newClientVille.clear();
                                }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 9),
                                  color: _newClient == isNew
                                      ? C.header
                                      : Colors.transparent,
                                  child: Center(
                                    child: Text(label,
                                        style: ts(
                                            12,
                                            F.semiBold,
                                            _newClient == isNew
                                                ? Colors.white
                                                : C.textMuted)),
                                  ),
                                ),
                              ),
                            ),
                        ]),
                      ),

                      if (!_newClient)
                        GestureDetector(
                          onTap: _pickClient,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 13),
                            decoration: BoxDecoration(
                              color: _clientId.isNotEmpty
                                  ? C.primarySoft
                                  : C.bg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: _clientId.isNotEmpty
                                      ? C.primary
                                      : C.border),
                            ),
                            child: Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _selectedClientNom ??
                                      'Sélectionner un client…',
                                  style: ts(
                                      14,
                                      _clientId.isNotEmpty
                                          ? F.semiBold
                                          : F.regular,
                                      _clientId.isNotEmpty
                                          ? C.primary
                                          : C.textMuted),
                                ),
                                Icon(Icons.chevron_right,
                                    size: 15,
                                    color: _clientId.isNotEmpty
                                        ? C.primary
                                        : C.textMuted),
                              ],
                            ),
                          ),
                        )
                      else
                        Column(children: [
                          Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: const Color(0xFFFDE68A)),
                            ),
                            child: Row(children: [
                              const Icon(Icons.error_outline,
                                  size: 13, color: C.warning),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "Ce client sera à rattacher depuis l'ERP avant confirmation.",
                                  style: ts(12, F.regular,
                                      const Color(0xFF92400E)),
                                ),
                              ),
                            ]),
                          ),
                          AppTextInput(
                            controller: _newClientNom,
                            placeholder: 'Nom du client ou groupement *',
                            borderColor:
                                _newClientNom.text.trim().isNotEmpty
                                    ? C.primary
                                    : C.border,
                            onChanged: (_) => setState(() {}),
                          ),
                          const SizedBox(height: 10),
                          Row(children: [
                            Expanded(
                              child: AppTextInput(
                                controller: _newClientTel,
                                placeholder: 'Téléphone',
                                textStyle: ts(13, F.regular, C.text),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: AppTextInput(
                                controller: _newClientVille,
                                placeholder: 'Ville',
                                textStyle: ts(13, F.regular, C.text),
                              ),
                            ),
                          ]),
                        ]),
                    ]),
                  ),

                  // ② Dates & devise
                  SectionCard(
                    label: '② Dates & devise',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Date de commande',
                            style: ts(12, F.semiBold, C.textSub)),
                        const SizedBox(height: 6),
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: C.bg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: C.border),
                          ),
                          child: Text(
                              DateFormat('dd MMM yyyy', 'fr_FR')
                                  .format(today),
                              style: ts(14, F.semiBold, C.text)),
                        ),
                        Text('Date de livraison souhaitée',
                            style: ts(12, F.semiBold, C.textSub)),
                        const SizedBox(height: 6),
                        AppTextInput(
                          controller: _livraison,
                          placeholder: 'AAAA-MM-JJ',
                          borderColor: _livraison.text.isNotEmpty
                              ? C.primary
                              : C.border,
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 12),
                        Text('Devise', style: ts(12, F.semiBold, C.textSub)),
                        const SizedBox(height: 6),
                        Row(children: [
                          for (final (i, cur)
                              in const ['XOF', 'EUR', 'USD'].indexed) ...[
                            if (i > 0) const SizedBox(width: 8),
                            Expanded(
                              child: GestureDetector(
                                onTap: () =>
                                    setState(() => _currency = cur),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _currency == cur
                                        ? C.primary
                                        : C.bg,
                                    borderRadius:
                                        BorderRadius.circular(10),
                                    border: Border.all(
                                        color: _currency == cur
                                            ? C.primary
                                            : C.border),
                                  ),
                                  child: Center(
                                    child: Text(cur,
                                        style: ts(
                                            13,
                                            F.bold,
                                            _currency == cur
                                                ? Colors.white
                                                : C.textSub)),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ]),
                      ],
                    ),
                  ),

                  // ③ Articles
                  SectionCard(
                    label: '③ Articles commandés',
                    child: Column(children: [
                      Align(
                        alignment: Alignment.centerRight,
                        child: GestureDetector(
                          onTap: () =>
                              setState(() => _itemForms.add(_ItemForm())),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: C.primarySoft,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.add,
                                      size: 12, color: C.primary),
                                  const SizedBox(width: 5),
                                  Text('Ajouter',
                                      style:
                                          ts(12, F.semiBold, C.primary)),
                                ]),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      for (final (idx, f) in _itemForms.indexed)
                        _itemFormBlock(idx, f),
                    ]),
                  ),

                  // ④ Notes
                  SectionCard(
                    label: '④ Notes',
                    child: AppTextInput(
                      controller: _notes,
                      multiline: true,
                      placeholder:
                          'Instructions particulières, conditions spéciales…',
                      textStyle: ts(14, F.regular, C.text),
                    ),
                  ),
                ]),
              ),
            ],
          ),
        ),

        // Footer sticky
        Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
          decoration: const BoxDecoration(
            color: C.surface,
            border: Border(top: BorderSide(color: C.divider)),
          ),
          child: Column(children: [
            if (_caTotal > 0)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('CA HT prévisionnel',
                        style: ts(13, F.regular, C.textMuted)),
                    Text('${fmtInt(_caTotal)} $_currency',
                        style: ts(18, F.extraBold, C.primary)),
                  ],
                ),
              ),
            BigButton(
              label: 'Créer la commande (DRAFT)',
              icon: Icons.description_outlined,
              enabled: _isValid,
              margin: EdgeInsets.zero,
              onTap: _save,
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _itemFormBlock(int idx, _ItemForm f) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: EdgeInsets.only(top: idx > 0 ? 14 : 0),
      decoration: BoxDecoration(
        border: idx > 0
            ? const Border(top: BorderSide(color: C.divider))
            : null,
      ),
      child: Column(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: C.bg, borderRadius: BorderRadius.circular(6)),
              child: Text('Ligne ${idx + 1}',
                  style: ts(10, F.semiBold, C.textMuted)),
            ),
            if (_itemForms.length > 1)
              GestureDetector(
                onTap: () => setState(() {
                  _itemForms.remove(f);
                  f.dispose();
                }),
                child: const Icon(Icons.delete_outline,
                    size: 16, color: C.danger),
              ),
          ],
        ),
        const SizedBox(height: 8),

        // Article selector
        GestureDetector(
          onTap: () => _pickArticle(f),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: f.articleId.isNotEmpty ? C.primarySoft : C.bg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: f.articleId.isNotEmpty ? C.primary : C.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    f.article.isEmpty
                        ? 'Sélectionner un article…'
                        : f.article,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: ts(
                        13,
                        f.articleId.isNotEmpty ? F.semiBold : F.regular,
                        f.articleId.isNotEmpty ? C.primary : C.textMuted),
                  ),
                ),
                Icon(Icons.inventory_2_outlined,
                    size: 14,
                    color:
                        f.articleId.isNotEmpty ? C.primary : C.textMuted),
              ],
            ),
          ),
        ),

        // Qté + PU HT
        Row(children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Quantité', style: ts(11, F.semiBold, C.textSub)),
                const SizedBox(height: 5),
                AppTextInput(
                  controller: f.quantite,
                  numeric: true,
                  placeholder: '0',
                  suffixText: f.unite.isEmpty ? 'u' : f.unite,
                  textStyle: ts(14, F.bold, C.text),
                  onChanged: (_) => setState(() {}),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('PU HT ($_currency)',
                    style: ts(11, F.semiBold, C.textSub)),
                const SizedBox(height: 5),
                AppTextInput(
                  controller: f.puHT,
                  numeric: true,
                  placeholder: '0',
                  textStyle: ts(14, F.bold, C.text),
                  onChanged: (_) => setState(() {}),
                ),
              ],
            ),
          ),
        ]),
        const SizedBox(height: 10),

        // Remise + montant
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Remise (%)', style: ts(11, F.semiBold, C.textSub)),
                const SizedBox(height: 5),
                AppTextInput(
                  controller: f.remisePct,
                  numeric: true,
                  placeholder: '0',
                  textStyle: ts(14, F.bold, C.text),
                  onChanged: (_) => setState(() {}),
                ),
              ],
            ),
          ),
          if (f.montant > 0) ...[
            const SizedBox(width: 10),
            Expanded(
              flex: 12,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: C.primarySoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('Montant HT', style: ts(11, F.regular, C.primary)),
                    Text(fmtInt(f.montant),
                        style: ts(15, F.extraBold, C.primary)),
                  ],
                ),
              ),
            ),
          ],
        ]),
      ]),
    );
  }
}
