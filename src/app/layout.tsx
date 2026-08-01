import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Vibe Code & AI Command Center Web UI",
  description: "Web-based Vibe Code, Content AI, and VPS Management Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}
