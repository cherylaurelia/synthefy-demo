import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nori's free prediction intervals on 16.8k real SF 311 tickets",
  description:
    "A learning-curve check of synthefy-nori's quantile output against a tuned gradient-boosting model, conformal prediction and a lookup table, from 250 to 16,786 context rows. Unofficial.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
