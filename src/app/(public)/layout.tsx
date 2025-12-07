import { PublicNav } from "@/components/marketing/public-nav";
import { Footer } from "@/components/marketing/footer";

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
