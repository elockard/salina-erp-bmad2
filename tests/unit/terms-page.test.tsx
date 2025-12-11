import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsOfServicePage from "@/app/(public)/terms/page";

describe("TermsOfServicePage", () => {
  it("renders the terms of service heading", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /terms of service/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders Agreement to Terms section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /agreement to terms/i }),
    ).toBeInTheDocument();
  });

  it("renders Use of Service section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /use of service/i }),
    ).toBeInTheDocument();
  });

  it("renders Subscription Terms section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /subscription terms/i }),
    ).toBeInTheDocument();
  });

  it("renders Acceptable Use Policy section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /acceptable use policy/i }),
    ).toBeInTheDocument();
  });

  it("renders Intellectual Property section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /intellectual property/i }),
    ).toBeInTheDocument();
  });

  it("renders Limitation of Liability section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /limitation of liability/i }),
    ).toBeInTheDocument();
  });

  it("renders Termination section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /termination/i }),
    ).toBeInTheDocument();
  });

  it("renders Changes to Terms section", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /changes to terms/i }),
    ).toBeInTheDocument();
  });

  it("renders Contact Information section with legal email", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByRole("heading", { name: /contact information/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/legal@salina.media/i)).toBeInTheDocument();
  });

  it("includes legal disclaimer note", () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getByText(/should be reviewed by legal counsel/i),
    ).toBeInTheDocument();
  });

  it("shows last updated date", () => {
    render(<TermsOfServicePage />);
    expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
  });

  it("lists subscription billing information", () => {
    render(<TermsOfServicePage />);
    const billingElements = screen.getAllByText(/billing/i);
    expect(billingElements.length).toBeGreaterThan(0);
    const renewalElements = screen.getAllByText(/renewal/i);
    expect(renewalElements.length).toBeGreaterThan(0);
    const cancellationElements = screen.getAllByText(/cancellation/i);
    expect(cancellationElements.length).toBeGreaterThan(0);
  });
});
