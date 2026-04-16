import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WIPcoin",
  description: "Trade and stake $WIP on Base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
