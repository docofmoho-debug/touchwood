"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  checkout,
} from "@/services/api";

import {
  clearCart,
  getCartItems,
  type CartItem,
} from "@/lib/localStore";

import styles from "./CheckoutPage.module.css";

const SHIPPING_COST = 250;

function getProductName(
  item: CartItem,
  locale: string
) {
  const name =
    item.product?.name;

  if (!name) {
    return "منتج";
  }

  return (
    name[
      locale as "ar" | "en"
    ] ||
    name.ar ||
    name.en ||
    "منتج"
  );
}

function getColorLabel(
  item: CartItem,
  locale: string
): string {
  const details = item.selectedColorDetails;

  if (!details) {
    return item.selectedColor || "";
  }

  const getLocalizedText = (
    value: unknown
  ): string => {
    if (typeof value === "string") {
      return value.trim();
    }

    if (value && typeof value === "object") {
      const localized = value as {
        ar?: unknown;
        en?: unknown;
      };

      const preferred =
        locale === "ar"
          ? localized.ar
          : localized.en;

      const fallback =
        locale === "ar"
          ? localized.en
          : localized.ar;

      if (typeof preferred === "string" && preferred.trim()) {
        return preferred.trim();
      }

      if (typeof fallback === "string" && fallback.trim()) {
        return fallback.trim();
      }
    }

    return "";
  };

  return (
    getLocalizedText(details.name) ||
    getLocalizedText(details.label) ||
    details.value ||
    details.id ||
    item.selectedColor ||
    ""
  );
}

function getProductImage(
  item: CartItem
) {
  const media =
    item.product?.media;

  if (
    !Array.isArray(media) ||
    media.length === 0
  ) {
    return null;
  }

  const primary =
    media.find(
      (item) =>
        item.type === "image" &&
        item.isPrimary
    );

  if (primary?.url) {
    return primary.url;
  }

  const firstImage =
    media.find(
      (item) =>
        item.type === "image"
    );

  return (
    firstImage?.url ||
    media[0]?.url ||
    null
  );
}

