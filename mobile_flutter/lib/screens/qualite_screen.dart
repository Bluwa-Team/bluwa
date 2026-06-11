import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../theme.dart';
import '../widgets/help_button.dart';
import '../widgets/shared.dart';

// ── Types DB-aligned ──────────────────────────────────────────────────────────

enum InspectionStatus { pending, released, rejected }

class InspectionLot {
  InspectionLot({
    required this.id,
    required this.batchNumber,
    this.supplierBatchNumber,
    required this.article,
    required this.fournisseur,
    required this.quantityToInspect,
    required this.unite,
    required this.status,
    this.humidityPct,
    this.impuretesPct,
    this.granulometrieMm,
    required this.expirationDate,
    required this.receivedAt,
  });

  final String id;
  final String batchNumber;
  final String? supplierBatchNumber;
  final String article;
  final String fournisseur;
  final double quantityToInspect;
  final String unite;
  final InspectionStatus status;
  final double? humidityPct;
  final double? impuretesPct;
  final double? granulometrieMm;
  final String expirationDate;
  final String receivedAt;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

final _lots = [
  InspectionLot(id: 'lot-1', batchNumber: 'LOT-COT-20260529-01', supplierBatchNumber: '2026-05-29', article: 'Coton graine', fournisseur: 'Coopérative Korhogo', quantityToInspect: 12.4, unite: 't', status: InspectionStatus.pending, expirationDate: '2026-11-29', receivedAt: '2026-05-29'),
  InspectionLot(id: 'lot-2', batchNumber: 'LOT-ANA-20260529-01', supplierBatchNumber: 'LOT-GIE-001', article: 'Anacarde brut', fournisseur: 'GIE Boundiali', quantityToInspect: 8.2, unite: 't', status: InspectionStatus.pending, humidityPct: 9.8, expirationDate: '2027-05-29', receivedAt: '2026-05-29'),
  InspectionLot(id: 'lot-3', batchNumber: 'LOT-SOJ-20260528-01', supplierBatchNumber: '2026-05-28', article: 'Soja décortiqué', fournisseur: 'GIE Ferkessédougou', quantityToInspect: 6.8, unite: 't', status: InspectionStatus.released, humidityPct: 11.2, impuretesPct: 1.8, expirationDate: '2026-11-28', receivedAt: '2026-05-28'),
  InspectionLot(id: 'lot-4', batchNumber: 'LOT-COT-20260528-02', supplierBatchNumber: '2026-05-28', article: 'Coton graine', fournisseur: 'Coop. Boundiali', quantityToInspect: 9.5, unite: 't', status: InspectionStatus.rejected, humidityPct: 16.2, impuretesPct: 4.1, expirationDate: '2026-11-28', receivedAt: '2026-05-28'),
  InspectionLot(id: 'lot-5', batchNumber: 'LOT-ANA-20260527-01', article: 'Anacarde brut', fournisseur: 'SOPROCO', quantityToInspect: 15.0, unite: 't', status: InspectionStatus.released, humidityPct: 8.5, impuretesPct: 1.2, expirationDate: '2027-05-27', receivedAt: '2026-05-27'),
];

// ── Configs ───────────────────────────────────────────────────────────────────

class _StatusCfg {
  const _StatusCfg(this.label, this.color, this.bg, this.icon);
  final String label;
  final Color color;
  final Color bg;
  final IconData icon;
}

const _statusCfg = {
  InspectionStatus.pending:
      _StatusCfg('En attente', C.warning, C.warningSoft, Icons.schedule),
  InspectionStatus.released: _StatusCfg(
      'Libéré', C.success, C.successSoft, Icons.check_circle_outline),
  InspectionStatus.rejected:
      _StatusCfg('Bloqué', C.danger, C.dangerSoft, Icons.cancel_outlined),
};

const _defectTypes = [
  'Humidité hors norme',
  'Corps étranger',
  'Emballage endommagé',
  'Produit périmé',
];

class _DispositionCfg {
  const _DispositionCfg(this.label, this.color, this.bg);
  final String label;
  final Color color;
  final Color bg;
}

const _dispositions = [
  _DispositionCfg("En cours d'examen", C.warning, C.warningSoft),
  _DispositionCfg('Retour fournisseur', C.primary, C.primarySoft),
  _DispositionCfg('Destruction', C.danger, C.dangerSoft),
  _DispositionCfg('Accepté avec remise', C.success, C.successSoft),
];

// ── Section photos (caméra / galerie) ─────────────────────────────────────────

class PhotoSection extends StatelessWidget {
  const PhotoSection({super.key, required this.photos, required this.onChange});

