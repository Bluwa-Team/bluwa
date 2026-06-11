import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme.dart';
import '../widgets/help_button.dart';
import '../widgets/shared.dart';

// ── Types alignés ERP ─────────────────────────────────────────────────────────

enum StatutOF {
  enAttenteComposants,
  planifie,
  enCours,
  controleQualite,
  dispo,
  termine,
}

enum EtatLigne { enProduction, enPause, arret, reglage }

enum TypeEvenement {
  lancement,
  declaration,
  arret,
  reprise,
  finProd,
  rebut,
  clotureLot,
}

class OF {
  OF({
    required this.id,
    required this.numero,
    required this.produitFini,
    required this.sku,
    required this.qty,
    required this.realise,
    required this.unite,
    required this.lotPF,
    required this.ligne,
    required this.operateur,
    required this.dateBesoin,
    required this.debutPlanif,
    required this.pickingValide,
    required this.statut,
  });

  final String id;
  final String numero;
  final String produitFini;
  final String sku;
  final double qty;
  double realise;
  final String unite;
  String? lotPF;
  final String ligne;
  final String? operateur;
  final String dateBesoin;
  final String debutPlanif;
  bool pickingValide;
  StatutOF statut;
}

class Composant {
  Composant({
    required this.id,
    required this.article,
    required this.codeArticle,
    required this.qteRequise,
    required this.qtePrelevee,
    required this.unite,
    required this.lotStockDisponible,
    required this.codeBarre,
    required this.scanned,
  });

  final String id;
  final String article;
  final String codeArticle;
  final double qteRequise;
  double qtePrelevee;
  final String unite;
  final String lotStockDisponible;
  final String codeBarre;
  bool scanned;
}

class Evenement {
  Evenement(this.type, this.heure, this.detail, this.operateur);
  final TypeEvenement type;
  final String heure;
  final String detail;
  final String operateur;
}

// ── Configs statuts ───────────────────────────────────────────────────────────

class _Cfg {
  const _Cfg(this.label, this.color, this.bg, this.icon);
  final String label;
  final Color color;
  final Color bg;
  final IconData icon;
}

const _statutCfg = {
  StatutOF.enAttenteComposants: _Cfg('En attente composants', C.orange,
      C.orangeSoft, Icons.inventory_2_outlined),
  StatutOF.planifie: _Cfg('Planifié', C.primary, C.primarySoft, Icons.schedule),
  StatutOF.enCours:
      _Cfg('En cours', C.rose, C.roseSoft, Icons.monitor_heart_outlined),
  StatutOF.controleQualite: _Cfg(
      'Contrôle qualité', C.warning, C.warningSoft, Icons.science_outlined),
  StatutOF.dispo:
      _Cfg('Dispo', C.success, C.successSoft, Icons.check_circle_outline),
  StatutOF.termine: _Cfg('Terminé', C.textMuted, C.bg, Icons.check),
};

const _transitionLabel = {
  StatutOF.enAttenteComposants: 'Valider le picking',
  StatutOF.planifie: "Lancer l'OF",
  StatutOF.enCours: 'Terminer la production',
  StatutOF.controleQualite: 'Libérer',
  StatutOF.dispo: 'Archiver',
};

const _nextStatut = {
  StatutOF.enAttenteComposants: StatutOF.planifie,
  StatutOF.planifie: StatutOF.enCours,
  StatutOF.enCours: StatutOF.controleQualite,
  StatutOF.controleQualite: StatutOF.dispo,
  StatutOF.dispo: StatutOF.termine,
};

const _etatLigneCfg = {
  EtatLigne.enProduction:
      _Cfg('En production', C.rose, C.roseSoft, Icons.monitor_heart_outlined),
  EtatLigne.enPause:
      _Cfg('En pause', C.warning, C.warningSoft, Icons.pause),
  EtatLigne.arret: _Cfg('Arrêt', C.danger, C.dangerSoft, Icons.stop),
  EtatLigne.reglage:
      _Cfg('Réglage', C.primary, C.primarySoft, Icons.bolt),
};

const _motifsArret = [
  'Panne machine',
  'Manque composants',
  'Pause opérateur',
  'Nettoyage / CIP',
  'Réglage / Calibrage',
  'Autre',
];

const _rebutMotifs = [
  'Casse mécanique',
  'Défaut qualité',
  'Déversement accidentel',
  'Lot rejeté (CCP NC)',
  'Autre',
];

class _CcpSpec {
  const _CcpSpec(this.key, this.label, this.unit, this.spec, this.placeholder,
      this.validate);
  final String key;
  final String label;
  final String unit;
  final String spec;
  final String placeholder;
  final bool Function(double) validate;
}

