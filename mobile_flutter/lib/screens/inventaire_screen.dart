import 'package:flutter/material.dart';

import '../theme.dart';
import '../widgets/shared.dart';

// ── Types ─────────────────────────────────────────────────────────────────────

enum InventoryStatus { proposed, counted, posted }

class InvItem {
  InvItem({
    required this.id,
    required this.articleCode,
    required this.articleDesignation,
    required this.batchNumber,
    required this.bookQuantity,
    required this.countedQuantity,
    required this.unite,
  });

  final String id;
  final String articleCode;
  final String articleDesignation;
  final String? batchNumber;
  final double bookQuantity;
  final double? countedQuantity;
  final String unite;
}

class InvDoc {
  InvDoc({
    required this.id,
    required this.documentNumber,
    required this.status,
    required this.createdAt,
    required this.postedAt,
    required this.itemCount,
    required this.countedCount,
    required this.ecartTotal,
  });

  final String id;
  final String documentNumber;
  final InventoryStatus status;
  final String createdAt;
  final String? postedAt;
  final int itemCount;
  final int countedCount;
  final double? ecartTotal;
}

// ── Config statut ─────────────────────────────────────────────────────────────

class _StatutCfg {
  const _StatutCfg(this.label, this.bg, this.text, this.border);
  final String label;
  final Color bg;
  final Color text;
  final Color border;
}

const _statutCfg = {
  InventoryStatus.proposed: _StatutCfg('Proposé', Color(0xFFEFF6FF),
      Color(0xFF1D4ED8), Color(0xFFBFDBFE)),
  InventoryStatus.counted: _StatutCfg('Compté', Color(0xFFFFFBEB),
      Color(0xFFB45309), Color(0xFFFDE68A)),
  InventoryStatus.posted: _StatutCfg('Validé', Color(0xFFF0FDF4),
      Color(0xFF15803D), Color(0xFFBBF7D0)),
};

// ── Mock data ─────────────────────────────────────────────────────────────────

final _mockItems = <String, List<InvItem>>{
  'inv-001': [
    InvItem(id: 'i1', articleCode: 'MAT-001', articleDesignation: 'Coton graine', batchNumber: 'LOT-2026-042', bookQuantity: 48.2, countedQuantity: 47.8, unite: 't'),
    InvItem(id: 'i2', articleCode: 'MAT-002', articleDesignation: 'Anacarde brut', batchNumber: 'LOT-2026-038', bookQuantity: 22.5, countedQuantity: 22.5, unite: 't'),
    InvItem(id: 'i3', articleCode: 'PKG-010', articleDesignation: 'Sacs PP 50 kg', batchNumber: null, bookQuantity: 1200, countedQuantity: 1180, unite: 'u'),
    InvItem(id: 'i4', articleCode: 'LUB-001', articleDesignation: 'Huile moteur 15W40', batchNumber: null, bookQuantity: 120, countedQuantity: null, unite: 'L'),
  ],
  'inv-002': [
    InvItem(id: 'i5', articleCode: 'MAT-003', articleDesignation: 'Soja décortiqué', batchNumber: 'LOT-2026-031', bookQuantity: 15.0, countedQuantity: 15.2, unite: 't'),
    InvItem(id: 'i6', articleCode: 'PKG-011', articleDesignation: 'Palettes bois', batchNumber: null, bookQuantity: 80, countedQuantity: 78, unite: 'u'),
  ],
  'inv-003': [
    InvItem(id: 'i7', articleCode: 'MAT-001', articleDesignation: 'Coton graine', batchNumber: 'LOT-2026-028', bookQuantity: 30.0, countedQuantity: 30.0, unite: 't'),
    InvItem(id: 'i8', articleCode: 'MAT-004', articleDesignation: 'Karité brut', batchNumber: 'LOT-2026-027', bookQuantity: 12.5, countedQuantity: 12.5, unite: 't'),
  ],
};

final _mockDocs = [
  InvDoc(id: 'inv-001', documentNumber: 'INV-2026-003', status: InventoryStatus.counted, createdAt: '2026-05-27', postedAt: null, itemCount: 4, countedCount: 3, ecartTotal: -20.4),
  InvDoc(id: 'inv-002', documentNumber: 'INV-2026-002', status: InventoryStatus.proposed, createdAt: '2026-05-20', postedAt: null, itemCount: 2, countedCount: 0, ecartTotal: null),
  InvDoc(id: 'inv-003', documentNumber: 'INV-2026-001', status: InventoryStatus.posted, createdAt: '2026-05-10', postedAt: '2026-05-12', itemCount: 2, countedCount: 2, ecartTotal: 0),
];