  final List<String> photos;
  final ValueChanged<List<String>> onChange;

  Future<void> _pickFromCamera(BuildContext context) async {
    try {
      final shot = await ImagePicker()
          .pickImage(source: ImageSource.camera, imageQuality: 75);
      if (shot != null) onChange([...photos, shot.path]);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text(
                "L'accès à la caméra est nécessaire pour prendre des photos.")));
      }
    }
  }

  Future<void> _pickFromLibrary(BuildContext context) async {
    try {
      final picked = await ImagePicker()
          .pickMultiImage(imageQuality: 75, limit: 6);
      if (picked.isNotEmpty) {
        onChange([...photos, ...picked.map((p) => p.path)]);
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text("L'accès à la galerie est nécessaire.")));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SizedBox(height: 14),
      const SectionLabel('Photos / Preuves'),
      if (photos.isNotEmpty) ...[
        SizedBox(
          height: 88,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: photos.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) => Stack(
              clipBehavior: Clip.none,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.file(
                    File(photos[i]),
                    width: 88,
                    height: 88,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                        width: 88, height: 88, color: C.border),
                  ),
                ),
                Positioned(
                  top: -6,
                  right: -6,
                  child: GestureDetector(
                    onTap: () => onChange(
                        [...photos]..removeAt(i)),
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: C.danger,
                        shape: BoxShape.circle,
                        border: Border.all(color: C.bg, width: 2),
                      ),
                      child: const Icon(Icons.close,
                          size: 10, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
      ],
      Row(children: [
        Expanded(child: _pickButton(context, Icons.camera_alt_outlined,
            'Caméra', () => _pickFromCamera(context))),
        const SizedBox(width: 8),
        Expanded(child: _pickButton(context, Icons.add_photo_alternate_outlined,
            'Galerie', () => _pickFromLibrary(context))),
      ]),
      if (photos.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            '${photos.length} photo${photos.length > 1 ? 's' : ''} ajoutée${photos.length > 1 ? 's' : ''}',
            style: ts(11, F.regular, C.textMuted),
          ),
        ),
    ]);
  }

  Widget _pickButton(BuildContext context, IconData icon, String label,
      VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: C.bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: C.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: C.textMuted),
            const SizedBox(width: 7),
            Text(label, style: ts(13, F.semiBold, C.textMuted)),
          ],
        ),
      ),
    );
  }
}

// ── Champ paramètre labo avec alerte seuil ────────────────────────────────────

class _ParamField extends StatelessWidget {
  const _ParamField({
    required this.label,
    this.seuil,
    required this.icon,
    required this.controller,
    required this.alert,
    this.alertMsg,
    this.editable = true,
    this.onChanged,
  });

  final String label;
  final String? seuil;
  final IconData icon;
  final TextEditingController controller;
  final bool alert;
  final String? alertMsg;
  final bool editable;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 14, color: alert ? C.danger : C.textMuted),
          const SizedBox(width: 6),
          Text(label, style: ts(12, F.semiBold, C.textSub)),
          if (seuil != null) ...[
            const SizedBox(width: 4),
            Text('— $seuil', style: ts(11, F.regular, C.textMuted)),
          ],
        ]),
        const SizedBox(height: 5),
        AppTextInput(
          controller: controller,
          numeric: true,
          placeholder: '—',
          enabled: editable,
          onChanged: onChanged,
          textStyle: ts(15, F.bold, C.text),
          borderColor: alert
              ? const Color(0xFFFCA5A5)
              : controller.text.isNotEmpty
                  ? C.primary
                  : C.border,
          fillColor: alert ? C.dangerSoft : C.bg,
        ),
        if (alert && alertMsg != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(children: [
              const Icon(Icons.warning_amber_rounded,
                  size: 11, color: C.danger),
              const SizedBox(width: 5),
              Text(alertMsg!, style: ts(11, F.regular, C.danger)),
            ]),
          ),
      ]),
    );
  }
}

