import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  PublicNav,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  Footer,
} from "@/components/marketing";

export const metadata: Metadata = {
  title: "Salina ERP - Publishing ERP Built for Publishers",
  description:
    "Streamline your publishing operations with tiered royalty calculations, ISBN management, author portals, and financial reporting.",
  openGraph: {
    title: "Salina ERP - Publishing ERP Built for Publishers",
    description: "The complete ERP solution for modern publishers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Salina ERP - Publishing ERP Built for Publishers",
  },
};

export default async function Home() {
  // Check if user is authenticated - redirect to dashboard if so
  const user = await currentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}
