import { Ionicons } from "@expo/vector-icons"
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"
import type { RequestPhotoItem } from "@/features/service-requests/useRequestPhotos"

type Props = {
  items: RequestPhotoItem[]
  canAddMore: boolean
  onAdd: () => void
  onRemove: (key: string) => void
  onRetry: (key: string) => void
}

// Grade de fotos da solicitação: miniaturas com remover, estado de envio por item
// e um bloco para adicionar. Puramente visual — a lógica fica no useRequestPhotos.
export function RequestPhotosField({ items, canAddMore, onAdd, onRemove, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Fotos do serviço <Text style={styles.optional}>(opcional)</Text>
      </Text>
      <Text style={styles.helper}>
        Anexe fotos para ajudar os profissionais a entenderem o serviço.
      </Text>

      <View style={styles.grid}>
        {items.map((item) => {
          const uri = item.kind === "existing" ? item.url : item.localUri
          const uploading = item.kind === "new" && item.status === "uploading"
          const failed = item.kind === "new" && item.status === "error"

          return (
            <View key={item.key} style={styles.thumb}>
              <Image source={{ uri }} style={styles.image} />

              {uploading ? (
                <View style={styles.overlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}

              {failed ? (
                <Pressable onPress={() => onRetry(item.key)} style={[styles.overlay, styles.errorOverlay]}>
                  <Ionicons color="#FFFFFF" name="refresh" size={20} />
                  <Text style={styles.errorText}>Tentar de novo</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityLabel="Remover foto"
                hitSlop={6}
                onPress={() => onRemove(item.key)}
                style={styles.remove}
              >
                <Ionicons color="#FFFFFF" name="close" size={14} />
              </Pressable>
            </View>
          )
        })}

        {canAddMore ? (
          <Pressable
            accessibilityLabel="Adicionar fotos"
            accessibilityRole="button"
            onPress={onAdd}
            style={({ pressed }) => [styles.addTile, pressed && styles.pressed]}
          >
            <Ionicons color={colors.textTertiary} name="camera-outline" size={24} />
            <Text style={styles.addText}>Adicionar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const THUMB_SIZE = 96

const styles = StyleSheet.create({
  addText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  addTile: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.card,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 4,
    height: THUMB_SIZE,
    justifyContent: "center",
    width: THUMB_SIZE,
  },
  container: {
    gap: 6,
  },
  errorOverlay: {
    backgroundColor: "rgba(180,35,35,0.55)",
    gap: 2,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  helper: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  image: {
    backgroundColor: colors.iconMutedBg,
    height: "100%",
    width: "100%",
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  optional: {
    color: colors.textTertiary,
    fontWeight: "400",
  },
  overlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  remove: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 22,
  },
  thumb: {
    borderRadius: radius.card,
    height: THUMB_SIZE,
    overflow: "hidden",
    width: THUMB_SIZE,
  },
})
