import 'package:flutter/material.dart';

import '../theme.dart';
import '../widgets/help_button.dart';
import '../widgets/shared.dart';

// ── Types alignés ERP ─────────────────────────────────────────────────────────

enum StatutReception { draft, validated, cancelled }

enum QualiteStatut { conforme, reserve, nonJuge }

enum FluxType { bc, baPlanifie, baDirect }

enum StatutQC { enControle, libere, bloque, nonConforme }

enum PaymentMethod { cash, wave, flooz, orange, opey }

class ReceptionHeader {
  ReceptionHeader({
    required this.id,
    required this.numero,
    required this.date,
    required this.deliveryNoteNumber,
    required this.numeroBon,
    required this.fournisseur,
    required this.typeFournisseur,
    required this.statut,
    required this.qualiteStatut,
    required this.flux,
  });

  final String id;
  final String numero;
  final String date;
  final String? deliveryNoteNumber;
  final String? numeroBon;
  final String fournisseur;
  final String typeFournisseur; // Formel | Informel
  final StatutReception statut;
  final QualiteStatut qualiteStatut;
  final FluxType flux;
}

class ReceptionItem {
  ReceptionItem({
    required this.id,
    required this.headerId,
    required this.article,
    required this.quantite,
    required this.unite,
    this.lot,
    this.lotFourn,
    this.dlc,
    this.humidite,
    this.statutLot,
  });

  final String id;
  final String headerId;
  final String article;
  final double quantite;
  final String unite;
  final String? lot;
  final String? lotFourn;
  final String? dlc;
  final double? humidite;
  final StatutQC? statutLot;
}

