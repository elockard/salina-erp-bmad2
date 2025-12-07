import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "Salina ERP transformed how we manage author royalties. What used to take days now takes minutes.",
    author: "Sarah Johnson",
    role: "Operations Director",
    company: "Horizon Publishing",
  },
  {
    quote:
      "The author portal alone has reduced our support tickets by 60%. Authors love being able to access their statements anytime.",
    author: "Michael Chen",
    role: "CEO",
    company: "Pacific Coast Books",
  },
  {
    quote:
      "Finally, an ERP built for publishers by people who understand publishing. The tiered royalty system is exactly what we needed.",
    author: "Emily Rodriguez",
    role: "Finance Manager",
    company: "Sunrise Media Group",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by Publishers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See what our customers have to say about Salina ERP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <blockquote className="text-muted-foreground italic mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {testimonial.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Trusted by 100+ publishers worldwide
          </p>
          <div className="flex justify-center items-center space-x-8 opacity-50">
            <div className="w-24 h-8 bg-muted rounded" />
            <div className="w-24 h-8 bg-muted rounded" />
            <div className="w-24 h-8 bg-muted rounded" />
            <div className="w-24 h-8 bg-muted rounded" />
          </div>
        </div>
      </div>
    </section>
  );
}