// ── Widgets ───────────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.status);
  final InventoryStatus status;

  @override
  Widget build(BuildContext context) {
    final cfg = _statutCfg[status]!;
    return StatusPill(
        label: cfg.label, color: cfg.text, bg: cfg.bg, border: cfg.border);
  }
}

class _DiffChip extends StatelessWidget {
  const _DiffChip(this.diff);
  final double? diff;

  @override
  Widget build(BuildContext context) {
    final d = diff;
    if (d == null) return Text('—', style: ts(12, F.regular, C.textMuted));
    if (d == 0) {
      return Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.remove, size: 11, color: C.textMuted),
        const SizedBox(width: 3),
        Text('0', style: ts(12, F.semiBold, C.textMuted)),
      ]);
    }
    final pos = d > 0;
    final color = pos ? C.success : C.danger;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(pos ? Icons.trending_up : Icons.trending_down,
          size: 11, color: color),
      const SizedBox(width: 3),
      Text('${pos ? '+' : ''}${fmtNum(d)}', style: ts(12, F.semiBold, color)),
    ]);
  }
}

// ── Écran principal ───────────────────────────────────────────────────────────

class InventaireScreen extends StatefulWidget {
  const InventaireScreen({super.key});

  @override
  State<InventaireScreen> createState() => _InventaireScreenState();
}

class _InventaireScreenState extends State<InventaireScreen> {
  final _docs = _mockDocs;
  InventoryStatus? _filter; // null = tous
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final proposed =
        _docs.where((d) => d.status == InventoryStatus.proposed).length;
    final counted =
        _docs.where((d) => d.status == InventoryStatus.counted).length;
    final posted =
        _docs.where((d) => d.status == InventoryStatus.posted).length;
    final totalEcart =
        _docs.fold<double>(0, (s, d) => s + (d.ecartTotal ?? 0));

