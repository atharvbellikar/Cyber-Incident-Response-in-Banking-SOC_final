import type { Metadata } from "next";
import { Orbitron, JetBrains_Mono, Geist } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sentra SOC Console",
  description: "AI-powered SOC dashboard for incident detection and response",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", "h-full", "antialiased", orbitron.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full bg-background text-textPrimary font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
