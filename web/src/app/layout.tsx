'use client';

import React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { StoreSettingsProvider } from "@/context/StoreSettingsContext";
import { AuthGuard } from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <AuthProvider>
          <StoreSettingsProvider>
            <AuthGuard>{children}</AuthGuard>
          </StoreSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