final _ccpSpecs = [
  _CcpSpec('pH', 'pH', '', '2.8 – 3.8', '3.2', (n) => n >= 2.8 && n <= 3.8),
  _CcpSpec('tempPast', 'Temp. pasteurisation', '°C', '≥ 85 °C', '90',
      (n) => n >= 85),
  _CcpSpec(
      'brix', 'Brix', '°Bx', '12.0 – 16.0', '14.5', (n) => n >= 12 && n <= 16),
  _CcpSpec('tempRefr', 'Temp. refroidissement', '°C', '≤ 25 °C', '20',
      (n) => n <= 25),
];

// ── Mock data ─────────────────────────────────────────────────────────────────

final _mockOfs = [
  OF(id: '1', numero: 'OF-2026-045', produitFini: 'Huile de coton raffinée 5L', sku: 'PF-HCR-005', qty: 500, realise: 0, unite: 'bidon', lotPF: null, ligne: 'L1', operateur: null, dateBesoin: '2026-05-30', debutPlanif: '2026-05-29', pickingValide: false, statut: StatutOF.enAttenteComposants),
  OF(id: '2', numero: 'OF-2026-044', produitFini: 'Tourteau de coton 45% — 50kg', sku: 'PF-TOU-050', qty: 200, realise: 0, unite: 'sac', lotPF: null, ligne: 'L2', operateur: 'Kouamé A.', dateBesoin: '2026-05-29', debutPlanif: '2026-05-28', pickingValide: true, statut: StatutOF.planifie),
  OF(id: '3', numero: 'OF-2026-043', produitFini: 'Anacarde décortiqué W320', sku: 'PF-ANA-W32', qty: 180, realise: 80, unite: 'kg', lotPF: null, ligne: 'L1', operateur: 'Ousmane B.', dateBesoin: '2026-05-29', debutPlanif: '2026-05-28', pickingValide: true, statut: StatutOF.enCours),
  OF(id: '4', numero: 'OF-2026-042', produitFini: 'Coton égrené fibre', sku: 'PF-COT-FIB', qty: 150, realise: 150, unite: 't', lotPF: 'LOT-PF-042', ligne: 'L2', operateur: 'Fatou N.', dateBesoin: '2026-05-28', debutPlanif: '2026-05-27', pickingValide: true, statut: StatutOF.controleQualite),
  OF(id: '5', numero: 'OF-2026-041', produitFini: 'Huile de coton brute', sku: 'PF-HCB-001', qty: 300, realise: 300, unite: 'L', lotPF: 'LOT-PF-041', ligne: 'L1', operateur: 'Mamadou D.', dateBesoin: '2026-05-25', debutPlanif: '2026-05-24', pickingValide: true, statut: StatutOF.dispo),
];

final _mockComposants = <String, List<Composant>>{
  '1': [
    Composant(id: 'c1', article: 'Coton graine brut', codeArticle: 'MAT-001', qteRequise: 1200, qtePrelevee: 0, unite: 'kg', lotStockDisponible: 'LOT-COT-20260527-01', codeBarre: '3700123456789', scanned: false),
    Composant(id: 'c2', article: 'Solvant hexane', codeArticle: 'CHI-012', qteRequise: 80, qtePrelevee: 0, unite: 'L', lotStockDisponible: 'LOT-CHI-20260520-01', codeBarre: '3700987654321', scanned: false),
    Composant(id: 'c3', article: 'Bidon plastique 5L', codeArticle: 'PKG-050', qteRequise: 500, qtePrelevee: 0, unite: 'u', lotStockDisponible: 'LOT-PKG-20260515-01', codeBarre: '3701234567890', scanned: false),
  ],
  '2': [
    Composant(id: 'c4', article: 'Tourteau de coton brut', codeArticle: 'MAT-002', qteRequise: 2000, qtePrelevee: 2000, unite: 'kg', lotStockDisponible: 'LOT-TOU-20260528-01', codeBarre: '3700111222333', scanned: true),
    Composant(id: 'c5', article: 'Sac PP 50kg', codeArticle: 'PKG-010', qteRequise: 200, qtePrelevee: 200, unite: 'u', lotStockDisponible: 'LOT-PKG-20260515-01', codeBarre: '3700444555666', scanned: true),
  ],
};

List<Evenement> _mockJournal() => [
      Evenement(TypeEvenement.declaration, '09:30',
          '+20 kg déclarés (cumul 80/180 kg)', 'Ousmane B.'),
      Evenement(TypeEvenement.arret, '09:00',
          'Arrêt — Réglage / Calibrage (15 min)', 'Ousmane B.'),
      Evenement(TypeEvenement.lancement, '08:15',
          'Lancement production — Anacarde décortiqué W320', 'Ousmane B.'),
    ];

// ── Écran principal ───────────────────────────────────────────────────────────

