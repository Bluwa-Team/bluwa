import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Palette Bluwa — miroir de mobile/constants/theme.ts
class C {
  // Brand
  static const primary = Color(0xFF0A4CE1);
  static const primarySoft = Color(0xFFE8EEFB);

  // Neutrals
  static const bg = Color(0xFFF1F4F9);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFE4E8EF);
  static const divider = Color(0xFFF0F2F6);

  // Text
  static const text = Color(0xFF0F172A);
  static const textSub = Color(0xFF64748B);
  static const textMuted = Color(0xFF94A3B8);

  // Status — muted
  static const success = Color(0xFF059669);
  static const successSoft = Color(0xFFD1FAE5);
  static const warning = Color(0xFFD97706);
  static const warningSoft = Color(0xFFFEF3C7);
  static const danger = Color(0xFFDC2626);
  static const dangerSoft = Color(0xFFFEE2E2);
  static const info = Color(0xFF0A4CE1);
  static const infoSoft = Color(0xFFE8EEFB);

  // Header dark (tous les écrans)
  static const header = Color(0xFF0F172A);

  // Accents secondaires partagés entre écrans
  static const orange = Color(0xFFC2410C);
  static const orangeSoft = Color(0xFFFFF4E8);
  static const violet = Color(0xFF7C3AED);
  static const violetSoft = Color(0xFFF5F3FF);
  static const rose = Color(0xFFBE123C);
  static const roseSoft = Color(0xFFFFF1F2);
}

/// Graisses Figtree — miroir de F dans theme.ts
class F {
  static const regular = FontWeight.w400;
  static const medium = FontWeight.w500;
  static const semiBold = FontWeight.w600;
  static const bold = FontWeight.w700;
  static const extraBold = FontWeight.w800;
}

/// Raccourci TextStyle Figtree.
TextStyle ts(
  double size,
  FontWeight weight,
  Color color, {
  double? height,
  double? letterSpacing,
}) {
  return TextStyle(
    fontFamily: 'Figtree',
    fontSize: size,
    fontWeight: weight,
    color: color,
    height: height != null ? height / size : null,
    letterSpacing: letterSpacing,
  );
}

final _numFmt = NumberFormat.decimalPattern('fr_FR');

/// 5 000 000 — espaces en séparateurs de milliers (charte §6).
String fmtNum(num n, {int maxDecimals = 4}) {
  final f = NumberFormat.decimalPattern('fr_FR')
    ..maximumFractionDigits = maxDecimals;
  return f.format(n);
}

String fmtInt(num n) => _numFmt.format(n.round());

String fmtDate(String iso) {
  final d = DateTime.parse(iso);
  return DateFormat('dd MMM yyyy', 'fr_FR').format(d);
}

String fmtMontant(num n, [String currency = 'XOF']) {
  if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)} M $currency';
  if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)} k $currency';
  return '${fmtInt(n)} $currency';
}

double? parseNum(String v) => double.tryParse(v.replaceAll(',', '.'));

ThemeData buildBluwaTheme() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Figtree',
    scaffoldBackgroundColor: C.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: C.primary,
      surface: C.surface,
    ),
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
  );
}
