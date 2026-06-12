import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../theme.dart';
import '../widgets/shared.dart';

// ── Supabase dispo ─────────────────────────────────────────────────────────────
const _kSupaUrl = String.fromEnvironment('SUPABASE_URL');
bool get _supaAvail => _kSupaUrl.isNotEmpty;

// ── Modèles ────────────────────────────────────────────────────────────────────

enum _AlertType { danger, warning, info }

class _AlertItem {
  const _AlertItem(this.message, this.time, this.type);
  final String message, time;
  final _AlertType type;
}

class _DashData {
  const _DashData({
    required this.userName,
    required this.initials,
    required this.role,
    required this.orgName,
    required this.orgLocation,
    required this.bcbaPending,
    required this.lotsEnControle,
    required this.lotsRejetes,
    required this.receptionsEnCours,
    required this.alerts,
  });

  final String userName, initials, role, orgName, orgLocation;
  final int bcbaPending, lotsEnControle, lotsRejetes, receptionsEnCours;
  final List<_AlertItem> alerts;

  factory _DashData.empty() => const _DashData(
        userName: '',
        initials: '?',
        role: '',
        orgName: '',
        orgLocation: '',
        bcbaPending: 0,
        lotsEnControle: 0,
        lotsRejetes: 0,
        receptionsEnCours: 0,
        alerts: [],
      );
}

// ── Utilitaires ────────────────────────────────────────────────────────────────

String _roleLabel(String r) => switch (r) {
      'owner' => 'Propriétaire',
      'admin' => 'Administrateur',
      'manager' => 'Manager',
      'operator' => 'Opérateur',
      'viewer' => 'Lecteur',
      _ => r,
    };

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.isEmpty || parts.first.isEmpty) return '?';
  if (parts.length == 1) return parts[0][0].toUpperCase();
  return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
}

String _relTime(String isoTs) {
  try {
    final diff = DateTime.now().difference(DateTime.parse(isoTs).toLocal());
    if (diff.inMinutes < 1) return 'à l\'instant';
    if (diff.inMinutes < 60) return 'il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'il y a ${diff.inHours} h';
    return 'il y a ${diff.inDays} j';
  } catch (_) {
    return '';
  }
}

