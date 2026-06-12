import 'package:supabase_flutter/supabase_flutter.dart' show SupabaseClient;

// ── Modèles retournés par le service ──────────────────────────────────────────

enum DashAlertType { danger, warning, info }

class DashAlert {
  const DashAlert(this.message, this.time, this.type);
  final String message, time;
  final DashAlertType type;
}

class DashData {
  const DashData({
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
  final List<DashAlert> alerts;

  factory DashData.empty() => const DashData(
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

// ── Utilitaires internes ───────────────────────────────────────────────────────

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

// ── Service ────────────────────────────────────────────────────────────────────

class DashboardService {
  DashboardService(this._supa);

  final SupabaseClient _supa;

  Future<DashData> load() async {
    final user = _supa.auth.currentUser;
    if (user == null) return DashData.empty();

    // ── Profil + organisation ────────────────────────────────────────────
    final profileRow = await _supa
        .from('profiles')
        .select('full_name, role, organization_id')
        .eq('id', user.id)
        .single();

    final orgId = profileRow['organization_id'] as String;
    final fullName = (profileRow['full_name'] as String? ?? '').trim();
    final role = profileRow['role'] as String? ?? '';

    final orgRow = await _supa
        .from('organizations')
        .select('name, country_headquarters')
        .eq('id', orgId)
        .single();

    // ── KPIs (requêtes parallèles) ───────────────────────────────────────
    final kpiResults = await Future.wait([
      // BC / BA en attente (brouillon ou soumis)
      _supa
          .from('purchase_orders')
          .select('id')
          .eq('organization_id', orgId)
          .or('status.eq.PENDING,status.eq.DRAFT'),
      // Lots en contrôle qualité
      _supa
          .from('lots')
          .select('id')
          .eq('organization_id', orgId)
          .eq('statut_qc', 'EnControle'),
      // Lots rejetés
      _supa
          .from('lots')
          .select('id')
          .eq('organization_id', orgId)
          .eq('statut_qc', 'Rejete'),
      // Réceptions en cours (brouillon)
      _supa
          .from('goods_receipts')
          .select('id')
          .eq('organization_id', orgId)
          .eq('status', 'DRAFT'),
    ]);

    // ── Alertes (requêtes parallèles) ────────────────────────────────────
    final alertResults = await Future.wait([
      // Lots rejetés récents → danger
      _supa
          .from('lots')
          .select('batch_number, created_at')
          .eq('organization_id', orgId)
          .eq('statut_qc', 'Rejete')
          .order('created_at', ascending: false)
          .limit(2),
      // BC/BA en attente d'approbation → warning
      _supa
          .from('purchase_orders')
          .select('order_number, created_at')
          .eq('organization_id', orgId)
          .eq('status', 'PENDING')
          .order('created_at', ascending: false)
          .limit(2),
      // Réceptions récemment validées → info
      _supa
          .from('goods_receipts')
          .select('receipt_number, created_at')
          .eq('organization_id', orgId)
          .eq('status', 'VALIDATED')
          .order('created_at', ascending: false)
          .limit(2),
    ]);

    final alerts = <DashAlert>[
      for (final r in alertResults[0] as List)
        DashAlert(
          'Lot ${r['batch_number']} — hors norme QC',
          _relTime(r['created_at'] as String),
          DashAlertType.danger,
        ),
      for (final r in alertResults[1] as List)
        DashAlert(
          '${r['order_number']} en attente d\'approbation',
          _relTime(r['created_at'] as String),
          DashAlertType.warning,
        ),
      for (final r in alertResults[2] as List)
        DashAlert(
          'Réception ${r['receipt_number']} validée',
          _relTime(r['created_at'] as String),
          DashAlertType.info,
        ),
    ];

    return DashData(
      userName: fullName,
      initials: _initials(fullName),
      role: role,
      orgName: orgRow['name'] as String? ?? '',
      orgLocation: orgRow['country_headquarters'] as String? ?? '',
      bcbaPending: (kpiResults[0] as List).length,
      lotsEnControle: (kpiResults[1] as List).length,
      lotsRejetes: (kpiResults[2] as List).length,
      receptionsEnCours: (kpiResults[3] as List).length,
      alerts: alerts,
    );
  }
}
