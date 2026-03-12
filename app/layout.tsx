// app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Envirocab | Administrative",
  description: "Secure access for Master Admins, Staff, and Users.",
  icons: {
    icon: "/images/removebglogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        {children}
        {/* Sonner toast container — available app-wide */}
        <Toaster position="top-center" richColors expand={false} />
      </body>
    </html>
  );
}