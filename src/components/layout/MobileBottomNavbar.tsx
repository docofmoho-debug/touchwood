
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  FiHeart,
  FiShuffle,
  FiShoppingCart,
  FiGlobe,
  FiShoppingBag,
} from "react-icons/fi";

import {
  getCartItemCount,
  getWishlistCount,
  getCompareCount,
  LOCAL_LIST_CHANGE_EVENT,
} from "@/lib/localStore";

import styles from "./MobileBottomNavbar.module.css";

export default function MobileBottomNavbar() {
  const pathname = usePathname();

  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);

  const segments = pathname?.split("/").filter(Boolean) || [];

  const locale: "ar" | "en" =
    segments[0] === "en" ? "en" : "ar";

  const otherLocale = locale === "ar" ? "en" : "ar";

  const currentPath =
    segments.length > 1
      ? `/${segments.slice(1).join("/")}`
      : "";

  const languageHref = `/${otherLocale}${currentPath}`;

  useEffect(() => {
    const syncLocalLists = () => {
      setCartItemsCount(getCartItemCount());
      setWishlistCount(getWishlistCount());
      setCompareCount(getCompareCount());
    };

    syncLocalLists();

    window.addEventListener(
      LOCAL_LIST_CHANGE_EVENT,
      syncLocalLists
    );

    window.addEventListener("storage", syncLocalLists);

    return () => {
      window.removeEventListener(
        LOCAL_LIST_CHANGE_EVENT,
        syncLocalLists
      );

      window.removeEventListener(
        "storage",
        syncLocalLists
      );
    };
  }, []);

  return (
    <nav
      className={styles.mobileBottomNavbar}
      aria-label={
        locale === "ar"
          ? "التنقل عبر الهاتف"
          : "Mobile navigation"
      }
    >
      <div className={styles.container}>
        {/* Wishlist */}
        <Link prefetch={false}
          href={`/${locale}/wishlist`}
          className={styles.action}
          aria-label={
            locale === "ar" ? "المفضلة" : "Wishlist"
          }
        >
          <span className={styles.iconWrapper}>
            <FiHeart />

            {wishlistCount > 0 && (
              <span className={styles.badge}>
                {wishlistCount}
              </span>
            )}
          </span>

          <span>
            {locale === "ar" ? "المفضلة" : "Wishlist"}
          </span>
        </Link>

        {/* Compare */}
        <Link prefetch={false}
          href={`/${locale}/compare`}
          className={styles.action}
          aria-label={
            locale === "ar" ? "المقارنة" : "Compare"
          }
        >
          <span className={styles.iconWrapper}>
            <FiShuffle />

            {compareCount > 0 && (
              <span className={styles.badge}>
                {compareCount}
              </span>
            )}
          </span>

          <span>
            {locale === "ar" ? "المقارنة" : "Compare"}
          </span>
        </Link>

        {/* Cart */}
        <Link prefetch={false}
          href={`/${locale}/cart`}
          className={styles.action}
          aria-label={
            locale === "ar" ? "عربة التسوق" : "Cart"
          }
        >
          <span className={styles.iconWrapper}>
            <FiShoppingCart />

            {cartItemsCount > 0 && (
              <span className={styles.badge}>
                {cartItemsCount}
              </span>
            )}
          </span>

          <span>
            {locale === "ar" ? "عربة التسوق" : "Cart"}
          </span>
        </Link>

        {/* Shop */}
        <Link prefetch={false}
          href={`/${locale}/shop`}
          className={styles.action}
          aria-label={
            locale === "ar" ? "المتجر" : "Shop"
          }
        >
          <span className={styles.iconWrapper}>
            <FiShoppingBag />
          </span>

          <span>
            {locale === "ar" ? "المتجر" : "Shop"}
          </span>
        </Link>

        {/* Language Switcher */}
        <a
          href={languageHref}
          className={styles.action}
          aria-label={
            locale === "ar"
              ? "التبديل إلى الإنجليزية"
              : "Switch to Arabic"
          }
        >
          <span className={styles.iconWrapper}>
            <FiGlobe />
          </span>

          <span>
            {locale === "ar" ? "EN" : "عربي"}
          </span>
        </a>
      </div>
    </nav>
  );
}