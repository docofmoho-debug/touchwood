"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiCheck,
  FiChevronDown,
  FiEdit3,
  FiLogOut,
  FiLock,
  FiPackage,
  FiRefreshCw,
  FiSave,
  FiUser,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";

import {
  getOrders,
  updateProfile,
  changePassword,
  cancelOrder,
} from "@/services/api";

import styles from "./AccountPage.module.css";

type Locale = "ar" | "en";

type User = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

type OrderProduct = {
  product?: {
    _id?: string;
    name?: {
      ar?: string;
      en?: string;
    };
    media?: Array<{
      url?: string;
      thumbnail?: string;
      isPrimary?: boolean;
    }>;
  };
  quantity?: number;
  priceAtPurchase?: number;
  colorName?: {
    ar?: string;
    en?: string;
  };
};

type Order = {
  _id: string;
  orderNumber?: number;
  status?: string;
  subtotal?: number;
  shipping?: number;
  discount?: number;
  totalPrice?: number;
  paymentMethod?: string;
  createdAt?: string;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  products?: OrderProduct[];
};

const text = (
  locale: Locale,
  ar: string,
  en: string
) => {
  return locale === "ar" ? ar : en;
};

const money = (
  value: number | undefined,
  locale: Locale
) => {
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-EG",
    {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }
  ).format(value || 0);
};

const getOrderStatus = (
  status: string | undefined,
  locale: Locale
) => {
  switch (status) {
    case "Pending":
      return text(
        locale,
        "قيد المراجعة",
        "Pending"
      );

    case "Processing":
      return text(
        locale,
        "جاري التجهيز",
        "Processing"
      );

    case "Out for Delivery":
      return text(
        locale,
        "خرج للتوصيل",
        "Out for Delivery"
      );

    case "Delivered":
      return text(
        locale,
        "تم التسليم",
        "Delivered"
      );

    case "Canceled":
      return text(
        locale,
        "ملغي",
        "Canceled"
      );

    case "Unauthorized":
      return text(
        locale,
        "غير مصرح",
        "Unauthorized"
      );

    default:
      return (
        status ||
        text(
          locale,
          "غير معروف",
          "Unknown"
        )
      );
  }
};

const getPaymentMethod = (
  method: string | undefined,
  locale: Locale
) => {
  switch (method) {
    case "Cash On Delivery":
      return text(
        locale,
        "الدفع عند الاستلام",
        "Cash On Delivery"
      );

    case "Vodafone Cash":
      return text(
        locale,
        "فودافون كاش او انستاباي على الرقم 01142447767",
         "Vodafone Cash or instapay on 01142447767"
      );

    case "Visa":
      return "Visa";

    default:
      return method || "-";
  }
};

const getProductName = (
  product: OrderProduct["product"],
  locale: Locale
) => {
  return (
    product?.name?.[locale] ||
    product?.name?.ar ||
    product?.name?.en ||
    text(
      locale,
      "منتج",
      "Product"
    )
  );
};

const getProductImage = (
  product: OrderProduct["product"]
) => {
  const media = product?.media || [];

  return (
    media.find(
      (item) => item.isPrimary
    )?.url ||
    media.find(
      (item) => item.url
    )?.url ||
    media.find(
      (item) => item.thumbnail
    )?.thumbnail ||
    "/logo/logo.jpeg"
  );
};

