import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small publishers getting started.",
    features: [
      "Up to 50 titles",
      "5 user accounts",
      "Quarterly statements",
      "Basic reporting",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: "$249",
    period: "/month",
    description: "For growing publishers with more complex needs.",
    features: [
      "Up to 200 titles",
      "15 user accounts",
      "Monthly statements",
      "All reports & exports",
      "Priority support",
      "Author portal",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large publishers with custom requirements.",
    features: [
      "Unlimited titles",
      "Unlimited users",
      "API access",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 lg:py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Choose the plan that fits your publishing needs. All plans include a
            14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative ${tier.popular ? "border-primary shadow-lg" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/sign-up">{tier.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