    var filtered = _filter == null
        ? _docs
        : _docs.where((d) => d.status == _filter).toList();
    final q = _search.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      filtered = filtered
          .where((d) => d.documentNumber.toLowerCase().contains(q))
          .toList();
    }

    return Column(children: [
      DarkHeader(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [
              const Icon(Icons.assignment_outlined,
                  size: 20, color: Colors.white),
              const SizedBox(width: 10),
              Text('Inventaires', style: ts(22, F.bold, Colors.white)),
            ]),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(children: [
                const Icon(Icons.add, size: 14, color: Colors.white),
                const SizedBox(width: 6),
                Text('Nouveau', style: ts(13, F.semiBold, Colors.white)),
              ]),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text('Comptage physique · Écarts imputés en stock INV_ADJ',
            style: ts(13, F.regular, Colors.white.withValues(alpha: 0.5))),
      ]),

      // KPI strip
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
        child: Row(children: [
          Expanded(
              child: KpiTile(
                  label: 'Documents',
                  value: '${_docs.length}',
                  color: C.primary,
                  bg: const Color(0xFFEFF6FF))),
          const SizedBox(width: 10),
          Expanded(
              child: KpiTile(
                  label: 'En attente',
                  value: '$proposed',
                  color: C.primary,
                  bg: const Color(0xFFEFF6FF))),
          const SizedBox(width: 10),
          Expanded(
              child: KpiTile(
                  label: 'À valider',
                  value: '$counted',
                  color: C.warning,
                  bg: C.warningSoft)),
          const SizedBox(width: 10),
          Expanded(
            child: KpiTile(
              label: 'Écart cumulé',
              value: totalEcart == 0
                  ? '0'
                  : '${totalEcart > 0 ? '+' : ''}${fmtNum(totalEcart)}',
              color: totalEcart != 0 ? C.danger : C.success,
              bg: totalEcart != 0 ? const Color(0xFFFFF5F5) : C.successSoft,
            ),
          ),
        ]),
      ),

      // Search
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: AppTextInput(
          controller: _search,
          placeholder: 'Rechercher un document…',
          prefixIcon: Icons.search,
          fillColor: C.surface,
          onChanged: (_) => setState(() {}),
        ),
      ),

      // Filter tabs
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        child: Row(children: [
          FilterPill(
              label: 'Tous',
              count: _docs.length,
              active: _filter == null,
              activeColor: C.primary,
              onTap: () => setState(() => _filter = null)),
          const SizedBox(width: 6),
          FilterPill(
              label: 'Proposé',
              count: proposed,
              active: _filter == InventoryStatus.proposed,
              activeColor: C.primary,
              onTap: () =>
                  setState(() => _filter = InventoryStatus.proposed)),
          const SizedBox(width: 6),
          FilterPill(
              label: 'Compté',
              count: counted,
              active: _filter == InventoryStatus.counted,
              activeColor: C.primary,
              onTap: () => setState(() => _filter = InventoryStatus.counted)),
          const SizedBox(width: 6),
          FilterPill(
              label: 'Validé',
              count: posted,
              active: _filter == InventoryStatus.posted,
              activeColor: C.primary,
              onTap: () => setState(() => _filter = InventoryStatus.posted)),
        ]),
      ),

      // Liste documents
      Expanded(
        child: filtered.isEmpty
            ? Column(children: [
                const SizedBox(height: 60),
                const Icon(Icons.assignment_outlined,
                    size: 36, color: C.textMuted),
                const SizedBox(height: 12),
                Text('Aucun document', style: ts(14, F.semiBold, C.textMuted)),
              ])
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [for (final doc in filtered) _docCard(doc)],
              ),
      ),
    ]);
  }

  Widget _docCard(InvDoc doc) {
    final allCounted = doc.countedCount == doc.itemCount && doc.itemCount > 0;
    return GestureDetector(
      onTap: () => showAppSheet(context, _DetailSheet(doc: doc)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: doc.status == InventoryStatus.counted
                  ? const Color(0xFFFDE68A)
                  : C.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(doc.documentNumber, style: ts(15, F.bold, C.text)),
              Row(children: [
                _StatusChip(doc.status),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right, size: 16, color: C.textMuted),
              ]),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Créé le ${fmtDate(doc.createdAt)}',
                      style: ts(12, F.regular, C.textMuted)),
                  if (doc.postedAt != null)
                    Text('Validé le ${fmtDate(doc.postedAt!)}',
                        style: ts(12, F.regular, C.textMuted)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(children: [
                    Icon(
                        allCounted
                            ? Icons.check_circle_outline
                            : Icons.warning_amber_rounded,
                        size: 12,
                        color: allCounted ? C.success : C.warning),
                    const SizedBox(width: 4),
                    Text('${doc.countedCount} / ${doc.itemCount} lignes',
                        style: ts(12, F.semiBold,
                            allCounted ? C.success : C.warning)),
                  ]),
                  if (doc.ecartTotal != null) ...[
                    const SizedBox(height: 4),
                    _DiffChip(doc.ecartTotal),
                  ],
                ],
              ),
            ],
          ),
          if (doc.status == InventoryStatus.counted)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Text(
                  'Toutes les lignes comptées — en attente de validation',
                  style: ts(12, F.semiBold, const Color(0xFFB45309))),
            ),
        ]),
      ),
    );
  }
}

// ── Modal détail / comptage ───────────────────────────────────────────────────

class _DetailSheet extends StatefulWidget {
  const _DetailSheet({required this.doc});
  final InvDoc doc;

  @override
  State<_DetailSheet> createState() => _DetailSheetState();
}

class _DetailSheetState extends State<_DetailSheet> {
  late final List<InvItem> _items = _mockItems[widget.doc.id] ?? [];
  late final Map<String, TextEditingController> _counts = {
    for (final i in _items)
      i.id: TextEditingController(
          text: i.countedQuantity != null ? fmtRaw(i.countedQuantity!) : ''),
  };

  static String fmtRaw(double v) =>
      v == v.roundToDouble() ? '${v.round()}' : '$v';

  bool get _editable => widget.doc.status != InventoryStatus.posted;

  double? _parsed(String id) => parseNum(_counts[id]!.text);

