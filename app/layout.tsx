import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Convert to SSI",
  description: "Import dive logs from your device and upload to SSI app via QR code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
