
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

import "./SecondHero.css";

const heroImages = [
  "https://images.touchwoodfurniture.online/products/gallery/1ffdb85c-0e18-4eea-be56-d3fb32fb9176.jpg",
  "https://images.touchwoodfurniture.online/products/gallery/40041854-1a5e-4aba-846a-f8ed10c18743.jpg",
  "https://images.touchwoodfurniture.online/products/gallery/0e4e1dfa-fe46-478b-b8d4-09fae3b87ca1.jpg",
];

export default function SecondHero() {
  const params = useParams();

  const locale =
    typeof params?.locale === "string" ? params.locale : "en";

  return (
    <section className="secondHero">
      <div className="secondHeroContainer">
        <Swiper
          modules={[Autoplay, Pagination]}
          slidesPerView={1}
          spaceBetween={0}
          loop={true}
          speed={900}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
          }}
          className="secondHeroSwiper"
        >
          {heroImages.map((image, index) => (
            <SwiperSlide key={index}>
              <div className="secondHeroSlide">
                <Link prefetch={false}
                  href={`/${locale}/shop`}
                  className="secondHeroLink"
                  aria-label={
                    locale === "ar"
                      ? `انتقل إلى المتجر - الصورة ${index + 1}`
                      : `Go to shop - Image ${index + 1}`
                  }
                >
                  <img
                    src={image}
                    alt={`Touch Wood ${index + 1}`}
                    className="secondHeroImage"
                  />
                </Link>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}