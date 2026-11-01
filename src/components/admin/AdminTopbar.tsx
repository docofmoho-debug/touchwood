"use client";

import Image from "next/image";
import {
  Bell,
  Globe,
  Menu,
  ShoppingCart,
  Package,
  Users,
  CheckCheck,
  X,
  Clock3,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AdminTopbar.module.css";
import {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
} from "@/services/api";

type AdminTopbarProps = {
  onMenuClick: () => void;
};

type AdminUser = {
  name?: string;
  email?: string;
  role?: string;
};

type NotificationItem = {
  _id: string;
  type:
    | "new_order"
    | "order_status"
    | "new_user"
    | "new_product"
    | "low_stock"
    | "out_of_stock";
  title: string;
  message: string;
  read?: boolean;
  createdAt?: string;
  order?: {
    _id?: string;
    orderNumber?: string;
    status?: string;
    totalPrice?: number;
  } | null;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  product?: {
    _id?: string;
    name?: unknown;
    stock?: number;
    price?: number;
  } | null;
};

type NotificationTab =
  | "orders"
  | "products"
  | "users";

const getOrderStatusLabel = (
  status: string | undefined,
  locale: "ar" | "en"
) => {
  if (locale === "ar") {
    switch (status) {
      case "Pending":
        return "قيد الانتظار";
      case "Processing":
        return "قيد التجهيز";
      case "Out for Delivery":
        return "خرج للتوصيل";
      case "Delivered":
        return "تم التوصيل";
      case "Canceled":
        return "ملغي";
      default:
        return status || "غير محدد";
    }
  }

  switch (status) {
    case "Pending":
      return "Pending";
    case "Processing":
      return "Processing";
    case "Out for Delivery":
      return "Out for Delivery";
    case "Delivered":
      return "Delivered";
    case "Canceled":
      return "Canceled";
    default:
      return status || "Unknown";
  }
};

const getLocalizedText = (
  value: unknown,
  locale: "ar" | "en"
) => {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const localizedValue = value as {
      ar?: unknown;
      en?: unknown;
    };

    const preferredValue =
      locale === "ar"
        ? localizedValue.ar
        : localizedValue.en;

    const fallbackValue =
      locale === "ar"
        ? localizedValue.en
        : localizedValue.ar;

    if (typeof preferredValue === "string") {
      return preferredValue;
    }

    if (typeof fallbackValue === "string") {
      return fallbackValue;
    }
  }

  return "";
};

const getLocalizedNotificationContent = (
  notification: NotificationItem,
  locale: "ar" | "en"
) => {
  const orderNumber =
    notification.order?.orderNumber ||
    notification.order?._id ||
    "";

  const productName = getLocalizedText(
    notification.product?.name,
    locale
  );

  const userName =
    notification.user?.name || "";

  if (locale === "ar") {
    switch (notification.type) {
      case "new_order":
        return {
          title: "طلب جديد",
          message: orderNumber
            ? `تم إنشاء طلب جديد رقم #${orderNumber}.`
            : "تم إنشاء طلب جديد.",
        };

      case "order_status":
        return {
          title: "تم تحديث حالة الطلب",
          message: orderNumber
            ? `تم تحديث حالة الطلب رقم #${orderNumber} إلى "${getOrderStatusLabel(
                notification.order?.status,
                "ar"
              )}".`
            : `تم تحديث حالة الطلب إلى "${getOrderStatusLabel(
                notification.order?.status,
                "ar"
              )}".`,
        };

      case "low_stock":
        return {
          title: "مخزون منخفض",
          message: productName
            ? `المنتج "${productName}" أوشك على النفاد.`
            : "أحد المنتجات أوشك على النفاد.",
        };

      case "out_of_stock":
        return {
          title: "نفد المخزون",
          message: productName
            ? `المنتج "${productName}" نفد من المخزون.`
            : "أحد المنتجات نفد من المخزون.",
        };

      case "new_product":
        return {
          title: "منتج جديد",
          message: productName
            ? `تمت إضافة المنتج "${productName}".`
            : "تمت إضافة منتج جديد.",
        };

      case "new_user":
        return {
          title: "مستخدم جديد",
          message: userName
            ? `قام المستخدم "${userName}" بإنشاء حساب جديد.`
            : "قام مستخدم جديد بإنشاء حساب.",
        };

      default:
        return {
          title: "إشعار جديد",
          message: "لديك إشعار جديد.",
        };
    }
  }

  switch (notification.type) {
    case "new_order":
      return {
        title: "New Order",
        message: orderNumber
          ? `A new order #${orderNumber} has been created.`
          : "A new order has been created.",
      };

    case "order_status":
      return {
        title: "Order Status Updated",
        message: orderNumber
          ? `Order #${orderNumber} status has been updated to "${getOrderStatusLabel(
              notification.order?.status,
              "en"
            )}".`
          : `Order status has been updated to "${getOrderStatusLabel(
              notification.order?.status,
              "en"
            )}".`,
      };

    case "low_stock":
      return {
        title: "Low Stock",
        message: productName
          ? `Product "${productName}" is running low on stock.`
          : "A product is running low on stock.",
      };

    case "out_of_stock":
      return {
        title: "Out of Stock",
        message: productName
          ? `Product "${productName}" is out of stock.`
          : "A product is out of stock.",
      };

    case "new_product":
      return {
        title: "New Product",
        message: productName
          ? `Product "${productName}" has been added.`
          : "A new product has been added.",
      };

    case "new_user":
      return {
        title: "New User",
        message: userName
          ? `User "${userName}" has created a new account.`
          : "A new user has registered.",
      };

    default:
      return {
        title: "New Notification",
        message: "You have a new notification.",
      };
  }
};

