import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/marketing/contact-form";

// Mock the server action
vi.mock("@/app/(public)/contact/actions", () => ({
  submitContactForm: vi.fn(),
}));

// Mock useActionState
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useActionState: vi.fn(() => [null, vi.fn(), false]),
  };
});

describe("ContactForm", () => {
  it("renders all required fields", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/^name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("renders optional company field", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ContactForm />);
    expect(
      screen.getByRole("button", { name: /send message/i })
    ).toBeInTheDocument();
  });

  it("shows character count for message field", () => {
    render(<ContactForm />);
    expect(screen.getByText(/0\/1000 characters/i)).toBeInTheDocument();
  });

  it("has honeypot field hidden from view", () => {
    render(<ContactForm />);
    const honeypot = screen.getByLabelText(/website/i);
    expect(honeypot.closest("div")).toHaveClass("hidden");
  });

  it("has proper accessibility attributes on required fields", () => {
    render(<ContactForm />);
    const nameInput = screen.getByLabelText(/^name \*/i);
    expect(nameInput).toHaveAttribute("aria-required", "true");

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute("aria-required", "true");

    const messageInput = screen.getByLabelText(/message/i);
    expect(messageInput).toHaveAttribute("aria-required", "true");
  });

  it("company field is marked as optional", () => {
    render(<ContactForm />);
    const companyLabel = screen.getByText(/company/i).closest("label");
    expect(companyLabel?.textContent).toContain("optional");
  });
});

describe("ContactForm success state", () => {
  it("shows success message when form submission succeeds", async () => {
    // Mock successful state
    const { useActionState } = await import("react");
    vi.mocked(useActionState).mockReturnValue([
      { success: true, message: "Thank you! We'll be in touch soon." },
      vi.fn(),
      false,
    ]);

    render(<ContactForm />);

    expect(
      screen.getByText(/thank you! we'll be in touch soon/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("ContactForm loading state", () => {
  it("shows Sending... text when form is pending", async () => {
    // Mock pending state
    const { useActionState } = await import("react");
    vi.mocked(useActionState).mockReturnValue([null, vi.fn(), true]);

    render(<ContactForm />);

    expect(
      screen.getByRole("button", { name: /sending.../i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("ContactForm character count", () => {
  it("has maxLength attribute on message field", () => {
    render(<ContactForm />);
    const messageInput = screen.getByLabelText(/message/i);
    expect(messageInput).toHaveAttribute("maxLength", "1000");
  });
});
