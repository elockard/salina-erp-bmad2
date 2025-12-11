import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeaturesSection } from "@/components/marketing/features-section";
import { Footer } from "@/components/marketing/footer";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { PublicNav } from "@/components/marketing/public-nav";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("HeroSection", () => {
  it("renders headline", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Publishing ERP Built for/i,
    );
  });

  it("renders CTA button with correct href", () => {
    render(<HeroSection />);
    const ctaLink = screen.getByRole("link", { name: /get started/i });
    expect(ctaLink).toHaveAttribute("href", "/sign-up");
  });

  it("renders subheadline with value proposition", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/tiered royalty calculations/i),
    ).toBeInTheDocument();
  });
});

describe("FeaturesSection", () => {
  it("renders 6 feature cards", () => {
    render(<FeaturesSection />);
    expect(
      screen.getByText(/Tiered Royalty Calculations/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ISBN Pool Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Author Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial Reporting/i)).toBeInTheDocument();
    expect(screen.getByText(/Multi-tenant SaaS/i)).toBeInTheDocument();
    expect(screen.getByText(/Returns Workflow/i)).toBeInTheDocument();
  });

  it("has features section id for anchor navigation", () => {
    const { container } = render(<FeaturesSection />);
    expect(container.querySelector("#features")).toBeInTheDocument();
  });
});

describe("PublicNav", () => {
  it("renders logo linking to home", () => {
    render(<PublicNav />);
    const logo = screen.getByRole("link", { name: /salina erp/i });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders login link with correct href", () => {
    render(<PublicNav />);
    const loginLink = screen.getByRole("link", { name: /login/i });
    expect(loginLink).toHaveAttribute("href", "/sign-in");
  });

  it("renders get started link with correct href", () => {
    render(<PublicNav />);
    const ctaLink = screen.getByRole("link", { name: /get started/i });
    expect(ctaLink).toHaveAttribute("href", "/sign-up");
  });

  it("renders features anchor link", () => {
    render(<PublicNav />);
    expect(screen.getByRole("link", { name: /features/i })).toHaveAttribute(
      "href",
      "/#features",
    );
  });

  it("renders pricing anchor link", () => {
    render(<PublicNav />);
    expect(screen.getByRole("link", { name: /pricing/i })).toHaveAttribute(
      "href",
      "/#pricing",
    );
  });
});

describe("PricingSection", () => {
  it("has pricing section id for anchor navigation", () => {
    const { container } = render(<PricingSection />);
    expect(container.querySelector("#pricing")).toBeInTheDocument();
  });

  it("renders three pricing tiers", () => {
    render(<PricingSection />);
    expect(screen.getByText(/Starter/i)).toBeInTheDocument();
    expect(screen.getByText(/Professional/i)).toBeInTheDocument();
    expect(screen.getByText(/Enterprise/i)).toBeInTheDocument();
  });

  it("displays prices for tiers", () => {
    render(<PricingSection />);
    expect(screen.getByText(/\$99/)).toBeInTheDocument();
    expect(screen.getByText(/\$249/)).toBeInTheDocument();
    // Use getAllByText since "Custom" appears in both price and feature list
    expect(screen.getAllByText(/Custom/).length).toBeGreaterThan(0);
  });

  it("renders CTA buttons linking to sign-up", () => {
    render(<PricingSection />);
    const signUpLinks = screen.getAllByRole("link", {
      name: /start free trial|contact sales/i,
    });
    expect(signUpLinks.length).toBeGreaterThan(0);
    signUpLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/sign-up");
    });
  });
});

describe("HowItWorksSection", () => {
  it("renders step numbers", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders step titles", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/Sign Up & Configure/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Your Catalog/i)).toBeInTheDocument();
    expect(screen.getByText(/Track Sales & Returns/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate Statements/i)).toBeInTheDocument();
  });
});

describe("TestimonialsSection", () => {
  it("renders testimonial quotes", () => {
    render(<TestimonialsSection />);
    expect(
      screen.getByText(/Salina ERP transformed how we manage/i),
    ).toBeInTheDocument();
  });

  it("renders testimonial authors", () => {
    render(<TestimonialsSection />);
    expect(screen.getByText(/Sarah Johnson/i)).toBeInTheDocument();
    expect(screen.getByText(/Michael Chen/i)).toBeInTheDocument();
    expect(screen.getByText(/Emily Rodriguez/i)).toBeInTheDocument();
  });

  it("renders trust badge", () => {
    render(<TestimonialsSection />);
    // Multiple elements contain "Trusted by" - title and badge
    const trustedElements = screen.getAllByText(/Trusted by/i);
    expect(trustedElements.length).toBeGreaterThan(0);
  });
});

describe("Footer", () => {
  it("has contact section id for anchor navigation", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("#contact")).toBeInTheDocument();
  });

  it("renders copyright with current year", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });

  it("renders privacy policy link", () => {
    render(<Footer />);
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  it("renders terms of service link", () => {
    render(<Footer />);
    const termsLink = screen.getByRole("link", { name: /terms of service/i });
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("renders contact email", () => {
    render(<Footer />);
    expect(screen.getByText(/hello@salina.media/i)).toBeInTheDocument();
  });
});
