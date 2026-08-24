import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Saad — Designer × Developer",
  description:
    "I turn ideas into intuitive interfaces and powerful products that make an impact.",
};

export const viewport: Viewport = {
  themeColor: "#f6f3f1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body>
        <SmoothScroll />
        <a className="skipLink" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
