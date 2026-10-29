// Design tokens: the single source of truth for color, spacing, radius, type and elevation.
// Mirrors the "SL" variables and text styles in Figma (file Kst76TL9bfwt3RYITqOR2E).
// tailwind.config.js builds the NativeWind theme from this file. Import it in TS only where a raw
// value is unavoidable (TextInput placeholder color, ActivityIndicator, shadows).
// CommonJS because tailwind.config.js requires it.

const colors = {
  primary: "#0B57D0",
  "on-primary": "#FFFFFF",
  "primary-container": "#D3E3FD",
  "on-primary-container": "#041E49",

  surface: "#FFFFFF",
  "surface-container-low": "#F8FAFD",
  "surface-container": "#F0F4F9",
  "surface-container-high": "#E9EEF6",
  "surface-container-highest": "#E3E3E3",
  "on-surface": "#1F1F1F",
  "on-surface-variant": "#444746",
  outline: "#747775",
  "outline-variant": "#C4C7C5",

  error: "#B3261E",
  "on-error": "#FFFFFF",
  "error-container": "#F9DEDC",
  "on-error-container": "#410E0B",

  success: "#146C2E",
  "on-success": "#FFFFFF",
  "success-container": "#C4EED0",
  "on-success-container": "#072711",

  warning: "#7D5700",
  "on-warning": "#FFFFFF",
  "warning-container": "#FFDEA6",
  "on-warning-container": "#2A1800",

  // shortcut: legacy aliases for screens not in Figma yet (auth, onboarding, notifications); remove once migrated
  background: "#FFFFFF",
  "on-background": "#1F1F1F",
  secondary: "#F0F4F9",
  "on-secondary": "#0B57D0",
  "surface-variant": "#F0F4F9",
};

// Key N = Figma space/(N×4). Same numbers as Tailwind's default scale, so p-4 = space/16.
const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 };

const radius = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 28, full: 9999 };

const fontFamily = {
  inter: "Inter_400Regular",
  "inter-medium": "Inter_500Medium",
  "inter-semibold": "Inter_600SemiBold",
  icon: "MaterialSymbolsRounded_400Regular",
  "icon-filled": "MaterialSymbolsRounded_400Regular_Filled",
};

// Figma SL text styles: size / line height / letter spacing in px, plus the font family key above.
const typography = {
  "headline-large": { size: 32, lineHeight: 40, letterSpacing: 0, font: "inter-semibold" },
  "headline-medium": { size: 28, lineHeight: 36, letterSpacing: 0, font: "inter-semibold" },
  "headline-small": { size: 24, lineHeight: 32, letterSpacing: 0, font: "inter-semibold" },
  "title-large": { size: 22, lineHeight: 28, letterSpacing: 0, font: "inter-medium" },
  "title-medium": { size: 16, lineHeight: 24, letterSpacing: 0.15, font: "inter-medium" },
  "title-small": { size: 14, lineHeight: 20, letterSpacing: 0.1, font: "inter-medium" },
  "body-large": { size: 16, lineHeight: 24, letterSpacing: 0.5, font: "inter" },
  "body-medium": { size: 14, lineHeight: 20, letterSpacing: 0.25, font: "inter" },
  "body-small": { size: 12, lineHeight: 16, letterSpacing: 0.4, font: "inter" },
  "label-large": { size: 14, lineHeight: 20, letterSpacing: 0.1, font: "inter-medium" },
  "label-medium": { size: 12, lineHeight: 16, letterSpacing: 0.5, font: "inter-medium" },
  "label-small": { size: 11, lineHeight: 16, letterSpacing: 0.5, font: "inter-medium" },
};

// Figma effect style SL/elevation/floating. Only for UI that floats over scrolling content.
const elevation = {
  floating: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  raised: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
};

module.exports = { colors, space, radius, fontFamily, typography, elevation };