function formatPrice(
  value: number,
  locale: string
) {
  return new Intl.NumberFormat(
    locale === "ar"
      ? "ar-EG"
      : "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function getErrorMessage(
  error: unknown,
  isArabic: boolean
) {
  const code =
    error &&
    typeof error === "object" &&
    "code" in error
      ? String(
          (error as { code?: unknown })
            .code || ""
        )
      : "";

  const message =
    error instanceof Error
      ? error.message
      : "";

  if (code === "INVALID_FIRST_NAME") {
    return isArabic
      ? "الاسم الأول يجب أن يحتوي على حروف فقط."
      : "First name must contain letters only.";
  }

  if (code === "INVALID_LAST_NAME") {
    return isArabic
      ? "اسم العائلة يجب أن يحتوي على حروف فقط."
      : "Last name must contain letters only.";
  }

  if (code === "INVALID_PHONE") {
    return isArabic
      ? "رقم الهاتف يجب أن يتكون من 11 رقمًا فقط."
      : "Phone number must contain exactly 11 digits.";
  }

  if (code === "INVALID_EMAIL") {
    return isArabic
      ? "يرجى إدخال بريد إلكتروني صحيح."
      : "Please enter a valid email address.";
  }

  if (code === "INVALID_ADDRESS") {
    return isArabic
      ? "يرجى إدخال عنوان صحيح من 5 إلى 300 حرف."
      : "Please enter a valid address between 5 and 300 characters.";
  }

  if (message) {
    if (
      message ===
      "Phone number must contain exactly 11 digits"
    ) {
      return isArabic
        ? "رقم الهاتف يجب أن يتكون من 11 رقمًا فقط."
        : message;
    }

    if (
      message ===
      "Invalid email address"
    ) {
      return isArabic
        ? "يرجى إدخال بريد إلكتروني صحيح."
        : message;
    }

    if (
      message ===
      "First name contains invalid characters"
    ) {
      return isArabic
        ? "الاسم الأول يحتوي على أحرف أو رموز غير صحيحة."
        : message;
    }

    if (
      message ===
      "Last name contains invalid characters"
    ) {
      return isArabic
        ? "اسم العائلة يحتوي على أحرف أو رموز غير صحيحة."
        : message;
    }

    if (
      message ===
      "Invalid address"
    ) {
      return isArabic
        ? "العنوان المدخل غير صحيح."
        : message;
    }

    if (
      message ===
      "First name is required"
    ) {
      return isArabic
        ? "الاسم الأول مطلوب."
        : message;
    }

    if (
      message ===
      "Last name is required"
    ) {
      return isArabic
        ? "اسم العائلة مطلوب."
        : message;
    }

    if (
      message ===
      "Phone number is required"
    ) {
      return isArabic
        ? "رقم الهاتف مطلوب."
        : message;
    }

    if (
      message ===
      "Email is required"
    ) {
      return isArabic
        ? "البريد الإلكتروني مطلوب."
        : message;
    }

    if (
      message ===
      "Address is required"
    ) {
      return isArabic
        ? "العنوان مطلوب."
        : message;
    }

    if (
      message ===
      "Your cart is empty"
    ) {
      return isArabic
        ? "السلة فارغة."
        : message;
    }

    if (
      message ===
      "Invalid payment method"
    ) {
      return isArabic
        ? "طريقة الدفع غير صحيحة."
        : message;
    }

    if (
      message ===
      "One of the products is no longer available"
    ) {
      return isArabic
        ? "أحد المنتجات لم يعد متاحًا."
        : message;
    }

    if (
      message ===
      "Insufficient product stock"
    ) {
      return isArabic
        ? "الكمية المطلوبة غير متوفرة في المخزون."
        : message;
    }

    if (
      message ===
      "Insufficient stock for selected color"
    ) {
      return isArabic
        ? "الكمية المطلوبة من اللون المحدد غير متوفرة."
        : message;
    }

    if (
      message ===
      "The selected color is no longer available"
    ) {
      return isArabic
        ? "اللون المحدد لم يعد متاحًا."
        : message;
    }

    if (
      message ===
      "Invalid discount code"
    ) {
      return isArabic
        ? "كود الخصم غير صحيح."
        : message;
    }
  }

  return isArabic
    ? "حدث خطأ أثناء إنشاء الطلب. يرجى المحاولة مرة أخرى."
    : "Something went wrong while creating the order. Please try again.";
}

function validateForm(
  formData: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    paymentMethod: string;
  },
  isArabic: boolean
) {
  const firstName =
    formData.firstName.trim();

  const lastName =
    formData.lastName.trim();

  const phone =
    formData.phone.trim();

  const email =
    formData.email.trim();

  const address =
    formData.address.trim();

  if (!firstName) {
    return isArabic
      ? "الاسم الأول مطلوب."
      : "First name is required.";
  }

  if (
    firstName.length < 2 ||
    firstName.length > 50 ||
    !/^[\p{L}\s'-]+$/u.test(
      firstName
    )
  ) {
    return isArabic
      ? "الاسم الأول يجب أن يحتوي على حروف فقط."
      : "First name must contain letters only.";
  }

  if (!lastName) {
    return isArabic
      ? "اسم العائلة مطلوب."
      : "Last name is required.";
  }

  if (
    lastName.length < 2 ||
    lastName.length > 50 ||
    !/^[\p{L}\s'-]+$/u.test(
      lastName
    )
  ) {
    return isArabic
      ? "اسم العائلة يجب أن يحتوي على حروف فقط."
      : "Last name must contain letters only.";
  }

  if (!/^\d{11}$/.test(phone)) {
    return isArabic
      ? "رقم الهاتف يجب أن يتكون من 11 رقمًا فقط."
      : "Phone number must contain exactly 11 digits.";
  }

  if (
    email.length < 5 ||
    email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    return isArabic
      ? "يرجى إدخال بريد إلكتروني صحيح."
      : "Please enter a valid email address.";
  }

  if (
    address.length < 5 ||
    address.length > 300 ||
    /[\u0000-\u001F\u007F]/.test(
      address
    )
  ) {
    return isArabic
      ? "يرجى إدخال عنوان صحيح من 5 إلى 300 حرف."
      : "Please enter a valid address between 5 and 300 characters.";
  }

  return "";
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();

  const locale =
    typeof params?.locale ===
    "string"
      ? params.locale
      : "ar";

  const isArabic =
    locale === "ar";

  const [items, setItems] =
    useState<CartItem[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [fieldErrors, setFieldErrors] =
    useState({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
    });

  const [formData, setFormData] =
    useState({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      paymentMethod:
        "Cash On Delivery",
    });

  useEffect(() => {
    const cart =
      getCartItems();

    setItems(cart);
    setLoaded(true);

    if (cart.length === 0) {
      router.replace(
        `/${locale}/cart`
      );
    }
  }, [locale, router]);

  const productsTotal =
    useMemo(() => {
      return items.reduce(
        (total, item) =>
          total +
          Number(
            item.product.price || 0
          ) *
            item.quantity,
        0
      );
    }, [items]);

  const grandTotal =
    productsTotal +
    (items.length
      ? SHIPPING_COST
      : 0);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");

    setFieldErrors((prev) => ({
      ...prev,
      [name]:
        name in prev
          ? ""
          : prev[
              name as keyof typeof prev
            ],
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (items.length === 0) {
      setError(
        isArabic
          ? "السلة فارغة."
          : "Your cart is empty."
      );

      return;
    }

    const validationError =
      validateForm(
        formData,
        isArabic
      );

    if (validationError) {
      setError(validationError);

      return;
    }

    setLoading(true);
    setError("");

    setFieldErrors({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
    });

    try {
      const token =
        localStorage.getItem(
          "token"
        );

      const orderData = {
        products:
          items.map((item) => ({
            productId:
              item.product._id,

            quantity:
              item.quantity,

            // يُرسل معرّف اللون الذي اختاره العميل؛
            // ويستخدمه الخادم للتحقق من اللون وحفظ تفاصيله في الطلب.
            colorId:
              item.selectedColorDetails?.id ||
              item.selectedColor ||
              null,
          })),

        paymentMethod:
          formData.paymentMethod,

        shippingAddress: {
          firstName:
            formData.firstName.trim(),

          lastName:
            formData.lastName.trim(),

          phone:
            formData.phone.trim(),

          email:
            formData.email
              .trim()
              .toLowerCase(),

          address:
            formData.address.trim(),
        },
      };

      const response =
        await checkout(
          token,
          orderData
        );

      const order =
        response?.order;

      if (
        !order ||
        !order.orderNumber
      ) {
        throw new Error(
          isArabic
            ? "تم إنشاء الطلب ولكن لم يتم استلام رقم الطلب."
            : "The order was created but no order number was returned."
        );
      }

      clearCart();

      router.replace(
        `/${locale}/order-success?orderNumber=${encodeURIComponent(
          String(order.orderNumber)
        )}`
      );
    } catch (err) {
      console.error(
        "Checkout error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          isArabic
        )
      );
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) {
    return (
      <main
        className={styles.page}
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <div
          className={styles.loading}
        >
          <div
            className={
              styles.spinner
            }
          />

          <p>
            {isArabic
              ? "جاري تحميل الطلب..."
              : "Loading checkout..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={styles.page}
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <div
        className={
          styles.container
        }
      >
        <nav
          className={
            styles.breadcrumb
          }
        >
          <Link
            href={`/${locale}`}
          >
            {isArabic
              ? "الرئيسية"
              : "Home"}
          </Link>

          <span>/</span>

          <Link
            href={`/${locale}/cart`}
          >
            {isArabic
              ? "السلة"
              : "Cart"}
          </Link>

          <span>/</span>

          <strong>
            {isArabic
              ? "إتمام الطلب"
              : "Checkout"}
          </strong>
        </nav>

        <header
          className={styles.header}
        >
          <span
            className={
              styles.eyebrow
            }
          >
            TOUCHWOOD
          </span>

          <h1>
            {isArabic
              ? "إتمام الطلب"
              : "Complete Your Order"}
          </h1>

          <p>
            {isArabic
              ? "أدخل بيانات التوصيل ثم راجع تفاصيل طلبك قبل التأكيد."
              : "Enter your delivery information and review your order before confirming."}
          </p>
        </header>

        <form
          className={styles.layout}
          onSubmit={handleSubmit}
        >
          <section
            className={
              styles.formCard
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <span
                  className={
                    styles.step
                  }
                >
                  01
                </span>

                <h2>
                  {isArabic
                    ? "بيانات العميل والتوصيل"
                    : "Customer & Delivery Information"}
                </h2>
              </div>
            </div>

            <div
              className={
                styles.fieldsGrid
              }
            >
              <label
                className={
                  styles.field
                }
              >
                <span>
                  {isArabic
                    ? "الاسم الأول"
                    : "First Name"}
                </span>

                <input
                  name="firstName"
                  value={
                    formData.firstName
                  }
                  onChange={
                    handleChange
                  }
                  required
                  autoComplete="given-name"
                  placeholder={
                    isArabic
                      ? "الاسم الأول"
                      : "First name"
                  }
                />
              </label>

              <label
                className={
                  styles.field
                }
              >
                <span>
                  {isArabic
                    ? "اسم العائلة"
                    : "Last Name"}
                </span>

                <input
                  name="lastName"
                  value={
                    formData.lastName
                  }
                  onChange={
                    handleChange
                  }
                  required
                  autoComplete="family-name"
                  placeholder={
                    isArabic
                      ? "اسم العائلة"
                      : "Last name"
                  }
                />
              </label>

              <label
                className={
                  styles.field
                }
              >
                <span>
                  {isArabic
                    ? "رقم الهاتف"
                    : "Phone Number"}
                </span>

                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={
                    formData.phone
                  }
                  onChange={
                    handleChange
                  }
                  required
                  autoComplete="tel"
                  placeholder="01xxxxxxxxx"
                />
              </label>

              <label
                className={
                  styles.field
                }
              >
                <span>
                  {isArabic
                    ? "البريد الإلكتروني"
                    : "Email Address"}
                </span>

                <input
                  name="email"
                  type="email"
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  required
                  autoComplete="email"
                  placeholder="example@email.com"
                />
              </label>

              <label
                className={`${styles.field} ${styles.fullField}`}
              >
                <span>
                  {isArabic
                    ? "عنوان التوصيل"
                    : "Delivery Address"}
                </span>

                <textarea
                  name="address"
                  value={
                    formData.address
                  }
                  onChange={
                    handleChange
                  }
                  required
                  rows={4}
                  maxLength={300}
                  autoComplete="street-address"
                  placeholder={
                    isArabic
                      ? "المحافظة، المدينة، الشارع، رقم المبنى..."
                      : "Governorate, city, street, building number..."
                  }
                />
              </label>
            </div>

            <div
              className={
                styles.paymentSection
              }
            >
              <div
                className={
                  styles.sectionTitle
                }
              >
                <span
                  className={
                    styles.step
                  }
                >
                  02
                </span>

                <h2>
                  {isArabic
                    ? "طريقة الدفع"
                    : "Payment Method"}
                </h2>
              </div>

              <label
                className={
                  styles.paymentOption
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash On Delivery"
                  checked={
                    formData.paymentMethod ===
                    "Cash On Delivery"
                  }
                  onChange={
                    handleChange
                  }
                />

                <span>
                  {isArabic
                    ? "الدفع عند الاستلام"
                    : "Cash On Delivery"}
                </span>
              </label>

              <label
                className={
                  styles.paymentOption
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Vodafone Cash"
                  checked={
                    formData.paymentMethod ===
                    "Vodafone Cash"
                  }
                  onChange={
                    handleChange
                  }
                />

                <span>
                 فودافون كاش او انستاباي على الرقم 01142447767
                </span>
              </label>
            </div>

            {error && (
              <div
                className={
                  styles.error
                }
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className={
                styles.submitButton
              }
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className={
                      styles.buttonSpinner
                    }
                  />

                  {isArabic
                    ? "جاري إنشاء الطلب..."
                    : "Creating order..."}
                </>
              ) : (
                <>
                  {isArabic
                    ? "تأكيد وإتمام الطلب"
                    : "Confirm & Place Order"}
                </>
              )}
            </button>

            <p
              className={
                styles.securityNote
              }
            >
              {isArabic
                ? "سيتم التحقق من البيانات والأسعار والمخزون على الموقع قبل إنشاء الطلب."
                : "Your information, prices, and stock are verified on the server before your order is created."}
            </p>
          </section>

          <aside
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <span
                  className={
                    styles.step
                  }
                >
                  03
                </span>

                <h2>
                  {isArabic
                    ? "مراجعة الطلب"
                    : "Review Order"}
                </h2>
              </div>
            </div>

            <div
              className={
                styles.itemsList
              }
            >
              {items.map(
                (item) => {
                  const name =
                    getProductName(
                      item,
                      locale
                    );

                  const image =
                    getProductImage(
                      item
                    );

                  return (
                    <div
                      className={
                        styles.item
                      }
                      key={`${item.product._id}-${item.selectedColor || "default"}`}
                    >
                      <div
                        className={
                          styles.itemImage
                        }
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={name}
                          />
                        ) : (
                          <span>
                            {isArabic
                              ? "لا صورة"
                              : "No image"}
                          </span>
                        )}
                      </div>

                      <div
                        className={
                          styles.itemInfo
                        }
                      >
                        <strong>
                          {name}
                        </strong>

                        <span>
                          {isArabic
                            ? `الكمية: ${item.quantity}`
                            : `Qty: ${item.quantity}`}
                        </span>

                        {item.selectedColor && (
                          <span>
                            {isArabic ? "اللون :" : "Color :"}{" "}
                            {getColorLabel(item, locale)}
                          </span>
                        )}
                      </div>

                      <strong
                        className={
                          styles.itemPrice
                        }
                      >
                        {formatPrice(
                          Number(
                            item.product
                              .price
                          ) *
                            item.quantity,
                          locale
                        )}{" "}
                        {isArabic
                          ? "ج.م"
                          : "EGP"}
                      </strong>
                    </div>
                  );
                }
              )}
            </div>

            <div
              className={
                styles.summaryRows
              }
            >
              <div>
                <span>
                  {isArabic
                    ? "المنتجات"
                    : "Products"}
                </span>

                <strong>
                  {formatPrice(
                    productsTotal,
                    locale
                  )}{" "}
                  {isArabic
                    ? "ج.م"
                    : "EGP"}
                </strong>
              </div>

              <div>
                <span>
                  {isArabic
                    ? "الشحن"
                    : "Shipping"}
                </span>

                <strong>
                  {formatPrice(
                    SHIPPING_COST,
                    locale
                  )}{" "}
                  {isArabic
                    ? "ج.م"
                    : "EGP"}
                </strong>
              </div>
            </div>

            <div
              className={
                styles.totalRow
              }
            >
              <span>
                {isArabic
                  ? "الإجمالي"
                  : "Total"}
              </span>

              <strong>
                {formatPrice(
                  grandTotal,
                  locale
                )}{" "}
                {isArabic
                  ? "ج.م"
                  : "EGP"}
              </strong>
            </div>

            <Link
              href={`/${locale}/cart`}
              className={
                styles.backToCart
              }
            >
              {isArabic
                ? "العودة إلى السلة"
                : "Back to Cart"}
            </Link>
          </aside>
        </form>
      </div>
    </main>
  );
}