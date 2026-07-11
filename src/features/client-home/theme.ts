// Tokens visuais do aplicativo — fonte única de verdade para cor, tipografia,
// forma e espaçamento. Importado em todo o app; alterar aqui repinta as telas de
// forma consistente. Identidade: verde esmeralda moderno, visual limpo e sóbrio,
// com destaque reservado apenas para ações importantes.

export const colors = {
  // Superfícies e fundo
  screenBg: "#F7F8F7",
  surface: "#FFFFFF",
  cardBorder: "#EAEDEA",
  // Alias semântico de borda (mesmo valor de cardBorder).
  border: "#EAEDEA",

  // Texto (hierarquia: primário > secundário > terciário)
  textPrimary: "#171A17",
  textSecondary: "#6B726B",
  textTertiary: "#9AA09A",

  // Primária (identidade única): verde esmeralda moderno.
  primary: "#059669",
  primaryPressed: "#047857",
  primarySoft: "#ECFDF5",
  primarySoftText: "#047857",
  onPrimary: "#FFFFFF",
  // Alias histórico mantido para compatibilidade (= primary / primarySoft).
  accent: "#059669",
  accentSoftBg: "#ECFDF5",

  // Chips (aba/segmento): ativo escuro neutro, inativo claro com borda.
  chipActiveBg: "#171A17",
  chipActiveText: "#FFFFFF",
  chipInactiveBg: "#FFFFFF",
  chipInactiveBorder: "#E2E5E2",

  // Avatares (fallback com iniciais) no tom da primária.
  avatarBg: "#D1FADF",
  avatarText: "#047857",

  // Fundo neutro de ícones/campos discretos.
  iconMutedBg: "#EFF1EF",

  // Feedback
  danger: "#DC2626",
  dangerSoft: "#FEECEC",

  // Sobreposição de modais/sheets.
  overlay: "rgba(0,0,0,0.4)",
} as const

export const radius = {
  card: 16,
  // Controles (botões e campos) compartilham o mesmo raio.
  control: 12,
  search: 12,
  chip: 999,
  tag: 8,
  avatar: 999,
} as const

export const spacing = {
  // Escala base de espaçamento.
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  // Aliases de uso comum (mantidos para compatibilidade).
  screen: 20,
  cardGap: 14,
  card: 16,
} as const

// Hierarquia tipográfica única. Cada papel define tamanho, peso e altura de linha.
export const typography = {
  display: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  title: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  subtitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  caption: { fontSize: 13, fontWeight: "500", lineHeight: 17 },
  micro: { fontSize: 11, fontWeight: "500", lineHeight: 14 },
} as const

// Paleta de status (etiquetas de estado): um único conjunto semântico para todo
// o app. Cada tom traz cor de texto e fundo suave combinados.
export const status = {
  success: { color: "#047857", background: "#ECFDF5" },
  info: { color: "#1D4ED8", background: "#E7EDFD" },
  warning: { color: "#B45309", background: "#FBEFD8" },
  danger: { color: "#DC2626", background: "#FEECEC" },
  neutral: { color: "#6B726B", background: "#EFF1EF" },
} as const

// Sombra única e suave para cartões elevados; modais usam uma um pouco mais forte.
export const shadow = {
  card: {
    shadowColor: "#0B1F14",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: "#0B1F14",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const
