# Bluwa Mobile — Flutter

App terrain Bluwa ERP pour les opérateurs (réception, qualité, production, inventaire, ventes).
Portage Flutter de l'app Expo/React Native (`../mobile`), écran pour écran.

## Stack

- **Flutter** ≥ 3.4 (Material 3, police Figtree embarquée)
- **supabase_flutter** — auth (login) + futur accès données
- **image_picker** — photos preuves qualité (caméra / galerie)
- **intl** — formats fr_FR (dates, nombres avec espaces des milliers)

## Écrans

| Onglet | Fichier | Contenu |
|---|---|---|
| Login | `lib/screens/login_screen.dart` | Auth Supabase email / mot de passe |
| Accueil | `lib/screens/dashboard_screen.dart` | KPIs, actions rapides, alertes |
| Réception | `lib/screens/reception_screen.dart` | Liste + détail + 3 flux : BC, BA planifié, BA direct |
| Inventaire | `lib/screens/inventaire_screen.dart` | Documents, comptage, écarts |
| Production | `lib/screens/of_screen.dart` | OF, picking code-barres, MES (déclaration/arrêt/rebut), clôture CCP HACCP |
| Qualité | `lib/screens/qualite_screen.dart` | Lots à analyser, résultats labo, photos, fiche NC |
| Ventes | `lib/screens/ventes_screen.dart` | Commandes clients, progression statut, prise de commande terrain |

Les écrans utilisent pour l'instant des **données mock** (comme la version Expo) —
seul le login est branché sur Supabase. Le branchement données + offline-first
(SQLite local, queue de mutations) est le prochain chantier.

## Lancer

```bash
flutter pub get

# Web (démo rapide, sans clés → bypass du login)
flutter run -d chrome

# Android / iOS avec Supabase
flutter run \
  --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ...
```

Sans `--dart-define`, l'app démarre directement sur le dashboard (mode démo).

## Structure

```
lib/
  main.dart            # init Supabase, AuthGate, barre d'onglets (HomeShell)
  theme.dart           # palette C, graisses F, helpers ts()/fmtNum()/fmtDate()
  help_content.dart    # contenu d'aide contextuelle (bouton ? des headers)
  widgets/
    shared.dart        # DarkHeader, SectionCard, StatusPill, BigButton, RadioRow…
    help_button.dart   # bottom sheet d'aide
  screens/             # un fichier par onglet + sous-écrans (détail, formulaires)
```

## Charte (rappel)

- Écrans simples : max 3 actions visibles, boutons larges.
- Statuts qualité (Quarantaine orange / Rebut rouge / Conforme vert) toujours
  distincts des statuts logistiques (gris/bleu).
- Grands nombres avec espaces : `5 000 000 XOF` (`fmtInt`/`fmtNum`).
- Confirmation obligatoire avant action destructive.