class BonOuvert {
  const BonOuvert(this.id, this.numero, this.fournisseur, this.article,
      this.reste, this.unite);
  final String id;
  final String numero;
  final String fournisseur;
  final String article;
  final double reste;
  final String unite;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

final _mockHeaders = [
  ReceptionHeader(id: 'rh1', numero: 'REC-2026-001', date: '2026-05-02', deliveryNoteNumber: 'BL-GIE-2604-01', numeroBon: 'BC-2406-001', fournisseur: 'GIE Boundiali Anacarde', typeFournisseur: 'Formel', statut: StatutReception.validated, qualiteStatut: QualiteStatut.conforme, flux: FluxType.bc),
  ReceptionHeader(id: 'rh2', numero: 'REC-2026-002', date: '2026-05-09', deliveryNoteNumber: 'BL-COOP-0508', numeroBon: 'BA-2026-019', fournisseur: 'Coopérative Korhogo Nord', typeFournisseur: 'Informel', statut: StatutReception.validated, qualiteStatut: QualiteStatut.reserve, flux: FluxType.baPlanifie),
  ReceptionHeader(id: 'rh3', numero: 'REC-2026-003', date: '2026-05-28', deliveryNoteNumber: null, numeroBon: 'BC-2406-003', fournisseur: 'GIE Ferkessédougou', typeFournisseur: 'Formel', statut: StatutReception.draft, qualiteStatut: QualiteStatut.nonJuge, flux: FluxType.bc),
  ReceptionHeader(id: 'rh4', numero: 'REC-2026-004', date: '2026-05-29', deliveryNoteNumber: null, numeroBon: null, fournisseur: 'Moussa Koné', typeFournisseur: 'Informel', statut: StatutReception.draft, qualiteStatut: QualiteStatut.nonJuge, flux: FluxType.baDirect),
];

final _mockItems = [
  ReceptionItem(id: 'ri1', headerId: 'rh1', article: 'Anacarde brut', quantite: 8.2, unite: 't', lot: 'LOT-ANA-20260502-01', lotFourn: 'GIE-001', dlc: '2027-05-02', humidite: 9.8, statutLot: StatutQC.enControle),
  ReceptionItem(id: 'ri2', headerId: 'rh2', article: 'Coton graine', quantite: 12.4, unite: 't', lot: 'LOT-COT-20260509-01', lotFourn: 'COOP-0508', dlc: '2026-11-09', humidite: 16.2, statutLot: StatutQC.bloque),
  ReceptionItem(id: 'ri3', headerId: 'rh3', article: 'Soja décortiqué', quantite: 0, unite: 't'),
  ReceptionItem(id: 'ri4', headerId: 'rh4', article: 'Coton graine', quantite: 4.5, unite: 't'),
];

const _bcOuverts = [
  BonOuvert('bc1', 'BC-2406-003', 'GIE Ferkessédougou', 'Soja décortiqué', 15, 't'),
  BonOuvert('bc2', 'BC-2406-004', 'Coop. Boundiali', 'Coton graine', 37.6, 't'),
];

const _baPlanifies = [
  BonOuvert('ba1', 'BA-2026-020', 'Kouyaté Mamadou', 'Anacarde brut', 5, 't'),
  BonOuvert('ba2', 'BA-2026-021', 'Groupement Tafiré', 'Sésame brut', 3, 't'),
];

const _articlesCatalogue = [
  ('a1', 'Coton graine', 't'),
  ('a2', 'Anacarde brut', 't'),
  ('a3', 'Soja décortiqué', 't'),
  ('a4', 'Sésame brut', 't'),
  ('a5', 'Noix de cajou brute', 't'),
];

// ── Configs ───────────────────────────────────────────────────────────────────

class _FluxCfg {
  const _FluxCfg(this.label, this.color, this.bg, this.facture);
  final String label;
  final Color color;
  final Color bg;
  final bool facture;
}

const _fluxCfg = {
  FluxType.bc: _FluxCfg('BC', C.primary, C.primarySoft, true),
  FluxType.baPlanifie: _FluxCfg('BA', C.orange, C.orangeSoft, false),
  FluxType.baDirect: _FluxCfg('BA Direct', C.violet, C.violetSoft, false),
};

class _PillCfg {
  const _PillCfg(this.label, this.color, this.bg, this.icon);
  final String label;
  final Color color;
  final Color bg;
  final IconData icon;
}

const _statutRec = {
  StatutReception.draft:
      _PillCfg('En cours', C.warning, C.warningSoft, Icons.schedule),
  StatutReception.validated: _PillCfg(
      'Validée', C.success, C.successSoft, Icons.check_circle_outline),
  StatutReception.cancelled:
      _PillCfg('Annulée', C.textMuted, C.bg, Icons.close),
};

const _qualiteCfg = {
  QualiteStatut.conforme: _PillCfg(
      'Conforme', C.success, C.successSoft, Icons.check_circle_outline),
  QualiteStatut.reserve: _PillCfg(
      'Réserve', C.warning, C.warningSoft, Icons.warning_amber_rounded),
  QualiteStatut.nonJuge:
      _PillCfg('Non jugée', C.textMuted, C.bg, Icons.schedule),
};

class _QcCfg {
  const _QcCfg(this.label, this.color, this.bg);
  final String label;
  final Color color;
  final Color bg;
}

const _statutQcCfg = {
  StatutQC.enControle: _QcCfg('En contrôle', C.warning, C.warningSoft),
  StatutQC.libere: _QcCfg('Libéré', C.success, C.successSoft),
  StatutQC.bloque: _QcCfg('Bloqué', C.danger, C.dangerSoft),
  StatutQC.nonConforme: _QcCfg('Non conforme', C.danger, C.dangerSoft),
};

const _paymentLabels = {
  PaymentMethod.cash: 'Espèces',
  PaymentMethod.wave: 'Wave',
  PaymentMethod.flooz: 'Flooz',
  PaymentMethod.orange: 'Orange',
  PaymentMethod.opey: 'Opey',
};

// ── Widgets partagés réception ────────────────────────────────────────────────

class _FactureBanner extends StatelessWidget {
  const _FactureBanner({required this.hasFacture});
  final bool hasFacture;

  @override
  Widget build(BuildContext context) {
    final color = hasFacture ? C.success : C.violet;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: hasFacture ? C.successSoft : C.violetSoft,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: hasFacture
                ? const Color(0xFFA7F3D0)
                : const Color(0xFFDDD6FE)),
      ),
      child: Row(children: [
        Icon(hasFacture ? Icons.receipt_outlined : Icons.block,
            size: 14, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            hasFacture
                ? 'Ce flux génère une facture fournisseur à valider.'
                : 'Pas de facture — règlement direct par paiement mobile ou espèces.',
            style: ts(12, F.medium, color),
          ),
        ),
      ]),
    );
  }
}