export default function AccountPage() {
  const params = useParams<{
    locale?: string;
  }>();

  const router = useRouter();

  const locale: Locale =
    params.locale === "en"
      ? "en"
      : "ar";

  const isArabic =
    locale === "ar";

  const [user, setUser] =
    useState<User | null>(null);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [ordersLoading, setOrdersLoading] =
    useState(true);

  const [profileSaving, setProfileSaving] =
    useState(false);

  const [passwordSaving, setPasswordSaving] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [cancelingOrderId, setCancelingOrderId] =
    useState<string | null>(null);

  const [cancelConfirmOrderId, setCancelConfirmOrderId] =
    useState<string | null>(null);

  const [activeSection, setActiveSection] =
    useState<
      "profile" | "orders" | "password"
    >("profile");

  const [expandedOrderId, setExpandedOrderId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [profileMessage, setProfileMessage] =
    useState("");

  const [profileError, setProfileError] =
    useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const userInitial = useMemo(() => {
    const value =
      user?.name?.trim() || "";

    return value
      ? value
          .charAt(0)
          .toUpperCase()
      : "U";
  }, [user]);

  useEffect(() => {
    if (!token) {
      router.replace(
        `/${locale}/login`
      );

      return;
    }

    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      router.replace(
        `/${locale}/login`
      );

      return;
    }

    try {
      const parsedUser =
        JSON.parse(
          storedUser
        ) as User;

      if (
        parsedUser?.role ===
        "admin"
      ) {
        router.replace(
          `/${locale}/admin`
        );

        return;
      }

      setUser(parsedUser);

      setName(
        parsedUser.name || ""
      );

      setEmail(
        parsedUser.email || ""
      );

      setPhone(
        parsedUser.phone || ""
      );
    } catch {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      router.replace(
        `/${locale}/login`
      );
    }
  }, [
    locale,
    router,
    token,
  ]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;

    const loadOrders =
      async () => {
        setOrdersLoading(true);

        try {
          const response =
            await getOrders(
              token
            );

          if (!mounted) {
            return;
          }

          const list =
            Array.isArray(
              response
            )
              ? response
              : Array.isArray(
                  response?.orders
                )
              ? response.orders
              : Array.isArray(
                  response?.data
                )
              ? response.data
              : [];

          setOrders(list);
        } catch (
          requestError
        ) {
          if (!mounted) {
            return;
          }

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : text(
                  locale,
                  "تعذر تحميل الطلبات",
                  "Unable to load orders"
                )
          );
        } finally {
          if (mounted) {
            setOrdersLoading(
              false
            );

            setLoading(false);
          }
        }
      };

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [
    locale,
    token,
  ]);

  const clearMessages =
    () => {
      setMessage("");
      setError("");
    };

  const clearProfileMessages =
    () => {
      setProfileMessage("");
      setProfileError("");
    };

  const clearPasswordMessages =
    () => {
      setPasswordMessage("");
      setPasswordError("");
    };

  const handleProfileSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      clearProfileMessages();

      const cleanName =
        name.trim();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const cleanPhone =
        phone.trim();

      if (
        !cleanName ||
        !cleanEmail ||
        !cleanPhone
      ) {
        setProfileError(
          text(
            locale,
            "من فضلك أكمل جميع بيانات الحساب",
            "Please complete all account fields"
          )
        );

        return;
      }

      if (!token) {
        router.replace(
          `/${locale}/login`
        );

        return;
      }

      setProfileSaving(
        true
      );

      try {
        const response =
          await updateProfile(
            token,
            {
              name: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
            }
          );

        const updatedUser =
          response?.user || {
            ...user,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
          };

        localStorage.setItem(
          "user",
          JSON.stringify(
            updatedUser
          )
        );

        setUser(
          updatedUser
        );

        setName(
          updatedUser.name ||
            cleanName
        );

        setEmail(
          updatedUser.email ||
            cleanEmail
        );

        setPhone(
          updatedUser.phone ||
            cleanPhone
        );

        window.dispatchEvent(
          new Event(
            "touchwood-auth-change"
          )
        );

        setProfileMessage(
          text(
            locale,
            "تم تحديث بيانات الحساب بنجاح",
            "Your account information has been updated successfully"
          )
        );
      } catch (
        requestError
      ) {
        setProfileError(
          requestError instanceof
            Error
            ? requestError.message
            : text(
                locale,
                "تعذر تحديث بيانات الحساب",
                "Unable to update your account"
              )
        );
      } finally {
        setProfileSaving(
          false
        );
      }
    };

  const handlePasswordSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      clearPasswordMessages();

      const cleanCurrentPassword =
        currentPassword;

      const cleanNewPassword =
        newPassword;

      const cleanConfirmPassword =
        confirmPassword;

      if (
        !cleanCurrentPassword ||
        !cleanNewPassword ||
        !cleanConfirmPassword
      ) {
        setPasswordError(
          text(
            locale,
            "من فضلك أكمل جميع حقول كلمة السر",
            "Please complete all password fields"
          )
        );

        return;
      }

      if (
        cleanNewPassword !==
        cleanConfirmPassword
      ) {
        setPasswordError(
          text(
            locale,
            "تأكيد كلمة السر الجديدة غير مطابق",
            "New password confirmation does not match"
          )
        );

        return;
      }

      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,}$/;

      if (
        !passwordRegex.test(
          cleanNewPassword
        )
      ) {
        setPasswordError(
          text(
            locale,
            "كلمة السر يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم ورمز خاص",
            "Password must be at least 8 characters and contain uppercase, lowercase, number and special character"
          )
        );

        return;
      }

      if (
        cleanCurrentPassword ===
        cleanNewPassword
      ) {
        setPasswordError(
          text(
            locale,
            "كلمة السر الجديدة يجب أن تكون مختلفة عن الحالية",
            "The new password must be different from the current password"
          )
        );

        return;
      }

      if (!token) {
        router.replace(
          `/${locale}/login`
        );

        return;
      }

      setPasswordSaving(true);

      try {
        await changePassword(
          token,
          cleanCurrentPassword,
          cleanNewPassword
        );

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setPasswordMessage(
          text(
            locale,
            "تم تغيير كلمة السر بنجاح",
            "Your password has been changed successfully"
          )
        );
      } catch (
        requestError
      ) {
        if (
          requestError instanceof Error &&
          (
            requestError as Error & {
              code?: string;
            }
          ).code ===
            "CURRENT_PASSWORD_INVALID"
        ) {
          setPasswordError(
            text(
              locale,
              "كلمة المرور الحالية غير صحيحة",
              "The current password is incorrect"
            )
          );
        } else {
          setPasswordError(
            requestError instanceof
              Error
              ? requestError.message
              : text(
                  locale,
                  "تعذر تغيير كلمة السر",
                  "Unable to change your password"
                )
          );
        }
      } finally {
        setPasswordSaving(
          false
        );
      }
    };

  const openCancelConfirmation =
    (orderId: string) => {
      if (cancelingOrderId) {
        return;
      }

      setCancelConfirmOrderId(
        orderId
      );
    };

  const closeCancelConfirmation =
    () => {
      if (cancelingOrderId) {
        return;
      }

      setCancelConfirmOrderId(
        null
      );
    };

  const handleCancelOrder =
    async (
      orderId: string
    ) => {
      if (!token) {
        router.replace(
          `/${locale}/login`
        );

        return;
      }

      setCancelConfirmOrderId(
        null
      );

      clearMessages();

      setCancelingOrderId(
        orderId
      );

      try {
        const response =
          await cancelOrder(
            token,
            orderId
          );

        const updatedOrder =
          response?.order;

        setOrders(
          (currentOrders) =>
            currentOrders.map(
              (order) =>
                order._id ===
                orderId
                  ? {
                      ...order,
                      ...(updatedOrder ||
                        {}),
                      status:
                        updatedOrder?.status ||
                        "Canceled",
                    }
                  : order
            )
        );

        setMessage(
          text(
            locale,
            "تم إلغاء الطلب بنجاح",
            "Your order has been canceled successfully"
          )
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : text(
                locale,
                "تعذر إلغاء الطلب",
                "Unable to cancel the order"
              )
        );
      } finally {
        setCancelingOrderId(
          null
        );
      }
    };

  const handleLogout =
    () => {
      if (loggingOut) {
        return;
      }

      setLoggingOut(true);

      window.setTimeout(() => {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "user"
        );

        window.dispatchEvent(
          new Event(
            "touchwood-auth-change"
          )
        );

      window.location.href = `/${locale}/`;
      }, 1000);
    };

  const refreshOrders =
    async () => {
      if (!token) {
        router.replace(
          `/${locale}/login`
        );

        return;
      }

      clearMessages();

      setOrdersLoading(
        true
      );

      try {
        const response =
          await getOrders(
            token
          );

        const list =
          Array.isArray(
            response
          )
            ? response
            : Array.isArray(
                response?.orders
              )
            ? response.orders
            : Array.isArray(
                response?.data
              )
            ? response.data
            : [];

        setOrders(list);

        setMessage(
          text(
            locale,
            "تم تحديث الطلبات",
            "Orders have been refreshed"
          )
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : text(
                locale,
                "تعذر تحديث الطلبات",
                "Unable to refresh orders"
              )
        );
      } finally {
        setOrdersLoading(
          false
        );
      }
    };

  if (
    loading &&
    !user
  ) {
    return (
      <main
        className={
          styles.page
        }
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <div
          className={
            styles.loadingCard
          }
        >
          <FiRefreshCw
            className={
              styles.loadingIcon
            }
          />

          <p>
            {text(
              locale,
              "جاري تحميل حسابك...",
              "Loading your account..."
            )}
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
        <section
          className={
            styles.accountHeader
          }
        >
          <div
            className={
              styles.headerIdentity
            }
          >
            <div
              className={
                styles.avatar
              }
            >
              {userInitial}
            </div>

            <div>
              <span
                className={
                  styles.eyebrow
                }
              >
                TOUCHWOOD
              </span>

              <h1>
                {text(
                  locale,
                  "حسابي",
                  "My Account"
                )}
              </h1>
<br />
              <p>
                {text(
                  locale,
                  `مرحبًا ${user?.name || ""}`,
                  `Welcome ${user?.name || ""}`
                )}
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`${styles.message} ${styles.successMessage}`}
          >
            <FiCheck />

            <span>
              {message}
            </span>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              aria-label={text(
                locale,
                "إغلاق",
                "Close"
              )}
            >
              <FiX />
            </button>
          </div>
        )}

        {error && (
          <div
            className={`${styles.message} ${styles.errorMessage}`}
          >
            <FiX />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label={text(
                locale,
                "إغلاق",
                "Close"
              )}
            >
              <FiX />
            </button>
          </div>
        )}

        <div
          className={
            styles.layout
          }
        >
          <aside
            className={
              styles.sidebar
            }
          >
            <button
              type="button"
              className={
                activeSection ===
                "profile"
                  ? styles.sidebarItemActive
                  : styles.sidebarItem
              }
              onClick={() => {
                clearMessages();
                clearProfileMessages();
                clearPasswordMessages();

                setActiveSection(
                  "profile"
                );
              }}
            >
              <FiUser />

              <span>
                {text(
                  locale,
                  "بيانات الحساب",
                  "Account Information"
                )}
              </span>
            </button>

            <button
              type="button"
              className={
                activeSection ===
                "orders"
                  ? styles.sidebarItemActive
                  : styles.sidebarItem
              }
              onClick={() => {
                clearMessages();
                clearProfileMessages();
                clearPasswordMessages();

                setActiveSection(
                  "orders"
                );
              }}
            >
              <FiPackage />

              <span>
                {text(
                  locale,
                  "طلباتي",
                  "My Orders"
                )}
              </span>

              <span
                className={
                  styles.orderCount
                }
              >
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              className={
                activeSection ===
                "password"
                  ? styles.sidebarItemActive
                  : styles.sidebarItem
              }
              onClick={() => {
                clearMessages();
                clearProfileMessages();
                clearPasswordMessages();

                setActiveSection(
                  "password"
                );
              }}
            >
              <FiLock />

              <span>
                {text(
                  locale,
                  "تغيير كلمة السر",
                  "Change Password"
                )}
              </span>
            </button>
          </aside>

          <section
            className={
              styles.content
            }
          >
            {activeSection ===
              "profile" && (
              <div
                className={
                  styles.sectionCard
                }
              >
                <div
                  className={
                    styles.sectionHeader
                  }
                >
                  <div>
                    <span
                      className={
                        styles.sectionIcon
                      }
                    >
                      <FiEdit3 />
                    </span>

                    <div>
                      <h2>
                        {text(
                          locale,
                          "بيانات الحساب",
                          "Account Information"
                        )}
                      </h2>

                      <p>
                        {text(
                          locale,
                          "قم بتعديل بياناتك الشخصية",
                          "Update your personal information"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  className={
                    styles.form
                  }
                  onSubmit={
                    handleProfileSubmit
                  }
                >
                  <div
                    className={
                      styles.formGrid
                    }
                  >
                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {text(
                          locale,
                          "الاسم",
                          "Name"
                        )}
                      </span>

                      <input
                        type="text"
                        value={name}
                        onChange={(
                          event
                        ) =>
                          setName(
                            event.target.value
                          )
                        }
                        autoComplete="name"
                      />
                    </label>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {text(
                          locale,
                          "البريد الإلكتروني",
                          "Email"
                        )}
                      </span>

                      <input
                        type="email"
                        value={email}
                        onChange={(
                          event
                        ) =>
                          setEmail(
                            event.target.value
                          )
                        }
                        autoComplete="email"
                      />
                    </label>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {text(
                          locale,
                          "رقم الهاتف",
                          "Phone"
                        )}
                      </span>

                      <input
                        type="tel"
                        value={phone}
                        onChange={(
                          event
                        ) =>
                          setPhone(
                            event.target.value
                          )
                        }
                        autoComplete="tel"
                        inputMode="numeric"
                      />
                    </label>
                  </div>

                  <div
                    className={
                      styles.formFooter
                    }
                  >
                    <button
                      type="submit"
                      className={
                        styles.primaryButton
                      }
                      disabled={
                        profileSaving
                      }
                    >
                      {profileSaving ? (
                        <FiRefreshCw
                          className={
                            styles.spin
                          }
                        />
                      ) : (
                        <FiSave />
                      )}

                      <span>
                        {profileSaving
                          ? text(
                              locale,
                              "جاري الحفظ...",
                              "Saving..."
                            )
                          : text(
                              locale,
                              "حفظ التعديلات",
                              "Save Changes"
                            )}
                      </span>
                    </button>
                  </div>

                  {profileMessage && (
                    <div
                      className={`${styles.inlineMessage} ${styles.inlineSuccess}`}
                    >
                      <FiCheck />

                      <span>
                        {profileMessage}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setProfileMessage("")
                        }
                        aria-label={text(
                          locale,
                          "إغلاق",
                          "Close"
                        )}
                      >
                        <FiX />
                      </button>
                    </div>
                  )}

                  {profileError && (
                    <div
                      className={`${styles.inlineMessage} ${styles.inlineError}`}
                    >
                      <FiX />

                      <span>
                        {profileError}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setProfileError("")
                        }
                        aria-label={text(
                          locale,
                          "إغلاق",
                          "Close"
                        )}
                      >
                        <FiX />
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {activeSection ===
              "orders" && (
              <div
                className={
                  styles.sectionCard
                }
              >
                <div
                  className={
                    styles.sectionHeader
                  }
                >
                  <div>
                    <span
                      className={
                        styles.sectionIcon
                      }
                    >
                      <FiPackage />
                    </span>

                    <div>
                      <h2>
                        {text(
                          locale,
                          "طلباتي",
                          "My Orders"
                        )}
                      </h2>

                      <p>
                        {text(
                          locale,
                          "تابع جميع طلباتك وحالتها",
                          "Track all your orders and their status"
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.refreshButton
                    }
                    onClick={
                      refreshOrders
                    }
                    disabled={
                      ordersLoading
                    }
                    aria-label={text(
                      locale,
                      "تحديث الطلبات",
                      "Refresh orders"
                    )}
                  >
                    <FiRefreshCw
                      className={
                        ordersLoading
                          ? styles.spin
                          : ""
                      }
                    />
                  </button>
                </div>

                {ordersLoading ? (
                  <div
                    className={
                      styles.ordersLoading
                    }
                  >
                    <FiRefreshCw
                      className={
                        styles.spin
                      }
                    />

                    <p>
                      {text(
                        locale,
                        "جاري تحميل الطلبات...",
                        "Loading orders..."
                      )}
                    </p>
                  </div>
                ) : orders.length ===
                  0 ? (
                  <div
                    className={
                      styles.emptyOrders
                    }
                  >
                    <span
                      className={
                        styles.emptyIcon
                      }
                    >
                      <FiPackage />
                    </span>

                    <h3>
                      {text(
                        locale,
                        "لا توجد طلبات حتى الآن",
                        "No orders yet"
                      )}
                    </h3>

                    <p>
                      {text(
                        locale,
                        "عندما تقوم بإجراء طلب سيظهر هنا.",
                        "Your orders will appear here once you place an order."
                      )}
                    </p>

                    <button
                      type="button"
                      className={
                        styles.primaryButton
                      }
                      onClick={() =>
                        router.push(
                          `/${locale}/`
                        )
                      }
                    >
                      {text(
                        locale,
                        "تصفح المنتجات",
                        "Shop Now"
                      )}
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      styles.ordersList
                    }
                  >
                    {orders.map(
                      (order) => {
                        const isExpanded =
                          expandedOrderId ===
                          order._id;

                        const canCancel =
                          order.status ===
                          "Pending";

                        return (
                          <article
                            key={
                              order._id
                            }
                            className={
                              styles.orderCard
                            }
                          >
                            <button
                              type="button"
                              className={
                                styles.orderSummary
                              }
                              onClick={() =>
                                setExpandedOrderId(
                                  isExpanded
                                    ? null
                                    : order._id
                                )
                              }
                            >
                              <div
                                className={
                                  styles.orderMain
                                }
                              >
                                <span
                                  className={
                                    styles.orderIcon
                                  }
                                >
                                  <FiPackage />
                                </span>

                                <div>
                                  <strong>
                                    {text(
                                      locale,
                                      "طلب رقم",
                                      "Order"
                                    )}{" "}
                                    #
                                    {order.orderNumber ||
                                      order._id
                                        .slice(
                                          -6
                                        )
                                        .toUpperCase()}
                                  </strong>

                                  <small>
                                    {order.createdAt
                                      ? new Date(
                                          order.createdAt
                                        ).toLocaleDateString(
                                          locale ===
                                            "ar"
                                            ? "ar-EG"
                                            : "en-EG",
                                          {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                          }
                                        )
                                      : ""}
                                  </small>
                                </div>
                              </div>

                              <div
                                className={
                                  styles.orderMeta
                                }
                              >
                                <span
                                  className={`${styles.status} ${
                                    styles[
                                      `status${(
                                        order.status ||
                                        "Pending"
                                      ).replace(
                                        /\s/g,
                                        ""
                                      )}`
                                    ] || ""
                                  }`}
                                >
                                  {getOrderStatus(
                                    order.status,
                                    locale
                                  )}
                                </span>

                                <strong
                                  className={
                                    styles.orderTotal
                                  }
                                >
                                  {money(
                                    order.totalPrice,
                                    locale
                                  )}
                                </strong>

                                <FiChevronDown
                                  className={
                                    isExpanded
                                      ? styles.chevronOpen
                                      : styles.chevron
                                  }
                                />
                              </div>
                            </button>

                            {isExpanded && (
                              <div
                                className={
                                  styles.orderDetails
                                }
                              >
                                <div
                                  className={
                                    styles.orderInfoGrid
                                  }
                                >
                                  <div>
                                    <span>
                                      {text(
                                        locale,
                                        "طريقة الدفع",
                                        "Payment Method"
                                      )}
                                    </span>

                                    <strong>
                                      {getPaymentMethod(
                                        order.paymentMethod,
                                        locale
                                      )}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      {text(
                                        locale,
                                        "الإجمالي الفرعي",
                                        "Subtotal"
                                      )}
                                    </span>

                                    <strong>
                                      {money(
                                        order.subtotal,
                                        locale
                                      )}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      {text(
                                        locale,
                                        "الشحن",
                                        "Shipping"
                                      )}
                                    </span>

                                    <strong>
                                      {money(
                                        order.shipping,
                                        locale
                                      )}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      {text(
                                        locale,
                                        "الإجمالي",
                                        "Total"
                                      )}
                                    </span>

                                    <strong>
                                      {money(
                                        order.totalPrice,
                                        locale
                                      )}
                                    </strong>
                                  </div>
                                </div>

                                {order.products &&
                                  order.products.length >
                                    0 && (
                                    <div
                                      className={
                                        styles.productsList
                                      }
                                    >
                                      <h3>
                                        {text(
                                          locale,
                                          "المنتجات",
                                          "Products"
                                        )}
                                      </h3>

                                      {order.products.map(
                                        (
                                          item,
                                          index
                                        ) => (
                                          <div
                                            key={`${order._id}-${index}`}
                                            className={
                                              styles.productRow
                                            }
                                          >
                                            <img
                                              src={getProductImage(
                                                item.product
                                              )}
                                              alt=""
                                            />

                                            <div
                                              className={
                                                styles.productInfo
                                              }
                                            >
                                              <strong>
                                                {getProductName(
                                                  item.product,
                                                  locale
                                                )}
                                              </strong>

                                              {item
                                                .colorName?.[
                                                locale
                                              ] && (
                                                <small>
                                                  {text(
                                                    locale,
                                                    "اللون",
                                                    "Color"
                                                  )}
                                                  :{" "}
                                                  {
                                                    item
                                                      .colorName[
                                                      locale
                                                    ]
                                                  }
                                                </small>
                                              )}

                                              <small>
                                                {text(
                                                  locale,
                                                  "الكمية",
                                                  "Quantity"
                                                )}
                                                :{" "}
                                                {item.quantity ||
                                                  1}
                                              </small>
                                            </div>

                                            <strong
                                              className={
                                                styles.productPrice
                                              }
                                            >
                                              {money(
                                                (item.priceAtPurchase ||
                                                  0) *
                                                  (item.quantity ||
                                                    1),
                                                locale
                                              )}
                                            </strong>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}

                                {order.shippingAddress && (
                                  <div
                                    className={
                                      styles.addressBox
                                    }
                                  >
                                    <h3>
                                      {text(
                                        locale,
                                        "عنوان الشحن",
                                        "Shipping Address"
                                      )}
                                    </h3>

                                    <p>
                                      {
                                        order
                                          .shippingAddress
                                          .firstName
                                      }{" "}
                                      {
                                        order
                                          .shippingAddress
                                          .lastName
                                      }
                                    </p>

                                    <p>
                                      {
                                        order
                                          .shippingAddress
                                          .address
                                      }
                                    </p>

                                    <p>
                                      {
                                        order
                                          .shippingAddress
                                          .phone
                                      }
                                    </p>
                                  </div>
                                )}

                                {canCancel && (
                                  <div
                                    className={
                                      styles.orderActions
                                    }
                                  >
                                    <button
                                      type="button"
                                      className={
                                        styles.cancelButton
                                      }
                                      onClick={() =>
                                        openCancelConfirmation(
                                          order._id
                                        )
                                      }
                                      disabled={
                                        cancelingOrderId ===
                                        order._id
                                      }
                                    >
                                      {cancelingOrderId ===
                                      order._id ? (
                                        <FiRefreshCw
                                          className={
                                            styles.spin
                                          }
                                        />
                                      ) : (
                                        <FiX />
                                      )}

                                      <span>
                                        {cancelingOrderId ===
                                        order._id
                                          ? text(
                                              locale,
                                              "جاري الإلغاء...",
                                              "Canceling..."
                                            )
                                          : text(
                                              locale,
                                              "إلغاء الطلب",
                                              "Cancel Order"
                                            )}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )}

            {activeSection ===
              "password" && (
              <div
                className={
                  styles.sectionCard
                }
              >
                <div
                  className={
                    styles.sectionHeader
                  }
                >
                  <div>
                    <span
                      className={
                        styles.sectionIcon
                      }
                    >
                      <FiLock />
                    </span>

                    <div>
                      <h2>
                        {text(
                          locale,
                          "تغيير كلمة السر",
                          "Change Password"
                        )}
                      </h2>

                      <p>
                        {text(
                          locale,
                          "استخدم كلمة سر قوية لحماية حسابك",
                          "Use a strong password to protect your account"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  className={
                    styles.form
                  }
                  onSubmit={
                    handlePasswordSubmit
                  }
                >
                  <div
                    className={
                      styles.passwordBox
                    }
                  >
                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {text(
                          locale,
                          "كلمة السر الحالية",
                          "Current Password"
                        )}
                      </span>

                      <input
                        type="password"
                        value={
                          currentPassword
                        }
                        onChange={(
                          event
                        ) =>
                          setCurrentPassword(
                            event.target.value
                          )
                        }
                        autoComplete="current-password"
                      />
                    </label>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {text(
                          locale,
                          "كلمة السر الجديدة",
                          "New Password"
                        )}
                      </span>

                      <input
                        type="password"
                        value={
                          newPassword
                        }
                        onChange={(
                          event
                        ) =>
                          setNewPassword(
                            event.target.value
                          )
                        }
                        autoComplete="new-password"
                      />

                      <small>
                        {text(
                          locale,
                          "يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم ورمز خاص.",
                          "At least 8 characters with uppercase, lowercase, number and special character."
                        )}
                      </small>
                    </label>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        {text(
                          locale,
                          "تأكيد كلمة السر الجديدة",
                          "Confirm New Password"
                        )}
                      </span>

                      <input
                        type="password"
                        value={
                          confirmPassword
                        }
                        onChange={(
                          event
                        ) =>
                          setConfirmPassword(
                            event.target.value
                          )
                        }
                        autoComplete="new-password"
                      />
                    </label>
                  </div>

                  <div
                    className={
                      styles.formFooter
                    }
                  >
                    <button
                      type="submit"
                      className={
                        styles.primaryButton
                      }
                      disabled={
                        passwordSaving
                      }
                    >
                      {passwordSaving ? (
                        <FiRefreshCw
                          className={
                            styles.spin
                          }
                        />
                      ) : (
                        <FiSave />
                      )}

                      <span>
                        {passwordSaving
                          ? text(
                              locale,
                              "جاري الحفظ...",
                              "Saving..."
                            )
                          : text(
                              locale,
                              "تغيير كلمة السر",
                              "Change Password"
                            )}
                      </span>
                    </button>
                  </div>

                  {passwordMessage && (
                    <div
                      className={`${styles.inlineMessage} ${styles.inlineSuccess}`}
                    >
                      <FiCheck />

                      <span>
                        {passwordMessage}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setPasswordMessage("")
                        }
                        aria-label={text(
                          locale,
                          "إغلاق",
                          "Close"
                        )}
                      >
                        <FiX />
                      </button>
                    </div>
                  )}

                  {passwordError && (
                    <div
                      className={`${styles.inlineMessage} ${styles.inlineError}`}
                    >
                      <FiX />

                      <span>
                        {passwordError}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setPasswordError("")
                        }
                        aria-label={text(
                          locale,
                          "إغلاق",
                          "Close"
                        )}
                      >
                        <FiX />
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </section>
        </div>

        <div
          className={
            styles.logoutSection
          }
        >
          <button
            type="button"
            className={`${styles.logoutButton} ${
              loggingOut
                ? styles.logoutButtonLoading
                : ""
            }`}
            onClick={
              handleLogout
            }
            disabled={
              loggingOut
            }
          >
            {loggingOut ? (
              <>
                <span
                  className={
                    styles.logoutSpinner
                  }
                />

                <span>
                  {text(
                    locale,
                    "جاري تسجيل الخروج...",
                    "Logging out..."
                  )}
                </span>
              </>
            ) : (
              <>
                <FiLogOut />

                <span>
                  {text(
                    locale,
                    "تسجيل الخروج",
                    "Log Out"
                  )}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {cancelConfirmOrderId && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCancelConfirmation();
            }
          }}
        >
          <div
            className={
              styles.confirmModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <div
              className={
                styles.confirmIcon
              }
            >
              <FiAlertTriangle />
            </div>

            <h2 id="cancel-order-title">
              {text(
                locale,
                "هل أنت متأكد؟",
                "Are you sure?"
              )}
            </h2>

            <p>
              {text(
                locale,
                "هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
                "Are you sure you want to cancel this order? This action cannot be undone."
              )}
            </p>

            <div
              className={
                styles.confirmActions
              }
            >
              <button
                type="button"
                className={
                  styles.confirmCancelButton
                }
                onClick={
                  closeCancelConfirmation
                }
                disabled={
                  !!cancelingOrderId
                }
              >
                {text(
                  locale,
                  "إلغاء",
                  "Cancel"
                )}
              </button>

              <button
                type="button"
                className={
                  styles.confirmDangerButton
                }
                onClick={() =>
                  handleCancelOrder(
                    cancelConfirmOrderId
                  )
                }
                disabled={
                  !!cancelingOrderId
                }
              >
                <FiCheck />

                <span>
                  {text(
                    locale,
                    "متأكد",
                    "Confirm"
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}