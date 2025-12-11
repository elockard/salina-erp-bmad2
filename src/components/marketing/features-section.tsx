import {
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  RotateCcw,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calculator,
    title: "Tiered Royalty Calculations",
    description:
      "Automatic tiered rate calculations with advance recoupment and complex contract support.",
  },
  {
    icon: BookOpen,
    title: "ISBN Pool Management",
    description:
      "Import, track, and assign ISBNs with ease. Never lose track of your ISBN inventory.",
  },
  {
    icon: Users,
    title: "Author Portal",
    description:
      "Self-service statement access for authors. Reduce support requests and improve author satisfaction.",
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    description:
      "Comprehensive sales, royalty liability, and revenue reports with export capabilities.",
  },
  {
    icon: Building2,
    title: "Multi-tenant SaaS",
    description:
      "Secure, isolated data for each publisher with role-based access control.",
  },
  {
    icon: RotateCcw,
    title: "Returns Workflow",
    description:
      "Structured approval process ensures accurate royalty calculations on returned items.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 lg:py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to Run Your Publishing Business
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            From author contracts to royalty statements, Salina ERP handles it
            all.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
