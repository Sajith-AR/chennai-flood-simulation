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
  title: "Chennai Disaster Response & Flood Simulation Platform",
  description:
    "Interactive OpenStreetMap disaster simulation platform for Chennai flood response, evacuation routing, and supply chain logistics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="h-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
