"use client";

import { addToCart } from "@/lib/localStore";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  FiHeart,
  FiShoppingCart,
  FiShuffle,
  FiCheck,
  FiLoader,
} from "react-icons/fi";

import styles from "./ProductCard.module.css";

import type {
  Product,
  Localized,
} from "@/types/product";

type ProductCardProps = {
  product: Product;
};

const categories: Record<string, Localized> = {
  "computer-desks": {
    ar: "مكاتب وطاولات كمبيوتر",
    en: "Computer Desks",
  },

  chairs: {
    ar: "كراسي",
    en: "Chairs",
  },

  "leather-chairs": {
    ar: "كراسي جلد",
    en: "Leather Chairs",
  },

  "mesh-chairs": {
    ar: "كراسي شبك",
    en: "Mesh Chairs",
  },

  "bar-chairs": {
    ar: "كراسي بار",
    en: "Bar Chairs",
  },

  "laboratory-chairs": {
    ar: "كراسي معمل",
    en: "Laboratory Chairs",
  },

  "office-sofas": {
    ar: "انتريهات مكتبية",
    en: "Office Sofas",
  },

  "work-cells": {
    ar: "خلايا العمل",
    en: "Work Cells",
  },

  "reception-counters": {
    ar: "كاونتر استقبال",
    en: "Reception Counters",
  },

  "meeting-tables": {
    ar: "ترابيزات اجتماعات",
    en: "Meeting Tables",
  },

  "office-accessories": {
    ar: "إكسسوارات الأثاث المكتبي",
    en: "Office Accessories",
  },
};

const WISHLIST_KEY = "touchwood_wishlist";
const COMPARE_KEY = "touchwood_compare";

type MessageType =
  | "cart"
  | "favorite"
  | "compare"
  | "";

type LoadingAction = "cart" | "favorite" | "compare" | "";

function getStoredIds(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];
  } catch {
    return [];
  }
}

