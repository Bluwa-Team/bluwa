import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme.dart';
import '../widgets/shared.dart';

enum _AlertType { danger, warning, info }

class _AlertData {
  const _AlertData(this.message, this.time, this.type);
  final String message;
  final String time;
  final _AlertType type;
}

const _alerts = [
  _AlertData('Lot #L-2406 : humidité hors norme (16,2 %)', 'il y a 12 min',
      _AlertType.danger),
  _AlertData('Réception BC-2406-001 en attente de saisie', 'il y a 28 min',
      _AlertType.warning),
  _AlertData('OF-2401 — Huile de coton assigné à Équipe A', 'il y a 1 h',
      _AlertType.info),
];

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Future<void> _onRefresh() =>
      Future.delayed(const Duration(milliseconds: 1200));

  @override
  Widget build(BuildContext context) {
    final dateStr =
        DateFormat('EEEE d MMMM', 'fr_FR').format(DateTime.now());

    return RefreshIndicator(
      color: C.primary,
      onRefresh: _onRefresh,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          DarkHeader(children: [
            Row(children: [
              const BluwaLogo(size: 24),
              const SizedBox(width: 10),
              Text('BLUWA',
                  style: ts(14, F.extraBold, Colors.white,
                      letterSpacing: 1.2)),
            ]),
            const SizedBox(height: 20),
            Text(
              dateStr[0].toUpperCase() + dateStr.substring(1),
              style: ts(12, F.regular, Colors.white.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 4),
            Text('Tableau de bord', style: ts(24, F.bold, Colors.white)),
            const SizedBox(height: 2),
            Text('Usine principale · Abidjan',
                style:
                    ts(13, F.regular, Colors.white.withValues(alpha: 0.45))),
          ]),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // KPIs
                const Row(children: [
                  Expanded(
                    child: _KpiCard(
                      label: 'BC / BA en attente',
                      value: 3,
                      icon: Icons.local_shipping_outlined,
                      iconColor: C.primary,
                      iconBg: C.primarySoft,
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: _KpiCard(
                      label: 'Lots en attente QC',
                      value: 8,
                      icon: Icons.science_outlined,
                      iconColor: C.danger,
                      iconBg: C.dangerSoft,
                    ),
                  ),
                ]),
                const SizedBox(height: 10),
                const Row(children: [
                  Expanded(
                    child: _KpiCard(
                      label: 'OF en cours',
                      value: 5,
                      icon: Icons.factory_outlined,
                      iconColor: C.success,
                      iconBg: C.successSoft,
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: _KpiCard(
                      label: 'Écarts inventaire',
                      value: 3,
                      icon: Icons.trending_up,
                      iconColor: C.warning,
                      iconBg: C.warningSoft,
                    ),
                  ),
                ]),
                const SizedBox(height: 24),

                // Actions rapides
                Text('Actions rapides', style: ts(14, F.semiBold, C.text)),
                const SizedBox(height: 12),
                Row(children: [
                  for (final (i, a) in const [
                    ('Nouvelle\nréception', Icons.local_shipping_outlined),
                    ('Saisie\nqualité', Icons.science_outlined),
                    ('Pointage\nOF', Icons.factory_outlined),
                  ].indexed) ...[
                    if (i > 0) const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: C.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: C.border),
                        ),
                        child: Column(children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: C.primarySoft,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child:
                                Icon(a.$2, size: 19, color: C.primary),
                          ),
                          const SizedBox(height: 8),
                          Text(a.$1,
                              textAlign: TextAlign.center,
                              style: ts(11, F.semiBold, C.textSub,
                                  height: 15)),
                        ]),
                      ),
                    ),
                  ],
                ]),
                const SizedBox(height: 28),

                // Alertes
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Alertes récentes',
                        style: ts(14, F.semiBold, C.text)),
                    Row(children: [
                      Text('Voir tout', style: ts(12, F.semiBold, C.primary)),
                      const Icon(Icons.chevron_right,
                          size: 15, color: C.primary),
                    ]),
                  ],
                ),
                const SizedBox(height: 12),
                for (final a in _alerts) _AlertRow(a),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
  });

  final String label;
  final int value;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: C.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: C.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            offset: const Offset(0, 1),
            blurRadius: 4,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          Text('$value', style: ts(28, F.extraBold, C.text, height: 32)),
          const SizedBox(height: 6),
          Text(label, style: ts(12, F.medium, C.textSub, height: 16)),
        ],
      ),
    );
  }
}

class _AlertRow extends StatelessWidget {
  const _AlertRow(this.alert);
  final _AlertData alert;

  @override
  Widget build(BuildContext context) {
    final (border, bg, icon, iconColor) = switch (alert.type) {
      _AlertType.danger => (
          const Color(0xFFFECACA),
          const Color(0xFFFEF7F7),
          Icons.warning_amber_rounded,
          C.danger
        ),
      _AlertType.warning => (
          const Color(0xFFFDE68A),
          const Color(0xFFFFFBF0),
          Icons.warning_amber_rounded,
          C.warning
        ),
      _AlertType.info => (
          const Color(0xFFBFDBFE),
          const Color(0xFFF5F8FF),
          Icons.notifications_none,
          C.primary
        ),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1, right: 10),
            child: Icon(icon, size: 14, color: iconColor),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(alert.message, style: ts(13, F.medium, C.text)),
                const SizedBox(height: 2),
                Text(alert.time, style: ts(11, F.regular, C.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
