"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  Box,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  PackageCheck,
  ShoppingBag,
  Truck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  getAdminDashboard,
} from "@/services/api";
import "./dashboard.css";

type Locale = "ar" | "en";

type LocalizedValue =
  | string
  | number
  | null
  | undefined
  | {
      ar?: string | number | null;
      en?: string | number | null;
    };

type SalesOverview = {
  date: string;
  sales: number;
  orders: number;
};

type DashboardStats = {
  totalSales?: number;
  totalOrders?: number;
  totalUsers?: number;
  totalProducts?: number;
  recentOrders?: Order[];
  salesOverview?: SalesOverview[];
  orderStatusStats?: {
    Pending?: number;
    Processing?: number;
    "Out for Delivery"?: number;
    Delivered?: number;
    Canceled?: number;
  };
};

type OrderProduct = {
  _id?: string;
  name?: LocalizedValue;
  quantity?: number;
  price?: number;
  product?: {
    _id?: string;
    name?: LocalizedValue;
    price?: number;
    images?: string[];
  };
};

type OrderUser = {
  _id?: string;
  name?: LocalizedValue;
  email?: LocalizedValue;
  phone?: LocalizedValue;
  role?: LocalizedValue;
};

type ShippingAddress = {
  name?: LocalizedValue;
  firstName?: LocalizedValue;
  lastName?: LocalizedValue;
  phone?: LocalizedValue;
  email?: LocalizedValue;
  address?: LocalizedValue;
  city?: LocalizedValue;
};

type Order = {
  _id: string;
  orderNumber?: LocalizedValue;
  status?: LocalizedValue;
  totalPrice?: number;
  total?: number;
  createdAt: string;
  paymentMethod?: LocalizedValue;
  shippingAddress?: ShippingAddress;
  user?: OrderUser | null;
  products?: OrderProduct[];
  items?: OrderProduct[];
};

const text = (
  locale: Locale,
  ar: string,
  en: string
) => (locale === "ar" ? ar : en);

const displayValue = (
  value: LocalizedValue,
  locale: Locale,
  fallback = "—"
): string => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const localized =
      value[locale] ??
      value.en ??
      value.ar;

    if (
      localized === null ||
      localized === undefined ||
      localized === ""
    ) {
      return fallback;
    }

    return String(localized);
  }

  return String(value);
};

const formatCurrency = (
  value: number,
  locale: Locale
) => {
  return new Intl.NumberFormat(
    locale === "ar"
      ? "ar-EG"
      : "en-US",
    {
      maximumFractionDigits: 0,
    }
  ).format(value || 0);
};

const getOrderTotal = (
  order: Order
) => {
  return Number(
    order.totalPrice ??
      order.total ??
      0
  );
};

const getOrderProducts = (
  order: Order
) => {
  return order.products || order.items || [];
};

const getEgyptDate = (
  dateString: string
) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Africa/Cairo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
};

const getEgyptDateKey = (
  dateString: string
) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (item) => item.type === "year"
    )?.value || "";

  const month =
    parts.find(
      (item) => item.type === "month"
    )?.value || "";

  const day =
    parts.find(
      (item) => item.type === "day"
    )?.value || "";

  return `${year}-${month}-${day}`;
};

const getStatusLabel = (
  status: LocalizedValue,
  locale: Locale
) => {
  if (
    status &&
    typeof status === "object"
  ) {
    return displayValue(
      status,
      locale
    );
  }

  const labels: Record<
    string,
    [string, string]
  > = {
    Pending: [
      "قيد الانتظار",
      "Pending",
    ],
    Processing: [
      "قيد التجهيز",
      "Processing",
    ],
    "Out for Delivery": [
      "خرج للتوصيل",
      "Out for Delivery",
    ],
    Delivered: [
      "تم التسليم",
      "Delivered",
    ],
    Canceled: [
      "ملغي",
      "Canceled",
    ],
  };

  const current =
    labels[String(status || "")] || [
      String(status || "—"),
      String(status || "—"),
    ];

  return locale === "ar"
    ? current[0]
    : current[1];
};