class _PaymentSelector extends StatelessWidget {
  const _PaymentSelector({required this.value, required this.onChange});
  final PaymentMethod value;
  final ValueChanged<PaymentMethod> onChange;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        for (final m in PaymentMethod.values) ...[
          GestureDetector(
            onTap: () => onChange(m),
            child: Container(
              margin: const EdgeInsets.only(right: 6),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: value == m ? C.primarySoft : C.bg,
                borderRadius: BorderRadius.circular(10),
                border:
                    Border.all(color: value == m ? C.primary : C.border),
              ),
              child: Text(_paymentLabels[m]!,
                  style: ts(13, F.semiBold,
                      value == m ? C.primary : C.textMuted)),
            ),
          ),
        ],
      ]),
    );
  }
}

class _QualitePicker extends StatelessWidget {
  const _QualitePicker({required this.value, required this.onChange});
  final QualiteStatut value;
  final ValueChanged<QualiteStatut> onChange;

  @override
  Widget build(BuildContext context) {
    const order = [
      QualiteStatut.nonJuge,
      QualiteStatut.conforme,
      QualiteStatut.reserve
    ];
    return Row(children: [
      for (final (i, v) in order.indexed) ...[
        if (i > 0) const SizedBox(width: 6),
        Expanded(
          child: GestureDetector(
            onTap: () => onChange(v),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: value == v ? _qualiteCfg[v]!.bg : C.bg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: value == v ? _qualiteCfg[v]!.color : C.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(_qualiteCfg[v]!.icon,
                      size: 12,
                      color:
                          value == v ? _qualiteCfg[v]!.color : C.textMuted),
                  const SizedBox(width: 4),
                  Text(_qualiteCfg[v]!.label,
                      style: ts(11, F.semiBold,
                          value == v ? _qualiteCfg[v]!.color : C.textMuted)),
                ],
              ),
            ),
          ),
        ),
      ],
    ]);
  }
}

/// Sélecteur de bon ouvert (BC ou BA planifié).
class _BonPicker extends StatelessWidget {
  const _BonPicker({
    required this.bons,
    required this.selected,
    required this.onSelect,
    required this.accentColor,
    required this.accentBg,
  });

  final List<BonOuvert> bons;
  final BonOuvert selected;
  final ValueChanged<BonOuvert> onSelect;
  final Color accentColor;
  final Color accentBg;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      for (final bon in bons)
        RadioRow(
          active: selected.id == bon.id,
          onTap: () => onSelect(bon),
          label: '${bon.numero} — ${bon.fournisseur}',
          sublabel: '${bon.article} · Reste : ${fmtNum(bon.reste)} ${bon.unite}',
          activeColor: accentColor,
          activeBg: accentBg,
        ),
    ]);
  }
}

// ── Écran principal ───────────────────────────────────────────────────────────

class ReceptionScreen extends StatefulWidget {
  const ReceptionScreen({super.key});

  @override
  State<ReceptionScreen> createState() => _ReceptionScreenState();
}

