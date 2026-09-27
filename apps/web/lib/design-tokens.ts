/**
 * Saraswati Design Tokens for Web
 * Per docs/07-UI-UX-SPECIFICATION.md
 */
export const colors = {
  background: "#FBF7F2",
  surface: "#FFFFFF",
  primary: "#8A1538",
  primaryHover: "#6E1030",
  primaryForeground: "#FFFFFF",
  accentGold: "#C9A227",
  accentGoldForeground: "#1F1B16",
  textPrimary: "#1F1B16",
  textMuted: "#6B6258",
  textInverse: "#FFFFFF",
  success: "#2D7A4F",
  successLight: "#E8F5EE",
  warning: "#B45309",
  warningLight: "#FEF3C7",
  danger: "#B91C1C",
  dangerLight: "#FEE2E2",
  border: "#E8E0D8",
  borderStrong: "#C4B8AD",
  disabled: "#C4B8AD",
  disabledForeground: "#9E948A",
} as const;

export const fontFamilies = {
  heading: "'Playfair Display', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
} as const;

export const transitions = {
  fast: "150ms ease-in-out",
  base: "200ms ease-in-out",
} as const;

export type ColorKey = keyof typeof colors;
