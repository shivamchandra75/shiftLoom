/** @type {import('tailwindcss').Config} */
const { colors, space, radius, fontFamily, typography } = require("./src/theme/tokens");

const px = (n) => `${n}px`;
const mapValues = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Text and Icon build these class names from tokens at runtime, so the scanner can't see them.
  safelist: [
    ...Object.entries(typography).flatMap(([k, t]) => [`text-${k}`, `font-${t.font}`]),
    ...Object.keys(colors).map((c) => `text-${c}`),
  ],
  theme: {
    extend: {
      colors,
      spacing: mapValues(space, px),
      borderRadius: mapValues(radius, px),
      fontFamily: mapValues(fontFamily, (f) => [f]),
      fontSize: mapValues(typography, (t) => [
        px(t.size),
        { lineHeight: px(t.lineHeight), letterSpacing: px(t.letterSpacing) },
      ]),
    },
  },
  plugins: [],
};