// ── Écran principal ───────────────────────────────────────────────────────────

class QualiteScreen extends StatefulWidget {
  const QualiteScreen({super.key});

  @override
  State<QualiteScreen> createState() => _QualiteScreenState();
}

class _QualiteScreenState extends State<QualiteScreen> {
  InspectionStatus? _filter;

  @override
  Widget build(BuildContext context) {
    final pending =
        _lots.where((l) => l.status == InspectionStatus.pending).length;
    final rejected =
        _lots.where((l) => l.status == InspectionStatus.rejected).length;
    final filtered =
        _lots.where((l) => _filter == null || l.status == _filter).toList();

    return Column(children: [
      DarkHeader(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [
              const Icon(Icons.science_outlined, size: 20, color: Colors.white),
              const SizedBox(width: 10),
              Text('Contrôle qualité', style: ts(22, F.bold, Colors.white)),
            ]),
            const HelpButton(helpKey: 'qualite_liste'),
          ],
        ),
        const SizedBox(height: 4),
        Text('$pending en attente · $rejected bloqués',
            style: ts(13, F.regular, Colors.white.withValues(alpha: 0.5))),
      ]),

      // Filtres
      Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          color: C.surface,
          border: Border(bottom: BorderSide(color: C.divider)),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            for (final (f, label) in [
              (null, 'Tous'),
              (InspectionStatus.pending, 'En attente'),
              (InspectionStatus.released, 'Libérés'),
              (InspectionStatus.rejected, 'Bloqués'),
            ]) ...[
              FilterPill(
                  label: label,
                  active: _filter == f,
                  onTap: () => setState(() => _filter = f)),
              const SizedBox(width: 8),
            ],
          ]),
        ),
      ),

      Expanded(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [for (final lot in filtered) _lotCard(lot)],
        ),
      ),
    ]);
  }

  Widget _lotCard(InspectionLot lot) {
    final s = _statusCfg[lot.status]!;
    final hum = lot.humidityPct;
    final imp = lot.impuretesPct;

    return GestureDetector(
      onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ControleDetailScreen(lot: lot))),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: lot.status == InspectionStatus.rejected
                  ? const Color(0xFFFCA5A5)
                  : C.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(lot.batchNumber, style: ts(11, F.regular, C.textMuted)),
              StatusPill(
                  label: s.label, color: s.color, bg: s.bg, icon: s.icon),
            ],
          ),
          const SizedBox(height: 6),
          Text(lot.article, style: ts(15, F.semiBold, C.text)),
          const SizedBox(height: 2),
          Text(lot.fournisseur, style: ts(12, F.regular, C.textMuted)),
          const SizedBox(height: 10),
          Row(children: [
            Text('${fmtNum(lot.quantityToInspect)} ${lot.unite}',
                style: ts(13, F.bold, C.textSub)),
            if (hum != null) ...[
              const SizedBox(width: 16),
              Icon(Icons.water_drop_outlined,
                  size: 12, color: hum > 14 ? C.danger : C.textMuted),
              const SizedBox(width: 4),
              Text('$hum %',
                  style: ts(12, F.semiBold,
                      hum > 14 ? C.danger : C.textSub)),
            ],
            if (imp != null) ...[
              const SizedBox(width: 16),
              Icon(Icons.filter_alt_outlined,
                  size: 12, color: imp > 3 ? C.danger : C.textMuted),
              const SizedBox(width: 4),
              Text('$imp %',
                  style:
                      ts(12, F.semiBold, imp > 3 ? C.danger : C.textSub)),
            ],
            const Spacer(),
            if (lot.status == InspectionStatus.pending)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: C.warningSoft,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text('À analyser',
                    style: ts(10, F.semiBold, C.warning)),
              ),
          ]),
        ]),
      ),
    );
  }
}

// ── Détail contrôle ───────────────────────────────────────────────────────────

