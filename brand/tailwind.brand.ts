import type { Config } from "tailwindcss"

export const brandPreset: Config = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#3b5bdb",
          secondary: "#151228",
          accent: "#7c6df0",
          bg: "#0c0a18",
          surface: "#14122a",
          text: "#eceef5",
          muted: "#6b7289",
        },
      },
      fontFamily: {
        heading: ['"Outfit"', "ui-sans-serif"],
        body: ['"DM Sans"', "ui-sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace"],
      },
    },
  },
}