class OFScreen extends StatefulWidget {
  const OFScreen({super.key});

  @override
  State<OFScreen> createState() => _OFScreenState();
}

class _OFScreenState extends State<OFScreen> {
  final List<OF> _ofs = _mockOfs;
  StatutOF? _filter;

  void _advance(OF of) {
    final next = _nextStatut[of.statut];
    if (next == null) return;
    setState(() {
      of.statut = next;
      if (next != StatutOF.enAttenteComposants) of.pickingValide = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final enCours =
        _ofs.where((o) => o.statut == StatutOF.enCours).length;
    final picking = _ofs
        .where((o) => !o.pickingValide && o.statut != StatutOF.termine)
        .length;
    final qualite =
        _ofs.where((o) => o.statut == StatutOF.controleQualite).length;
    final filtered =
        _ofs.where((o) => _filter == null || o.statut == _filter).toList();

    return Column(children: [
      DarkHeader(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [
              const Icon(Icons.factory_outlined,
                  size: 20, color: Colors.white),
              const SizedBox(width: 10),
              Text('Production', style: ts(22, F.bold, Colors.white)),
            ]),
            const HelpButton(helpKey: 'of_liste'),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '$enCours en cours · $picking picking à valider · $qualite en QC',
          style: ts(13, F.regular, Colors.white.withValues(alpha: 0.5)),
        ),
      ]),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                Expanded(
                    child: KpiTile(
                        label: 'En cours',
                        value: '$enCours',
                        color: C.rose,
                        bg: C.roseSoft,
                        centered: true)),
                const SizedBox(width: 8),
                Expanded(
                    child: KpiTile(
                        label: 'Picking',
                        value: '$picking',
                        color: C.orange,
                        bg: C.orangeSoft,
                        centered: true)),
                const SizedBox(width: 8),
                Expanded(
                    child: KpiTile(
                        label: 'Contrôle QC',
                        value: '$qualite',
                        color: C.warning,
                        bg: C.warningSoft,
                        centered: true)),
              ]),
            ),

            // Filtres statut
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                FilterPill(
                    label: 'Tous',
                    active: _filter == null,
                    onTap: () => setState(() => _filter = null)),
                const SizedBox(width: 6),
                for (final (s, label) in const [
                  (StatutOF.enAttenteComposants, 'Composants'),
                  (StatutOF.planifie, 'Planifié'),
                  (StatutOF.enCours, 'En cours'),
                  (StatutOF.controleQualite, 'QC'),
                  (StatutOF.dispo, 'Dispo'),
                ]) ...[
                  FilterPill(
                      label: label,
                      active: _filter == s,
                      onTap: () => setState(() => _filter = s)),
                  const SizedBox(width: 6),
                ],
              ]),
            ),
            const SizedBox(height: 12),

            // Liste OF
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(children: [
                for (final of in filtered) _ofCard(of),
              ]),
            ),
          ],
        ),
      ),
    ]);
  }

  Widget _ofCard(OF of) {
    final s = _statutCfg[of.statut]!;
    final pct = of.qty > 0 ? (of.realise / of.qty * 100).round() : 0;

    return GestureDetector(
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => OFDetailScreen(of: of, onAdvance: _advance)));
        setState(() {});
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: C.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(of.numero, style: ts(11, F.regular, C.textMuted)),
                    const SizedBox(height: 2),
                    Text(of.produitFini,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: ts(15, F.semiBold, C.text)),
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
            StatusPill(label: s.label, color: s.color, bg: s.bg, icon: s.icon),
            if (!of.pickingValide && of.statut != StatutOF.termine)
              const StatusPill(
                  label: 'Picking à valider', color: C.orange, bg: C.orangeSoft),
            StatusPill(label: of.ligne, color: C.textMuted, bg: C.bg),
          ]),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${fmtNum(of.realise)} / ${fmtNum(of.qty)} ${of.unite}',
                  style: ts(12, F.regular, C.textMuted)),
              Text('$pct %', style: ts(12, F.semiBold, s.color)),
            ],
          ),
          const SizedBox(height: 6),
          AppProgressBar(value: pct.toDouble(), color: s.color),
          if (of.operateur != null) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.people_outline, size: 11, color: C.textMuted),
              const SizedBox(width: 5),
              Text('${of.operateur} · Besoin : ${of.dateBesoin}',
                  style: ts(11, F.regular, C.textMuted)),
            ]),
          ],
        ]),
      ),
    );
  }
}

// ── Détail OF ─────────────────────────────────────────────────────────────────

class OFDetailScreen extends StatefulWidget {
  const OFDetailScreen({super.key, required this.of, required this.onAdvance});
  final OF of;
  final void Function(OF) onAdvance;

  @override
  State<OFDetailScreen> createState() => _OFDetailScreenState();
}