  @override
  void dispose() {
    for (final c in _counts.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final allCounted =
        _items.isNotEmpty && _items.every((i) => _parsed(i.id) != null);
    final notCounted = _items.where((i) => _parsed(i.id) == null).length;
    final totalEcart = _items.fold<double>(0, (s, i) {
      final cnt = _parsed(i.id);
      return cnt == null ? s : s + (cnt - i.bookQuantity);
    });

    return Column(mainAxisSize: MainAxisSize.min, children: [
      // Header
      Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: C.divider))),
        child: Row(children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.doc.documentNumber, style: ts(17, F.bold, C.text)),
                const SizedBox(height: 2),
                Text(
                  'Créé le ${fmtDate(widget.doc.createdAt)}'
                  '${widget.doc.postedAt != null ? ' · Validé le ${fmtDate(widget.doc.postedAt!)}' : ''}',
                  style: ts(12, F.regular, C.textMuted),
                ),
              ],
            ),
          ),
          _StatusChip(widget.doc.status),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.close, size: 20, color: C.textMuted),
          ),
        ]),
      ),

      // Lignes
      Flexible(
        child: _items.isEmpty
            ? Padding(
                padding: const EdgeInsets.all(32),
                child: Text('Aucune ligne dans ce document.',
                    style: ts(14, F.regular, C.textMuted)),
              )
            : ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.all(16),
                children: [for (final item in _items) _itemCard(item)],
              ),
      ),

      // Footer
      if (_editable)
        Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
          decoration: const BoxDecoration(
            color: C.surface,
            border: Border(top: BorderSide(color: C.divider)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              allCounted
                  ? 'Toutes les lignes comptées · Écart : ${totalEcart > 0 ? '+' : ''}${fmtNum(totalEcart)}'
                  : '$notCounted ligne(s) non comptée(s)',
              style: ts(12, F.regular, C.textMuted),
            ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: BigButton(
                  label: 'Sauvegarder',
                  icon: Icons.save_outlined,
                  outlined: true,
                  textColor: C.textSub,
                  margin: EdgeInsets.zero,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  onTap: () => Navigator.pop(context),
                ),
              ),
              if (allCounted) ...[
                const SizedBox(width: 10),
                Expanded(
                  flex: 12,
                  child: BigButton(
                    label: 'Valider les écarts',
                    icon: Icons.send_outlined,
                    color: C.success,
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    onTap: () => Navigator.pop(context),
                  ),
                ),
              ],
            ]),
          ]),
        ),
    ]);
  }

  Widget _itemCard(InvItem item) {
    final cnt = _parsed(item.id);
    final diff = cnt != null ? cnt - item.bookQuantity : null;
    final hasEcart = diff != null && diff != 0;

    final cardBg = hasEcart
        ? (diff > 0 ? const Color(0xFFF0FDF4) : const Color(0xFFFFF5F5))
        : C.surface;
    final cardBorder = hasEcart
        ? (diff > 0 ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA))
        : C.border;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.articleDesignation,
                      style: ts(14, F.semiBold, C.text)),
                  const SizedBox(height: 2),
                  Text(
                    '${item.articleCode}${item.batchNumber != null ? ' · ${item.batchNumber}' : ' · Sans lot'}',
                    style: ts(11, F.regular, C.textMuted),
                  ),
                ],
              ),
            ),
            _DiffChip(diff),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Qté système', style: ts(11, F.regular, C.textMuted)),
              Text('${fmtNum(item.bookQuantity)} ${item.unite}',
                  style: ts(14, F.bold, C.textSub)),
            ]),
            if (_editable)
              Row(children: [
                Text('Compté : ', style: ts(11, F.regular, C.textMuted)),
                const SizedBox(width: 4),
                SizedBox(
                  width: 80,
                  child: AppTextInput(
                    controller: _counts[item.id]!,
                    numeric: true,
                    placeholder: '—',
                    textAlign: TextAlign.center,
                    textStyle: ts(14, F.bold, C.text),
                    borderColor: _counts[item.id]!.text.isNotEmpty
                        ? C.primary
                        : C.border,
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 8),
                Text(item.unite, style: ts(12, F.regular, C.textMuted)),
              ])
            else
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('Qté comptée', style: ts(11, F.regular, C.textMuted)),
                Text(
                  item.countedQuantity != null
                      ? '${fmtNum(item.countedQuantity!)} ${item.unite}'
                      : '—',
                  style: ts(14, F.bold, C.text),
                ),
              ]),
          ],
        ),
      ]),
    );
  }
}
