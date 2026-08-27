'use client';

import React, { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("billing_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("billing_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <div className="min-h-screen flex flex-col md:flex-row">
          <Sidebar isCollapsed={isCollapsed} />
          <div className="flex-1 flex flex-col min-w-0">
            <Header isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
