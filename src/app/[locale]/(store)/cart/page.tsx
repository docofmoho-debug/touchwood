"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import styles from "./CartPage.module.css";

import {
  getCartItems,
  removeFromCart,
  updateCartQuantity,
  LOCAL_LIST_CHANGE_EVENT,
  type CartItem,
} from "@/lib/localStore";

const SHIPPING_COST = 250;

function getProductName(item: CartItem, locale: string) {
  const name = item.product?.name;

  if (!name) return "منتج";

  return (
    name[locale as "ar" | "en"] ||
    name.ar ||
    name.en ||
    "منتج"
  );
}


function getSelectedColorLabel(item: CartItem, locale: string): string | null {
  const details = item.selectedColorDetails;

  if (!details) {
    return item.selectedColor || null;
  }

  const resolveText = (
    value: { ar?: string; en?: string } | string | undefined
  ): string | null => {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (value && typeof value === "object") {
      const localized =
        value[locale as "ar" | "en"] ||
        value.ar ||
        value.en;

      if (localized?.trim()) {
        return localized.trim();
      }
    }

    return null;
  };

  return (
    resolveText(details.name) ||
    resolveText(details.label) ||
    details.value ||
    item.selectedColor ||
    null
  );
}

function getProductImage(item: CartItem) {
  const media = item.product?.media;

  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }

  const primaryImage = media.find(
    (mediaItem) =>
      mediaItem.type === "image" && mediaItem.isPrimary
  );

  if (primaryImage?.url) {
    return primaryImage.url;
  }

  const firstImage = media.find(
    (mediaItem) => mediaItem.type === "image"
  );

  return firstImage?.url || media[0]?.url || null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CartPage() {
  const params = useParams();

  const locale =
    typeof params?.locale === "string"
      ? params.locale
      : "ar";

  const isArabic = locale === "ar";

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadCart = useCallback(() => {
    setItems(getCartItems());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadCart();

    const handleCartChange = () => {
      loadCart();
    };

    window.addEventListener(
      LOCAL_LIST_CHANGE_EVENT,
      handleCartChange
    );

    window.addEventListener("storage", handleCartChange);

    return () => {
      window.removeEventListener(
        LOCAL_LIST_CHANGE_EVENT,
        handleCartChange
      );

      window.removeEventListener("storage", handleCartChange);
    };
  }, [loadCart]);

  const productsTotal = useMemo(() => {
    return items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  }, [items]);

  const shippingCost = items.length > 0 ? SHIPPING_COST : 0;

  const grandTotal = productsTotal + shippingCost;

  const handleIncrease = (
    productId: string,
    quantity: number,
    selectedColor?: string | null
  ) => {
    const updatedItems = updateCartQuantity(
      productId,
      quantity + 1,
      selectedColor ?? null
    );

    setItems(updatedItems);
  };

  const handleDecrease = (
    productId: string,
    quantity: number,
    selectedColor?: string | null
  ) => {
    if (quantity <= 1) {
      return;
    }

    const updatedItems = updateCartQuantity(
      productId,
      quantity - 1,
      selectedColor ?? null
    );

    setItems(updatedItems);
  };

  const handleRemove = (
    productId: string,
    selectedColor?: string | null
  ) => {
    const updatedItems = removeFromCart(
      productId,
      selectedColor ?? null
    );

    setItems(updatedItems);
  };

  if (!isLoaded) {
    return (
      <section
        className={styles.page}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p>{isArabic ? "جاري تحميل السلة..." : "Loading cart..."}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.page}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className={styles.container}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <a href={`/${locale}`}>
            {isArabic ? "الرئيسية" : "Home"}
          </a>

          <span className={styles.breadcrumbSeparator}>/</span>

          <span>
            {isArabic ? "عربة التسوق" : "Shopping Cart"}
          </span>
        </nav>

        {/* Header */}
        <header className={styles.header}>
          <div>
            

            <h1>
              {isArabic ? "عربة التسوق" : "Shopping Cart"}
            </h1>

            <p>
              {isArabic
                ? `${items.length} ${items.length === 1 ? "منتج" : "منتجات"} في عربة التسوق الخاصة بك`
                : `${items.length} ${
                    items.length === 1 ? "item" : "items"
                  } in your cart`}
            </p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyIcon}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="10"
                  cy="20"
                  r="1.2"
                  fill="currentColor"
                />
                <circle
                  cx="18"
                  cy="20"
                  r="1.2"
                  fill="currentColor"
                />
              </svg>
            </div>

            <h2>
              {isArabic
                ? "عربة التسوق فارغة"
                : "Your cart is empty"}
            </h2>

            <p>
              {isArabic
                ? "لم تقم بإضافة أي منتجات إلى عربة التسوق بعد."
                : "You haven't added any products to your cart yet."}
            </p>

            <Link
              href={`/${locale}/shop`}
              className={styles.shopButton}
            >
              {isArabic ? "تصفح المنتجات" : "Browse Products"}
            </Link>
          </div>
        ) : (
          <div className={styles.cartLayout}>
            {/* Products */}
            <div className={styles.productsSection}>
              <div className={styles.productsHeader}>
                <h2>
                  {isArabic
                    ? "عدد المنتجات في السلة"
                    : "Products in Cart"}
                </h2>

                <span>
                  {items.length}
                </span>
              </div>

              <div className={styles.productsList}>
                {items.map((item) => {
                  const product = item.product;
                  const image = getProductImage(item);
                  const name = getProductName(item, locale);
                  const selectedColorLabel = getSelectedColorLabel(item, locale);

                  const itemTotal =
                    product.price * item.quantity;

                  return (
                    <article
                      className={styles.productCard}
                      key={`${product._id}-${item.selectedColor ?? "default"}`}
                    >
                      {/* Image */}
                      <Link
                        href={`/${locale}/products/${
                          product.slug || product._id
                        }`}
                        className={styles.productImageLink}
                      >
                        <div className={styles.productImage}>
                          {image ? (
                            <img
                              src={image}
                              alt={name}
                            />
                          ) : (
                            <div className={styles.noImage}>
                              {isArabic
                                ? "لا توجد صورة"
                                : "No image"}
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className={styles.productInfo}>
                        <div className={styles.productTop}>
                          <div>
                            <Link
                              href={`/${locale}/products/${
                                product.slug || product._id
                              }`}
                              className={styles.productName}
                            >
                              {name}
                            </Link>

                            {selectedColorLabel && (
                              <div className={styles.colorInfo}>
                                <span className={styles.colorLabel}>
                                  {isArabic ? "اللون:" : "Color:"}
                                </span>

                                <span>
                                  {selectedColorLabel}
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() =>
                              handleRemove(
                                product._id,
                                item.selectedColor
                              )
                            }
                            aria-label={
                              isArabic
                                ? `حذف ${name}`
                                : `Remove ${name}`
                            }
                          >
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3m-9 0 1 13h8l1-13"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>

                        <div className={styles.productBottom}>
                          <div className={styles.priceArea}>
                            <span className={styles.unitPrice}>
                              {formatPrice(product.price)} جنيه
                            </span>

                            {item.quantity > 1 && (
                              <span className={styles.unitPriceHint}>
                                {formatPrice(product.price)} ×{" "}
                                {item.quantity}
                              </span>
                            )}
                          </div>

                          <div className={styles.quantityArea}>
                            <span className={styles.quantityLabel}>
                              {isArabic ? "الكمية" : "Quantity"}
                            </span>

                            <div className={styles.quantityControl}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDecrease(
                                    product._id,
                                    item.quantity,
                                    item.selectedColor
                                  )
                                }
                                disabled={item.quantity <= 1}
                                aria-label={
                                  isArabic
                                    ? "تقليل الكمية"
                                    : "Decrease quantity"
                                }
                              >
                                −
                              </button>

                              <span>{item.quantity}</span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleIncrease(
                                    product._id,
                                    item.quantity,
                                    item.selectedColor
                                  )
                                }
                                aria-label={
                                  isArabic
                                    ? "زيادة الكمية"
                                    : "Increase quantity"
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className={styles.itemTotal}>
                            {formatPrice(itemTotal)}
                            <span> جنيه</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <aside className={styles.summary}>
              <div className={styles.summaryCard}>
                <h2>
                  {isArabic
                    ? "ملخص الطلب"
                    : "Order Summary"}
                </h2>

                <div className={styles.summaryRows}>
                  <div className={styles.summaryRow}>
                    <span>
                      {isArabic
                        ? "إجمالي المنتجات"
                        : "Products Total"}
                    </span>

                    <strong>
                      {formatPrice(productsTotal)} جنيه
                    </strong>
                  </div>

                  <div className={styles.summaryRow}>
                    <span>
                      {isArabic
                        ? "مصاريف الشحن"
                        : "Shipping"}
                    </span>

                    <strong>
                      {formatPrice(SHIPPING_COST)} جنيه
                    </strong>
                  </div>
                </div>

                <div className={styles.summaryDivider} />

                <div className={styles.grandTotal}>
                  <span>
                    {isArabic
                      ? "الإجمالي النهائي"
                      : "Grand Total"}
                  </span>

                  <strong>
                    {formatPrice(grandTotal)} جنيه
                  </strong>
                </div>

                <a
  href={`/${locale}/checkout`}
  className={styles.checkoutButton}
>
  {isArabic
    ? "المتابعة إلى إتمام الطلب"
    : "Proceed to Checkout"}
</a>

                <Link
                  href={`/${locale}/shop`}
                  className={styles.continueShopping}
                >
                  {isArabic
                    ? "← متابعة التسوق"
                    : "← Continue Shopping"}
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}