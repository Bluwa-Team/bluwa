import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Eye, EyeOff, Mail, Lock } from "lucide-react-native";
import BluwaLogo from "../components/BluwaLogo";
import { supabase } from "../lib/supabase";
import { C, F } from "../constants/theme";

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError("Email ou mot de passe incorrect."); return; }
    router.replace("/(tabs)/dashboard");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo + titre */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 18,
            backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
            marginBottom: 18,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
          }}>
            <BluwaLogo size={38} />
          </View>
          <Text style={{ fontFamily: F.extraBold, color: C.text, fontSize: 26, letterSpacing: 0.5 }}>
            Bluwa
          </Text>
          <Text style={{ fontFamily: F.semiBold, color: C.text, fontSize: 18, marginTop: 6 }}>
            Connexion
          </Text>
          <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 14, marginTop: 4, textAlign: "center" }}>
            Bienvenue, connectez-vous à votre espace
          </Text>
        </View>

        {/* Formulaire */}
        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border }}>

          {/* Email */}
          <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 13, marginBottom: 6 }}>
            Email
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1, borderColor: C.border, borderRadius: 12,
            backgroundColor: C.bg, paddingHorizontal: 14, marginBottom: 16,
          }}>
            <Mail size={16} color={C.textMuted} strokeWidth={2} style={{ marginRight: 10 }} />
            <TextInput
              style={{ flex: 1, fontFamily: F.regular, color: C.text, fontSize: 15, paddingVertical: 13 }}
              placeholder="vous@exemple.com"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Mot de passe */}
          <Text style={{ fontFamily: F.semiBold, color: C.textSub, fontSize: 13, marginBottom: 6 }}>
            Mot de passe
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1, borderColor: C.border, borderRadius: 12,
            backgroundColor: C.bg, paddingHorizontal: 14, marginBottom: 20,
          }}>
            <Lock size={16} color={C.textMuted} strokeWidth={2} style={{ marginRight: 10 }} />
            <TextInput
              style={{ flex: 1, fontFamily: F.regular, color: C.text, fontSize: 15, paddingVertical: 13 }}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={8}>
              {showPwd
                ? <EyeOff size={18} color={C.textMuted} strokeWidth={2} />
                : <Eye size={18} color={C.textMuted} strokeWidth={2} />}
            </TouchableOpacity>
          </View>

          {/* Erreur */}
          {error ? (
            <View style={{
              backgroundColor: C.dangerSoft, borderRadius: 10, padding: 12,
              marginBottom: 16, borderWidth: 1, borderColor: "#FECACA",
            }}>
              <Text style={{ fontFamily: F.medium, color: C.danger, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          {/* Bouton connexion */}
          <TouchableOpacity
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#6B94F5" : C.primary,
              borderRadius: 14, paddingVertical: 16,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 8,
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 16 }}>Se connecter</Text>}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={{ fontFamily: F.regular, color: C.textMuted, fontSize: 12, textAlign: "center", marginTop: 24 }}>
          Bluwa ERP · App terrain
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
