import 'package:flutter/material.dart';
import '../theme.dart';

// ── Data ───────────────────────────────────────────────────────────────────────

class _Step {
  const _Step({
    required this.title,
    required this.body,
    required this.tag,
    required this.primary,
    required this.accent,
  });
  final String title, body, tag;
  final Color primary, accent;
}

const _steps = [
  _Step(
    title: 'Opérations terrain\nsous contrôle',
    body:
        'Réception, inventaire, qualité, production et ventes — toutes vos opérations dans une seule application.',
    tag: 'ERP · Terrain',
    primary: Color(0xFF0A4CE1),
    accent: Color(0xFF60A5FA),
  ),
  _Step(
    title: 'Synchronisé\nen temps réel',
    body:
        'Vos données circulent instantanément entre les équipes. Travaillez même hors connexion.',
    tag: 'Cloud · Offline-first',
    primary: Color(0xFF059669),
    accent: Color(0xFF34D399),
  ),
  _Step(
    title: 'Accès rapide\net sécurisé',
    body:
        'Identifiants sauvegardés, connexion en un geste. Votre espace vous attend.',
    tag: 'Biométrie · Sécurité',
    primary: Color(0xFF7C3AED),
    accent: Color(0xFFA78BFA),
  ),
];

// ── Screen ─────────────────────────────────────────────────────────────────────

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onComplete});
  final VoidCallback onComplete;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _ctrl = PageController();
  int _page = 0;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _next() {
    if (_page == _steps.length - 1) {
      widget.onComplete();
    } else {
      _ctrl.nextPage(
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final step = _steps[_page];

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          // ── Illustration ────────────────────────────────────────────────
          Expanded(
            flex: 57,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Gradient fond animé
                AnimatedContainer(
                  duration: const Duration(milliseconds: 420),
                  curve: Curves.easeInOut,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [step.primary, step.accent],
                    ),
                  ),
                ),
                // Blobs décoratifs
                const Positioned(
                  top: -80,
                  right: -80,
                  child: _Blob(size: 260, opacity: 0.08),
                ),
                const Positioned(
                  bottom: 70,
                  left: -50,
                  child: _Blob(size: 180, opacity: 0.07),
                ),
                const Positioned(
                  top: 110,
                  left: 36,
                  child: _Blob(size: 64, opacity: 0.12),
                ),
                // Slides
                PageView.builder(
                  controller: _ctrl,
                  itemCount: _steps.length,
                  onPageChanged: (i) => setState(() => _page = i),
                  itemBuilder: (_, i) => switch (i) {
                    0 => const _ErpSlide(),
                    1 => const _SyncSlide(),
                    _ => const _SecuritySlide(),
                  },
                ),
                // Vague blanche bas
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: CustomPaint(
                    size: const Size(double.infinity, 52),
                    painter: _WavePainter(),
                  ),
                ),
                // Bouton Passer
                SafeArea(
                  child: Align(
                    alignment: Alignment.topRight,
                    child: Padding(
                      padding: const EdgeInsets.only(right: 18, top: 6),
                      child: AnimatedOpacity(
                        duration: const Duration(milliseconds: 200),
                        opacity: _page < _steps.length - 1 ? 1.0 : 0.0,
                        child: TextButton(
                          onPressed: _page < _steps.length - 1
                              ? widget.onComplete
                              : null,
                          child: Text(
                            'Passer',
                            style: ts(
                                14, F.medium, Colors.white.withOpacity(0.85)),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Contenu ─────────────────────────────────────────────────────
          Expanded(
            flex: 43,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 26, 28, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tag
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 250),
                    child: _Chip(
                      key: ValueKey(_page),
                      label: step.tag,
                      color: step.primary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Titre
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 250),
                    child: Text(
                      step.title,
                      key: ValueKey('t$_page'),
                      style: ts(25, F.bold, C.text, height: 25 * 1.28),
                    ),
                  ),
                  const SizedBox(height: 10),
                  // Description
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 250),
                    child: Text(
                      step.body,
                      key: ValueKey('d$_page'),
                      style: ts(14.5, F.regular, C.textSub, height: 14.5 * 1.6),
                    ),
                  ),
                  const Spacer(),
                  // Indicateurs de page
                  Row(
                    children: List.generate(_steps.length, (i) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.only(right: 6),
                        width: _page == i ? 22 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _page == i ? step.primary : C.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 18),
                  // Bouton CTA
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 350),
                    width: double.infinity,
                    height: 54,
                    decoration: BoxDecoration(
                      color: step.primary,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: step.primary.withOpacity(0.30),
                          blurRadius: 18,
                          offset: const Offset(0, 7),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _next,
                        borderRadius: BorderRadius.circular(14),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _page == _steps.length - 1
                                  ? 'Commencer'
                                  : 'Suivant',
                              style: ts(16, F.semiBold, Colors.white),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.arrow_forward_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Slide 1 — ERP / Terrain ────────────────────────────────────────────────────

class _ErpSlide extends StatelessWidget {
  const _ErpSlide();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Logo + nom
        Image.asset(
          'assets/images/logo_white_icon.png',
          width: 60,
          height: 60,
        ),
        const SizedBox(height: 10),
        Text(
          'bluwa',
          style: ts(30, F.extraBold, Colors.white, letterSpacing: -0.5),
        ),
        const SizedBox(height: 28),
        // Cartes de stats
        Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            _StatCard(
              label: 'Réceptions',
              value: '128',
              icon: Icons.inbox_rounded,
            ),
            SizedBox(width: 10),
            _StatCard(
              label: 'Produits',
              value: '3 402',
              icon: Icons.inventory_2_rounded,
            ),
            SizedBox(width: 10),
            _StatCard(
              label: 'Lots OK',
              value: '99 %',
              icon: Icons.verified_rounded,
            ),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
  });
  final String label, value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.28), width: 1.2),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 22),
          const SizedBox(height: 8),
          Text(value, style: ts(13, F.bold, Colors.white)),
          const SizedBox(height: 3),
          Text(
            label,
            style: ts(9.5, F.medium, Colors.white.withOpacity(0.75)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ── Slide 2 — Sync ─────────────────────────────────────────────────────────────

class _SyncSlide extends StatelessWidget {
  const _SyncSlide();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _Device(icon: Icons.phone_android_rounded),
            const SizedBox(width: 14),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.arrow_forward_rounded,
                    color: Colors.white.withOpacity(0.70), size: 18),
                const SizedBox(height: 10),
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: Colors.white.withOpacity(0.32), width: 1.5),
                  ),
                  child: const Icon(Icons.cloud_done_rounded,
                      color: Colors.white, size: 28),
                ),
                const SizedBox(height: 10),
                Icon(Icons.arrow_back_rounded,
                    color: Colors.white.withOpacity(0.70), size: 18),
              ],
            ),
            const SizedBox(width: 14),
            _Device(icon: Icons.tablet_android_rounded),
          ],
        ),
        const SizedBox(height: 22),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.15),
            borderRadius: BorderRadius.circular(30),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                      color: Color(0xFF4ADE80), shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text('Synchronisation active',
                  style: ts(12, F.medium, Colors.white)),
            ],
          ),
        ),
      ],
    );
  }
}