const getPaymentLabel = (
  paymentMethod: LocalizedValue,
  locale: Locale
) => {
  if (
    paymentMethod &&
    typeof paymentMethod === "object"
  ) {
    return displayValue(
      paymentMethod,
      locale
    );
  }

  const labels: Record<
    string,
    [string, string]
  > = {
    "Cash On Delivery": [
      "الدفع عند الاستلام",
      "Cash On Delivery",
    ],
    "Vodafone Cash": [
      "فودافون كاش او انستاباي على الرقم 01142447767",
      "Vodafone Cash or instapay on 01142447767",
    ],
  };

  const current =
    labels[
      String(paymentMethod || "")
    ] || [
      String(paymentMethod || "—"),
      String(paymentMethod || "—"),
    ];

  return locale === "ar"
    ? current[0]
    : current[1];
};

const getDateParts = (
  dateKey: string
) => {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  return {
    year,
    month,
    day,
  };
};

const formatDayLabel = (
  dateKey: string,
  locale: Locale
) => {
  const {
    year,
    month,
    day,
  } = getDateParts(dateKey);

  return new Intl.DateTimeFormat(
    locale === "ar"
      ? "ar-EG"
      : "en-US",
    {
      day: "numeric",
      month: "short",
      timeZone: "Africa/Cairo",
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    )
  );
};

const formatMonthLabel = (
  year: number,
  month: number,
  locale: Locale
) => {
  return new Intl.DateTimeFormat(
    locale === "ar"
      ? "ar-EG"
      : "en-US",
    {
      month: "short",
      year: "numeric",
      timeZone: "Africa/Cairo",
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        1
      )
    )
  );
};

const shiftDate = (
  dateKey: string,
  amount: number
) => {
  const {
    year,
    month,
    day,
  } = getDateParts(dateKey);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  date.setUTCDate(
    date.getUTCDate() + amount
  );

  return date
    .toISOString()
    .slice(0, 10);
};

const getTodayKey = () => {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(new Date());

  const year =
    parts.find(
      (item) => item.type === "year"
    )?.value || "";

  const month =
    parts.find(
      (item) => item.type === "month"
    )?.value || "";

  const day =
    parts.find(
      (item) => item.type === "day"
    )?.value || "";

  return `${year}-${month}-${day}`;
};

const formatEgyptInputDate = (
  dateKey: string
) => {
  if (!dateKey) return "";

  const {
    year,
    month,
    day,
  } = getDateParts(dateKey);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  return `${String(day).padStart(
    2,
    "0"
  )}/${String(month).padStart(
    2,
    "0"
  )}/${year}`;
};

