const steps = [
  {
    number: "1",
    title: "Sign Up & Configure",
    description:
      "Create your account, set up your tenant, and configure your royalty periods and ISBN prefixes.",
  },
  {
    number: "2",
    title: "Add Your Catalog",
    description:
      "Import your authors, titles, and ISBN pool. Set up contracts with tiered royalty rates.",
  },
  {
    number: "3",
    title: "Track Sales & Returns",
    description:
      "Record sales transactions and manage returns with approval workflows for accurate reporting.",
  },
  {
    number: "4",
    title: "Generate Statements",
    description:
      "Create professional PDF statements, email them to authors, and track your royalty liabilities.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Get started in minutes and streamline your publishing operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-border" />
              )}

              <div className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4 z-10">
                  {step.number}
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