class _ReceptionScreenState extends State<ReceptionScreen> {
  final _search = TextEditingController();
  FluxType? _fluxFilter;
  StatutReception? _statFilter;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _push(Widget screen) {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    final q = _search.text.toLowerCase();
    final filtered = _mockHeaders.where((h) {
      if (_fluxFilter != null && h.flux != _fluxFilter) return false;
      if (_statFilter != null && h.statut != _statFilter) return false;
      return q.isEmpty ||
          h.fournisseur.toLowerCase().contains(q) ||
          h.numero.toLowerCase().contains(q) ||
          (h.numeroBon?.toLowerCase().contains(q) ?? false);
    }).toList();

    final enCours =
        _mockHeaders.where((h) => h.statut == StatutReception.draft).length;
    final conformes = _mockHeaders
        .where((h) => h.qualiteStatut == QualiteStatut.conforme)
        .length;
    final reserve = _mockHeaders
        .where((h) => h.qualiteStatut == QualiteStatut.reserve)
        .length;

    return Column(children: [
      DarkHeader(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [
              const Icon(Icons.local_shipping_outlined,
                  size: 20, color: Colors.white),
              const SizedBox(width: 10),
              Text('Réceptions', style: ts(22, F.bold, Colors.white)),
            ]),
            const HelpButton(helpKey: 'reception_liste'),
          ],
        ),
        const SizedBox(height: 4),
        Text('BC · BA planifié · BA direct',
            style: ts(13, F.regular, Colors.white.withValues(alpha: 0.5))),
      ]),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            // KPIs
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                Expanded(
                    child: KpiTile(
                        label: 'En cours',
                        value: '$enCours',
                        color: C.warning,
                        bg: C.warningSoft,
                        centered: true)),
                const SizedBox(width: 8),
                Expanded(
                    child: KpiTile(
                        label: 'Conformes',
                        value: '$conformes',
                        color: C.success,
                        bg: C.successSoft,
                        centered: true)),
                const SizedBox(width: 8),
                Expanded(
                    child: KpiTile(
                        label: 'Réserve',
                        value: '$reserve',
                        color: C.danger,
                        bg: C.dangerSoft,
                        centered: true)),
              ]),
            ),

            // 3 boutons flux
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionLabel('Nouvelle réception', bottom: 8),
                  _fluxButton(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                          color: C.primarySoft,
                          borderRadius: BorderRadius.circular(10)),
                      child: Center(
                          child: Text('BC',
                              style: ts(13, F.extraBold, C.primary))),
                    ),
                    title: 'Sur Bon de Commande',
                    subtitle: 'Fournisseur formel · Avec facture',
                    subtitleIcon: Icons.receipt_outlined,
                    subtitleIconColor: C.success,
                    onTap: () => _push(const BCFormScreen()),
                  ),
                  _fluxButton(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                          color: C.orangeSoft,
                          borderRadius: BorderRadius.circular(10)),
                      child: Center(
                          child: Text('BA',
                              style: ts(13, F.extraBold, C.orange))),
                    ),
                    title: "Sur Bon d'Achat planifié",
                    subtitle: 'Producteur informel · Sans facture',
                    subtitleIcon: Icons.block,
                    subtitleIconColor: C.violet,
                    onTap: () => _push(const BAPlanifieFormScreen()),
                  ),
                  _fluxButton(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                          color: C.violetSoft,
                          borderRadius: BorderRadius.circular(10)),
                      child:
                          const Icon(Icons.add, size: 18, color: C.violet),
                    ),
                    title: 'Achat direct (BA auto)',
                    subtitle: 'Spontané · Prix du jour · Sans facture',
                    subtitleIcon: Icons.block,
                    subtitleIconColor: C.violet,
                    onTap: () => _push(const BADirectFormScreen()),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Recherche + filtres
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(children: [
                AppTextInput(
                  controller: _search,
                  placeholder: 'N°, fournisseur, bon…',
                  prefixIcon: Icons.search,
                  fillColor: C.surface,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(children: [
                    FilterPill(
                        label: 'Tous',
                        active: _fluxFilter == null,
                        onTap: () => setState(() => _fluxFilter = null)),
                    const SizedBox(width: 6),
                    for (final f in FluxType.values) ...[
                      FilterPill(
                          label: switch (f) {
                            FluxType.bc => 'BC',
                            FluxType.baPlanifie => 'BA planifié',
                            FluxType.baDirect => 'BA direct',
                          },
                          active: _fluxFilter == f,
                          onTap: () => setState(() => _fluxFilter = f)),
                      const SizedBox(width: 6),
                    ],
                    FilterPill(
                        label: 'En cours',
                        active: _statFilter == StatutReception.draft,
                        onTap: () => setState(() => _statFilter =
                            _statFilter == StatutReception.draft
                                ? null
                                : StatutReception.draft)),
                    const SizedBox(width: 6),
                    FilterPill(
                        label: 'Validées',
                        active: _statFilter == StatutReception.validated,
                        onTap: () => setState(() => _statFilter =
                            _statFilter == StatutReception.validated
                                ? null
                                : StatutReception.validated)),
                  ]),
                ),
              ]),
            ),

            // Liste
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionLabel(
                      '${filtered.length} réception${filtered.length != 1 ? 's' : ''}',
                      bottom: 8),
                  for (final h in filtered) _receptionCard(h),
                ],
              ),
            ),
          ],
        ),
      ),
    ]);
  }

  Widget _fluxButton({
    required Widget leading,
    required String title,
    required String subtitle,
    required IconData subtitleIcon,
    required Color subtitleIconColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: C.border),
        ),
        child: Row(children: [
          leading,
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: ts(14, F.bold, C.text)),
                const SizedBox(height: 3),
                Row(children: [
                  Icon(subtitleIcon, size: 11, color: subtitleIconColor),
                  const SizedBox(width: 4),
                  Text(subtitle, style: ts(12, F.regular, C.textMuted)),
                ]),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 15, color: C.textMuted),
        ]),
      ),
    );
  }

  Widget _receptionCard(ReceptionHeader h) {
    final s = _statutRec[h.statut]!;
    final qc = _qualiteCfg[h.qualiteStatut]!;
    final fl = _fluxCfg[h.flux]!;

    return GestureDetector(
      onTap: () => _push(ReceptionDetailScreen(
          header: h,
          items: _mockItems.where((i) => i.headerId == h.id).toList())),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: h.qualiteStatut == QualiteStatut.reserve
                  ? const Color(0xFFFED7AA)
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
                    Text('${h.numero} · ${h.date}',
                        style: ts(11, F.regular, C.textMuted)),
                    const SizedBox(height: 2),
                    Text(h.fournisseur, style: ts(15, F.semiBold, C.text)),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child:
                    Icon(Icons.chevron_right, size: 15, color: C.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 6, children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                  color: fl.bg, borderRadius: BorderRadius.circular(6)),
              child: Text(h.numeroBon ?? fl.label,
                  style: ts(11, F.bold, fl.color)),
            ),
            StatusPill(label: s.label, color: s.color, bg: s.bg, icon: s.icon),
            StatusPill(
                label: qc.label, color: qc.color, bg: qc.bg, icon: qc.icon),
            if (!fl.facture)
              const StatusPill(
                  label: 'Sans facture', color: C.violet, bg: C.violetSoft),
          ]),
        ]),
      ),
    );
  }
}

