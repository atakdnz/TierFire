import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TierFire - Beautiful Tier Lists",
  description: "Create and share beautiful tier lists with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${inter.variable} min-h-full flex flex-col bg-[#0f0f0f] text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
