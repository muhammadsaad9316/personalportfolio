import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { siteMetadata } from "@/lib/siteMetadata";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = siteMetadata(
  "Abdullah — Designer × Developer",
  "I turn ideas into intuitive interfaces and powerful products that make an impact.",
);

export const viewport: Viewport = {
  themeColor: "#fcf9f4",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${instrument.variable} ${bricolage.variable}`}>
      <body>
        <a className="skipLink" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
