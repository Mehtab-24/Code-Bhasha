import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeBhasha - Syntax is a barrier; Logic is universal",
  description: "Mobile-first coding environment for Indian students. Code in Hinglish, execute Python instantly.",
  keywords: ["coding", "python", "hinglish", "indian students", "programming", "education"],
  authors: [{ name: "CodeBhasha Team" }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,

  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jakartaSans.variable} ${jetbrainsMono.variable} antialiased min-h-screen font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
