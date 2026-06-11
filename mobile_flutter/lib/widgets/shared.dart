import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';

class BluwaLogo extends StatelessWidget {
  const BluwaLogo({super.key, this.size = 32});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/logo_white_icon.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
    );
  }
}

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.bottom = 10});
  final String text;
  final double bottom;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Text(
        text.toUpperCase(),
        style: ts(11, F.semiBold, C.textMuted, letterSpacing: 0.7),
      ),
    );
  }
}

/// Carte blanche arrondie — bloc de base de tous les écrans.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.child,
    this.label,
    this.margin = const EdgeInsets.only(bottom: 14),
    this.padding = const EdgeInsets.all(16),
    this.borderColor = C.border,
    this.color = C.surface,
  });

  final Widget child;
  final String? label;
  final EdgeInsets margin;
  final EdgeInsets padding;
  final Color borderColor;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label != null) SectionLabel(label!),
          child,
        ],
      ),
    );
  }
}

/// Pastille statut (Quarantaine orange / Rebut rouge / Conforme vert…).
class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    required this.color,
    required this.bg,
    this.icon,
    this.border,
    this.fontSize = 11,
  });

  final String label;
  final Color color;
  final Color bg;
  final IconData? icon;
  final Color? border;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(99),
        border: border != null ? Border.all(color: border!) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 10, color: color),
            const SizedBox(width: 4),
          ],
          Text(label, style: ts(fontSize, F.semiBold, color)),
        ],
      ),
    );
  }
}

/// Onglet filtre arrondi avec compteur optionnel.
class FilterPill extends StatelessWidget {
  const FilterPill({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
    this.count,
    this.activeColor = C.header,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;
  final int? count;
  final Color activeColor;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? activeColor : C.surface,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: active ? activeColor : C.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label,
                style: ts(12, F.semiBold, active ? Colors.white : C.textSub)),
            if (count != null) ...[
              const SizedBox(width: 5),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: active ? Colors.white.withValues(alpha: 0.25) : C.bg,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text('$count',
                    style:
                        ts(10, F.bold, active ? Colors.white : C.textMuted)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AppProgressBar extends StatelessWidget {
  const AppProgressBar({
    super.key,
    required this.value,
    required this.color,
    this.track = C.bg,
  });

  /// Pourcentage 0–100.
  final double value;
  final Color color;
  final Color track;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: LinearProgressIndicator(
        value: (value / 100).clamp(0, 1),
        minHeight: 6,
        backgroundColor: track,
        valueColor: AlwaysStoppedAnimation(color),
      ),
    );
  }
}

/// Ligne radio (sélection motif, BC/BA, type de défaut…).
class RadioRow extends StatelessWidget {
  const RadioRow({
    super.key,
    required this.active,
    required this.onTap,
    required this.label,
    this.sublabel,
    this.activeColor = C.primary,
    this.activeBg = C.primarySoft,
    this.activeBorder,
  });

  final bool active;
  final VoidCallback onTap;
  final String label;
  final String? sublabel;
  final Color activeColor;
  final Color activeBg;
  final Color? activeBorder;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: active ? activeBg : C.bg,
          borderRadius: BorderRadius.circular(10),
          border:
              Border.all(color: active ? (activeBorder ?? activeColor) : C.border),
        ),
        child: Row(
          children: [
            Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active ? activeColor : Colors.transparent,
                border:
                    Border.all(color: active ? activeColor : C.border, width: 2),
              ),
              child: active
                  ? Center(
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                            shape: BoxShape.circle, color: Colors.white),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: ts(13, F.semiBold,
                          active ? activeColor : C.textSub)),
                  if (sublabel != null)
                    Text(sublabel!, style: ts(11, F.regular, C.textMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Champ de saisie avec label + icône (formulaires réception, qualité…).
class InputField extends StatelessWidget {
  const InputField({
    super.key,
    required this.label,
    required this.controller,
    this.icon,
    this.placeholder = '',
    this.numeric = false,
    this.multiline = false,
    this.enabled = true,
    this.onChanged,
    this.suffixText,
    this.borderColor,
    this.fillColor,
  });

  final String label;
  final TextEditingController controller;
  final IconData? icon;
  final String placeholder;
  final bool numeric;
  final bool multiline;
  final bool enabled;
  final ValueChanged<String>? onChanged;
  final String? suffixText;
  final Color? borderColor;
  final Color? fillColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 13, color: C.textMuted),
                const SizedBox(width: 5),
              ],
              Expanded(
                  child: Text(label, style: ts(12, F.semiBold, C.textSub))),
            ],
          ),
          const SizedBox(height: 5),
          AppTextInput(
            controller: controller,
            placeholder: placeholder,
            numeric: numeric,
            multiline: multiline,
            enabled: enabled,
            onChanged: onChanged,
            suffixText: suffixText,
            borderColor: borderColor,
            fillColor: fillColor,
          ),
        ],
      ),
    );
  }
}

/// TextField stylé Bluwa, sans label.
class AppTextInput extends StatelessWidget {
  const AppTextInput({
    super.key,
    required this.controller,
    this.placeholder = '',
    this.numeric = false,
    this.multiline = false,
    this.enabled = true,
    this.obscure = false,
    this.onChanged,
    this.suffixText,
    this.suffix,
    this.prefixIcon,
    this.borderColor,
    this.fillColor,
    this.textStyle,
    this.textAlign = TextAlign.start,
  });

