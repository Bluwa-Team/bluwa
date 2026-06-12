import 'package:flutter/material.dart';
import '../theme.dart';
import 'shared.dart';

// ── Formats d'étiquette ────────────────────────────────────────────────────────

class LabelFormat {
  const LabelFormat({
    required this.code,
    required this.dims,
    required this.perSheet,
    required this.cols,
    required this.rows,
  });

  final String code;  // ex. '0812'
  final String dims;  // ex. '99.1 × 67.8 mm'
  final int perSheet; // nombre d'étiquettes par feuille
  final int cols;     // colonnes sur la planche
  final int rows;     // lignes sur la planche
}

const labelFormats = [
  LabelFormat(code: '0119', dims: '199.6 × 289.1 mm', perSheet: 1,  cols: 1, rows: 1),
  LabelFormat(code: '0218', dims: '199.6 × 143.5 mm', perSheet: 2,  cols: 1, rows: 2),
  LabelFormat(code: '0416', dims: '100 × 139 mm',     perSheet: 4,  cols: 2, rows: 2),
  LabelFormat(code: '0812', dims: '99.1 × 67.8 mm',   perSheet: 8,  cols: 2, rows: 4),
  LabelFormat(code: '1413', dims: '99.1 × 38.1 mm',   perSheet: 14, cols: 2, rows: 7),
  LabelFormat(code: '1611', dims: '100 × 34 mm',      perSheet: 16, cols: 2, rows: 8),
  LabelFormat(code: '2113', dims: '63.5 × 38.2 mm',   perSheet: 21, cols: 3, rows: 7),
  LabelFormat(code: '6517', dims: '64 × 34 mm',       perSheet: 24, cols: 3, rows: 8),
];

// ── Point d'entrée ─────────────────────────────────────────────────────────────

/// Ouvre le sélecteur de format et retourne le [LabelFormat] choisi, ou null.
Future<LabelFormat?> showLabelFormatPicker(BuildContext context) =>
    showAppSheet<LabelFormat>(context, const _LabelFormatSheet());

// ── Bottom sheet ───────────────────────────────────────────────────────────────

class _LabelFormatSheet extends StatefulWidget {
  const _LabelFormatSheet();

  @override
  State<_LabelFormatSheet> createState() => _LabelFormatSheetState();
}

class _LabelFormatSheetState extends State<_LabelFormatSheet> {
  // 0812 (8/feuille) : format polyvalent le plus utilisé
  String _code = '0812';

  LabelFormat get _current =>
      labelFormats.firstWhere((f) => f.code == _code);

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Handle ─────────────────────────────────────────────────────
        Center(
          child: Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 18),
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: C.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ),

        // ── Titre ──────────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.print_rounded, size: 17, color: C.text),
                const SizedBox(width: 8),
                Text("Format d'étiquette",
                    style: ts(16, F.bold, C.text)),
              ]),
              const SizedBox(height: 4),
              Text(
                "Sélectionnez le format correspondant à votre planche.",
                style: ts(12, F.regular, C.textSub),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // ── Grille 4 colonnes ───────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: GridView.count(
            crossAxisCount: 4,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 0.56,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              for (final f in labelFormats)
                _FormatCard(
                  format: f,
                  selected: _code == f.code,
                  onTap: () => setState(() => _code = f.code),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // ── Bouton confirmer ────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: BigButton(
            label: 'Imprimer · Format ${_current.code}',
            icon: Icons.print_rounded,
            onTap: () => Navigator.pop(context, _current),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

// ── Carte d'un format ──────────────────────────────────────────────────────────

class _FormatCard extends StatelessWidget {
  const _FormatCard({
    required this.format,
    required this.selected,
    required this.onTap,
  });

  final LabelFormat format;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.fromLTRB(5, 7, 5, 7),
        decoration: BoxDecoration(
          color: selected ? C.primarySoft : C.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? C.primary : C.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: [
            // Aperçu planche A4
            Expanded(
              child: _SheetPreview(
                cols: format.cols,
                rows: format.rows,
                selected: selected,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              format.code,
              style: ts(12, F.bold, selected ? C.primary : C.text),
            ),
            const SizedBox(height: 2),
            Text(
              format.dims,
              style:
                  ts(8, F.regular, selected ? C.primary : C.textMuted),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              '${format.perSheet}/feuille',
              style: ts(9, F.semiBold, selected ? C.primary : C.textSub),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Aperçu miniature de la planche ────────────────────────────────────────────

class _SheetPreview extends StatelessWidget {
  const _SheetPreview({
    required this.cols,
    required this.rows,
    required this.selected,
  });

  final int cols, rows;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 0.707, // ratio A4 (210/297)
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(
            color: selected ? C.primary : C.border,
            width: selected ? 1.2 : 0.8,
          ),
          borderRadius: BorderRadius.circular(2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 3,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        padding: const EdgeInsets.all(2),
        child: Column(
          children: List.generate(
            rows,
            (_) => Expanded(
              child: Row(
                children: List.generate(
                  cols,
                  (_) => Expanded(
                    child: Container(
                      margin: const EdgeInsets.all(0.7),
                      decoration: BoxDecoration(
                        color: selected
                            ? C.primary.withValues(alpha: 0.08)
                            : C.bg,
                        border: Border.all(
                          color: selected
                              ? C.primary.withValues(alpha: 0.25)
                              : C.border,
                          width: 0.4,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