// ── Détail réception ──────────────────────────────────────────────────────────

class ReceptionDetailScreen extends StatelessWidget {
  const ReceptionDetailScreen(
      {super.key, required this.header, required this.items});

  final ReceptionHeader header;
  final List<ReceptionItem> items;

  @override
  Widget build(BuildContext context) {
    final s = _statutRec[header.statut]!;
    final qc = _qualiteCfg[header.qualiteStatut]!;
    final fl = _fluxCfg[header.flux]!;

    return Scaffold(
      backgroundColor: C.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          DarkHeader(children: [
            HeaderBackButton(onTap: () => Navigator.pop(context)),
            const SizedBox(height: 14),
            Text('${header.numero} · ${header.date}',
                style:
                    ts(12, F.regular, Colors.white.withValues(alpha: 0.45))),
            const SizedBox(height: 2),
            Text(header.fournisseur, style: ts(18, F.bold, Colors.white)),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                    color: fl.bg, borderRadius: BorderRadius.circular(6)),
                child: Text(
                    '${fl.label}${fl.facture ? ' · Avec facture' : ' · Sans facture'}',
                    style: ts(11, F.bold, fl.color)),
              ),
              StatusPill(
                  label: s.label, color: s.color, bg: s.bg, icon: s.icon),
              StatusPill(
                  label: qc.label, color: qc.color, bg: qc.bg, icon: qc.icon),
            ]),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              SectionCard(
                label: 'Informations',
                child: Column(children: [
                  FieldRow('Type fournisseur', header.typeFournisseur),
                  FieldRow('Document lié', header.numeroBon),
                  FieldRow(
                      'Bordereau de livraison', header.deliveryNoteNumber),
                ]),
              ),
              for (final item in items) _itemCard(item),
              if (header.statut == StatutReception.draft) ...[
                BigButton(
                  label: 'Valider la réception',
                  icon: Icons.task_alt,
                  color: C.success,
                  onTap: () {},
                ),
                BigButton(
                  label: 'Signaler une réserve',
                  icon: Icons.warning_amber_rounded,
                  color: C.dangerSoft,
                  textColor: C.danger,
                  borderColor: const Color(0xFFFECACA),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  onTap: () {},
                ),
              ],
            ]),
          ),
        ],
      ),
    );
  }

  Widget _itemCard(ReceptionItem item) {
    final qc = item.statutLot != null ? _statutQcCfg[item.statutLot]! : null;
    return SectionCard(
      margin: const EdgeInsets.only(bottom: 10),
      borderColor: item.statutLot == StatutQC.bloque
          ? const Color(0xFFFCA5A5)
          : C.border,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
                child: Text(item.article, style: ts(15, F.semiBold, C.text))),
            if (qc != null)
              StatusPill(label: qc.label, color: qc.color, bg: qc.bg),
          ],
        ),
        const SizedBox(height: 10),
        Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Quantité reçue', style: ts(11, F.regular, C.textMuted)),
            Text('${fmtNum(item.quantite)} ${item.unite}',
                style: ts(16, F.bold, C.text)),
          ]),
          if (item.humidite != null) ...[
            const SizedBox(width: 24),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Humidité', style: ts(11, F.regular, C.textMuted)),
              Text('${item.humidite} %',
                  style: ts(16, F.bold,
                      item.humidite! > 14 ? C.danger : C.text)),
            ]),
          ],
        ]),
        const SizedBox(height: 10),
        FieldRow('Lot Bluwa', item.lot),
        FieldRow('Lot fournisseur', item.lotFourn),
        FieldRow('DLC', item.dlc),
      ]),
    );
  }
}

