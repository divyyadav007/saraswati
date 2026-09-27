/**
 * Saraswati Design Tokens
 *
 * Single source of truth for colors, typography, and spacing.
 * Used by:
 *   - apps/web  → via Tailwind CSS theme config (tailwind.config.ts)
 *   - apps/mobile → imported directly in StyleSheet / nativewind
 *
 * Per docs/07-UI-UX-SPECIFICATION.md
 */

// ── Colors ────────────────────────────────────────────────────────────────────
export const colors = {
  // Background
  background: "#FBF7F2", // Warm off-white
  surface: "#FFFFFF", // Card surfaces

  // Brand
  primary: "#8A1538", // Deep maroon — primary CTA, highlights
  primaryHover: "#6E1030", // Slightly darker for hover states
  primaryForeground: "#FFFFFF", // Text on primary

  // Accent
  accentGold: "#C9A227", // Used sparingly — festival badges, hamper highlights
  accentGoldForeground: "#1F1B16",

  // Text
  textPrimary: "#1F1B16", // Near-black
  textMuted: "#6B6258", // Warm gray
  textInverse: "#FFFFFF",

  // Semantic
  success: "#2D7A4F", // Desaturated green
  successLight: "#E8F5EE",
  warning: "#B45309", // Amber/brown
  warningLight: "#FEF3C7",
  danger: "#B91C1C", // Desaturated red
  dangerLight: "#FEE2E2",

  // Border & Dividers
  border: "#E8E0D8",
  borderStrong: "#C4B8AD",

  // Disabled / Inactive
  disabled: "#C4B8AD",
  disabledForeground: "#9E948A",
} as const;

// ── Typography ─────────────────────────────────────────────────────────────────
export const fontFamilies = {
  heading: "'Playfair Display', Georgia, serif", // Premium/artisanal feel
  body: "'Inter', system-ui, sans-serif", // Clean, readable
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16, // Minimum body size for accessibility
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// ── Spacing (4px base scale) ───────────────────────────────────────────────────
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ── Border Radius ──────────────────────────────────────────────────────────────
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────────
export const shadows = {
  sm: "0 1px 2px 0 rgba(31, 27, 22, 0.05)",
  md: "0 4px 6px -1px rgba(31, 27, 22, 0.08), 0 2px 4px -1px rgba(31, 27, 22, 0.04)",
  lg: "0 10px 15px -3px rgba(31, 27, 22, 0.08), 0 4px 6px -2px rgba(31, 27, 22, 0.04)",
} as const;

// ── Transitions ────────────────────────────────────────────────────────────────
// Per docs/07-UI-UX-SPECIFICATION.md §2.5 — minimal, functional only
export const transitions = {
  fast: "150ms ease-in-out",
  base: "200ms ease-in-out", // Max for decorative transitions
} as const;

// ── Type exports ──────────────────────────────────────────────────────────────
export type ColorKey = keyof typeof colors;
export type FontSizeKey = keyof typeof fontSizes;
export type SpacingKey = keyof typeof spacing;
