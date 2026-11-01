import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileTopNavbar from "@/components/layout/MobileTopNavbar";
import MobileBottomNavbar from "@/components/layout/MobileBottomNavbar";
import Hero from "@/components/layout/Hero";
import PhoneFloatingButton from "@/components/phoneicone";
export default async function ShopLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  return (
    <>
      <Navbar />

      <MobileTopNavbar />

      <Hero />

      <main>{children}</main>
<PhoneFloatingButton locale={locale} />
      <WhatsAppFloatingButton locale={locale} />

      <MobileBottomNavbar />

      <Footer />
    </>
  );
}