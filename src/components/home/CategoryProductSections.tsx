
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import ProductCard from "@/components/products/ProductCard";
import { getProducts } from "@/services/api";
import type { Product } from "@/types/product";

import styles from "./CategoryProductSections.module.css";

type CategoryConfig = {
  slug: string;
  ar: string;
  en: string;
};

const categoryConfigs: CategoryConfig[] = [
  {
    slug: "chairs",
    ar: "الكراسي",
    en: "Chairs",
  },
  {
    slug: "office-sofas",
    ar: "الانتريهات",
    en: "Office Sofas",
  },
  {
    slug: "computer-desks",
    ar: "المكاتب وطاولات الكمبيوتر",
    en: "Computer Desks",
  },
];

function normalizeProducts(response: unknown): Product[] {
  if (Array.isArray(response)) {
    return response as Product[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const data = response as {
    products?: unknown;
    data?: unknown;
  };

  if (Array.isArray(data.products)) {
    return data.products as Product[];
  }

  if (
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data)
  ) {
    const nestedData = data.data as {
      products?: unknown;
    };

    if (Array.isArray(nestedData.products)) {
      return nestedData.products as Product[];
    }
  }

  if (Array.isArray(data.data)) {
    return data.data as Product[];
  }

  return [];
}

function getProductName(
  name: Product["name"],
  locale: "ar" | "en",
): string {
  if (typeof name === "string") {
    return name;
  }

  if (!name || typeof name !== "object") {
    return "";
  }

  return name[locale] || name.ar || name.en || "";
}

function isChairProduct(product: Product): boolean {
  const nameAr = getProductName(product.name, "ar");
  const nameEn = getProductName(product.name, "en");

  return (
    /كرسي|كراسي/i.test(nameAr) ||
    /\bchairs?\b/i.test(nameEn)
  );
}

export default function CategoryProductSections() {
  const params = useParams();

  const locale =
    typeof params?.locale === "string" ? params.locale : "en";

  const isArabic = locale === "ar";

  const [productsByCategory, setProductsByCategory] = useState<
    Record<string, Product[]>
  >({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => categoryConfigs, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        const results = await Promise.all(
          categories.map(async (category) => {
            let products: Product[] = [];

            if (category.slug === "chairs") {
              // جلب المنتجات دون تقييدها بكاتيجوري الكراسي.
              // إذا كان الـ API يدعم البحث بالاسم، فالأفضل
              // استخدامه أو جلب الصفحات بالتتابع.
              const response = await getProducts({
                active: true,
                limit: 1000,
                page: 1,
              });

              products = normalizeProducts(response)
                .filter(isChairProduct)
                .slice(0, 7);
            } else {
              const response = await getProducts({
                category: category.slug,
                active: true,
                limit: 7,
                page: 1,
              });

              products = normalizeProducts(response).slice(0, 7);
            }

            return {
              category: category.slug,
              products,
            };
          }),
        );

        if (!isMounted) {
          return;
        }

        const groupedProducts: Record<string, Product[]> = {};

        results.forEach((result) => {
          groupedProducts[result.category] = result.products;
        });

        setProductsByCategory(groupedProducts);
      } catch (err) {
        console.error("Failed to load homepage products:", err);

        if (isMounted) {
          setError(
            isArabic
              ? "حدث خطأ أثناء تحميل المنتجات"
              : "An error occurred while loading products",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [categories, isArabic]);

  if (loading) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.statusMessage}>
          {isArabic
            ? "جاري تحميل المنتجات..."
            : "Loading products..."}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.statusMessage}>{error}</div>
      </section>
    );
  }

  return (
    <section
      className={styles.wrapper}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {categories.map((category) => {
        const products =
          productsByCategory[category.slug] || [];

        if (products.length === 0) {
          return null;
        }

        const categoryTitle = isArabic
          ? category.ar
          : category.en;

        const shopUrl =
          `/${locale}/shop?category=${encodeURIComponent(
            category.slug,
          )}`;

        return (
          <section
            className={styles.categorySection}
            key={category.slug}
          >
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                {categoryTitle}
              </h2>

              <Link
                prefetch={false}
                href={shopUrl}
                className={styles.viewAllLink}
              >
                {isArabic ? "عرض الكل" : "View all"}
              </Link>
            </div>

            <div className={styles.productsGrid}>
              {products.map((product, index) => (
                <ProductCard
                  key={
                    product._id ||
                    product.slug ||
                    `${category.slug}-${index}`
                  }
                  product={product}
                />
              ))}

              <Link
                prefetch={false}
                href={shopUrl}
                className={styles.moreCard}
              >
                <span className={styles.moreCardArrow}>
                  {isArabic ? "←" : "→"}
                </span>

                <span className={styles.moreCardText}>
                  {isArabic
                    ? `عرض كل ${category.ar}`
                    : `View all ${category.en}`}
                </span>
              </Link>
            </div>
          </section>
        );
      })}
    </section>
  );
}
