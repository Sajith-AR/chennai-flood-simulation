import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GCC IFM-ROP — Greater Chennai Corporation Disaster Response & Flood Management",
  description:
    "Integrated Flood Management & Emergency Response Portal (IFM-ROP) for Greater Chennai Corporation and TNSDMA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="h-full bg-[#05080f] text-slate-100 font-sans antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