  final TextEditingController controller;
  final String placeholder;
  final bool numeric;
  final bool multiline;
  final bool enabled;
  final bool obscure;
  final ValueChanged<String>? onChanged;
  final String? suffixText;
  final Widget? suffix;
  final IconData? prefixIcon;
  final Color? borderColor;
  final Color? fillColor;
  final TextStyle? textStyle;
  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      obscureText: obscure,
      onChanged: onChanged,
      textAlign: textAlign,
      maxLines: multiline ? 4 : 1,
      keyboardType: numeric
          ? const TextInputType.numberWithOptions(decimal: true)
          : (multiline ? TextInputType.multiline : TextInputType.text),
      inputFormatters: numeric
          ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,\-]'))]
          : null,
      style: textStyle ?? ts(14, F.semiBold, C.text),
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: ts(14, F.regular, C.textMuted),
        filled: true,
        fillColor: fillColor ?? C.bg,
        isDense: true,
        suffixText: suffixText,
        suffixStyle: ts(13, F.semiBold, C.textMuted),
        suffixIcon: suffix,
        prefixIcon: prefixIcon != null
            ? Icon(prefixIcon, size: 16, color: C.textMuted)
            : null,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor ?? C.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor ?? C.primary),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor ?? C.border),
        ),
      ),
    );
  }
}

/// Bouton large pleine largeur (charte §6 : boutons d'action larges).
class BigButton extends StatelessWidget {
  const BigButton({
    super.key,
    required this.label,
    required this.onTap,
    this.icon,
    this.color = C.primary,
    this.textColor = Colors.white,
    this.enabled = true,
    this.outlined = false,
    this.borderColor,
    this.margin = const EdgeInsets.only(bottom: 10),
    this.padding = const EdgeInsets.symmetric(vertical: 15),
  });

  final String label;
  final VoidCallback? onTap;
  final IconData? icon;
  final Color color;
  final Color textColor;
  final bool enabled;
  final bool outlined;
  final Color? borderColor;
  final EdgeInsets margin;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final bg = enabled ? color : C.border;
    final fg = enabled ? textColor : C.textMuted;
    return Padding(
      padding: margin,
      child: GestureDetector(
        onTap: enabled ? onTap : null,
        child: Container(
          width: double.infinity,
          padding: padding,
          decoration: BoxDecoration(
            color: outlined ? C.bg : bg,
            borderRadius: BorderRadius.circular(14),
            border: borderColor != null || outlined
                ? Border.all(color: borderColor ?? C.border)
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 17, color: outlined ? fg : fg),
                const SizedBox(width: 8),
              ],
              Text(label, style: ts(15, F.bold, fg)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Ligne label / valeur (fiches détail).
class FieldRow extends StatelessWidget {
  const FieldRow(this.label, this.value, {super.key});
  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: ts(12, F.regular, C.textMuted)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value!,
                textAlign: TextAlign.right,
                style: ts(12, F.semiBold, C.text)),
          ),
        ],
      ),
    );
  }
}

/// Header sombre commun à tous les écrans (charte : header #0F172A).
class DarkHeader extends StatelessWidget {
  const DarkHeader({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.of(context).padding.top;
    return Container(
      width: double.infinity,
      color: C.header,
      padding: EdgeInsets.fromLTRB(20, topInset + 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

/// Bouton retour blanc translucide pour DarkHeader.
class HeaderBackButton extends StatelessWidget {
  const HeaderBackButton({super.key, required this.onTap, this.label = 'Retour'});
  final VoidCallback onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    final white60 = Colors.white.withValues(alpha: 0.6);
    return GestureDetector(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.chevron_left, size: 19, color: white60),
          const SizedBox(width: 4),
          Text(label, style: ts(13, F.medium, white60)),
        ],
      ),
    );
  }
}

/// Petit badge rectangulaire (BC · Formel, Picking · OF-…).
class HeaderBadge extends StatelessWidget {
  const HeaderBadge(this.label,
      {super.key, required this.color, required this.bg});
  final String label;
  final Color color;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: ts(11, F.bold, color)),
    );
  }
}

/// Tuile KPI colorée (bandeaux du haut des listes).
class KpiTile extends StatelessWidget {
  const KpiTile({
    super.key,
    required this.label,
    required this.value,
    required this.color,
    required this.bg,
    this.centered = false,
    this.labelColor,
  });

  final String label;
  final String value;
  final Color color;
  final Color bg;
  final bool centered;
  final Color? labelColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment:
            centered ? CrossAxisAlignment.center : CrossAxisAlignment.start,
        children: [
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: ts(centered ? 22 : 18, F.extraBold, color)),
          const SizedBox(height: 2),
          Text(label,
              style: ts(11, centered ? F.medium : F.regular,
                  labelColor ?? (centered ? color : C.textMuted))),
        ],
      ),
    );
  }
}

/// Bottom sheet arrondi standard (modales déclaration, sélection client…).
Future<T?> showAppSheet<T>(BuildContext context, Widget child,
    {bool scrollable = false}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.4),
    builder: (ctx) => Container(
      constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.9),
      decoration: const BoxDecoration(
        color: C.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: child,
    ),
  );
}
