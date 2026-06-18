// Tokens visuais da área do cliente, derivados da referência de design.
// Centralizados aqui para manter consistência entre os componentes da Home.

export const colors = {
  screenBg: "#F6F7F6",
  surface: "#FFFFFF",
  cardBorder: "#ECEFEC",
  textPrimary: "#1A1D1A",
  textSecondary: "#6B726B",
  textTertiary: "#9AA09A",
  accent: "#16A34A",
  accentSoftBg: "#E6F4EA",
  chipActiveBg: "#1A1D1A",
  chipActiveText: "#FFFFFF",
  chipInactiveBg: "#FFFFFF",
  chipInactiveBorder: "#E2E5E2",
  avatarBg: "#CDEAD8",
  avatarText: "#1F7A45",
  iconMutedBg: "#EFF1EF",
  danger: "#B91C1C",
} as const

export const radius = {
  card: 16,
  chip: 999,
  tag: 8,
  search: 12,
  avatar: 999,
} as const

export const spacing = {
  screen: 20,
  cardGap: 14,
  card: 16,
} as const
