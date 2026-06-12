import 'package:supabase_flutter/supabase_flutter.dart';

const _kSupaUrl = String.fromEnvironment('SUPABASE_URL');

/// True si Supabase a été initialisé (clés injectées au build).
bool get supabaseReady => _kSupaUrl.isNotEmpty;

/// Client Supabase — utiliser uniquement si [supabaseReady] est true.
SupabaseClient get supabase => Supabase.instance.client;
