import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/dashboard_screen.dart';
import 'screens/inventaire_screen.dart';
import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/of_screen.dart';
import 'screens/qualite_screen.dart';
import 'screens/reception_screen.dart';
import 'screens/ventes_screen.dart';
import 'theme.dart';

// Clés injectées au build :
// flutter run --dart-define=SUPABASE_URL=… --dart-define=SUPABASE_ANON_KEY=…
const _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR');
  if (_supabaseUrl.isNotEmpty) {
    // ignore: deprecated_member_use — clé anon legacy du projet Supabase
    await Supabase.initialize(url: _supabaseUrl, anonKey: _supabaseAnonKey);
  }
  runApp(const BluwaApp());
}

bool get supabaseReady => _supabaseUrl.isNotEmpty;

class BluwaApp extends StatelessWidget {
  const BluwaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bluwa',
      debugShowCheckedModeBanner: false,
      theme: buildBluwaTheme(),
      locale: const Locale('fr', 'FR'),
      home: const AppEntry(),
    );
  }
}

class AppEntry extends StatefulWidget {
  const AppEntry({super.key});

  @override
  State<AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends State<AppEntry> {
  bool _ready = false;
  bool _onboardingDone = false;

  @override
  void initState() {
    super.initState();
    _loadStartupState();
  }

  Future<void> _loadStartupState() async {
    final prefs = await SharedPreferences.getInstance();
    final done = prefs.getBool('onboardingComplete') ?? false;
    if (mounted) {
      setState(() {
        _ready = true;
        _onboardingDone = done;
      });
    }
  }

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboardingComplete', true);
    if (mounted) {
      setState(() {
        _onboardingDone = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!supabaseReady) return const HomeShell();
    if (!_ready) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!_onboardingDone) {
      return OnboardingScreen(onComplete: _completeOnboarding);
    }
    return const AuthGate();
  }
}

/// Affiche Login tant qu'il n'y a pas de session Supabase.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    // Sans clés Supabase (dev local), on entre directement dans l'app.
    if (!supabaseReady) return const HomeShell();

    return StreamBuilder<AuthState>(
      stream: Supabase.instance.client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = Supabase.instance.client.auth.currentSession;
        if (session != null) return const HomeShell();
        return const LoginScreen();
      },
    );
  }
}

class _TabItem {
  const _TabItem(this.label, this.icon, this.builder);
  final String label;
  final IconData icon;
  final WidgetBuilder builder;
}

/// Barre d'onglets — miroir de app/(tabs)/_layout.tsx
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static final _tabs = <_TabItem>[
    _TabItem('Accueil', Icons.home_outlined, (_) => const DashboardScreen()),
    _TabItem('Réception', Icons.local_shipping_outlined,
        (_) => const ReceptionScreen()),
    _TabItem('Inventaire', Icons.assignment_outlined,
        (_) => const InventaireScreen()),
    _TabItem('Production', Icons.factory_outlined, (_) => const OFScreen()),
    _TabItem('Qualité', Icons.science_outlined, (_) => const QualiteScreen()),
    _TabItem('Ventes', Icons.shopping_bag_outlined,
        (_) => const VentesScreen()),
  ];

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        body: IndexedStack(
          index: _index,
          children: [for (final t in _tabs) t.builder(context)],
        ),
        bottomNavigationBar: Container(
          decoration: const BoxDecoration(
            color: C.surface,
            border: Border(top: BorderSide(color: C.border)),
          ),
          child: SafeArea(
            child: SizedBox(
              height: 60,
              child: Row(
                children: [
                  for (var i = 0; i < _tabs.length; i++)
                    Expanded(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => setState(() => _index = i),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(_tabs[i].icon,
                                size: 21,
                                color: _index == i ? C.primary : C.textMuted),
                            const SizedBox(height: 3),
                            Text(
                              _tabs[i].label,
                              style: ts(10, F.semiBold,
                                  _index == i ? C.primary : C.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