class ControleDetailScreen extends StatefulWidget {
  const ControleDetailScreen({super.key, required this.lot});
  final InspectionLot lot;

  @override
  State<ControleDetailScreen> createState() => _ControleDetailScreenState();
}

class _ControleDetailScreenState extends State<ControleDetailScreen> {
  late final _humidity = TextEditingController(
      text: widget.lot.humidityPct?.toString() ?? '');
  late final _impuretes = TextEditingController(
      text: widget.lot.impuretesPct?.toString() ?? '');
  late final _granulometrie = TextEditingController(
      text: widget.lot.granulometrieMm?.toString() ?? '');
  final _observations = TextEditingController();
  List<String> _photos = [];

  InspectionLot get lot => widget.lot;

  @override
  void dispose() {
    for (final c in [_humidity, _impuretes, _granulometrie, _observations]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = _statusCfg[lot.status]!;
    final humVal = parseNum(_humidity.text);
    final impVal = parseNum(_impuretes.text);
    final humAlert = humVal != null && humVal > 14;
    final impAlert = impVal != null && impVal > 3;
    final editable = lot.status == InspectionStatus.pending;

    return Scaffold(
      backgroundColor: C.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          DarkHeader(children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                HeaderBackButton(onTap: () => Navigator.pop(context)),
                const HelpButton(helpKey: 'qualite_controle'),
              ],
            ),
            const SizedBox(height: 14),
            StatusPill(label: s.label, color: s.color, bg: s.bg, icon: s.icon),
            const SizedBox(height: 6),
            Text(lot.article, style: ts(18, F.bold, Colors.white)),
            const SizedBox(height: 2),
            Text(
              '${lot.fournisseur} · ${fmtNum(lot.quantityToInspect)} ${lot.unite}',
              style: ts(12, F.regular, Colors.white.withValues(alpha: 0.5)),
            ),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              SectionCard(
                label: 'Identification du lot',
                child: Column(children: [
                  FieldRow('Lot Bluwa', lot.batchNumber),
                  FieldRow('Lot fournisseur', lot.supplierBatchNumber),
                  FieldRow('DLC calculée', lot.expirationDate),
                ]),
              ),
              SectionCard(
                label: 'Résultats laboratoire',
                child: Column(children: [
                  _ParamField(
                    label: 'Humidité (%)',
                    seuil: 'seuil : ≤ 14 %',
                    icon: Icons.water_drop_outlined,
                    controller: _humidity,
                    alert: humAlert,
                    alertMsg: 'Humidité hors norme — lot à bloquer',
                    editable: editable,
                    onChanged: (_) => setState(() {}),
                  ),
                  _ParamField(
                    label: 'Impuretés (%)',
                    seuil: 'seuil : ≤ 3 %',
                    icon: Icons.filter_alt_outlined,
                    controller: _impuretes,
                    alert: impAlert,
                    alertMsg: "Taux d'impuretés hors norme",
                    editable: editable,
                    onChanged: (_) => setState(() {}),
                  ),
                  _ParamField(
                    label: 'Granulométrie (mm)',
                    icon: Icons.verified_user_outlined,
                    controller: _granulometrie,
                    alert: false,
                    editable: editable,
                  ),
                ]),
              ),
              SectionCard(
                label: 'Observations',
                child: Column(children: [
                  AppTextInput(
                    controller: _observations,
                    multiline: true,
                    enabled: editable,
                    placeholder: 'Aspect visuel, odeur, texture, remarques…',
                    textStyle: ts(14, F.regular, C.text),
                  ),
                  PhotoSection(
                    photos: _photos,
                    onChange: (p) => setState(() => _photos = p),
                  ),
                ]),
              ),
              if (editable) ...[
                const Align(
                  alignment: Alignment.centerLeft,
                  child: SectionLabel('Décision'),
                ),
                BigButton(
                  label: 'Libérer le lot (RELEASED)',
                  icon: Icons.check_circle_outline,
                  color: C.success,
                  onTap: () => Navigator.pop(context),
                ),
                BigButton(
                  label: 'Bloquer + Ouvrir une NC',
                  icon: Icons.warning_amber_rounded,
                  color: C.dangerSoft,
                  textColor: C.danger,
                  borderColor: const Color(0xFFFECACA),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  onTap: _openNC,
                ),
                BigButton(
                  label: 'Enregistrer brouillon',
                  outlined: true,
                  textColor: C.textSub,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  onTap: () => Navigator.pop(context),
                ),
              ],
              if (lot.status == InspectionStatus.rejected)
                BigButton(
                  label: 'Voir / modifier la NC',
                  icon: Icons.warning_amber_rounded,
                  color: C.dangerSoft,
                  textColor: C.danger,
                  borderColor: const Color(0xFFFECACA),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  onTap: _openNC,
                ),
            ]),
          ),
        ],
      ),
    );
  }

  void _openNC() {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => NCFormScreen(lot: lot)));
  }
}