class _OFDetailScreenState extends State<OFDetailScreen> {
  OF get of => widget.of;

  void _advance() {
    widget.onAdvance(of);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final s = _statutCfg[of.statut]!;
    final pct = of.qty > 0 ? (of.realise / of.qty * 100).round() : 0;
    final nextLabel = _transitionLabel[of.statut];
    const white = Colors.white;

    return Scaffold(
      backgroundColor: C.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          DarkHeader(children: [
            HeaderBackButton(onTap: () => Navigator.pop(context)),
            const SizedBox(height: 14),
            Row(children: [
              StatusPill(
                  label: s.label, color: s.color, bg: s.bg, icon: s.icon),
              const SizedBox(width: 8),
              Text(of.numero,
                  style: ts(12, F.regular, white.withValues(alpha: 0.4))),
            ]),
            const SizedBox(height: 6),
            Text(of.produitFini, style: ts(18, F.bold, white)),
            const SizedBox(height: 4),
            Row(children: [
              Icon(Icons.factory_outlined,
                  size: 12, color: white.withValues(alpha: 0.4)),
              const SizedBox(width: 5),
              Text('${of.ligne} · ${of.operateur ?? 'Opérateur non assigné'}',
                  style: ts(12, F.regular, white.withValues(alpha: 0.4))),
            ]),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              SectionCard(
                label: 'Progression',
                margin: const EdgeInsets.only(bottom: 12),
                child: Column(children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Réalisé', style: ts(13, F.regular, C.textSub)),
                      Text(
                          '${fmtNum(of.realise)} / ${fmtNum(of.qty)} ${of.unite}',
                          style: ts(15, F.bold, C.text)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  AppProgressBar(value: pct.toDouble(), color: s.color),
                  const SizedBox(height: 5),
                  Align(
                    alignment: Alignment.centerRight,
                    child:
                        Text('$pct %', style: ts(12, F.medium, C.textMuted)),
                  ),
                ]),
              ),
              SectionCard(
                label: 'Informations',
                margin: const EdgeInsets.only(bottom: 12),
                child: Column(children: [
                  for (final (label, value) in [
                    ('SKU', of.sku),
                    ('Ligne', of.ligne),
                    ('Début planifié', of.debutPlanif),
                    ('Date besoin', of.dateBesoin),
                    ('Lot PF', of.lotPF ?? '—'),
                    ('Picking', of.pickingValide ? '✓ Validé' : '⚠ À valider'),
                  ])
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(label, style: ts(13, F.regular, C.textMuted)),
                          Text(value, style: ts(13, F.semiBold, C.text)),
                        ],
                      ),
                    ),
                ]),
              ),

              // Actions contextuelles
              if (of.statut == StatutOF.enAttenteComposants)
                BigButton(
                  label: 'Préparer les composants (Picking)',
                  icon: Icons.qr_code_scanner,
                  color: C.orange,
                  onTap: () async {
                    await Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => PickingScreen(
                            of: of,
                            composants: _mockComposants[of.id] ?? [],
                            onValidate: _advance)));
                    setState(() {});
                  },
                ),
              if (of.statut == StatutOF.planifie ||
                  of.statut == StatutOF.enCours)
                BigButton(
                  label: 'Tableau de bord MES',
                  icon: Icons.monitor_heart_outlined,
                  color: C.rose,
                  onTap: () async {
                    await Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => MESScreen(of: of, onFinish: _advance)));
                    setState(() {});
                  },
                ),
              if (nextLabel != null &&
                  of.statut != StatutOF.enAttenteComposants &&
                  of.statut != StatutOF.planifie &&
                  of.statut != StatutOF.enCours)
                BigButton(
                  label: nextLabel,
                  icon: Icons.check_circle_outline,
                  color: C.success,
                  onTap: _advance,
                ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ── Picking — préparation des composants ──────────────────────────────────────

class PickingScreen extends StatefulWidget {
  const PickingScreen({
    super.key,
    required this.of,
    required this.composants,
    required this.onValidate,
  });

  final OF of;
  final List<Composant> composants;
  final VoidCallback onValidate;

  @override
  State<PickingScreen> createState() => _PickingScreenState();
}

class _PickingScreenState extends State<PickingScreen> {
  String? _scanTarget;
  bool _scanError = false;
  final _scanInput = TextEditingController();
  late final Map<String, TextEditingController> _qteInputs = {
    for (final c in widget.composants)
      c.id: TextEditingController(
          text: c.qtePrelevee == 0 ? '' : fmtRaw(c.qtePrelevee)),
  };

  static String fmtRaw(double v) =>
      v == v.roundToDouble() ? '${v.round()}' : '$v';

  @override
  void dispose() {
    _scanInput.dispose();
    for (final c in _qteInputs.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _handleScan(Composant c) {
    if (_scanInput.text.trim() == c.codeBarre) {
      setState(() {
        c.scanned = true;
        _scanTarget = null;
        _scanError = false;
        _scanInput.clear();
      });
    } else {
      setState(() => _scanError = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.composants;
    final allScanned = items.every((c) => c.scanned);
    final allPrelevees = items.every((c) => c.qtePrelevee >= c.qteRequise);
    final doneCount = items
        .where((c) => c.scanned && c.qtePrelevee >= c.qteRequise)
        .length;
    final remaining = items.where((c) => !c.scanned).length;

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
                const HelpButton(helpKey: 'of_picking'),
              ],
            ),
            const SizedBox(height: 14),
            HeaderBadge('Picking · ${widget.of.numero}',
                color: C.orange, bg: C.orangeSoft),
            Text(widget.of.produitFini, style: ts(18, F.bold, Colors.white)),
            const SizedBox(height: 2),
            Text(
              '${items.where((c) => c.scanned).length} / ${items.length} composants scannés',
              style: ts(12, F.regular, Colors.white.withValues(alpha: 0.45)),
            ),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              SectionCard(
                child: Column(children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Avancement picking',
                          style: ts(12, F.semiBold, C.textMuted)),
                      Text('$doneCount / ${items.length}',
                          style: ts(12, F.bold, C.primary)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  AppProgressBar(
                      value: items.isEmpty
                          ? 0
                          : doneCount / items.length * 100,
                      color: C.primary),
                ]),
              ),
              for (final c in items) _composantCard(c),
              const SizedBox(height: 8),
              BigButton(
                label: allScanned && allPrelevees
                    ? 'Valider le picking'
                    : 'Encore $remaining composant(s) à scanner',
                color: C.success,
                enabled: allScanned && allPrelevees,
                onTap: () {
                  widget.onValidate();
                  Navigator.pop(context);
                },
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _composantCard(Composant c) {
    final done = c.scanned && c.qtePrelevee >= c.qteRequise;
    final scanning = _scanTarget == c.id;

    return SectionCard(
      margin: const EdgeInsets.only(bottom: 10),
      borderColor: done
          ? const Color(0xFFA7F3D0)
          : scanning
              ? C.primary
              : C.border,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.codeArticle, style: ts(11, F.regular, C.textMuted)),
                  Text(c.article, style: ts(15, F.semiBold, C.text)),
                  const SizedBox(height: 2),
                  Text('Lot stock : ${c.lotStockDisponible}',
                      style: ts(11, F.regular, C.textMuted)),
                ],
              ),
            ),
            if (done)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: C.successSoft,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: const Icon(Icons.check_circle_outline,
                    size: 14, color: C.success),
              )
            else
              const StatusPill(
                  label: 'À prélever', color: C.orange, bg: C.orangeSoft),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Quantité requise', style: ts(11, F.regular, C.textMuted)),
              Text('${fmtNum(c.qteRequise)} ${c.unite}',
                  style: ts(16, F.bold, C.text)),
            ]),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('Prélevé', style: ts(11, F.regular, C.textMuted)),
              SizedBox(
                width: 80,
                child: TextField(
                  controller: _qteInputs[c.id],
                  textAlign: TextAlign.right,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  style: ts(16, F.bold,
                      c.qtePrelevee >= c.qteRequise ? C.success : C.text),
                  decoration: InputDecoration(
                    hintText: '0',
                    hintStyle: ts(16, F.bold, C.textMuted),
                    isDense: true,
                    contentPadding: const EdgeInsets.only(bottom: 2),
                    enabledBorder: UnderlineInputBorder(
                      borderSide: BorderSide(
                          color: c.qtePrelevee >= c.qteRequise
                              ? C.success
                              : C.border),
                    ),
                    focusedBorder: const UnderlineInputBorder(
                        borderSide: BorderSide(color: C.primary)),
                  ),
                  onChanged: (v) {
                    final val = parseNum(v);
                    if (val != null) {
                      setState(() => c.qtePrelevee = val);
                    }
                  },
                ),
              ),
            ]),
          ],
        ),
        const SizedBox(height: 12),

        // Scan
        if (c.scanned)
          Row(children: [
            const Icon(Icons.check_circle_outline,
                size: 13, color: C.success),
            const SizedBox(width: 6),
            Text('Lot scanné : ${c.codeBarre}',
                style: ts(12, F.medium, C.success)),
          ])
        else if (scanning)
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppTextInput(
              controller: _scanInput,
              placeholder: 'Code-barres : ${c.codeBarre}',
              prefixIcon: Icons.qr_code_scanner,
              borderColor: _scanError ? C.danger : C.primary,
              onChanged: (_) => setState(() => _scanError = false),
              suffix: GestureDetector(
                onTap: () => setState(() {
                  _scanTarget = null;
                  _scanError = false;
                  _scanInput.clear();
                }),
                child: const Icon(Icons.close, size: 14, color: C.textMuted),
              ),
            ),
            if (_scanError)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('Code-barres incorrect. Réessayer.',
                    style: ts(11, F.regular, C.danger)),
              ),
            const SizedBox(height: 6),
            BigButton(
              label: 'Valider le scan',
              margin: EdgeInsets.zero,
              padding: const EdgeInsets.symmetric(vertical: 10),
              onTap: () => _handleScan(c),
            ),
          ])
        else
          BigButton(
            label: 'Scanner le code-barres',
            icon: Icons.qr_code_scanner,
            outlined: true,
            textColor: C.textSub,
            margin: EdgeInsets.zero,
            padding: const EdgeInsets.symmetric(vertical: 10),
            onTap: () => setState(() {
              _scanTarget = c.id;
              _scanError = false;
              _scanInput.clear();
            }),
          ),
      ]),
    );
  }
}

