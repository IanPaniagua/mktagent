import type { Metadata } from "next";
import { Geist, DM_Serif_Display, DM_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "MKTAGENT — AI Marketing Intelligence",
  description: "Feed it your landing page, your repo, your docs. Get back a complete marketing strategy in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${dmSerifDisplay.variable} ${dmMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-geist), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
