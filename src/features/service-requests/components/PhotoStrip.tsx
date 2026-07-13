import { Image, ScrollView, StyleSheet } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

// Faixa horizontal de fotos, somente leitura. Compartilhada pelo detalhe da
// solicitação (cliente) e pelo detalhe da oportunidade (profissional).
export function PhotoStrip({ photos }: { photos: { id: string; url: string }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
      {photos.map((photo) => (
        <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.tag,
    height: 110,
    marginRight: 10,
    width: 140,
  },
  strip: {
    marginTop: 2,
  },
})
