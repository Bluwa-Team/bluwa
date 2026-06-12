import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;
import '../services/supabase.dart';
import '../theme.dart';
import '../widgets/shared.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _showPwd = false;
  bool _remember = true;
  bool _loading = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  Future<void> _loadSavedCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final savedEmail = prefs.getString('savedEmail') ?? '';
    final savedPassword = prefs.getString('savedPassword') ?? '';
    final remember = prefs.getBool('rememberLogin') ?? true;

    if (mounted) {
      setState(() {
        _remember = remember;
        if (savedEmail.isNotEmpty) {
          _email.text = savedEmail;
        }
        if (savedPassword.isNotEmpty) {
          _password.text = savedPassword;
        }
      });
    }
  }

  Future<void> _saveCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('rememberLogin', _remember);
    await prefs.setString('savedEmail', _email.text.trim());
    if (_remember) {
      await prefs.setString('savedPassword', _password.text);
    } else {
      await prefs.remove('savedPassword');
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_email.text.isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Veuillez remplir tous les champs.');
      return;
    }
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      await supabase.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
      await _saveCredentials();
      // L'AuthGate bascule automatiquement vers HomeShell.
    } on AuthException {
      setState(() => _error = 'Email ou mot de passe incorrect.');
    } catch (_) {
      setState(() => _error = 'Connexion impossible. Vérifie le réseau.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.bg,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 48),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo + titre
              Container(
                width: 64,
                height: 64,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: C.primary,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: C.primary.withValues(alpha: 0.25),
                      offset: const Offset(0, 8),
                      blurRadius: 16,
                    ),
                  ],
                ),
                child: const Center(child: BluwaLogo(size: 38)),
              ),
              Text('Bluwa',
                  style: ts(26, F.extraBold, C.text, letterSpacing: 0.5)),
              const SizedBox(height: 6),
              Text('Connexion', style: ts(18, F.semiBold, C.text)),
              const SizedBox(height: 4),
              Text('Bienvenue, connectez-vous à votre espace',
                  textAlign: TextAlign.center,
                  style: ts(14, F.regular, C.textMuted)),
              const SizedBox(height: 40),

              // Formulaire
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: C.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: C.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Email', style: ts(13, F.semiBold, C.textSub)),
                    const SizedBox(height: 6),
                    AppTextInput(
                      controller: _email,
                      placeholder: 'vous@exemple.com',
                      prefixIcon: Icons.mail_outline,
                    ),
                    const SizedBox(height: 16),
                    Text('Mot de passe', style: ts(13, F.semiBold, C.textSub)),
                    const SizedBox(height: 6),
                    AppTextInput(
                      controller: _password,
                      placeholder: '••••••••',
                      prefixIcon: Icons.lock_outline,
                      obscure: !_showPwd,
                      suffix: GestureDetector(
                        onTap: () => setState(() => _showPwd = !_showPwd),
                        child: Icon(
                          _showPwd
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          size: 18,
                          color: C.textMuted,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    Row(
                      children: [
                        Checkbox(
                          value: _remember,
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _remember = value);
                          },
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _remember = !_remember),
                            child: Text('Se souvenir de moi',
                                style: ts(13, F.medium, C.text)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Les identifiants sont sauvegardés localement pour accélérer la connexion.',
                      style: ts(11, F.regular, C.textMuted),
                    ),
                    const SizedBox(height: 16),

                    if (_error.isNotEmpty)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: C.dangerSoft,
                          borderRadius: BorderRadius.circular(10),
                          border:
                              Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child:
                            Text(_error, style: ts(13, F.medium, C.danger)),
                      ),

                    GestureDetector(
                      onTap: _loading ? null : _handleLogin,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: _loading
                              ? const Color(0xFF6B94F5)
                              : C.primary,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Center(
                          child: _loading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white),
                                )
                              : Text('Se connecter',
                                  style: ts(16, F.bold, Colors.white)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),
              Text('Bluwa ERP · App terrain',
                  style: ts(12, F.regular, C.textMuted)),
            ],
          ),
        ),
      ),
    );
  }
}
