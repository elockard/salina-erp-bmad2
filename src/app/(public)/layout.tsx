import { Footer } from "@/components/marketing/footer";
import { PublicNav } from "@/components/marketing/public-nav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