const getNotificationTypeLabel = (
  type: NotificationItem["type"],
  locale: "ar" | "en"
) => {
  if (locale === "ar") {
    switch (type) {
      case "new_order":
      case "order_status":
        return "الطلبات";

      case "low_stock":
      case "out_of_stock":
      case "new_product":
        return "المنتجات";

      case "new_user":
        return "المستخدمون";

      default:
        return "الإشعارات";
    }
  }

  switch (type) {
    case "new_order":
    case "order_status":
      return "Orders";

    case "low_stock":
    case "out_of_stock":
    case "new_product":
      return "Products";

    case "new_user":
      return "Users";

    default:
      return "Notifications";
  }
};

const getNotificationTone = (
  notification: NotificationItem
) => {
  if (notification.type === "new_order") {
    return "notificationToneSuccess";
  }

  if (notification.type === "order_status") {
    switch (notification.order?.status) {
      case "Delivered":
        return "notificationToneDelivered";

      case "Canceled":
        return "notificationToneDanger";

      case "Out for Delivery":
        return "notificationToneWarning";

      case "Processing":
        return "notificationToneInfo";

      case "Pending":
        return "notificationToneWarning";

      default:
        return "notificationToneDefault";
    }
  }

  if (notification.type === "low_stock") {
    return "notificationToneWarning";
  }

  if (notification.type === "out_of_stock") {
    return "notificationToneDanger";
  }

  if (notification.type === "new_product") {
    return "notificationToneSuccess";
  }

  if (notification.type === "new_user") {
    return "notificationToneInfo";
  }

  return "notificationToneDefault";
};

