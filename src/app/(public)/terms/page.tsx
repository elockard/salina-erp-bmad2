import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Salina ERP",
  description:
    "Read the terms and conditions for using the Salina ERP platform.",
  openGraph: {
    title: "Terms of Service - Salina ERP",
    description: "Terms and conditions for using Salina ERP.",
    type: "website",
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: December 2024
          </p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Agreement to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              By accessing or using Salina ERP (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service. If you do not agree
              to these terms, you may not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Use of Service
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Salina ERP provides a cloud-based enterprise resource planning
              platform designed for small to medium publishing companies. The
              Service includes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>Author and contact management</li>
              <li>Title catalog and ISBN tracking</li>
              <li>Royalty contract management and calculations</li>
              <li>Sales and returns processing</li>
              <li>Financial reporting and analytics</li>
              <li>Statement generation and delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Subscription Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Access to Salina ERP requires a paid subscription. By subscribing,
              you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>
                <strong>Billing:</strong> Pay the applicable subscription fees
                as described on our pricing page. Fees are billed in advance on
                a monthly or annual basis.
              </li>
              <li>
                <strong>Renewal:</strong> Subscriptions automatically renew
                unless cancelled before the renewal date.
              </li>
              <li>
                <strong>Cancellation:</strong> You may cancel your subscription
                at any time. Cancellation takes effect at the end of the current
                billing period.
              </li>
              <li>
                <strong>Refunds:</strong> Subscription fees are non-refundable,
                except as required by law.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Acceptable Use Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>
                Upload or transmit viruses, malware, or other malicious code
              </li>
              <li>
                Attempt to gain unauthorized access to the Service or other
                users&apos; accounts
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service
              </li>
              <li>Use the Service for any illegal or fraudulent purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Intellectual Property
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              The Service and its original content, features, and functionality
              are owned by Salina ERP and are protected by international
              copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You retain all rights to the data you input into the Service. By
              using the Service, you grant us a limited license to use this data
              solely to provide the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To the maximum extent permitted by law, Salina ERP shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, including without limitation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>Loss of profits, data, or business opportunities</li>
              <li>Service interruptions or downtime</li>
              <li>Errors or inaccuracies in the Service</li>
              <li>Third-party actions or content</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our total liability for any claims arising from these Terms or
              your use of the Service shall not exceed the amount you paid us in
              the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Termination
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We may terminate or suspend your account and access to the Service
              immediately, without prior notice or liability, for any reason,
              including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mt-4 space-y-2">
              <li>Breach of these Terms of Service</li>
              <li>Non-payment of subscription fees</li>
              <li>Violation of our Acceptable Use Policy</li>
              <li>At your request</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Upon termination, your right to use the Service will cease
              immediately. You may request export of your data within 30 days of
              termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Changes to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We reserve the right to modify these Terms at any time. We will
              notify you of any material changes by posting the new Terms on
              this page and updating the &quot;Last updated&quot; date. Your
              continued use of the Service after any changes constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Contact Information
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-4">
              If you have any questions about these Terms of Service, please
              contact us at:
            </p>
            <div className="mt-4 p-6 bg-muted rounded-lg">
              <p className="text-foreground font-medium">Salina ERP</p>
              <p className="text-muted-foreground">
                Email:{" "}
                <a
                  href="mailto:legal@salina.media"
                  className="text-primary hover:underline"
                >
                  legal@salina.media
                </a>
              </p>
              <p className="text-muted-foreground">
                Address: 123 Publishing Way, Salina, KS 67401
              </p>
            </div>
          </section>

          <section className="border-t pt-8">
            <p className="text-sm text-muted-foreground italic">
              Note: These terms of service are a template and should be reviewed
              by legal counsel before production deployment.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
