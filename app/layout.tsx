import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Garmin to SSI Converter",
  description:
    "Convert Garmin .fit files into SSI App QR codes. Auto-import dive details and reduce the need for manual entry.",
  keywords: [
    "garmin to ssi",
    "garmin ssi converter",
    "garmin fit to ssi",
    "ssi dive log qr",
    "fit file to ssi",
    "dive log converter",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
