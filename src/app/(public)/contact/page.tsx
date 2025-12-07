import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact Us - Salina ERP",
  description:
    "Get in touch with the Salina ERP team. We'd love to hear from you.",
  openGraph: {
    title: "Contact Us - Salina ERP",
    description: "Get in touch with the Salina ERP team.",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Have questions about Salina ERP? We&apos;d love to hear from you.
            Send us a message and we&apos;ll respond as soon as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Send us a message
            </h2>
            <ContactForm />
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Contact Information
            </h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Email</h3>
                  <p className="text-muted-foreground">
                    <a
                      href="mailto:hello@salina.media"
                      className="hover:text-primary transition-colors"
                    >
                      hello@salina.media
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    For general inquiries
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Support</h3>
                  <p className="text-muted-foreground">
                    <a
                      href="mailto:support@salina.media"
                      className="hover:text-primary transition-colors"
                    >
                      support@salina.media
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    For existing customers
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Phone</h3>
                  <p className="text-muted-foreground">+1 (555) 123-4567</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mon-Fri, 9am-5pm EST
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Office</h3>
                  <p className="text-muted-foreground">
                    123 Publishing Way
                    <br />
                    Salina, KS 67401
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-muted rounded-lg">
              <h3 className="font-medium text-foreground mb-2">
                Looking for support?
              </h3>
              <p className="text-sm text-muted-foreground">
                If you&apos;re an existing customer, please use your dashboard
                to submit a support ticket or email us at{" "}
                <a
                  href="mailto:support@salina.media"
                  className="text-primary hover:underline"
                >
                  support@salina.media
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
