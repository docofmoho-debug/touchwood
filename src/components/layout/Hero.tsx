
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Autoplay } from "swiper/modules";
import {
  Swiper,
  SwiperSlide,
} from "swiper/react";

import "swiper/css";
import styles from "./Hero.module.css";

export default function Hero() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] === "en" ? "en" : "ar";

  const categories = [
    {
      id: "computer-desks",
      name:
        locale === "ar"
          ? "مكاتب وطاولات كمبيوتر"
          : "Computer Tables",
      image: "https://images.touchwoodfurniture.online/products/gallery/5f86001b-4135-4fb7-9d2c-3b614111b7eb.jpg",
    },
    {
      id: "chairs",
      name: locale === "ar" ? "كراسي" : "Chairs",
      image:
        "https://images.touchwoodfurniture.online/products/gallery/c23c65df-d8a5-49f2-a156-b0aa8d4c90e8.jpg",
    },
    {
      id: "office-sofas",
      name:
        locale === "ar"
          ? "انتريهات مكتبية"
          : "Office Seating Sets",
      image: "https://images.touchwoodfurniture.online/products/gallery/283b4063-8268-4691-9305-ac00c65c22d8.jpg",
    },
    {
      id: "work-cells",
      name:
        locale === "ar"
          ? "خلايا العمل"
          : "Working Stations",
      image: "https://images.touchwoodfurniture.online/products/gallery/6d1cbf85-8176-45a8-8b40-acf06495862d.jpg",
    },
    {
      id: "reception-counters",
      name:
        locale === "ar"
          ? "كاونتر استقبال"
          : "Reception Desks",
      image: "https://images.touchwoodfurniture.online/products/gallery/8a2d290d-5a7b-476f-9475-2cbee46b22f5.jpg",
    },
    {
      id: "meeting-tables",
      name:
        locale === "ar"
          ? "ترابيزات اجتماعات"
          : "Meeting Tables",
      image: "https://images.touchwoodfurniture.online/products/gallery/179ccee6-4729-42ec-a26d-5c653b2176c9.jpg",
    },
    {
      id: "office-accessories",
      name:
        locale === "ar"
          ? "إكسسوارات الأثاث المكتبي"
          : "Office Furniture Accessories",
      image: "https://images.touchwoodfurniture.online/products/gallery/07d18381-3a42-4743-bbb7-9d536fb9b521.jpg",
    },
  ];

  const getShopUrl = (categoryId: string) => {
    return `/${locale}/shop?category=${encodeURIComponent(
      categoryId,
    )}`;
  };

  const handleCategoryClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    categoryId: string,
  ) => {
    event.preventDefault();

    const url = getShopUrl(categoryId);

    // الانتقال المباشر للرابط مع إعادة تحميل الصفحة.
    // يعمل بنفس الطريقة في الكمبيوتر والهاتف.
    window.location.assign(url);
  };

  return (
    <section className={styles.hero}>
      {/* نسخة الكمبيوتر */}
      <div className={styles.desktopCategories}>
        {categories.map((category) => (
          <Link prefetch={false}
            key={category.id}
            href={getShopUrl(category.id)}
            className={styles.category}
            onClick={(event) =>
              handleCategoryClick(event, category.id)
            }
          >
            <div className={styles.imageWrapper}>
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
              />
            </div>

            <span>{category.name}</span>
          </Link>
        ))}
      </div>

      {/* نسخة الهاتف */}
      <div className={styles.mobileCategories}>
        <Swiper
          modules={[Autoplay]}
          loop={false}
          freeMode={false}
          allowTouchMove
          slidesPerView={3.5}
          spaceBetween={16}
          speed={2500}
          autoplay={{
            
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
          }}
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          {categories.map((category) => (
            <SwiperSlide key={category.id}>
              <Link prefetch={false}
                href={getShopUrl(category.id)}
                className={styles.category}
                onClick={(event) =>
                  handleCategoryClick(
                    event,
                    category.id,
                  )
                }
              >
                <div className={styles.imageWrapper}>
                  <img
                    src={category.image}
                    alt={category.name}
                    loading="lazy"
                  />
                </div>

                <span>{category.name}</span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}