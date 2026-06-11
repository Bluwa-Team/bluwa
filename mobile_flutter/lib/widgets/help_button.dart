import 'package:flutter/material.dart';

import '../help_content.dart';
import '../theme.dart';

/// Bouton « ? » des headers — ouvre la fiche d'aide contextuelle.
class HelpButton extends StatelessWidget {
  const HelpButton({super.key, required this.helpKey, this.color});

  final String helpKey;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final content = HelpContent.all[helpKey];
    if (content == null) return const SizedBox.shrink();
    return GestureDetector(
      onTap: () => _open(context, content),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Icon(Icons.help_outline,
            size: 20, color: color ?? Colors.white.withValues(alpha: 0.7)),
      ),
    );
  }

  void _open(BuildContext context, HelpContent content) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (ctx) => Container(
        constraints:
            BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.85),
        decoration: const BoxDecoration(
          color: C.bg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: C.border,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: C.divider)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: C.primarySoft,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text('AIDE',
                              style: ts(10, F.semiBold, C.primary,
                                  letterSpacing: 0.5)),
                        ),
                        const SizedBox(height: 6),
                        Text(content.titre, style: ts(18, F.bold, C.text)),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(ctx),
                    child: const Icon(Icons.close, size: 20, color: C.textMuted),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(content.resume,
                        style: ts(14, F.regular, C.textSub, height: 22)),
                    const SizedBox(height: 20),

                    // Étapes
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: C.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: C.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('COMMENT FAIRE',
                              style: ts(11, F.semiBold, C.textMuted,
                                  letterSpacing: 0.7)),
                          const SizedBox(height: 14),
                          for (var i = 0; i < content.etapes.length; i++)
                            Padding(
                              padding: EdgeInsets.only(
                                  bottom: i < content.etapes.length - 1
                                      ? 12
                                      : 0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 22,
                                    height: 22,
                                    margin: const EdgeInsets.only(top: 1),
                                    decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: C.primary),
                                    child: Center(
                                      child: Text('${i + 1}',
                                          style: ts(11, F.bold, Colors.white)),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(content.etapes[i],
                                        style: ts(14, F.regular, C.text,
                                            height: 21)),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),

                    // Tips
                    if (content.tips.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(14),
                          border:
                              Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.lightbulb_outline,
                                    size: 14, color: C.warning),
                                const SizedBox(width: 6),
                                Text('À SAVOIR',
                                    style: ts(11, F.semiBold, C.warning,
                                        letterSpacing: 0.7)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            for (var i = 0; i < content.tips.length; i++)
                              Padding(
                                padding: EdgeInsets.only(
                                    bottom: i < content.tips.length - 1
                                        ? 10
                                        : 0),
                                child: Row(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text('·',
                                        style: ts(14, F.regular, C.warning)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(content.tips[i],
                                          style: ts(
                                              13,
                                              F.regular,
                                              const Color(0xFF92400E),
                                              height: 20)),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