// ── Screen ─────────────────────────────────────────────────────────────────────

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  _DashData _data = _DashData.empty();
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!_supaAvail) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    if (mounted) setState(() { _loading = true; _error = null; });

    try {
      final supa = Supabase.instance.client;
      final user = supa.auth.currentUser;
      if (user == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }

      // ── Profil + organisation ──────────────────────────────────────────
      final profileRow = await supa
          .from('profiles')
          .select('full_name, role, organization_id')
          .eq('id', user.id)
          .single();

      final orgId = profileRow['organization_id'] as String;
      final fullName = (profileRow['full_name'] as String? ?? '').trim();
      final role = profileRow['role'] as String? ?? '';

      final orgRow = await supa
          .from('organizations')
          .select('name, country_headquarters')
          .eq('id', orgId)
          .single();

      final orgName = orgRow['name'] as String? ?? '';
      final orgLoc = orgRow['country_headquarters'] as String? ?? '';

      // ── KPIs en parallèle ──────────────────────────────────────────────
      final kpiResults = await Future.wait([
        // BC / BA en attente (brouillon ou soumis)
        supa
            .from('purchase_orders')
            .select('id')
            .eq('organization_id', orgId)
            .or('status.eq.PENDING,status.eq.DRAFT'),
        // Lots en contrôle qualité
        supa
            .from('lots')
            .select('id')
            .eq('organization_id', orgId)
            .eq('statut_qc', 'EnControle'),
        // Lots rejetés
        supa
            .from('lots')
            .select('id')
            .eq('organization_id', orgId)
            .eq('statut_qc', 'Rejete'),
        // Réceptions en cours (brouillon)
        supa
            .from('goods_receipts')
            .select('id')
            .eq('organization_id', orgId)
            .eq('status', 'DRAFT'),
      ]);

      // ── Alertes en parallèle ───────────────────────────────────────────
      final alertResults = await Future.wait([
        // Lots rejetés récents → danger
        supa
            .from('lots')
            .select('batch_number, created_at')
            .eq('organization_id', orgId)
            .eq('statut_qc', 'Rejete')
            .order('created_at', ascending: false)
            .limit(2),
        // BC/BA en attente d'approbation → warning
        supa
            .from('purchase_orders')
            .select('order_number, created_at')
            .eq('organization_id', orgId)
            .eq('status', 'PENDING')
            .order('created_at', ascending: false)
            .limit(2),
        // Réceptions récemment validées → info
        supa
            .from('goods_receipts')
            .select('receipt_number, created_at')
            .eq('organization_id', orgId)
            .eq('status', 'VALIDATED')
            .order('created_at', ascending: false)
            .limit(2),
      ]);

      final alerts = <_AlertItem>[
        for (final r in alertResults[0] as List)
          _AlertItem(
            'Lot ${r['batch_number']} — hors norme QC',
            _relTime(r['created_at'] as String),
            _AlertType.danger,
          ),
        for (final r in alertResults[1] as List)
          _AlertItem(
            '${r['order_number']} en attente d\'approbation',
            _relTime(r['created_at'] as String),
            _AlertType.warning,
          ),
        for (final r in alertResults[2] as List)
          _AlertItem(
            'Réception ${r['receipt_number']} validée',
            _relTime(r['created_at'] as String),
            _AlertType.info,
          ),
      ];

      if (mounted) {
        setState(() {
          _data = _DashData(
            userName: fullName,
            initials: _initials(fullName),
            role: role,
            orgName: orgName,
            orgLocation: orgLoc,
            bcbaPending: (kpiResults[0] as List).length,
            lotsEnControle: (kpiResults[1] as List).length,
            lotsRejetes: (kpiResults[2] as List).length,
            receptionsEnCours: (kpiResults[3] as List).length,
            alerts: alerts,
          );
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Impossible de charger les données.'; _loading = false; });
    }
  }

  Future<void> _onRefresh() => _load();

  Future<void> _confirmLogout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Déconnexion', style: ts(17, F.bold, C.text)),
        content: Text(
          'Voulez-vous vous déconnecter de votre compte ?',
          style: ts(14, F.regular, C.textSub),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Annuler', style: ts(14, F.medium, C.textSub)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Déconnexion', style: ts(14, F.semiBold, C.danger)),
          ),
        ],
      ),
    );
    if (ok == true && _supaAvail) {
      await Supabase.instance.client.auth.signOut();
      // AuthGate redirige automatiquement vers LoginScreen via le stream.
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('EEEE d MMMM', 'fr_FR').format(DateTime.now());
    final d = _data;

    return RefreshIndicator(
      color: C.primary,
      onRefresh: _onRefresh,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          // ── Header ─────────────────────────────────────────────────────
          DarkHeader(children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Logo + marque
                Row(children: [
                  const BluwaLogo(size: 24),
                  const SizedBox(width: 10),
                  Text('BLUWA',
                      style: ts(14, F.extraBold, Colors.white,
                          letterSpacing: 1.2)),
                ]),
                // Avatar + déconnexion
                Row(children: [
                  _Avatar(initials: d.initials),
                  const SizedBox(width: 14),
                  GestureDetector(
                    onTap: _confirmLogout,
                    child: Icon(
                      Icons.logout_rounded,
                      color: Colors.white.withValues(alpha: 0.55),
                      size: 20,
                    ),
                  ),
                ]),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              dateStr[0].toUpperCase() + dateStr.substring(1),
              style:
                  ts(12, F.regular, Colors.white.withValues(alpha: 0.50)),
            ),
            const SizedBox(height: 5),
            if (d.userName.isNotEmpty)
              Text('Bonjour, ${d.userName.split(' ').first}',
                  style: ts(24, F.bold, Colors.white))
            else
              Text('Tableau de bord', style: ts(24, F.bold, Colors.white)),
            const SizedBox(height: 4),
            // Organisation + rôle
            Row(children: [
              if (d.orgName.isNotEmpty)
                Text(
                  d.orgName,
                  style: ts(
                      13, F.medium, Colors.white.withValues(alpha: 0.55)),
                ),
              if (d.orgName.isNotEmpty && d.role.isNotEmpty)
                Text(' · ',
                    style: ts(13, F.regular,
                        Colors.white.withValues(alpha: 0.35))),
              if (d.role.isNotEmpty)
                Text(
                  _roleLabel(d.role),
                  style: ts(
                      13, F.medium, Colors.white.withValues(alpha: 0.55)),
                ),
            ]),
          ]),

          // ── Loading ─────────────────────────────────────────────────────
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )

          // ── Erreur ──────────────────────────────────────────────────────
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.all(28),
              child: Column(children: [
                Icon(Icons.wifi_off_rounded,
                    size: 36, color: C.textMuted),
                const SizedBox(height: 12),
                Text(_error!,
                    textAlign: TextAlign.center,
                    style: ts(13, F.regular, C.textSub)),
                const SizedBox(height: 14),
                TextButton(
                  onPressed: _load,
                  child: Text('Réessayer',
                      style: ts(14, F.semiBold, C.primary)),
                ),
              ]),
            )

          // ── Contenu ─────────────────────────────────────────────────────
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── KPIs ─────────────────────────────────────────────
                  Row(children: [
                    Expanded(
                      child: _KpiCard(
                        label: 'BC / BA en attente',
                        value: d.bcbaPending,
                        icon: Icons.local_shipping_outlined,
                        iconColor: C.primary,
                        iconBg: C.primarySoft,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _KpiCard(
                        label: 'Lots en contrôle QC',
                        value: d.lotsEnControle,
                        icon: Icons.science_outlined,
                        iconColor: C.warning,
                        iconBg: C.warningSoft,
                      ),
                    ),
                  ]),
                  const SizedBox(height: 10),
                  Row(children: [
                    Expanded(
                      child: _KpiCard(
                        label: 'Réceptions en cours',
                        value: d.receptionsEnCours,
                        icon: Icons.inbox_outlined,
                        iconColor: C.success,
                        iconBg: C.successSoft,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _KpiCard(
                        label: 'Lots rejetés',
                        value: d.lotsRejetes,
                        icon: Icons.warning_amber_rounded,
                        iconColor: C.danger,
                        iconBg: C.dangerSoft,
                      ),
                    ),
                  ]),
                  const SizedBox(height: 24),

                  // ── Actions rapides ───────────────────────────────────
                  Text('Actions rapides',
                      style: ts(14, F.semiBold, C.text)),
                  const SizedBox(height: 12),
                  Row(children: [
                    for (final (i, a) in const [
                      (
                        'Nouvelle\nréception',
                        Icons.local_shipping_outlined
                      ),
                      ('Saisie\nqualité', Icons.science_outlined),
                      ('Pointage\nOF', Icons.factory_outlined),
                    ].indexed) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14),
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

                  // ── Alertes ───────────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Alertes récentes',
                          style: ts(14, F.semiBold, C.text)),
                      if (d.alerts.isNotEmpty)
                        Row(children: [
                          Text('Voir tout',
                              style: ts(12, F.semiBold, C.primary)),
                          const Icon(Icons.chevron_right,
                              size: 15, color: C.primary),
                        ]),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (d.alerts.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      decoration: BoxDecoration(
                        color: C.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: C.border),
                      ),
                      child: Column(children: [
                        const Icon(Icons.check_circle_outline,
                            size: 30, color: Color(0xFF4ADE80)),
                        const SizedBox(height: 10),
                        Text('Aucune alerte active',
                            style: ts(13, F.semiBold, C.textSub)),
                        const SizedBox(height: 4),
                        Text(
                          'Les alertes stock, QC et commandes apparaîtront ici.',
                          textAlign: TextAlign.center,
                          style: ts(12, F.regular, C.textMuted),
                        ),
                      ]),
                    )
                  else
                    for (final a in d.alerts) _AlertRow(a),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ── Avatar initiales ───────────────────────────────────────────────────────────

class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials});
  final String initials;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        shape: BoxShape.circle,
        border: Border.all(
            color: Colors.white.withValues(alpha: 0.30), width: 1.5),
      ),
      child: Center(
        child: Text(initials, style: ts(12, F.bold, Colors.white)),
      ),
    );
  }
}