const formatNotificationDate = (
  dateString: string | undefined,
  locale: "ar" | "en"
) => {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    {
      timeZone: "Africa/Cairo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};

const getNotificationIcon = (
  type: NotificationItem["type"]
) => {
  if (
    type === "new_order" ||
    type === "order_status"
  ) {
    return <ShoppingCart size={18} />;
  }

  if (
    type === "low_stock" ||
    type === "out_of_stock" ||
    type === "new_product"
  ) {
    return <Package size={18} />;
  }

  return <Users size={18} />;
};

export default function AdminTopbar({
  onMenuClick,
}: AdminTopbarProps) {
  const [user, setUser] =
    useState<AdminUser | null>(null);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [isNotificationsOpen, setIsNotificationsOpen] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<NotificationTab>("orders");

  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);

  const [isLoadingNotifications, setIsLoadingNotifications] =
    useState(false);

  const notificationsRef =
    useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const handleOutsideClick = (
      event: MouseEvent
    ) => {
      if (
        !notificationsRef.current?.contains(
          event.target as Node
        )
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [isNotificationsOpen]);

  const pathSegments = pathname
    .split("/")
    .filter(Boolean);

  const currentLocale =
    pathSegments[0] === "en" ? "en" : "ar";

  const otherLocale =
    currentLocale === "ar" ? "en" : "ar";

  const currentLocaleTyped =
    currentLocale as "ar" | "en";

  const adminName = user?.name || "Admin";

  const adminInitial =
    adminName.charAt(0).toUpperCase();

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoadingNotifications(true);

        const token =
          localStorage.getItem("token");

        if (!token) {
          return;
        }

        const response =
          await getAdminNotifications(token);

        const notificationList =
          Array.isArray(response)
            ? response
            : response?.notifications || [];

        setNotifications(notificationList);
      } catch {
        setNotifications([]);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();

    const interval = setInterval(
      fetchNotifications,
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, []);

  const unreadCount =
    notifications.filter(
      (notification) => !notification.read
    ).length;

  const filteredNotifications =
    notifications.filter((notification) => {
      if (activeTab === "orders") {
        return (
          notification.type === "new_order" ||
          notification.type === "order_status"
        );
      }

      if (activeTab === "products") {
        return (
          notification.type === "low_stock" ||
          notification.type === "out_of_stock" ||
          notification.type === "new_product"
        );
      }

      return notification.type === "new_user";
    });

  const handleLanguageChange = () => {
    const newPath = [
      otherLocale,
      ...pathSegments.slice(1),
    ].join("/");

    router.push(`/${newPath}`);
  };

  const handleNotificationClick = async (
    notification: NotificationItem
  ) => {
    setIsNotificationsOpen(false);
    setSelectedNotification(notification);

    if (!notification.read) {
      try {
        const token =
          localStorage.getItem("token");

        if (token) {
          await markAdminNotificationAsRead(
            token,
            notification._id
          );

          setNotifications((current) =>
            current.map((item) =>
              item._id === notification._id
                ? {
                    ...item,
                    read: true,
                  }
                : item
            )
          );
        }
      } catch {
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        return;
      }

      await markAllAdminNotificationsAsRead(
        token
      );

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
        }))
      );
    } catch {
    }
  };

  const closeDetails = () => {
    setSelectedNotification(null);
  };

  const renderNotificationDetails = () => {
    if (!selectedNotification) {
      return null;
    }

    const notification =
      selectedNotification;

    const localizedContent =
      getLocalizedNotificationContent(
        notification,
        currentLocaleTyped
      );

    const notificationTone =
      getNotificationTone(notification);

    const isOrder =
      notification.type === "new_order" ||
      notification.type === "order_status";

    const isProduct =
      notification.type === "low_stock" ||
      notification.type === "out_of_stock" ||
      notification.type === "new_product";

    const isUser =
      notification.type === "new_user";

    const orderNumber =
      notification.order?.orderNumber ||
      notification.order?._id ||
      "";

    const productName = getLocalizedText(
      notification.product?.name,
      currentLocaleTyped
    );

    const userName =
      notification.user?.name || "";

    return (
      <div
        className={styles.detailsOverlay}
        onClick={closeDetails}
      >
        <div
          className={styles.detailsModal}
          onClick={(event) =>
            event.stopPropagation()
          }
          dir={
            currentLocale === "ar"
              ? "rtl"
              : "ltr"
          }
        >
          <div className={styles.detailsHeader}>
            <div
              className={
                styles.detailsTitleWrapper
              }
            >
              <div
                className={`${styles.detailsIcon} ${styles[notificationTone]}`}
              >
                {getNotificationIcon(
                  notification.type
                )}
              </div>

              <div>
                <span
                  className={
                    styles.detailsCategory
                  }
                >
                  {getNotificationTypeLabel(
                    notification.type,
                    currentLocaleTyped
                  )}
                </span>

                <h3
                  className={
                    styles.detailsTitle
                  }
                >
                  {localizedContent.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={closeDetails}
              aria-label={
                currentLocale === "ar"
                  ? "إغلاق"
                  : "Close"
              }
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.detailsBody}>
            <p
              className={
                styles.detailsMessage
              }
            >
              {localizedContent.message}
            </p>

            {isOrder && (
              <div
                className={
                  styles.detailSection
                }
              >
                <div
                  className={
                    styles.detailSectionTitle
                  }
                >
                  <ShoppingCart
                    size={17}
                  />

                  <span>
                    {currentLocale ===
                    "ar"
                      ? "تفاصيل الطلب"
                      : "Order Details"}
                  </span>
                </div>

                <div
                  className={
                    styles.detailGrid
                  }
                >
                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "رقم الطلب"
                        : "Order Number"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {orderNumber
                        ? `#${orderNumber}`
                        : currentLocale ===
                          "ar"
                        ? "غير متوفر"
                        : "Not Available"}
                    </strong>
                  </div>

                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "حالة الطلب"
                        : "Order Status"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {getOrderStatusLabel(
                        notification.order
                          ?.status,
                        currentLocaleTyped
                      )}
                    </strong>
                  </div>

                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "إجمالي الطلب"
                        : "Order Total"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {typeof notification
                        .order
                        ?.totalPrice ===
                      "number"
                        ? `${notification.order.totalPrice.toLocaleString(
                            currentLocale ===
                              "ar"
                              ? "ar-EG"
                              : "en-US"
                          )} ${
                            currentLocale ===
                            "ar"
                              ? "جنيه"
                              : "EGP"
                          }`
                        : currentLocale ===
                          "ar"
                        ? "غير متوفر"
                        : "Not Available"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {isProduct && (
              <div
                className={
                  styles.detailSection
                }
              >
                <div
                  className={
                    styles.detailSectionTitle
                  }
                >
                  <Package size={17} />

                  <span>
                    {currentLocale ===
                    "ar"
                      ? "تفاصيل المنتج"
                      : "Product Details"}
                  </span>
                </div>

                <div
                  className={
                    styles.detailGrid
                  }
                >
                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "اسم المنتج"
                        : "Product Name"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {productName ||
                        (currentLocale ===
                        "ar"
                          ? "غير متوفر"
                          : "Not Available")}
                    </strong>
                  </div>

                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "المخزون"
                        : "Stock"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {typeof notification
                        .product
                        ?.stock ===
                      "number"
                        ? notification.product.stock
                        : currentLocale ===
                          "ar"
                        ? "غير متوفر"
                        : "Not Available"}
                    </strong>
                  </div>

                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "السعر"
                        : "Price"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {typeof notification
                        .product
                        ?.price ===
                      "number"
                        ? `${notification.product.price.toLocaleString(
                            currentLocale ===
                              "ar"
                              ? "ar-EG"
                              : "en-US"
                          )} ${
                            currentLocale ===
                            "ar"
                              ? "جنيه"
                              : "EGP"
                          }`
                        : currentLocale ===
                          "ar"
                        ? "غير متوفر"
                        : "Not Available"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {isUser && (
              <div
                className={
                  styles.detailSection
                }
              >
                <div
                  className={
                    styles.detailSectionTitle
                  }
                >
                  <Users size={17} />

                  <span>
                    {currentLocale ===
                    "ar"
                      ? "بيانات المستخدم"
                      : "User Details"}
                  </span>
                </div>

                <div
                  className={
                    styles.detailGrid
                  }
                >
                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "الاسم"
                        : "Name"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {userName ||
                        (currentLocale ===
                        "ar"
                          ? "غير متوفر"
                          : "Not Available")}
                    </strong>
                  </div>

                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "البريد الإلكتروني"
                        : "Email"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {notification.user
                        ?.email ||
                        (currentLocale ===
                        "ar"
                          ? "غير متوفر"
                          : "Not Available")}
                    </strong>
                  </div>

                  <div>
                    <span
                      className={
                        styles.detailLabel
                      }
                    >
                      {currentLocale ===
                      "ar"
                        ? "رقم الهاتف"
                        : "Phone"}
                    </span>

                    <strong
                      className={
                        styles.detailValue
                      }
                    >
                      {notification.user
                        ?.phone ||
                        (currentLocale ===
                        "ar"
                          ? "غير متوفر"
                          : "Not Available")}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <div
              className={styles.detailsDate}
            >
              <Clock3 size={16} />

              <span>
                {formatNotificationDate(
                  notification.createdAt,
                  currentLocaleTyped
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label={
            currentLocale === "ar"
              ? "فتح القائمة"
              : "Open menu"
          }
        >
          <Menu size={24} />
        </button>

        <div className={styles.logoWrapper}>
          <Image
            src="/logo/logo.jpeg"
            alt="Touch Wood"
            width={115}
            height={44}
            priority
            className={styles.logo}
          />

          <span
            className={styles.brandName}
          >
            {currentLocale === "ar"
              ? "تاتش وود للأثاث المكتبي"
              : "Touch Wood Furniture"}
          </span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleLanguageChange}
          aria-label={
            currentLocale === "ar"
              ? "تغيير اللغة"
              : "Change language"
          }
        >
          <Globe size={21} />

          <span>
            {currentLocale === "ar"
              ? "EN"
              : "AR"}
          </span>
        </button>

        <div
          ref={notificationsRef}
          className={
            styles.notificationWrapper
          }
        >
          <button
            type="button"
            className={styles.iconButton}
            onClick={() =>
              setIsNotificationsOpen(
                (current) => !current
              )
            }
            aria-label={
              currentLocale === "ar"
                ? "الإشعارات"
                : "Notifications"
            }
          >
            <Bell size={21} />

            {unreadCount > 0 && (
              <span
                className={
                  styles.notificationBadge
                }
              >
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div
              className={
                styles.notificationPanel
              }
              dir={
                currentLocale === "ar"
                  ? "rtl"
                  : "ltr"
              }
            >
              <div
                className={
                  styles.notificationHeader
                }
              >
                <div>
                  <h3>
                    {currentLocale ===
                    "ar"
                      ? "الإشعارات"
                      : "Notifications"}
                  </h3>

                  <span>
                    {unreadCount > 0
                      ? currentLocale ===
                        "ar"
                        ? `${unreadCount} إشعار غير مقروء`
                        : `${unreadCount} unread notification${
                            unreadCount > 1
                              ? "s"
                              : ""
                          }`
                      : currentLocale ===
                        "ar"
                      ? "لا توجد إشعارات غير مقروءة"
                      : "No unread notifications"}
                  </span>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className={
                      styles.markAllButton
                    }
                    onClick={
                      handleMarkAllAsRead
                    }
                  >
                    <CheckCheck
                      size={16}
                    />

                    <span>
                      {currentLocale ===
                      "ar"
                        ? "قراءة الكل"
                        : "Mark all as read"}
                    </span>
                  </button>
                )}
              </div>

              <div
                className={
                  styles.notificationTabs
                }
              >
                <button
                  type="button"
                  className={
                    activeTab === "orders"
                      ? styles.activeTab
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("orders")
                  }
                >
                  <ShoppingCart
                    size={16}
                  />

                  <span>
                    {currentLocale ===
                    "ar"
                      ? "الطلبات"
                      : "Orders"}
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "products"
                      ? styles.activeTab
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(
                      "products"
                    )
                  }
                >
                  <Package size={16} />

                  <span>
                    {currentLocale ===
                    "ar"
                      ? "المنتجات"
                      : "Products"}
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "users"
                      ? styles.activeTab
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("users")
                  }
                >
                  <Users size={16} />

                  <span>
                    {currentLocale ===
                    "ar"
                      ? "المستخدمون"
                      : "Users"}
                  </span>
                </button>
              </div>

              <div
                className={
                  styles.notificationList
                }
              >
                {isLoadingNotifications ? (
                  <div
                    className={
                      styles.emptyNotifications
                    }
                  >
                    <span
                      className={
                        styles.loadingSpinner
                      }
                    />

                    <span>
                      {currentLocale ===
                      "ar"
                        ? "جاري تحميل الإشعارات..."
                        : "Loading notifications..."}
                    </span>
                  </div>
                ) : filteredNotifications.length ===
                  0 ? (
                  <div
                    className={
                      styles.emptyNotifications
                    }
                  >
                    <Bell size={28} />

                    <span>
                      {currentLocale ===
                      "ar"
                        ? "لا توجد إشعارات"
                        : "No notifications"}
                    </span>
                  </div>
                ) : (
                  filteredNotifications.map(
                    (notification) => {
                      const localizedContent =
                        getLocalizedNotificationContent(
                          notification,
                          currentLocaleTyped
                        );

                      const notificationTone =
                        getNotificationTone(
                          notification
                        );

                      return (
                        <button
                          type="button"
                          key={
                            notification._id
                          }
                          className={`${styles.notificationItem} ${
                            !notification.read
                              ? styles.unreadNotification
                              : ""
                          }`}
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                        >
                          <div
                            className={`${styles.notificationItemIcon} ${styles[notificationTone]}`}
                          >
                            {getNotificationIcon(
                              notification.type
                            )}
                          </div>

                          <div
                            className={
                              styles.notificationItemContent
                            }
                          >
                            <div
                              className={
                                styles.notificationItemTop
                              }
                            >
                              <strong>
                                {
                                  localizedContent.title
                                }
                              </strong>

                              {!notification.read && (
                                <span
                                  className={
                                    styles.unreadDot
                                  }
                                />
                              )}
                            </div>

                            <p>
                              {
                                localizedContent.message
                              }
                            </p>

                            <div
                              className={
                                styles.notificationState
                              }
                            >
                              <span>
                                {formatNotificationDate(
                                  notification.createdAt,
                                  currentLocaleTyped
                                )}
                              </span>

                              <span>
                                {notification.read
                                  ? currentLocale ===
                                    "ar"
                                    ? "مقروء"
                                    : "Read"
                                  : currentLocale ===
                                    "ar"
                                  ? "جديد"
                                  : "New"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.separator} />

        <div className={styles.profile}>
          <div
            className={styles.profileAvatar}
          >
            {adminInitial}
          </div>

          <div
            className={styles.profileInfo}
          >
            <span
              className={styles.profileName}
            >
              {adminName}
            </span>

            <span
              className={styles.profileRole}
            >
              {currentLocale === "ar"
                ? user?.role === "admin"
                  ? "مدير النظام"
                  : "مدير"
                : user?.role === "admin"
                ? "Administrator"
                : "Admin"}
            </span>
          </div>
        </div>
      </div>

      {renderNotificationDetails()}
    </header>
  );
}
