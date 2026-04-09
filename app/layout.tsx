import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Finance Tracker",
  description: "Personal finance manager — track accounts, transactions and budgets",
  metadataBase: new URL("http://localhost:3000"),
  applicationName: "Finance Tracker",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="https://progressier.app/rxG7c94SpMdFd7JOMC7C/progressier.json" />
        <script defer src="https://progressier.app/rxG7c94SpMdFd7JOMC7C/script.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
      >
        {/* Soft full-screen gradient + subtle texture via CSS in globals.css */}
        <div className="min-h-screen bg-app-gradient">
          {/* content container keeps UI readable on large screens */}
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
