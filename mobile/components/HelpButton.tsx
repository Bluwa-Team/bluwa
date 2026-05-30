import {
  Modal, View, Text, TouchableOpacity, ScrollView, Linking, Platform,
} from "react-native";
import { useState } from "react";
import { HelpCircle, X, ChevronRight, Lightbulb, PlayCircle } from "lucide-react-native";
import { HELP, HelpKey } from "../constants/help";
import { C, F } from "../constants/theme";

interface Props {
  helpKey: HelpKey;
  color?: string;
}

export default function HelpButton({ helpKey, color = "rgba(255,255,255,0.7)" }: Props) {
  const [visible, setVisible] = useState(false);
  const content = HELP[helpKey];

  function openVideo() {
    if (!content.videoUrl) return;
    Linking.openURL(content.videoUrl);
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        hitSlop={12}
        style={{ padding: 4 }}
        accessibilityLabel="Aide"
      >
        <HelpCircle size={20} color={color} strokeWidth={2} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "85%",
          }}>
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 99, backgroundColor: C.border }} />
            </View>

            {/* Header */}
            <View style={{
              flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
              paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
              borderBottomWidth: 1, borderBottomColor: C.divider,
            }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{
                  backgroundColor: C.primarySoft, borderRadius: 6,
                  paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6,
                }}>
                  <Text style={{ fontFamily: F.semiBold, color: C.primary, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Aide
                  </Text>
                </View>
                <Text style={{ fontFamily: F.bold, color: C.text, fontSize: 18 }}>
                  {content.titre}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={8}>
                <X size={20} color={C.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

              {/* Résumé */}
              <Text style={{
                fontFamily: F.regular, color: C.textSub, fontSize: 14,
                lineHeight: 22, marginBottom: 20,
              }}>
                {content.resume}
              </Text>

              {/* Vidéo */}
              {content.videoUrl && (
                <TouchableOpacity
                  onPress={openVideo}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    backgroundColor: "#1E1B4B", borderRadius: 14,
                    padding: 14, marginBottom: 20,
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 99,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <PlayCircle size={22} color="#fff" strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 14 }}>
                      Voir la vidéo
                    </Text>
                    <Text style={{ fontFamily: F.regular, color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>
                      Démonstration étape par étape
                    </Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                </TouchableOpacity>
              )}

              {/* Étapes */}
              <View style={{
                backgroundColor: C.surface, borderRadius: 14,
                borderWidth: 1, borderColor: C.border,
                padding: 16, marginBottom: 16,
              }}>
                <Text style={{
                  fontFamily: F.semiBold, color: C.textMuted, fontSize: 11,
                  textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 14,
                }}>
                  Comment faire
                </Text>
                {content.etapes.map((etape, i) => (
                  <View key={i} style={{
                    flexDirection: "row", alignItems: "flex-start", gap: 12,
                    marginBottom: i < content.etapes.length - 1 ? 12 : 0,
                  }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 99,
                      backgroundColor: C.primary,
                      alignItems: "center", justifyContent: "center",
                      marginTop: 1, flexShrink: 0,
                    }}>
                      <Text style={{ fontFamily: F.bold, color: "#fff", fontSize: 11 }}>{i + 1}</Text>
                    </View>
                    <Text style={{
                      fontFamily: F.regular, color: C.text, fontSize: 14,
                      lineHeight: 21, flex: 1,
                    }}>
                      {etape}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Tips */}
              {content.tips && content.tips.length > 0 && (
                <View style={{
                  backgroundColor: "#FFFBEB", borderRadius: 14,
                  borderWidth: 1, borderColor: "#FDE68A",
                  padding: 16,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <Lightbulb size={14} color={C.warning} strokeWidth={2} />
                    <Text style={{
                      fontFamily: F.semiBold, color: C.warning, fontSize: 11,
                      textTransform: "uppercase", letterSpacing: 0.7,
                    }}>
                      À savoir
                    </Text>
                  </View>
                  {content.tips.map((tip, i) => (
                    <View key={i} style={{
                      flexDirection: "row", alignItems: "flex-start", gap: 8,
                      marginBottom: i < content.tips!.length - 1 ? 10 : 0,
                    }}>
                      <Text style={{ color: C.warning, fontSize: 14, marginTop: 1 }}>·</Text>
                      <Text style={{
                        fontFamily: F.regular, color: "#92400E", fontSize: 13,
                        lineHeight: 20, flex: 1,
                      }}>
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