// ── Flux 1 : BC (avec facture) ────────────────────────────────────────────────

class BCFormScreen extends StatefulWidget {
  const BCFormScreen({super.key});

  @override
  State<BCFormScreen> createState() => _BCFormScreenState();
}

class _BCFormScreenState extends State<BCFormScreen> {
  BonOuvert _selected = _bcOuverts.first;
  final _quantite = TextEditingController();
  final _lotFourn = TextEditingController();
  final _dlc = TextEditingController();
  final _bl = TextEditingController();
  final _carrier = TextEditingController();
  QualiteStatut _qualite = QualiteStatut.nonJuge;

  @override
  void dispose() {
    for (final c in [_quantite, _lotFourn, _dlc, _bl, _carrier]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 60),
        children: [
          DarkHeader(children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                HeaderBackButton(onTap: () => Navigator.pop(context)),
                const HelpButton(helpKey: 'reception_bc'),
              ],
            ),
            const SizedBox(height: 14),
            const HeaderBadge('BC · Formel',
                color: C.primary, bg: C.primarySoft),
            Text('Réception sur BC', style: ts(18, F.bold, Colors.white)),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              const _FactureBanner(hasFacture: true),
              SectionCard(
                label: 'Sélectionner le bon de commande',
                child: _BonPicker(
                  bons: _bcOuverts,
                  selected: _selected,
                  onSelect: (b) => setState(() => _selected = b),
                  accentColor: C.primary,
                  accentBg: C.primarySoft,
                ),
              ),
              SectionCard(
                label: 'Réception physique',
                child: Column(children: [
                  InputField(
                      label: 'Quantité reçue (${_selected.unite})',
                      icon: Icons.inventory_2_outlined,
                      placeholder: '0,000 ${_selected.unite}',
                      controller: _quantite,
                      numeric: true),
                  InputField(
                      label: 'N° lot fournisseur',
                      icon: Icons.tag,
                      placeholder: 'LOT-XXXX',
                      controller: _lotFourn),
                  InputField(
                      label: 'DLC',
                      icon: Icons.calendar_today_outlined,
                      placeholder: 'AAAA-MM-JJ',
                      controller: _dlc),
                  InputField(
                      label: 'N° bordereau de livraison',
                      icon: Icons.tag,
                      placeholder: 'BL-XXXX',
                      controller: _bl),
                  InputField(
                      label: 'Chauffeur / Immatriculation',
                      icon: Icons.place_outlined,
                      placeholder: 'Nom · AB-1234-CI',
                      controller: _carrier),
                ]),
              ),
              SectionCard(
                label: 'Appréciation qualité',
                margin: const EdgeInsets.only(bottom: 20),
                child: _QualitePicker(
                    value: _qualite,
                    onChange: (v) => setState(() => _qualite = v)),
              ),
              BigButton(
                label: 'Valider la réception',
                onTap: () => Navigator.pop(context),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: C.primarySoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 1),
                      child: Icon(Icons.check_circle_outline,
                          size: 14, color: C.primary),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "Un lot qualité (En contrôle) sera automatiquement créé. La facture fournisseur sera générée dans l'ERP.",
                        style: ts(12, F.regular, C.primary),
                      ),
                    ),
                  ],
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ── Flux 2 : BA planifié (sans facture) ───────────────────────────────────────