function saveStoredIds(
  key: string,
  ids: string[]
) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    key,
    JSON.stringify(ids)
  );

  window.dispatchEvent(
    new CustomEvent(
      "touchwood-local-list-change",
      {
        detail: {
          key,
          ids,
        },
      }
    )
  );
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const pathname = usePathname();

  const segments =
    pathname?.split("/").filter(Boolean) || [];

  const locale =
    segments[0] === "en" ? "en" : "ar";

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [isCompared, setIsCompared] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<MessageType>("");

  const [portalReady, setPortalReady] =
    useState(false);

  const [loadingAction, setLoadingAction] =
    useState<LoadingAction>("");

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setIsFavorite(
      getStoredIds(WISHLIST_KEY).includes(
        product._id
      )
    );

    setIsCompared(
      getStoredIds(COMPARE_KEY).includes(
        product._id
      )
    );

    const handleLocalListChange = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          key: string;
          ids: string[];
        }>;

      if (
        customEvent.detail?.key ===
        WISHLIST_KEY
      ) {
        setIsFavorite(
          customEvent.detail.ids.includes(
            product._id
          )
        );
      }

      if (
        customEvent.detail?.key ===
        COMPARE_KEY
      ) {
        setIsCompared(
          customEvent.detail.ids.includes(
            product._id
          )
        );
      }
    };

    window.addEventListener(
      "touchwood-local-list-change",
      handleLocalListChange
    );

    return () => {
      window.removeEventListener(
        "touchwood-local-list-change",
        handleLocalListChange
      );
    };
  }, [product._id]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  const productName =
    product.name?.[locale] ||
    product.name?.ar ||
    product.name?.en ||
    "منتج";

  const category =
    categories[product.category];

  const categoryName =
    category?.[locale] ||
    category?.ar ||
    product.category;

  const productHref =
    `/${locale}/products/${product.slug}`;

  const primaryImage = useMemo(() => {
    return (
      product.media?.find(
        (item) => item.isPrimary
      ) ||
      product.media?.find(
        (item) => item.type === "image"
      ) ||
      product.media?.[0]
    );
  }, [product.media]);

  const oldPrice =
    Number(product.oldPrice) || 0;

  const currentPrice =
    Number(product.price) || 0;

  const discount =
    oldPrice > currentPrice
      ? Math.round(
          ((oldPrice - currentPrice) /
            oldPrice) *
            100
        )
      : 0;

  const formattedPrice =
    currentPrice.toLocaleString(
      locale === "ar"
        ? "ar-EG"
        : "en-US"
    );

  const formattedOldPrice =
    oldPrice > currentPrice
      ? oldPrice.toLocaleString(
          locale === "ar"
            ? "ar-EG"
            : "en-US"
        )
      : null;

  const waitOneSecond = () =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1000);
    });

  const toggleWishlist = async () => {
    if (loadingAction) return;

    setLoadingAction("favorite");

    try {
      await waitOneSecond();

      const current = getStoredIds(WISHLIST_KEY);

      const next = current.includes(product._id)
        ? current.filter((id) => id !== product._id)
        : [...current, product._id];

      saveStoredIds(WISHLIST_KEY, next);

      const added = next.includes(product._id);

      setIsFavorite(added);
      setMessageType("favorite");
      setMessage(
        added
          ? locale === "ar"
            ? "تمت إضافة المنتج إلى المفضلة"
            : "Product added to wishlist"
          : locale === "ar"
            ? "تمت إزالة المنتج من المفضلة"
            : "Product removed from wishlist"
      );
    } finally {
      setLoadingAction("");
    }
  };

  const toggleCompare = async () => {
    if (loadingAction) return;

    setLoadingAction("compare");

    try {
      await waitOneSecond();

      const current = getStoredIds(COMPARE_KEY);

      if (current.includes(product._id)) {
        const next = current.filter((id) => id !== product._id);

        saveStoredIds(COMPARE_KEY, next);
        setIsCompared(false);
        setMessageType("compare");
        setMessage(
          locale === "ar"
            ? "تمت إزالة المنتج من المقارنة"
            : "Product removed from compare"
        );

        return;
      }

      if (current.length >= 4) {
        setIsCompared(false);
        setMessageType("compare");
        setMessage(
          locale === "ar"
            ? "يمكنك مقارنة 4 منتجات فقط"
            : "You can compare up to 4 products only"
        );

        return;
      }

      const next = [...current, product._id];

      saveStoredIds(COMPARE_KEY, next);
      setIsCompared(true);
      setMessageType("compare");
      setMessage(
        locale === "ar"
          ? "تمت إضافة المنتج إلى المقارنة"
          : "Product added to compare"
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleAddToCart = async () => {
    if (loadingAction) return;

    const productColors = Array.isArray(product.colors)
      ? product.colors
      : [];

    // إذا كان للمنتج أكثر من لون، انتقل إلى صفحة التفاصيل
    // حتى يختار العميل اللون بنفسه.
    if (productColors.length > 1) {
      window.location.assign(productHref);
      return;
    }

    // إذا كان له لون واحد، أضفه إلى السلة باللون الوحيد تلقائيًا.
    // إذا لم يكن له ألوان، أضفه دون لون.
    const onlyColor = productColors[0];
    let selectedColorId: string | null = null;

    if (onlyColor) {
      if (typeof onlyColor._id === "string" && onlyColor._id.trim()) {
        selectedColorId = onlyColor._id;
      } else {
        // يجب أن تتطابق هذه الصيغة مع getColorId في localStore.
        const colorValue =
          onlyColor.hex ||
          onlyColor.color ||
          onlyColor.value ||
          onlyColor.code ||
          "";

        selectedColorId = `${colorValue}-0`;
      }
    }

    setLoadingAction("cart");

    try {
      await waitOneSecond();

      addToCart(product, 1, selectedColorId);

      setMessageType("cart");
      setMessage(
        locale === "ar"
          ? "تمت إضافة المنتج إلى العربة"
          : "Product added to cart"
      );
    } finally {
      setLoadingAction("");
    }
  };

  const messagePortal =
    portalReady &&
    message &&
    typeof document !== "undefined"
      ? createPortal(
          <p
            className={`${styles.message} ${
              messageType === "cart"
                ? styles.messageCart
                : messageType ===
                    "favorite"
                  ? styles.messageFavorite
                  : styles.messageCompare
            }`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>,
          document.body
        )
      : null;

  return (
    <>
      {messagePortal}

      <article
        className={styles.card}
      >
        <div
          className={
            styles.imageContainer
          }
        >
          {discount > 0 && (
            <div
              className={
                styles.discountBadge
              }
            >
              {discount}%-
            </div>
          )}

          <div
            className={
              styles.topActions
            }
          >
            <button
              type="button"
              className={`${styles.actionButton} ${
                isFavorite
                  ? styles.actionActive
                  : ""
              }`}
              onClick={toggleWishlist}
              disabled={Boolean(loadingAction)}
              aria-label={
                locale === "ar"
                  ? "إضافة إلى المفضلة"
                  : "Add to wishlist"
              }
              aria-pressed={isFavorite}
            >
              {loadingAction === "favorite" ? (
                <FiLoader className={styles.spinner} />
              ) : (
                <FiHeart
                  className={
                    isFavorite
                      ? styles.filledIcon
                      : ""
                  }
                />
              )}
            </button>

            <button
              type="button"
              className={`${styles.actionButton} ${
                isCompared
                  ? styles.actionActive
                  : ""
              }`}
              onClick={toggleCompare}
              disabled={Boolean(loadingAction)}
              aria-label={
                locale === "ar"
                  ? "إضافة إلى المقارنة"
                  : "Add to compare"
              }
              aria-pressed={isCompared}
            >
              {loadingAction === "compare" ? (
                <FiLoader className={styles.spinner} />
              ) : isCompared ? (
                <FiCheck />
              ) : (
                <FiShuffle />
              )}
            </button>
          </div>

          <a
            href={productHref}
            className={
              styles.imageLink
            }
            onClick={(event) => {
              event.preventDefault();

              window.location.assign(
                productHref
              );
            }}
          >
            {primaryImage?.url ? (
              <img
                src={primaryImage.url}
                alt={
                  primaryImage.alt?.[
                    locale
                  ] ||
                  productName
                }
                className={styles.image}
              />
            ) : (
              <div
                className={styles.noImage}
              >
                <span>
                  {locale === "ar"
                    ? "لا توجد صورة"
                    : "No image"}
                </span>
              </div>
            )}
          </a>
        </div>

        <div
          className={styles.content}
        >
          <a
            href={`/${locale}/category/${product.category}`}
            className={styles.category}
          >
            {categoryName}
          </a>

          <a
            href={productHref}
            className={
              styles.productName
            }
            title={productName}
          >
            {productName}
          </a>

          <div
            className={styles.prices}
          >
            <span
              className={
                styles.currentPrice
              }
            >
              {formattedPrice}{" "}
              {locale === "ar"
                ? "ج.م"
                : "EGP"}
            </span>

            {formattedOldPrice && (
              <span
                className={
                  styles.oldPrice
                }
              >
                {formattedOldPrice}{" "}
                {locale === "ar"
                  ? "ج.م"
                  : "EGP"}
              </span>
            )}
          </div>

          <button
  type="button"
  className={styles.cartButton}
  onClick={handleAddToCart}
  disabled={Boolean(loadingAction)}
  aria-label={
    locale === "ar"
      ? "إضافة إلى العربة"
      : "Add to cart"
  }
>
  <span>
    {loadingAction === "cart"
      ? locale === "ar"
        ? "جارٍ الإضافة..."
        : "Adding..."
      : locale === "ar"
        ? "إضافة إلى العربة"
        : "Add to cart"}
  </span>

  {loadingAction === "cart" ? (
    <FiLoader className={styles.spinner} />
  ) : (
    <FiShoppingCart />
  )}
</button>
        </div>
      </article>
    </>
  );
}