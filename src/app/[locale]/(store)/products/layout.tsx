import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileTopNavbar from "@/components/layout/MobileTopNavbar";
import MobileBottomNavbar from "@/components/layout/MobileBottomNavbar";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import PhoneFloatingButton from "@/components/phoneicone";
export default async function ProductsLayout({
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

      <main>{children}</main>
<PhoneFloatingButton locale={locale} />
      <WhatsAppFloatingButton locale={locale} />

      <MobileBottomNavbar />

      <Footer />
    </>
  );
}