"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";
import {
  FiArrowUpLeft,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import styles from "./Footer.module.css";

export default function Footer() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] === "en" ? "en" : "ar";

  const isArabic = locale === "ar";

  const productCategories = [
    {
      label: isArabic ? "مكاتب وطاولات كمبيوتر" : "Computer Tables",
      href: `/${locale}/shop?category=computer-desks`,
    },
    {
      label: isArabic ? "كراسي" : "Chairs",
      href: `/${locale}/shop?category=chairs`,
    },
    {
      label: isArabic ? "انتريهات مكتبية" : "Office Seating Sets",
      href: `/${locale}/shop?category=office-sofas`,
    },
    {
      label: isArabic ? "خلايا العمل" : "Working Stations",
      href: `/${locale}/shop?category=work-cells`,
    },
    {
      label: isArabic ? "كاونتر استقبال" : "Reception Desks",
      href: `/${locale}/shop?category=reception-counters`,
    },
    {
      label: isArabic ? "ترابيزات اجتماعات" : "Meeting Tables",
      href: `/${locale}/shop?category=meeting-tables`,
    },
    {
      label:
        isArabic
          ? "اكسسوارات الأثاث المكتبي"
          : "Office Furniture Accessories",
      href: `/${locale}/shop?category=office-accessories`,
    },
  ];

  const quickLinks = [
    {
      label: isArabic ? "من نحن" : "About Us",
      href: `/${locale}/about`,
    },
    {
      label: isArabic ? "تواصل معنا" : "Contact Us",
      href: `https://wa.me/201142447767`,
    },
    {
      label: isArabic ? "الشحن والتوصيل" : "Shipping & Delivery",
      href: `/${locale}/shipping`,
    },
    {
      label: isArabic ? "الضمان" : "Warranty",
      href: `/${locale}/warranty`,
    },
    {
      label: isArabic ? "مراجعات العملاء" : "Customer Reviews",
      href: `/${locale}/reviews`,
    },
  ];

  const socialLinks = [
    {
      name: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61566761378486",
      icon: <FaFacebookF />,
    },
    {
      name: "Instagram",
      href: "https://instagram.com",
      icon: <FaInstagram />,
    },
    {
      name: "YouTube",
      href: "https://youtube.com",
      icon: <FaYoutube />,
    },
    {
      name: "WhatsApp",
      href: "https://wa.me/201142447767",
      icon: <FaWhatsapp />,
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.mainFooter}>
        <div className={styles.container}>
          <div className={styles.brandColumn}>
            <Link prefetch={false}
              href={`/${locale}`}
              className={styles.brandLogo}
            >
              <Image
                src="/logo/logo.jpeg"
                alt={isArabic ? "تاتش وود" : "Touch Wood"}
                width={180}
                height={68}
              />

              <span className={styles.companyName}>
                {isArabic ? "تاتش وود للاُثاث المكتبي" : "Touch Wood Furniture"}
              </span>
            </Link>

            <p className={styles.description}>
              {isArabic
?        "تصاميم للإنتاجية ومتانة تدوم. في تاتش وود، نوفر حلول الأثاث المكتبي بأعلى معايير الراحة والجودة. اختر ما تستحقه... وابدأ مستقبلك اليوم."        : 
"Designs built for productivity and lasting durability. At Touch Wood, we provide office furniture solutions that meet the highest standards of comfort and quality. Choose what you deserve—and start your future today."}
            </p>

            <div className={styles.contactInfo}>
              <a href="tel:+201142447767" className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <FiPhone />
                </span>
                <span dir="ltr">01142447767</span>
              </a>

              <a
                href="Touchwoodfurniture@gmail.com"
                className={styles.contactItem}
              >
                <span className={styles.contactIcon}>
                  <FiMail />
                </span>
                <span>Touchwoodfurniture@gmail.com</span>
              </a>

              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <FiMapPin />
                </span>
                <span>
                  {isArabic
                    ? "بجوار قسم و مرور الأميرية -الاميرية- القاهرة, مصر"
                    : "Next to the Al-Amiriya Police Station and Traffic Department — Al-Amiriya, Cairo"}
                </span>
                
              </div>
            </div>

            <div className={styles.socialLinks}>
              {socialLinks.map((social) => (
                <a 
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.linksColumn}>
            <h3>
              {isArabic
                ? "أقسام المنتجات"
                : "Product Categories"}
            </h3>

            <div className={styles.linksList}>
              {productCategories.map((category) => (
                <a
                  key={category.href}
                  href={category.href}
                  className={styles.footerLink}
                >
                  <span>{category.label}</span>
                  <FiArrowUpLeft />
                </a>
              ))}
            </div>
          </div>

          <div className={styles.linksColumn}>
            <h3>
              {isArabic ? "روابط سريعة" : "Quick Links"}
            </h3>

            <div className={styles.linksList}>
              {quickLinks.map((link) => (
                <Link prefetch={false}
                  key={link.href}
                  href={link.href}
                  className={styles.footerLink}
                >
                  <span>{link.label}</span>
                  <FiArrowUpLeft />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.hololSection}>
  <div className={styles.hololGlow} />

  <div className={styles.hololContent}>
    <span className={styles.hololText}>
      {isArabic
        ? `جميع الحقوق محفوظة لشركة تاتش وود ${new Date().getFullYear()} ©`
        : `© All rights reserved to Touchwood Company ${new Date().getFullYear()} `}
    </span>

    <div className={styles.hololDivider} />

    <div className={styles.hololCredit}>
      <span className={styles.hololText}>
        {isArabic
          ? "تم التصميم والتطوير بواسطة"
          : "Designed & Developed by" }
      </span>

      <Link prefetch={false}
        href="https://wa.me/201018059131"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.hololLogo}
        aria-label={isArabic ? "زيارة حلول" : "Visit Holol"}
      >
        <Image 

          src="/logo/holol.png"
          alt="حلول"
          width={150}
          height={55}
        />
      </Link>
    </div>
  </div>
</div>
    </footer>
  );
}