// ── Fiche Non-Conformité ──────────────────────────────────────────────────────

class NCFormScreen extends StatefulWidget {
  const NCFormScreen({super.key, required this.lot});
  final InspectionLot lot;

  @override
  State<NCFormScreen> createState() => _NCFormScreenState();
}

class _NCFormScreenState extends State<NCFormScreen> {
  String _defectType = _defectTypes.first;
  _DispositionCfg _disposition = _dispositions.first;
  final _financialClaim = TextEditingController();
  final _description = TextEditingController();
  List<String> _photos = [];

  InspectionLot get lot => widget.lot;

  @override
  void dispose() {
    _financialClaim.dispose();
    _description.dispose();
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
                HeaderBackButton(
                    onTap: () => Navigator.pop(context),
                    label: 'Retour au contrôle'),
                const HelpButton(helpKey: 'qualite_nc'),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: C.dangerSoft,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text('Non-Conformité',
                  style: ts(11, F.semiBold, C.danger)),
            ),
            Text(lot.article, style: ts(18, F.bold, Colors.white)),
            const SizedBox(height: 2),
            Text('${lot.batchNumber} · ${lot.fournisseur}',
                style:
                    ts(12, F.regular, Colors.white.withValues(alpha: 0.5))),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              SectionCard(
                label: 'Type de défaut',
                child: Column(children: [
                  for (final d in _defectTypes)
                    RadioRow(
                      active: _defectType == d,
                      onTap: () => setState(() => _defectType = d),
                      label: d,
                      activeColor: C.danger,
                      activeBg: C.dangerSoft,
                      activeBorder: const Color(0xFFFECACA),
                    ),
                ]),
              ),
              SectionCard(
                label: 'Description du problème',
                child: Column(children: [
                  AppTextInput(
                    controller: _description,
                    multiline: true,
                    placeholder:
                        "Détails du problème constaté, conditions d'observation…",
                    textStyle: ts(14, F.regular, C.text),
                  ),
                  PhotoSection(
                    photos: _photos,
                    onChange: (p) => setState(() => _photos = p),
                  ),
                ]),
              ),
              SectionCard(
                label: 'Action corrective',
                child: Column(children: [
                  for (final d in _dispositions)
                    RadioRow(
                      active: _disposition == d,
                      onTap: () => setState(() => _disposition = d),
                      label: d.label,
                      activeColor: d.color,
                      activeBg: d.bg,
                    ),
                ]),
              ),
              SectionCard(
                label: 'Réclamation financière',
                margin: const EdgeInsets.only(bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppTextInput(
                      controller: _financialClaim,
                      numeric: true,
                      placeholder: '0',
                      suffixText: 'FCFA',
                      textStyle: ts(15, F.bold, C.text),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Montant du litige réclamé au fournisseur. Laisser à 0 si aucune réclamation.',
                      style: ts(11, F.regular, C.textMuted),
                    ),
                  ],
                ),
              ),
              BigButton(
                label: 'Bloquer le lot + Enregistrer NC',
                icon: Icons.cancel_outlined,
                color: C.danger,
                onTap: () => Navigator.pop(context),
              ),
              BigButton(
                label: 'Enregistrer brouillon',
                outlined: true,
                textColor: C.textSub,
                padding: const EdgeInsets.symmetric(vertical: 14),
                onTap: () => Navigator.pop(context),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
