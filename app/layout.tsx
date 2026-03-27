import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Garmin to SSI Converter",
  description:
    "Convert Garmin .fit dive logs to SSI-ready QR code payloads. Upload one or multiple logs and generate data for SSI app import.",
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
      </body>
    </html>
  );
}
