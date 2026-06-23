import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Outfit } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Juce",
  description: "Say it. Start a room. Leave a snippet.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