class BAPlanifieFormScreen extends StatefulWidget {
  const BAPlanifieFormScreen({super.key});

  @override
  State<BAPlanifieFormScreen> createState() => _BAPlanifieFormScreenState();
}

class _BAPlanifieFormScreenState extends State<BAPlanifieFormScreen> {
  BonOuvert _selected = _baPlanifies.first;
  final _quantite = TextEditingController();
  final _lotFourn = TextEditingController();
  final _carrier = TextEditingController();
  PaymentMethod _payment = PaymentMethod.cash;
  QualiteStatut _qualite = QualiteStatut.nonJuge;

  @override
  void dispose() {
    for (final c in [_quantite, _lotFourn, _carrier]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 60),
        children: [
          DarkHeader(children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                HeaderBackButton(onTap: () => Navigator.pop(context)),
                const HelpButton(helpKey: 'reception_ba_planifie'),
              ],
            ),
            const SizedBox(height: 14),
            const HeaderBadge('BA · Planifié',
                color: C.orange, bg: C.orangeSoft),
            Text('Réception sur BA planifié',
                style: ts(18, F.bold, Colors.white)),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              const _FactureBanner(hasFacture: false),
              SectionCard(
                label: "Sélectionner le bon d'achat",
                child: _BonPicker(
                  bons: _baPlanifies,
                  selected: _selected,
                  onSelect: (b) => setState(() => _selected = b),
                  accentColor: C.orange,
                  accentBg: C.orangeSoft,
                ),
              ),
              SectionCard(
                label: 'Réception physique',
                child: Column(children: [
                  InputField(
                      label: 'Quantité reçue (${_selected.unite})',
                      icon: Icons.inventory_2_outlined,
                      placeholder: '0,000 ${_selected.unite}',
                      controller: _quantite,
                      numeric: true),
                  InputField(
                      label: 'N° lot / date du jour',
                      icon: Icons.tag,
                      placeholder: '2026-05-29',
                      controller: _lotFourn),
                  InputField(
                      label: 'Chauffeur / Immatriculation',
                      icon: Icons.place_outlined,
                      placeholder: 'Nom · AB-1234-CI',
                      controller: _carrier),
                ]),
              ),
              SectionCard(
                label: 'Moyen de paiement',
                child: _PaymentSelector(
                    value: _payment,
                    onChange: (v) => setState(() => _payment = v)),
              ),
              SectionCard(
                label: 'Appréciation qualité',
                margin: const EdgeInsets.only(bottom: 20),
                child: _QualitePicker(
                    value: _qualite,
                    onChange: (v) => setState(() => _qualite = v)),
              ),
              BigButton(
                label: 'Valider la réception',
                color: C.orange,
                onTap: () => Navigator.pop(context),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: C.orangeSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 1),
                      child: Icon(Icons.check_circle_outline,
                          size: 14, color: C.orange),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Un paiement ${_paymentLabels[_payment]} + un lot qualité (En contrôle) seront créés. Aucune facture générée.',
                        style: ts(12, F.regular, C.orange),
                      ),
                    ),
                  ],
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ── Flux 3 : BA direct / spontané (sans facture) ──────────────────────────────

class BADirectFormScreen extends StatefulWidget {
  const BADirectFormScreen({super.key});

