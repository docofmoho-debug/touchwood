import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "تاتش وود للأثاث المكتبي",
  description: "Touch Wood Furniture Store",
  icons: {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon.jpg", type: "image/jpeg"},
    { url: "/icon1.jpg", type: "image/jpeg" },
    { url: "/icon2.jpg", type: "image/jpeg" },
  ],
  apple: "/icon1.jpg",
}
  
};

export const viewport: Viewport = {
  themeColor: "#238A37",
  width: "device-width",
  initialScale: 1,
  
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}