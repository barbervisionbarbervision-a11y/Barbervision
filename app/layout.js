import { Anton, Manrope } from "next/font/google";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata = {
  title: "Barber Vision",
  description: "Descubra como você ficará antes mesmo de cortar o cabelo.",
  icons: {
    icon: "/logo-barbervision.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${manrope.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
