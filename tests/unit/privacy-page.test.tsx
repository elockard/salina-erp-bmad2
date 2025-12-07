import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "@/app/(public)/privacy/page";

describe("PrivacyPolicyPage", () => {
  it("renders the privacy policy heading", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /privacy policy/i, level: 1 })
    ).toBeInTheDocument();
  });

  it("renders Information We Collect section", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /information we collect/i })
    ).toBeInTheDocument();
  });

  it("renders How We Use Your Information section", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /how we use your information/i })
    ).toBeInTheDocument();
  });

  it("renders Cookies and Tracking section", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /cookies and tracking/i })
    ).toBeInTheDocument();
  });

  it("renders Data Security section", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /data security/i })
    ).toBeInTheDocument();
  });

  it("renders Your Rights section", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /your rights/i })
    ).toBeInTheDocument();
  });

  it("renders Contact Us section with privacy email", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /contact us/i })
    ).toBeInTheDocument();
    const privacyEmails = screen.getAllByText(/privacy@salina.media/i);
    expect(privacyEmails.length).toBeGreaterThan(0);
  });

  it("includes legal disclaimer note", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText(/should be reviewed by legal counsel/i)
    ).toBeInTheDocument();
  });

  it("shows last updated date", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });
});
