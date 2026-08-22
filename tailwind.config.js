/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#000000",       // fundo principal, preto puro (destaca a logo)
        parchment: "#EDE3D0", // papel / texto claro
        brass: "#C6963B",     // latão — botões, destaques
        "brass-dim": "#8f6c28",
        barber: "#8C2F39",    // vermelho do poste de barbearia
        steel: "#6B6459"      // texto secundário, bordas
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      },
      letterSpacing: {
        widest2: "0.18em"
      },
      keyframes: {
        stripe: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "80px 0" }
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        }
      },
      animation: {
        stripe: "stripe 2.4s linear infinite",
        fadeUp: "fadeUp 0.5s ease-out both"
      }
    }
  },
  plugins: []
};
