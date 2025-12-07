import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Salina ERP",
  description:
    "Learn how Salina ERP collects, uses, and protects your personal information.",
  openGraph: {
    title: "Privacy Policy - Salina ERP",
    description: "Learn how Salina ERP protects your personal information.",
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: December 2024
          </p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Information We Collect
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We collect information you provide directly to us, such as when
              you create an account, use our services, or contact us for
              support. This may include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>
                Account information (name, email address, company name, password)
              </li>
              <li>
                Billing information (payment method, billing address)
              </li>
              <li>
                Business data you input into the platform (authors, titles,
                contracts, sales data)
              </li>
              <li>
                Communications with our support team
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              How We Use Your Information
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>
                Send technical notices, updates, security alerts, and support
                messages
              </li>
              <li>
                Respond to your comments, questions, and customer service
                requests
              </li>
              <li>
                Monitor and analyze trends, usage, and activities in connection
                with our services
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Cookies and Tracking
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We use cookies and similar tracking technologies to collect
              information about your browsing activities on our platform. This
              includes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>
                <strong>Essential cookies:</strong> Required for the platform to
                function properly, including authentication and session
                management
              </li>
              <li>
                <strong>Analytics cookies:</strong> Help us understand how
                visitors interact with our website
              </li>
              <li>
                <strong>Preference cookies:</strong> Remember your settings and
                preferences
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We take reasonable measures to help protect your personal
              information from loss, theft, misuse, and unauthorized access. Our
              security measures include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure data centers with physical security measures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Your Rights
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Depending on your location, you may have certain rights regarding
              your personal information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your personal data</li>
              <li>Data portability</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise any of these rights, please contact us at{" "}
              <a
                href="mailto:privacy@salina.media"
                className="text-primary hover:underline"
              >
                privacy@salina.media
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              If you have any questions about this Privacy Policy or our privacy
              practices, please contact us at:
            </p>
            <div className="mt-4 p-6 bg-muted rounded-lg">
              <p className="text-foreground font-medium">Salina ERP</p>
              <p className="text-muted-foreground">
                Email:{" "}
                <a
                  href="mailto:privacy@salina.media"
                  className="text-primary hover:underline"
                >
                  privacy@salina.media
                </a>
              </p>
              <p className="text-muted-foreground">
                Address: 123 Publishing Way, Salina, KS 67401
              </p>
            </div>
          </section>

          <section className="border-t pt-8">
            <p className="text-sm text-muted-foreground italic">
              Note: This privacy policy is a template and should be reviewed by
              legal counsel before production deployment.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
