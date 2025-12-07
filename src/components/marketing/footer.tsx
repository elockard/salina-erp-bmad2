import Link from "next/link";

export function Footer() {
  return (
    <footer id="contact" className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-xl font-bold">
              Salina ERP
            </Link>
            <p className="mt-4 text-sm opacity-80 max-w-md">
              The complete publishing ERP solution. Manage authors, titles,
              royalties, and more in one integrated platform.
            </p>
            <p className="mt-4 text-sm opacity-80">
              Contact us:{" "}
              <a
                href="mailto:hello@salina.media"
                className="underline hover:opacity-100"
              >
                hello@salina.media
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <a href="/#features" className="hover:opacity-100">
                  Features
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:opacity-100">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/contact" className="hover:opacity-100">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:opacity-100">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:opacity-100">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <Link href="/privacy" className="hover:opacity-100">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:opacity-100">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <p className="text-sm text-center opacity-80">
            &copy; {new Date().getFullYear()} Salina ERP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