  @override
  State<BADirectFormScreen> createState() => _BADirectFormScreenState();
}

class _BADirectFormScreenState extends State<BADirectFormScreen> {
  String _articleId = _articlesCatalogue.first.$1;
  final _quantite = TextEditingController();
  final _prixUnitaire = TextEditingController();
  final _supplierName = TextEditingController();
  final _carrier = TextEditingController();
  PaymentMethod _payment = PaymentMethod.cash;

  @override
  void dispose() {
    for (final c in [_quantite, _prixUnitaire, _supplierName, _carrier]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final article =
        _articlesCatalogue.firstWhere((a) => a.$1 == _articleId);
    final q = parseNum(_quantite.text);
    final p = parseNum(_prixUnitaire.text);
    final total = (q != null && p != null) ? '${fmtInt(q * p)} FCFA' : null;

    return Scaffold(
      backgroundColor: C.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 60),
        children: [
          DarkHeader(children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                HeaderBackButton(onTap: () => Navigator.pop(context)),
                const HelpButton(helpKey: 'reception_ba_direct'),
              ],
            ),
            const SizedBox(height: 14),
            const HeaderBadge('BA · Direct',
                color: C.violet, bg: C.violetSoft),
            Text('Achat direct spontané', style: ts(18, F.bold, Colors.white)),
            const SizedBox(height: 2),
            Text('Le BA est généré automatiquement à la validation',
                style:
                    ts(12, F.regular, Colors.white.withValues(alpha: 0.45))),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              const _FactureBanner(hasFacture: false),
              SectionCard(
                label: 'Producteur / Fournisseur',
                child: Column(children: [
                  InputField(
                      label: 'Nom du producteur',
                      icon: Icons.inventory_2_outlined,
                      placeholder: 'Nom ou groupement',
                      controller: _supplierName),
                  InputField(
                      label: 'Chauffeur / Immatriculation',
                      icon: Icons.place_outlined,
                      placeholder: 'Nom · AB-1234-CI',
                      controller: _carrier),
                ]),
              ),
              SectionCard(
                label: 'Moyen de paiement',
                child: _PaymentSelector(
                    value: _payment,
                    onChange: (v) => setState(() => _payment = v)),
              ),
              SectionCard(
                label: 'Matière première',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(children: [
                        for (final a in _articlesCatalogue)
                          GestureDetector(
                            onTap: () =>
                                setState(() => _articleId = a.$1),
                            child: Container(
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 7),
                              decoration: BoxDecoration(
                                color:
                                    _articleId == a.$1 ? C.violet : C.bg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                    color: _articleId == a.$1
                                        ? C.violet
                                        : C.border),
                              ),
                              child: Text(a.$2,
                                  style: ts(
                                      12,
                                      F.semiBold,
                                      _articleId == a.$1
                                          ? Colors.white
                                          : C.textSub)),
                            ),
                          ),
                      ]),
                    ),
                    const SizedBox(height: 16),
                    InputField(
                        label: 'Quantité (${article.$3})',
                        icon: Icons.inventory_2_outlined,
                        placeholder: '0,000 ${article.$3}',
                        controller: _quantite,
                        numeric: true,
                        onChanged: (_) => setState(() {})),
                    InputField(
                        label: 'Prix unitaire (FCFA / t)',
                        icon: Icons.account_balance_wallet_outlined,
                        placeholder: '0',
                        controller: _prixUnitaire,
                        numeric: true,
                        onChanged: (_) => setState(() {})),
                    if (total != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: C.violetSoft,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisAlignment:
                              MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Montant total',
                                style: ts(13, F.regular, C.violet)),
                            Text(total,
                                style: ts(18, F.extraBold, C.violet)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              BigButton(
                label: "Valider l'achat direct",
                color: C.violet,
                onTap: () => Navigator.pop(context),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: C.violetSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 1),
                      child: Icon(Icons.check_circle_outline,
                          size: 14, color: C.violet),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'BA (AUTO_APPROVED) + paiement ${_paymentLabels[_payment]} + lot qualité (En contrôle) générés automatiquement. Aucune facture.',
                        style: ts(12, F.regular, C.violet),
                      ),
                    ),
                  ],
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