class _Device extends StatelessWidget {
  const _Device({required this.icon});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 68,
      height: 100,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border:
            Border.all(color: Colors.white.withOpacity(0.30), width: 1.5),
      ),
      child: Icon(icon, color: Colors.white, size: 34),
    );
  }
}

// ── Slide 3 — Sécurité ─────────────────────────────────────────────────────────

class _SecuritySlide extends StatelessWidget {
  const _SecuritySlide();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            // Halo extérieur
            Container(
              width: 170,
              height: 170,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.07),
                shape: BoxShape.circle,
                border: Border.all(
                    color: Colors.white.withOpacity(0.12), width: 1),
              ),
            ),
            // Halo intermédiaire
            Container(
              width: 126,
              height: 126,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
            ),
            // Icône principale
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.20),
                shape: BoxShape.circle,
                border: Border.all(
                    color: Colors.white.withOpacity(0.38), width: 1.5),
              ),
              child: const Icon(Icons.fingerprint_rounded,
                  color: Colors.white, size: 46),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _BadgeItem(icon: Icons.lock_rounded, label: 'Chiffré'),
            const SizedBox(width: 10),
            _BadgeItem(icon: Icons.shield_rounded, label: 'Sécurisé'),
            const SizedBox(width: 10),
            _BadgeItem(icon: Icons.speed_rounded, label: 'Rapide'),
          ],
        ),
      ],
    );
  }
}

class _BadgeItem extends StatelessWidget {
  const _BadgeItem({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border:
            Border.all(color: Colors.white.withOpacity(0.25), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 14),
          const SizedBox(width: 5),
          Text(label, style: ts(12, F.medium, Colors.white)),
        ],
      ),
    );
  }
}

// ── Widgets utilitaires ────────────────────────────────────────────────────────

class _Blob extends StatelessWidget {
  const _Blob({required this.size, required this.opacity});
  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(opacity),
        shape: BoxShape.circle,
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({super.key, required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: ts(12, F.semiBold, color, letterSpacing: 0.4),
      ),
    );
  }
}

class _WavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawPath(
      Path()
        ..moveTo(0, size.height * 0.45)
        ..quadraticBezierTo(
          size.width / 2,
          -size.height * 0.25,
          size.width,
          size.height * 0.45,
        )
        ..lineTo(size.width, size.height)
        ..lineTo(0, size.height)
        ..close(),
      Paint()..color = Colors.white,
    );
  }

  @override
  bool shouldRepaint(_) => false;
}
