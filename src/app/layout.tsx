import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Salina ERP",
  description: "Publishing ERP System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: "#1E3A5F", // Editorial Navy
          colorBackground: "#FFFFFF",
          fontSize: "16px",
          fontFamily: "Inter, sans-serif",
          borderRadius: "8px",
        },
        elements: {
          card: "shadow-lg",
          formButtonPrimary:
            "bg-[#1E3A5F] hover:bg-[#2E4A6F] transition-colors",
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