const parseEgyptInputDate = (
  value: string
) => {
  const cleaned =
    value.replace(
      /\D/g,
      ""
    );

  if (
    cleaned.length !== 8
  ) {
    return "";
  }

  const day = Number(
    cleaned.slice(0, 2)
  );

  const month = Number(
    cleaned.slice(2, 4)
  );

  const year = Number(
    cleaned.slice(4, 8)
  );

  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 2000
  ) {
    return "";
  }

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  const today =
    getTodayKey();

  const selected =
    `${year}-${String(
      month
    ).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

  if (selected > today) {
    return "";
  }

  return selected;
};

export default function AdminDashboardPage() {
  const params = useParams<{
    locale?: string;
  }>();

  const locale: Locale =
    params.locale === "en"
      ? "en"
      : "ar";

  const isArabic =
    locale === "ar";

  const [
    dashboard,
    setDashboard,
  ] = useState<DashboardStats | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    period,
    setPeriod,
  ] = useState<
    "7" |
    "month" |
    "year" |
    "all"
  >("7");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    selectedDateInput,
    setSelectedDateInput,
  ] = useState("");

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<Order | null>(
    null
  );

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        ""
      : "";

  useEffect(() => {
    const loadDashboard =
      async () => {
        if (!token) {
          setError(
            text(
              locale,
              "انتهت جلسة تسجيل الدخول",
              "Your session has expired"
            )
          );

          setLoading(false);
          return;
        }

        try {
          const response =
            await getAdminDashboard(
              token
            );

          setDashboard(response);
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : text(
                  locale,
                  "تعذر تحميل الداشبورد",
                  "Unable to load dashboard"
                )
          );
        } finally {
          setLoading(false);
        }
      };

    loadDashboard();
  }, []);

  const chartData = useMemo(() => {
    const source =
      dashboard?.salesOverview || [];

    const today =
      getTodayKey();

    if (selectedDate) {
      const item =
        source.find(
          (entry) =>
            entry.date ===
            selectedDate
        );

      return [
        {
          key: selectedDate,
          label:
            formatDayLabel(
              selectedDate,
              locale
            ),
          orders:
            item?.orders || 0,
          sales:
            item?.sales || 0,
        },
      ];
    }

    if (
      period === "7" ||
      period === "month"
    ) {
      const days =
        period === "7"
          ? 7
          : 30;

      const startDate =
        shiftDate(
          today,
          -(days - 1)
        );

      const sourceMap =
        new Map(
          source.map(
            (item) => [
              item.date,
              item,
            ]
          )
        );

      return Array.from(
        {
          length: days,
        },
        (_, index) => {
          const date =
            shiftDate(
              startDate,
              index
            );

          const item =
            sourceMap.get(date);

          return {
            key: date,
            label: formatDayLabel(
              date,
              locale
            ),
            orders:
              item?.orders || 0,
            sales:
              item?.sales || 0,
          };
        }
      );
    }

    if (period === "all") {
      const grouped =
        new Map<
          string,
          {
            year: number;
            month: number;
            orders: number;
            sales: number;
          }
        >();

      source.forEach(
        (item) => {
          const {
            year,
            month,
          } = getDateParts(
            item.date
          );

          const key = `${year}-${String(
            month
          ).padStart(2, "0")}`;

          const current =
            grouped.get(key) || {
              year,
              month,
              orders: 0,
              sales: 0,
            };

          current.orders +=
            item.orders || 0;

          current.sales +=
            item.sales || 0;

          grouped.set(
            key,
            current
          );
        }
      );

      return Array.from(
        grouped.values()
      )
        .sort(
          (a, b) =>
            a.year - b.year ||
            a.month - b.month
        )
        .map(
          (item) => ({
            key: `${item.year}-${String(
              item.month
            ).padStart(2, "0")}`,
            label:
              formatMonthLabel(
                item.year,
                item.month,
                locale
              ),
            orders:
              item.orders,
            sales:
              item.sales,
          })
        );
    }

    const grouped =
      new Map<
        string,
        {
          year: number;
          month: number;
          orders: number;
          sales: number;
        }
      >();

    source.forEach(
      (item) => {
        const {
          year,
          month,
        } = getDateParts(
          item.date
        );

        const key = `${year}-${String(
          month
        ).padStart(2, "0")}`;

        const current =
          grouped.get(key) || {
            year,
            month,
            orders: 0,
            sales: 0,
          };

        current.orders +=
          item.orders || 0;

        current.sales +=
          item.sales || 0;

        grouped.set(
          key,
          current
        );
      }
    );

    return Array.from(
      grouped.values()
    )
      .sort(
        (a, b) =>
          a.year - b.year ||
          a.month - b.month
      )
      .map(
        (item) => ({
          key: `${item.year}-${String(
            item.month
          ).padStart(2, "0")}`,
          label:
            formatMonthLabel(
              item.year,
              item.month,
              locale
            ),
          orders:
            item.orders,
          sales:
            item.sales,
        })
      );
  }, [
    dashboard,
    period,
    selectedDate,
    locale,
  ]);

  const maxOrders =
    Math.max(
      ...chartData.map(
        (item) => item.orders
      ),
      1
    );

  const statuses = [
    {
      key: "Pending",
      labelAr: "قيد الانتظار",
      labelEn: "Pending",
      icon: Clock3,
      className:
        "dashboard-status-pending",
    },
    {
      key: "Processing",
      labelAr: "قيد التجهيز",
      labelEn: "Processing",
      icon: PackageCheck,
      className:
        "dashboard-status-processing",
    },
    {
      key: "Out for Delivery",
      labelAr: "خرج للتوصيل",
      labelEn: "Out for Delivery",
      icon: Truck,
      className:
        "dashboard-status-delivery",
    },
    {
      key: "Delivered",
      labelAr: "تم التسليم",
      labelEn: "Delivered",
      icon: CheckCircle2,
      className:
        "dashboard-status-delivered",
    },
    {
      key: "Canceled",
      labelAr: "ملغي",
      labelEn: "Canceled",
      icon: XCircle,
      className:
        "dashboard-status-canceled",
    },
  ];

  const stats = [
    {
      titleAr: "إجمالي المبيعات",
      titleEn: "Total Sales",
      value: `${formatCurrency(
        Number(
          dashboard?.totalSales || 0
        ),
        locale
      )} EGP`,
      icon: DollarSign,
      className:
        "dashboard-stat-sales",
    },
    {
      titleAr: "إجمالي الطلبات",
      titleEn: "Total Orders",
      value: formatCurrency(
        Number(
          dashboard?.totalOrders || 0
        ),
        locale
      ),
      icon: ShoppingBag,
      className:
        "dashboard-stat-orders",
    },
    {
      titleAr: "إجمالي المستخدمين",
      titleEn: "Total Users",
      value: formatCurrency(
        Number(
          dashboard?.totalUsers || 0
        ),
        locale
      ),
      icon: Users,
      className:
        "dashboard-stat-users",
    },
    {
      titleAr: "إجمالي المنتجات",
      titleEn: "Total Products",
      value: formatCurrency(
        Number(
          dashboard?.totalProducts || 0
        ),
        locale
      ),
      icon: Box,
      className:
        "dashboard-stat-products",
    },
  ];

  if (loading) {
    return (
      <main
        className="dashboard-page"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <div className="dashboard-loading">
          {text(
            locale,
            "جاري تحميل الداشبورد...",
            "Loading dashboard..."
          )}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        className="dashboard-page"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <div className="dashboard-error">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main
      className="dashboard-page"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              TOUCHWOOD
            </span>

            <h1>
              {text(
                locale,
                "لوحة التحكم",
                "Dashboard"
              )}
            </h1>

            <p>
              {text(
                locale,
                "نظرة عامة على أداء المتجر والطلبات",
                "Overview of your store performance and orders"
              )}
            </p>
          </div>

          <div className="dashboard-date">
            <CalendarDays size={17} />

            {new Intl.DateTimeFormat(
              locale === "ar"
                ? "ar-EG"
                : "en-US",
              {
                timeZone:
                  "Africa/Cairo",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            ).format(new Date())}
          </div>
        </header>

        <section className="dashboard-stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className={`dashboard-stat-card ${stat.className}`}
                key={stat.titleEn}
              >
                <div className="dashboard-stat-top">
                  <div className="dashboard-stat-icon">
                    <Icon size={21} />
                  </div>
                </div>

                <div className="dashboard-stat-content">
                  <span>
                    {text(
                      locale,
                      stat.titleAr,
                      stat.titleEn
                    )}
                  </span>

                  <strong>
                    {stat.value}
                  </strong>
                </div>
              </div>
            );
          })}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2>
                {text(
                  locale,
                  "حالات الطلبات",
                  "Order Status"
                )}
              </h2>

              <p>
                {text(
                  locale,
                  "توزيع جميع الطلبات حسب الحالة الحالية",
                  "All orders grouped by their current status"
                )}
              </p>
            </div>
          </div>

          <div className="dashboard-status-grid">
            {statuses.map((status) => {
              const Icon = status.icon;

              const count =
                dashboard
                  ?.orderStatusStats?.[
                  status.key as keyof typeof dashboard.orderStatusStats
                ] || 0;

              return (
                <div
                  className={`dashboard-status-card ${status.className}`}
                  key={status.key}
                >
                  <div className="dashboard-status-icon">
                    <Icon size={20} />
                  </div>

                  <div className="dashboard-status-info">
                    <span>
                      {text(
                        locale,
                        status.labelAr,
                        status.labelEn
                      )}
                    </span>

                    <strong>
                      {formatCurrency(
                        Number(count),
                        locale
                      )}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="dashboard-performance-grid">
          <div className="dashboard-performance-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  {text(
                    locale,
                    "أداء المتجر",
                    "Store Performance"
                  )}
                </h2>

                <p>
                  {selectedDate
                    ? text(
                        locale,
                        "بيانات اليوم المحدد",
                        "Data for the selected day"
                      )
                    : text(
                        locale,
                        "عدد الطلبات خلال الفترة المحددة",
                        "Number of orders during the selected period"
                      )}
                </p>
              </div>

              <div className="dashboard-period-filter">
                <button
                  type="button"
                  className={
                    period === "7" &&
                    !selectedDate
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setSelectedDate("");
                    setSelectedDateInput("");
                    setPeriod("7");
                  }}
                >
                  {text(
                    locale,
                    "7 أيام",
                    "7 Days"
                  )}
                </button>

                <button
                  type="button"
                  className={
                    period === "month" &&
                    !selectedDate
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setSelectedDate("");
                    setSelectedDateInput("");
                    setPeriod("month");
                  }}
                >
                  {text(
                    locale,
                    "شهر",
                    "Month"
                  )}
                </button>

                <button
                  type="button"
                  className={
                    period === "year" &&
                    !selectedDate
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setSelectedDate("");
                    setSelectedDateInput("");
                    setPeriod("year");
                  }}
                >
                  {text(
                    locale,
                    "سنة",
                    "Year"
                  )}
                </button>

                <button
                  type="button"
                  className={
                    period === "all" &&
                    !selectedDate
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setSelectedDate("");
                    setSelectedDateInput("");
                    setPeriod("all");
                  }}
                >
                  {text(
                    locale,
                    "الكل",
                    "All"
                  )}
                </button>

                <div className="dashboard-date-filter">
                  <CalendarDays size={16} />

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={text(
                      locale,
                      "DD/MM/YYYY",
                      "DD/MM/YYYY"
                    )}
                    value={
                      selectedDateInput
                    }
                    maxLength={10}
                    onChange={(event) => {
                      let value =
                        event.target.value.replace(
                          /\D/g,
                          ""
                        );

                      if (
                        value.length >
                        8
                      ) {
                        value =
                          value.slice(
                            0,
                            8
                          );
                      }

                      if (
                        value.length >
                        4
                      ) {
                        value = `${value.slice(
                          0,
                          2
                        )}/${value.slice(
                          2,
                          4
                        )}/${value.slice(
                          4
                        )}`;
                      } else if (
                        value.length >
                        2
                      ) {
                        value = `${value.slice(
                          0,
                          2
                        )}/${value.slice(
                          2
                        )}`;
                      }

                      setSelectedDateInput(
                        value
                      );

                      if (
                        value.length ===
                        10
                      ) {
                        const parsed =
                          parseEgyptInputDate(
                            value
                          );

                        if (parsed) {
                          setSelectedDate(
                            parsed
                          );
                        } else {
                          setSelectedDate(
                            ""
                          );
                        }
                      } else {
                        setSelectedDate(
                          ""
                        );
                      }
                    }}
                    onBlur={() => {
                      if (
                        selectedDate
                      ) {
                        setSelectedDateInput(
                          formatEgyptInputDate(
                            selectedDate
                          )
                        );
                      }
                    }}
                    aria-label={text(
                      locale,
                      "اختيار التاريخ",
                      "Select date"
                    )}
                  />
                </div>

                {selectedDate && (
                  <button
                    type="button"
                    className="dashboard-date-clear"
                    onClick={() => {
                      setSelectedDate("");
                      setSelectedDateInput("");
                    }}
                    aria-label={text(
                      locale,
                      "مسح التاريخ",
                      "Clear date"
                    )}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="dashboard-chart">
              {chartData.length ===
              0 ? (
                <div className="dashboard-empty">
                  {text(
                    locale,
                    "لا توجد بيانات متاحة",
                    "No data available"
                  )}
                </div>
              ) : (
                <div className="dashboard-chart-bars">
                  {chartData.map(
                    (item) => {
                      const height =
                        Math.max(
                          (item.orders /
                            maxOrders) *
                            100,
                          item.orders > 0
                            ? 7
                            : 0
                        );

                      return (
                        <div
                          className="dashboard-chart-column"
                          key={item.key}
                        >
                          <div className="dashboard-chart-value">
                            {item.orders}
                          </div>

                          <div className="dashboard-chart-track">
                            <div
                              className="dashboard-chart-bar"
                              style={{
                                height: `${height}%`,
                              }}
                            />
                          </div>

                          <span>
                            {item.label}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {selectedDate && (
              <div className="dashboard-selected-date">
                <CalendarDays size={15} />

                <span>
                  {text(
                    locale,
                    "التاريخ المحدد:",
                    "Selected date:"
                  )}
                </span>

                <strong>
                  {new Intl.DateTimeFormat(
                    locale === "ar"
                      ? "ar-EG"
                      : "en-US",
                    {
                      timeZone:
                        "Africa/Cairo",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  ).format(
                    new Date(
                      `${selectedDate}T12:00:00`
                    )
                  )}
                </strong>
              </div>
            )}
          </div>

          <div className="dashboard-recent-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  {text(
                    locale,
                    "أحدث الطلبات",
                    "Recent Orders"
                  )}
                </h2>

                <p>
                  {text(
                    locale,
                    "آخر الطلبات المسجلة في المتجر",
                    "Latest orders placed in the store"
                  )}
                </p>
              </div>
            </div>

            <div className="dashboard-recent-list">
              {(dashboard?.recentOrders ||
                []).length === 0 ? (
                <div className="dashboard-empty">
                  {text(
                    locale,
                    "لا توجد طلبات حتى الآن",
                    "No orders yet"
                  )}
                </div>
              ) : (
                dashboard?.recentOrders?.map(
                  (order) => {
                    const orderNumber =
                      displayValue(
                        order.orderNumber,
                        locale,
                        `#${order._id
                          .slice(
                            -6
                          )
                          .toUpperCase()}`
                      );

                    const customerName =
                      displayValue(
                        order.user?.name ||
                          order.shippingAddress
                            ?.name ||
                          order.shippingAddress
                            ?.firstName,
                        locale,
                        text(
                          locale,
                          "ضيف",
                          "Guest"
                        )
                      );

                    return (
                      <button
                        type="button"
                        className="dashboard-order-row"
                        key={order._id}
                        onClick={() =>
                          setSelectedOrder(
                            order
                          )
                        }
                      >
                        <div className="dashboard-order-main">
                          <div className="dashboard-order-icon">
                            <ShoppingBag
                              size={17}
                            />
                          </div>

                          <div>
                            <strong>
                              {orderNumber}
                            </strong>

                            <span>
                              {customerName}
                            </span>
                          </div>
                        </div>

                        <div className="dashboard-order-side">
                          <strong>
                            {formatCurrency(
                              getOrderTotal(
                                order
                              ),
                              locale
                            )}{" "}
                            EGP
                          </strong>

                          <span>
                            {getEgyptDate(
                              order.createdAt
                            )}
                          </span>
                        </div>

                        <Eye
                          size={17}
                          className="dashboard-order-eye"
                        />
                      </button>
                    );
                  }
                )
              )}
            </div>
          </div>
        </section>
      </div>

      {selectedOrder && (
        <div
          className="dashboard-modal-overlay"
          onMouseDown={() =>
            setSelectedOrder(null)
          }
        >
          <div
            className="dashboard-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="dashboard-modal-header">
              <div>
                <span>
                  {text(
                    locale,
                    "تفاصيل الطلب",
                    "Order Details"
                  )}
                </span>

                <h2>
                  {displayValue(
                    selectedOrder.orderNumber,
                    locale,
                    `#${selectedOrder._id
                      .slice(-6)
                      .toUpperCase()}`
                  )}
                </h2>
              </div>

              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="dashboard-modal-body">
              <div className="dashboard-modal-grid">
                <div className="dashboard-modal-item">
                  <span>
                    {text(
                      locale,
                      "العميل",
                      "Customer"
                    )}
                  </span>

                  <strong>
                    {displayValue(
                      selectedOrder.user
                        ?.name ||
                        selectedOrder
                          .shippingAddress
                          ?.name ||
                        selectedOrder
                          .shippingAddress
                          ?.firstName,
                      locale,
                      text(
                        locale,
                        "ضيف",
                        "Guest"
                      )
                    )}
                  </strong>
                </div>

                <div className="dashboard-modal-item">
                  <span>
                    {text(
                      locale,
                      "الهاتف",
                      "Phone"
                    )}
                  </span>

                  <strong>
                    {displayValue(
                      selectedOrder.user
                        ?.phone ||
                        selectedOrder
                          .shippingAddress
                          ?.phone,
                      locale
                    )}
                  </strong>
                </div>

                <div className="dashboard-modal-item">
                  <span>
                    {text(
                      locale,
                      "الحالة",
                      "Status"
                    )}
                  </span>

                  <strong>
                    {getStatusLabel(
                      selectedOrder.status,
                      locale
                    )}
                  </strong>
                </div>

                <div className="dashboard-modal-item">
                  <span>
                    {text(
                      locale,
                      "طريقة الدفع",
                      "Payment"
                    )}
                  </span>

                  <strong>
                    {getPaymentLabel(
                      selectedOrder.paymentMethod,
                      locale
                    )}
                  </strong>
                </div>
              </div>

              <div className="dashboard-modal-address">
                <span>
                  {text(
                    locale,
                    "عنوان الشحن",
                    "Shipping Address"
                  )}
                </span>

                <strong>
                  {[
                    displayValue(
                      selectedOrder
                        .shippingAddress
                        ?.address,
                      locale,
                      ""
                    ),
                    displayValue(
                      selectedOrder
                        .shippingAddress
                        ?.city,
                      locale,
                      ""
                    ),
                  ]
                    .filter(
                      (value) =>
                        value &&
                        value !== "—"
                    )
                    .join(" - ") ||
                    "—"}
                </strong>
              </div>

              <div className="dashboard-modal-products">
                <div className="dashboard-modal-products-title">
                  {text(
                    locale,
                    "المنتجات",
                    "Products"
                  )}
                </div>

                {getOrderProducts(
                  selectedOrder
                ).map(
                  (product, index) => {
                    const productName =
                      displayValue(
                        product.name ||
                          product.product
                            ?.name,
                        locale,
                        text(
                          locale,
                          "منتج",
                          "Product"
                        )
                      );

                    const productPrice =
                      Number(
                        product.price ??
                          product.product
                            ?.price ??
                          0
                      );

                    const quantity =
                      Number(
                        product.quantity ||
                          1
                      );

                    const productKey =
                      product._id ||
                      product.product
                        ?._id ||
                      `${productName}-${index}`;

                    return (
                      <div
                        className="dashboard-modal-product"
                        key={
                          productKey
                        }
                      >
                        <div>
                          <strong>
                            {productName}
                          </strong>

                          <span>
                            {text(
                              locale,
                              "الكمية",
                              "Qty"
                            )}{" "}
                            {quantity}
                          </span>
                        </div>

                        <strong>
                          {formatCurrency(
                            productPrice *
                              quantity,
                            locale
                          )}{" "}
                          EGP
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="dashboard-modal-total">
                <span>
                  {text(
                    locale,
                    "الإجمالي",
                    "Total"
                  )}
                </span>

                <strong>
                  {formatCurrency(
                    getOrderTotal(
                      selectedOrder
                    ),
                    locale
                  )}{" "}
                  EGP
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}