// ── MES — Manufacturing Execution System ──────────────────────────────────────

class MESScreen extends StatefulWidget {
  const MESScreen({super.key, required this.of, required this.onFinish});
  final OF of;
  final VoidCallback onFinish;

  @override
  State<MESScreen> createState() => _MESScreenState();
}

class _MESScreenState extends State<MESScreen> {
  late EtatLigne _etat = widget.of.statut == StatutOF.enCours
      ? EtatLigne.enProduction
      : EtatLigne.arret;
  late final List<Evenement> _journal =
      widget.of.statut == StatutOF.enCours ? _mockJournal() : [];

  OF get of => widget.of;

  String _now() => DateFormat('HH:mm', 'fr_FR').format(DateTime.now());

  void _addEvent(TypeEvenement type, String detail) {
    _journal.insert(
        0, Evenement(type, _now(), detail, of.operateur ?? 'Opérateur'));
  }

  // ── Modales ──

  Future<void> _openDeclaration() async {
    final ctrl = TextEditingController();
    await showAppSheet(
      context,
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Déclaration de production', style: ts(18, F.bold, C.text)),
            const SizedBox(height: 6),
            Text(
                'Cumul actuel : ${fmtNum(of.realise)} / ${fmtNum(of.qty)} ${of.unite}',
                style: ts(13, F.regular, C.textMuted)),
            const SizedBox(height: 20),
            Text('Quantité produite (${of.unite})',
                style: ts(13, F.semiBold, C.textSub)),
            const SizedBox(height: 8),
            AppTextInput(
              controller: ctrl,
              numeric: true,
              placeholder: '0',
              textAlign: TextAlign.center,
              textStyle: ts(22, F.bold, C.text),
              borderColor: C.primary,
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: BigButton(
                  label: 'Annuler',
                  outlined: true,
                  textColor: C.textSub,
                  margin: EdgeInsets.zero,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  onTap: () => Navigator.pop(context),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: BigButton(
                  label: 'Valider',
                  color: C.success,
                  margin: EdgeInsets.zero,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  onTap: () {
                    final q = parseNum(ctrl.text);
                    if (q == null || q <= 0) return;
                    setState(() {
                      of.realise += q;
                      _addEvent(TypeEvenement.declaration,
                          '+${fmtNum(q)} ${of.unite} déclarés (cumul ${fmtNum(of.realise)}/${fmtNum(of.qty)})');
                      _etat = EtatLigne.enProduction;
                    });
                    Navigator.pop(context);
                  },
                ),
              ),
            ]),
          ],
        ),
      ),
    );
    ctrl.dispose();
  }

  Future<void> _openArret() async {
    var motif = _motifsArret.first;
    await showAppSheet(
      context,
      StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Signaler un arrêt', style: ts(18, F.bold, C.text)),
              const SizedBox(height: 16),
              for (final m in _motifsArret)
                RadioRow(
                  active: motif == m,
                  onTap: () => setSheet(() => motif = m),
                  label: m,
                  activeColor: C.danger,
                  activeBg: C.dangerSoft,
                  activeBorder: const Color(0xFFFECACA),
                ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: BigButton(
                    label: 'Annuler',
                    outlined: true,
                    textColor: C.textSub,
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    onTap: () => Navigator.pop(ctx),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: BigButton(
                    label: "Confirmer l'arrêt",
                    color: C.danger,
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    onTap: () {
                      setState(() {
                        _addEvent(TypeEvenement.arret, 'Arrêt — $motif');
                        _etat = EtatLigne.arret;
                      });
                      Navigator.pop(ctx);
                    },
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openRebut() async {
    final ctrl = TextEditingController();
    var motif = _rebutMotifs.first;
    await showAppSheet(
      context,
      StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Déclarer des rebuts', style: ts(18, F.bold, C.text)),
              const SizedBox(height: 16),
              Text('Quantité rebut (${of.unite})',
                  style: ts(13, F.semiBold, C.textSub)),
              const SizedBox(height: 8),
              AppTextInput(
                controller: ctrl,
                numeric: true,
                placeholder: '0',
                textAlign: TextAlign.center,
                textStyle: ts(20, F.bold, C.text),
                borderColor: C.warning,
              ),
              const SizedBox(height: 14),
              Text('Motif', style: ts(13, F.semiBold, C.textSub)),
              const SizedBox(height: 8),
              for (final m in _rebutMotifs)
                RadioRow(
                  active: motif == m,
                  onTap: () => setSheet(() => motif = m),
                  label: m,
                  activeColor: C.warning,
                  activeBg: C.warningSoft,
                  activeBorder: const Color(0xFFFDE68A),
                ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: BigButton(
                    label: 'Annuler',
                    outlined: true,
                    textColor: C.textSub,
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    onTap: () => Navigator.pop(ctx),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: BigButton(
                    label: 'Enregistrer',
                    color: C.warning,
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    onTap: () {
                      final q = parseNum(ctrl.text);
                      if (q == null || q <= 0) return;
                      setState(() {
                        _addEvent(TypeEvenement.rebut,
                            '${fmtNum(q)} ${of.unite} en rebut — $motif');
                      });
                      Navigator.pop(ctx);
                    },
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
    ctrl.dispose();
  }

  Future<void> _openCloture() async {
    final ctrls = {for (final s in _ccpSpecs) s.key: TextEditingController()};

    bool allValid() => _ccpSpecs.every((s) {
          final n = parseNum(ctrls[s.key]!.text);
          return n != null && s.validate(n);
        });

    await showAppSheet(
      context,
      StatefulBuilder(
        builder: (ctx, setSheet) => SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    const Icon(Icons.shield_outlined,
                        size: 18, color: C.violet),
                    const SizedBox(width: 8),
                    Text('Clôture lot — CCP HACCP',
                        style: ts(18, F.bold, C.text)),
                  ]),
                  const HelpButton(helpKey: 'of_ccp', color: C.textMuted),
                ],
              ),
              const SizedBox(height: 4),
              Text('Tous les CCPs doivent être validés avant de clôturer le lot.',
                  style: ts(13, F.regular, C.textMuted)),
              const SizedBox(height: 20),
              for (final spec in _ccpSpecs)
                Builder(builder: (_) {
                  final txt = ctrls[spec.key]!.text;
                  final val = parseNum(txt);
                  final bool? valid = txt.isEmpty
                      ? null
                      : (val != null && spec.validate(val));
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                                '${spec.label}${spec.unit.isNotEmpty ? ' (${spec.unit})' : ''}',
                                style: ts(13, F.semiBold, C.textSub)),
                            Text('Spec : ${spec.spec}',
                                style: ts(12, F.regular, C.textMuted)),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Row(children: [
                          Expanded(
                            child: AppTextInput(
                              controller: ctrls[spec.key]!,
                              numeric: true,
                              placeholder: spec.placeholder,
                              textStyle: ts(16, F.bold, C.text),
                              borderColor: valid == true
                                  ? C.success
                                  : valid == false
                                      ? C.danger
                                      : C.border,
                              onChanged: (_) => setSheet(() {}),
                            ),
                          ),
                          if (valid == true) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.check_circle_outline,
                                size: 20, color: C.success),
                          ],
                          if (valid == false) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.warning_amber_rounded,
                                size: 20, color: C.danger),
                          ],
                        ]),
                        if (valid == false)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                                'Valeur hors spécification (${spec.spec})',
                                style: ts(11, F.regular, C.danger)),
                          ),
                      ],
                    ),
                  );
                }),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: BigButton(
                    label: 'Annuler',
                    outlined: true,
                    textColor: C.textSub,
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    onTap: () => Navigator.pop(ctx),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: BigButton(
                    label: 'Clôturer le lot',
                    color: C.violet,
                    enabled: allValid(),
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    onTap: () {
                      if (!allValid()) return;
                      setState(() {
                        _addEvent(TypeEvenement.clotureLot,
                            'Clôture lot — CCP validés · Lot PF généré');
                      });
                      Navigator.pop(ctx);
                      widget.onFinish();
                      Navigator.pop(context);
                    },
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
    for (final c in ctrls.values) {
      c.dispose();
    }
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    final pct = of.qty > 0 ? (of.realise / of.qty * 100).round() : 0;
    final etatCfg = _etatLigneCfg[_etat]!;
    const white = Colors.white;

    return Scaffold(
      backgroundColor: C.bg,
      body: Column(children: [
        DarkHeader(children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              HeaderBackButton(onTap: () => Navigator.pop(context)),
              const HelpButton(helpKey: 'of_mes'),
            ],
          ),
          const SizedBox(height: 14),
          Row(children: [
            StatusPill(
                label: etatCfg.label,
                color: etatCfg.color,
                bg: etatCfg.bg,
                icon: etatCfg.icon),
            const SizedBox(width: 8),
            Text('${of.numero} · ${of.ligne}',
                style: ts(12, F.regular, white.withValues(alpha: 0.4))),
          ]),
          const SizedBox(height: 6),
          Text(of.produitFini,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: ts(17, F.bold, white)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${fmtNum(of.realise)} / ${fmtNum(of.qty)} ${of.unite}',
                  style: ts(12, F.regular, white.withValues(alpha: 0.5))),
              Text('$pct %', style: ts(12, F.bold, white)),
            ],
          ),
          const SizedBox(height: 5),
          AppProgressBar(
            value: pct.toDouble(),
            color: pct >= 100 ? const Color(0xFF34D399) : white,
            track: white.withValues(alpha: 0.15),
          ),
        ]),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 60),
            children: [
              const SectionLabel('Actions'),
              Row(children: [
                Expanded(
                  child: _mesAction(
                      label: 'Déclarer',
                      icon: Icons.add,
                      bg: C.success,
                      fg: Colors.white,
                      onTap: _openDeclaration),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _etat == EtatLigne.enProduction ||
                          _etat == EtatLigne.reglage
                      ? _mesAction(
                          label: 'Arrêt',
                          icon: Icons.stop,
                          bg: C.dangerSoft,
                          fg: C.danger,
                          border: const Color(0xFFFECACA),
                          onTap: _openArret)
                      : _mesAction(
                          label: 'Reprendre',
                          icon: Icons.play_arrow,
                          bg: C.primarySoft,
                          fg: C.primary,
                          border: C.primary,
                          onTap: () => setState(() {
                                _addEvent(TypeEvenement.reprise,
                                    'Reprise de production');
                                _etat = EtatLigne.enProduction;
                              })),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _mesAction(
                      label: 'Rebut',
                      icon: Icons.delete_outline,
                      bg: C.warningSoft,
                      fg: C.warning,
                      border: const Color(0xFFFDE68A),
                      onTap: _openRebut),
                ),
              ]),
              const SizedBox(height: 16),
              BigButton(
                label: 'Clôturer le lot (CCP HACCP)',
                icon: Icons.shield_outlined,
                color: C.violet,
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.symmetric(vertical: 14),
                onTap: _openCloture,
              ),
              const SectionLabel('Journal des événements'),
              if (_journal.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Text('Aucun événement pour cet OF.',
                        style: ts(13, F.regular, C.textMuted)),
                  ),
                )
              else
                for (final e in _journal) _eventRow(e),
            ],
          ),
        ),
      ]),
    );
  }

  Widget _mesAction({
    required String label,
    required IconData icon,
    required Color bg,
    required Color fg,
    Color? border,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: border != null ? Border.all(color: border) : null,
        ),
        child: Column(children: [
          Icon(icon, size: 20, color: fg),
          const SizedBox(height: 4),
          Text(label, style: ts(12, F.bold, fg)),
        ]),
      ),
    );
  }

  Widget _eventRow(Evenement e) {
    final (icon, color) = switch (e.type) {
      TypeEvenement.lancement => (Icons.play_arrow, C.primary),
      TypeEvenement.declaration => (Icons.add, C.success),
      TypeEvenement.arret => (Icons.stop, C.danger),
      TypeEvenement.reprise => (Icons.restart_alt, C.warning),
      TypeEvenement.finProd => (Icons.check_circle_outline, C.success),
      TypeEvenement.rebut => (Icons.delete_outline, C.danger),
      TypeEvenement.clotureLot => (Icons.inventory_outlined, C.violet),
    };
    final typeLabel = switch (e.type) {
      TypeEvenement.lancement => 'Lancement',
      TypeEvenement.declaration => 'Déclaration',
      TypeEvenement.arret => 'Arrêt',
      TypeEvenement.reprise => 'Reprise',
      TypeEvenement.finProd => 'Fin de production',
      TypeEvenement.rebut => 'Rebut',
      TypeEvenement.clotureLot => 'Clôture lot',
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.13),
            ),
            child: Icon(icon, size: 13, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(typeLabel, style: ts(13, F.semiBold, C.text)),
                    Text(e.heure, style: ts(12, F.regular, C.textMuted)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(e.detail, style: ts(12, F.regular, C.textMuted)),
                const SizedBox(height: 1),
                Text('— ${e.operateur}', style: ts(11, F.regular, C.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
