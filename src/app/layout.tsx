import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexi Follow-up",
  description: "Sistema de prospecção comercial — Tendência Energia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
