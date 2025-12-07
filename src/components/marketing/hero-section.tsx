import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Publishing ERP Built for{" "}
            <span className="text-primary">Publishers</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Streamline your publishing operations with tiered royalty
            calculations, ISBN management, author portals, and comprehensive
            financial reporting—all in one platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>

        {/* Hero illustration placeholder */}
        <div className="mt-16 flex justify-center">
          <div className="relative w-full max-w-4xl aspect-video rounded-xl bg-muted border shadow-2xl overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-muted-foreground">
                  Your publishing dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
