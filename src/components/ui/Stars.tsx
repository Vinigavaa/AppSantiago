import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, View } from "react-native"

const STAR_COLOR = "#F5A623"

// Cinco estrelas preenchidas conforme a nota (arredonda para meia estrela).
// Primitivo compartilhado por cliente e profissional (perfil, cards, avaliações).
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((position) => {
        const name =
          rating >= position
            ? "star"
            : rating >= position - 0.5
              ? "star-half"
              : "star-outline"

        return <Ionicons color={STAR_COLOR} key={position} name={name} size={size} />
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 2,
  },
})

export { STAR_COLOR }
