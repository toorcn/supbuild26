import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forebrief",
  description: "Memory and meeting companion for startup founders"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