// ── Carte KPI ──────────────────────────────────────────────────────────────────

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
  final Color iconColor, iconBg;

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
          Text('$value',
              style: ts(28, F.extraBold, C.text, height: 32)),
          const SizedBox(height: 6),
          Text(label,
              style: ts(12, F.medium, C.textSub, height: 16)),
        ],
      ),
    );
  }
}

// ── Ligne alerte ───────────────────────────────────────────────────────────────

class _AlertRow extends StatelessWidget {
  const _AlertRow(this.alert);
  final _AlertItem alert;

  @override
  Widget build(BuildContext context) {
    final (border, bg, icon, iconColor) = switch (alert.type) {
      _AlertType.danger => (
          const Color(0xFFFECACA),
          const Color(0xFFFEF7F7),
          Icons.warning_amber_rounded,
          C.danger,
        ),
      _AlertType.warning => (
          const Color(0xFFFDE68A),
          const Color(0xFFFFFBF0),
          Icons.hourglass_top_rounded,
          C.warning,
        ),
      _AlertType.info => (
          const Color(0xFFBFDBFE),
          const Color(0xFFF5F8FF),
          Icons.check_circle_outline_rounded,
          C.primary,
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
                if (alert.time.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(alert.time, style: ts(11, F.regular, C.textMuted)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
