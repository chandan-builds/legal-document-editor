import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legal Document Editor — Collaborative Contract Platform",
  description: "A collaborative legal document editor for client-vendor contract negotiation with audit trails and mutual clause approval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientErrorBoundary>
          {children}
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
