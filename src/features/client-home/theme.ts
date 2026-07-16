// Tokens visuais do aplicativo — fonte única de verdade para cor, tipografia,
// forma e espaçamento. Importado em todo o app; alterar aqui repinta as telas de
// forma consistente. Identidade: azul marinho como cor da marca (confiança,
// profissionalismo, tecnologia), sobre branco e cinza claro, com azul royal
// reservado apenas para destaques (links, indicadores ativos, foco).

export const colors = {
  // Superfícies e fundo
  screenBg: "#F5F7FA",
  surface: "#FFFFFF",
  cardBorder: "#E2E8F0",
  // Alias semântico de borda (mesmo valor de cardBorder).
  border: "#E2E8F0",

  // Texto (hierarquia: primário > secundário > terciário)
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",

  // Primária (identidade da marca): azul marinho.
  primary: "#05013D",
  primaryPressed: "#0D0A52",
  primarySoft: "#EAEAF3",
  primarySoftText: "#05013D",
  onPrimary: "#FFFFFF",
  // Alias histórico mantido para compatibilidade (= primary / primarySoft).
  // É o token de marca dominante do app — permanece azul marinho.
  accent: "#05013D",
  accentSoftBg: "#EAEAF3",

  // Destaque (azul royal): reservado a links, indicadores ativos, chips
  // selecionados leves e estados de foco. Uso pontual (não é cor de marca).
  highlight: "#3B82F6",
  highlightSoft: "#EAF2FE",

  // Chips (aba/segmento): ativo no azul marinho da marca, inativo claro com borda.
  chipActiveBg: "#05013D",
  chipActiveText: "#FFFFFF",
  chipInactiveBg: "#FFFFFF",
  chipInactiveBorder: "#E2E8F0",

  // Avatares (fallback com iniciais) no tom da marca.
  avatarBg: "#DAD9EC",
  avatarText: "#05013D",

  // Fundo neutro de ícones/campos discretos.
  iconMutedBg: "#EEF1F6",

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
  info: { color: "#2563EB", background: "#EAF2FE" },
  warning: { color: "#B45309", background: "#FBEFD8" },
  danger: { color: "#DC2626", background: "#FEECEC" },
  neutral: { color: "#6B726B", background: "#EFF1EF" },
} as const

// Sombra única e suave para cartões elevados; modais usam uma um pouco mais forte.
export const shadow = {
  card: {
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const
