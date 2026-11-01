"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createAdminOrder,
  deleteAdminOrder,
  getAdminOrders,
  getAdminProducts,
  getAdminUsers,
  updateAdminOrder,
  updateAdminOrderStatus,
} from "@/services/api";

import "./orders.css";

type Locale = "ar" | "en";

type Localized = {
  ar?: string;
  en?: string;
};

type ProductColor = {
  _id: string;
  name?: Localized;
  hex?: string;
  stock?: number;
};

type Product = {
  _id: string;
  name?: Localized;
  price?: number;
  stock?: number;
  colors?: ProductColor[];
  media?: {
    url?: string;
    thumbnail?: string;
    isPrimary?: boolean;
  }[];
};

type User = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
};

type OrderProduct = {
  product?: Product;
  colorId?: string | null;
  colorName?: Localized;
  colorHex?: string;
  quantity?: number;
  priceAtPurchase?: number;
};

type EditHistory = {
  _id?: string;
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  admin?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  createdAt: string;
};

type Order = {
  _id: string;
  orderNumber: number;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  totalPrice: number;
  paymentMethod: string;
  createdAt: string;
  user?: User | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
  };
  products: OrderProduct[];
  editHistory?: EditHistory[];
};

type FormProduct = {
  product: string;
  colorId: string;
  quantity: string;
};

const STATUSES = [
  "Pending",
  "Processing",
  "Out for Delivery",
  "Delivered",
  "Canceled",
];

const text = (
  locale: Locale,
  ar: string,
  en: string
) => (locale === "ar" ? ar : en);

const productName = (
  product: Product | undefined,
  locale: Locale
) =>
  product?.name?.[locale] ||
  product?.name?.ar ||
  product?.name?.en ||
  text(locale, "منتج", "Product");

const money = (
  value: number | undefined,
  locale: Locale
) =>
  new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-EG",
    {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }
  ).format(value || 0);
const getOrderColorName = (
  item: OrderProduct,
  locale: Locale
): string => {
  const savedName =
    item.colorName?.[locale]?.trim();

  if (savedName) {
    return savedName;
  }

  const fallbackName =
    item.colorName?.ar?.trim() ||
    item.colorName?.en?.trim();

  if (fallbackName) {
    return fallbackName;
  }

  const matchingColor =
    item.product?.colors?.find(
      (color) =>
        color._id === item.colorId
    );

  return (
    matchingColor?.name?.[locale]?.trim() ||
    matchingColor?.name?.ar?.trim() ||
    matchingColor?.name?.en?.trim() ||
    ""
  );
};
const statusLabel = (
  status: string,
  locale: Locale
) => {
  const values: Record<
    string,
    [string, string]
  > = {
    Pending: [
      "قيد المراجعة",
      "Pending",
    ],
    Processing: [
      "جاري التجهيز",
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

  return (
    values[status]?.[
      locale === "ar" ? 0 : 1
    ] || status
  );
};

const getEgyptDateKey = (
  dateString: string
) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  return formatter.format(date);
};

const formatOrderDate = (
  dateString: string,
  locale: Locale
) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    locale === "ar"
      ? "ar-EG"
      : "en-EG",
    {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: locale === "ar",
    }
  ).format(date);
};

const getInitialForm = (): {
  user: string;
  products: FormProduct[];
  shipping: string;
  discount: string;
  paymentMethod: string;
  status: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
} => ({
  user: "",
  products: [
    {
      product: "",
      colorId: "",
      quantity: "1",
    },
  ],
  shipping: "250",
  discount: "0",
  paymentMethod: "Cash On Delivery",
  status: "Pending",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
});

const getHistoryFieldLabel = (
  field: string,
  locale: Locale
) => {
  const values: Record<
    string,
    [string, string]
  > = {
    user: ["العميل", "Customer"],
    products: ["المنتجات", "Products"],
    shippingAddress: [
      "عنوان الشحن",
      "Shipping Address",
    ],
    paymentMethod: [
      "طريقة الدفع",
      "Payment Method",
    ],
    shipping: ["الشحن", "Shipping"],
    discount: ["الخصم", "Discount"],
    status: ["الحالة", "Status"],
  };

  return (
    values[field]?.[
      locale === "ar" ? 0 : 1
    ] || field
  );
};

const getPaymentLabel = (
  value: unknown,
  locale: Locale
) => {
  if (value === "Cash On Delivery") {
    return text(
      locale,
      "الدفع عند الاستلام",
      "Cash On Delivery"
    );
  }

  if (value === "Vodafone Cash") {
    return "Vodafone Cash";
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return text(
      locale,
      "غير محدد",
      "Not specified"
    );
  }

  return String(value);
};

const getHistoryValue = (
  value: unknown,
  field: string,
  locale: Locale
): string => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return text(
      locale,
      "غير محدد",
      "Not specified"
    );
  }

  if (field === "status") {
    return statusLabel(
      String(value),
      locale
    );
  }

  if (field === "paymentMethod") {
    return getPaymentLabel(
      value,
      locale
    );
  }

  if (field === "shipping") {
    return money(
      Number(value) || 0,
      locale
    );
  }

  if (field === "discount") {
    return money(
      Number(value) || 0,
      locale
    );
  }

  if (
    field === "user" &&
    typeof value === "object" &&
    value !== null
  ) {
    const user =
      value as User;

    return (
      user.name ||
      user.email ||
      user.phone ||
      String(
        user._id || ""
      ) ||
      text(
        locale,
        "غير محدد",
        "Not specified"
      )
    );
  }

  if (
    field === "shippingAddress" &&
    typeof value === "object" &&
    value !== null
  ) {
    const address =
      value as {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
        address?: string;
      };

    const parts = [
      `${address.firstName || ""} ${
        address.lastName || ""
      }`.trim(),
      address.phone || "",
      address.email || "",
      address.address || "",
    ].filter(Boolean);

    return (
      parts.join(" — ") ||
      text(
        locale,
        "غير محدد",
        "Not specified"
      )
    );
  }

  if (
    field === "products" &&
    Array.isArray(value)
  ) {
    return value
      .map((item, index) => {
        if (
          typeof item !==
            "object" ||
          item === null
        ) {
          return `${index + 1}. ${String(
            item
          )}`;
        }

        const product =
          item as {
            product?: unknown;
            quantity?: number;
            colorId?: string | null;
          };

        const productValue =
          typeof product.product ===
            "object" &&
          product.product !== null
            ? (
                product.product as {
                  name?: Localized;
                  _id?: string;
                }
              ).name?.[locale] ||
              (
                product.product as {
                  name?: Localized;
                  _id?: string;
                }
              ).name?.ar ||
              (
                product.product as {
                  name?: Localized;
                  _id?: string;
                }
              ).name?.en ||
              (
                product.product as {
                  name?: Localized;
                  _id?: string;
                }
              )._id
            : String(
                product.product ||
                  ""
              );

        return `${productValue} × ${
          product.quantity || 1
        }`;
      })
      .join("، ");
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    try {
      return JSON.stringify(
        value,
        null,
        2
      );
    } catch {
      return text(
        locale,
        "قيمة غير قابلة للعرض",
        "Value unavailable"
      );
    }
  }

  return String(value);
};

export default function OrdersPage() {
  const locale: Locale =
    typeof window !== "undefined" &&
    window.location.pathname.includes(
      "/en/"
    )
      ? "en"
      : "ar";

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState("");

  const [detailsOrder, setDetailsOrder] =
    useState<Order | null>(null);

  const [editingOrder, setEditingOrder] =
    useState<Order | null>(null);

  const [showCreate, setShowCreate] =
    useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<Order | null>(null);

  const [
    statusChangeTarget,
    setStatusChangeTarget,
  ] = useState<{
    order: Order;
    status: string;
  } | null>(null);

  const [form, setForm] =
    useState(getInitialForm());

  const [error, setError] =
    useState("");

  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [
        ordersResponse,
        productsResponse,
        usersResponse,
      ] = await Promise.all([
        getAdminOrders(token),
        getAdminProducts(token),
        getAdminUsers(token),
      ]);

      setOrders(
        ordersResponse?.orders || []
      );

      setProducts(
        productsResponse?.products || []
      );

      setUsers(
        usersResponse?.users || []
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : text(
              locale,
              "تعذر تحميل البيانات",
              "Unable to load data"
            )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return orders.filter(
      (order) => {
        const phone =
          order.shippingAddress?.phone ||
          order.user?.phone ||
          "";

        const number =
          String(
            order.orderNumber || ""
          );

        const customerName =
          `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`
            .trim()
            .toLowerCase();

        const email =
          order.shippingAddress?.email ||
          order.user?.email ||
          "";

        const address =
          order.shippingAddress?.address ||
          "";

        const paymentMethod =
          order.paymentMethod || "";

        const matchesSearch =
          !query ||
          number
            .toLowerCase()
            .includes(query) ||
          phone
            .toLowerCase()
            .includes(query) ||
          customerName.includes(query) ||
          email
            .toLowerCase()
            .includes(query) ||
          address
            .toLowerCase()
            .includes(query) ||
          paymentMethod
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter === "all" ||
          order.status ===
            statusFilter;

        const orderDate =
          order.createdAt
            ? getEgyptDateKey(
                order.createdAt
              )
            : "";

        const matchesDate =
          !dateFilter ||
          orderDate === dateFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesDate
        );
      }
    );
  }, [
    orders,
    search,
    statusFilter,
    dateFilter,
  ]);

  const resetForm = () => {
    setForm(
      getInitialForm()
    );
  };

  const openCreate = () => {
    resetForm();
    setEditingOrder(null);
    setShowCreate(true);
    setError("");
  };

  const openEdit = (
    order: Order
  ) => {
    setEditingOrder(order);
    setShowCreate(false);

    setForm({
      user:
        order.user?._id || "",
      products:
        order.products.map(
          (item) => ({
            product:
              item.product?._id || "",
            colorId:
              item.colorId || "",
            quantity:
              String(
                item.quantity || 1
              ),
          })
        ),
      shipping:
        String(
          order.shipping || 0
        ),
      discount:
        String(
          order.discount || 0
        ),
      paymentMethod:
        order.paymentMethod,
      status:
        order.status,
      firstName:
        order.shippingAddress
          ?.firstName || "",
      lastName:
        order.shippingAddress
          ?.lastName || "",
      phone:
        order.shippingAddress
          ?.phone || "",
      email:
        order.shippingAddress
          ?.email || "",
      address:
        order.shippingAddress
          ?.address || "",
    });

    setError("");
  };

  const closeEditor = () => {
    if (saving) return;

    setEditingOrder(null);
    setShowCreate(false);
    setError("");
  };

  const updateFormProduct = (
    index: number,
    key: keyof FormProduct,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      products:
        current.products.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  [key]: value,
                  ...(key ===
                  "product"
                    ? {
                        colorId:
                          "",
                      }
                    : {}),
                }
              : item
        ),
    }));
  };

  const addProductRow = () => {
    setForm((current) => ({
      ...current,
      products: [
        ...current.products,
        {
          product: "",
          colorId: "",
          quantity: "1",
        },
      ],
    }));
  };

  const removeProductRow = (
    index: number
  ) => {
    setForm((current) => ({
      ...current,
      products:
        current.products.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
    }));
  };

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!token) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        user:
          form.user || null,
        products:
          form.products.map(
            (item) => ({
              product:
                item.product,
              colorId:
                item.colorId || null,
              quantity:
                Number(
                  item.quantity
                ),
            })
          ),
        shippingAddress: {
          firstName:
            form.firstName,
          lastName:
            form.lastName,
          phone:
            form.phone,
          email:
            form.email,
          address:
            form.address,
        },
        paymentMethod:
          form.paymentMethod,
        shipping:
          Number(form.shipping),
        discount:
          Number(form.discount),
        status:
          form.status,
      };

      const response =
        editingOrder
          ? await updateAdminOrder(
              token,
              editingOrder._id,
              payload
            )
          : await createAdminOrder(
              token,
              payload
            );

      const savedOrder =
        response?.order;

      if (editingOrder) {
        setOrders(
          (current) =>
            current.map(
              (order) =>
                order._id ===
                editingOrder._id
                  ? savedOrder
                  : order
            )
        );
      } else if (savedOrder) {
        setOrders(
          (current) => [
            savedOrder,
            ...current,
          ]
        );
      }

      closeEditor();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : text(
              locale,
              "تعذر حفظ الطلب",
              "Unable to save order"
            )
      );
    } finally {
      setSaving(false);
    }
  };

  const requestStatusChange = (
    order: Order,
    status: string
  ) => {
    if (
      status === order.status
    ) {
      return;
    }

    setStatusChangeTarget({
      order,
      status,
    });
  };

  const confirmStatusChange =
    async () => {
      if (
        !token ||
        !statusChangeTarget
      ) {
        return;
      }

      setSaving(true);
      setError("");

      const {
        order,
        status,
      } = statusChangeTarget;

      try {
        const response =
          await updateAdminOrderStatus(
            token,
            order._id,
            status
          );

        if (response?.order) {
          setOrders(
            (current) =>
              current.map(
                (item) =>
                  item._id ===
                  order._id
                    ? response.order
                    : item
              )
          );

          setDetailsOrder(
            (current) =>
              current?._id ===
              order._id
                ? response.order
                : current
          );
        }

        setStatusChangeTarget(
          null
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : text(
                locale,
                "تعذر تغيير حالة الطلب",
                "Unable to update order status"
              )
        );
      } finally {
        setSaving(false);
      }
    };

  const handleDelete =
    async () => {
      if (
        !token ||
        !deleteTarget
      ) {
        return;
      }

      setSaving(true);

      try {
        await deleteAdminOrder(
          token,
          deleteTarget._id
        );

        setOrders(
          (current) =>
            current.filter(
              (order) =>
                order._id !==
                deleteTarget._id
            )
        );

        setDeleteTarget(null);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : text(
                locale,
                "تعذر حذف الطلب",
                "Unable to delete order"
              )
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div
      className="orders-page"
      dir={
        locale === "ar"
          ? "rtl"
          : "ltr"
      }
    >
      <div className="orders-container">
        <header className="orders-header">
          <div>
            <span className="orders-eyebrow">
              TOUCHWOOD
            </span>

            <h1>
              {text(
                locale,
                "إدارة الطلبات",
                "Order Management"
              )}
            </h1>

            <p>
              {text(
                locale,
                "إدارة ومتابعة جميع طلبات العملاء",
                "Manage and track all customer orders"
              )}
            </p>
          </div>

          <button
            type="button"
            className="orders-primary-button"
            onClick={openCreate}
          >
            <Plus size={18} />

            {text(
              locale,
              "إضافة طلب",
              "Add Order"
            )}
          </button>
        </header>

        {error && (
          <div className="orders-alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <X size={18} />
            </button>
          </div>
        )}

        <section className="orders-filters">
          <div className="orders-search">
            <Search size={18} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder={text(
                locale,
                "ابحث برقم الطلب أو رقم الهاتف",
                "Search by order number or phone"
              )}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              {text(
                locale,
                "كل الحالات",
                "All statuses"
              )}
            </option>

            {STATUSES.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {statusLabel(
                    status,
                    locale
                  )}
                </option>
              )
            )}
          </select>

          <div className="orders-date-filter">
            <input
              type="date"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(
                  event.target.value
                )
              }
              lang="ar-EG"
              dir="rtl"
              aria-label={text(
                locale,
                "البحث بالتاريخ",
                "Search by date"
              )}
            />
          </div>

          <button
            type="button"
            className="orders-refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "orders-spin"
                  : ""
              }
            />

            {text(
              locale,
              "تحديث",
              "Refresh"
            )}
          </button>
        </section>

        <section className="orders-summary">
          <strong>
            {filteredOrders.length}
          </strong>

          <span>
            {text(
              locale,
              "طلب ظاهر",
              "orders shown"
            )}
          </span>
        </section>

        {loading ? (
          <div className="orders-loading">
            <Loader2
              size={28}
              className="orders-spin"
            />

            <span>
              {text(
                locale,
                "جاري تحميل الطلبات...",
                "Loading orders..."
              )}
            </span>
          </div>
        ) : filteredOrders.length ===
          0 ? (
          <div className="orders-empty">
            <Search size={34} />

            <h3>
              {text(
                locale,
                "لا توجد طلبات",
                "No orders found"
              )}
            </h3>

            <p>
              {text(
                locale,
                "جرّب تغيير الفلاتر أو البحث.",
                "Try changing the filters or search."
              )}
            </p>
          </div>
        ) : (
          <div className="orders-table-card">
            <div className="orders-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      {text(
                        locale,
                        "رقم الطلب",
                        "Order"
                      )}
                    </th>

                    <th>
                      {text(
                        locale,
                        "العميل",
                        "Customer"
                      )}
                    </th>

                    <th>
                      {text(
                        locale,
                        "الهاتف",
                        "Phone"
                      )}
                    </th>

                    <th>
                      {text(
                        locale,
                        "التاريخ",
                        "Date"
                      )}
                    </th>

                    <th>
                      {text(
                        locale,
                        "الدفع",
                        "Payment"
                      )}
                    </th>

                    <th>
                      {text(
                        locale,
                        "الإجمالي",
                        "Total"
                      )}
                    </th>

                    <th>
                      {text(
                        locale,
                        "الحالة",
                        "Status"
                      )}
                    </th>

                    <th>
                      {text(
                        locale,
                        "الإجراءات",
                        "Actions"
                      )}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map(
                    (order) => (
                      <tr
                        key={
                          order._id
                        }
                      >
                        <td>
                          <strong>
                            #
                            {
                              order.orderNumber
                            }
                          </strong>
                        </td>

                        <td>
                          <div className="orders-customer">
                            <strong>
                              {order.user?.name ||
                                `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`}
                            </strong>

                            <small>
                              {
                                order
                                  .shippingAddress
                                  ?.email
                              }
                            </small>
                          </div>
                        </td>

                        <td>
                          {
                            order
                              .shippingAddress
                              ?.phone
                          }
                        </td>

                        <td dir="ltr">
                          {formatOrderDate(
                            order.createdAt,
                            locale
                          )}
                        </td>

                        <td>
                          {
                            order.paymentMethod
                          }
                        </td>

                        <td>
                          <strong>
                            {money(
                              order.totalPrice,
                              locale
                            )}
                          </strong>
                        </td>

                        <td>
                          <select
                            className={`orders-status orders-status-${order.status
                              .replace(
                                /\s/g,
                                "-"
                              )
                              .toLowerCase()}`}
                            value={
                              order.status
                            }
                            onChange={(
                              event
                            ) =>
                              requestStatusChange(
                                order,
                                event
                                  .target
                                  .value
                              )
                            }
                          >
                            {STATUSES.map(
                              (
                                status
                              ) => (
                                <option
                                  key={
                                    status
                                  }
                                  value={
                                    status
                                  }
                                >
                                  {statusLabel(
                                    status,
                                    locale
                                  )}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td>
                          <div className="orders-actions">
                            <button
                              type="button"
                              title={text(
                                locale,
                                "التفاصيل",
                                "Details"
                              )}
                              onClick={() =>
                                setDetailsOrder(
                                  order
                                )
                              }
                            >
                              <Eye
                                size={
                                  17
                                }
                              />
                            </button>

                            <button
                              type="button"
                              title={text(
                                locale,
                                "تعديل",
                                "Edit"
                              )}
                              onClick={() =>
                                openEdit(
                                  order
                                )
                              }
                            >
                              <Pencil
                                size={
                                  17
                                }
                              />
                            </button>

                            <button
                              type="button"
                              className="orders-delete-icon"
                              title={text(
                                locale,
                                "حذف",
                                "Delete"
                              )}
                              onClick={() =>
                                setDeleteTarget(
                                  order
                                )
                              }
                            >
                              <Trash2
                                size={
                                  17
                                }
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {detailsOrder && (
        <div
          className="orders-modal-overlay"
          onMouseDown={() =>
            setDetailsOrder(null)
          }
        >
          <div
            className="orders-modal orders-details-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="orders-modal-header">
              <div>
                <span>
                  {text(
                    locale,
                    "تفاصيل الطلب",
                    "Order Details"
                  )}
                </span>

                <h2>
                  #
                  {
                    detailsOrder.orderNumber
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetailsOrder(
                    null
                  )
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="orders-detail-grid">
              <div>
                <span>
                  {text(
                    locale,
                    "اسم العميل",
                    "Customer"
                  )}
                </span>

                <strong>
                  {detailsOrder.user?.name ||
                    `${detailsOrder.shippingAddress.firstName} ${detailsOrder.shippingAddress.lastName}`}
                </strong>
              </div>

              <div>
                <span>
                  {text(
                    locale,
                    "رقم الهاتف",
                    "Phone"
                  )}
                </span>

                <strong>
                  {
                    detailsOrder
                      .shippingAddress
                      .phone
                  }
                </strong>
              </div>

              <div>
                <span>
                  {text(
                    locale,
                    "البريد الإلكتروني",
                    "Email"
                  )}
                </span>

                <strong>
                  {
                    detailsOrder
                      .shippingAddress
                      .email
                  }
                </strong>
              </div>

              <div>
                <span>
                  {text(
                    locale,
                    "طريقة الدفع",
                    "Payment"
                  )}
                </span>

                <strong>
                  {getPaymentLabel(
                    detailsOrder.paymentMethod,
                    locale
                  )}
                </strong>
              </div>

              <div className="orders-detail-full">
                <span>
                  {text(
                    locale,
                    "العنوان",
                    "Address"
                  )}
                </span>

                <strong>
                  {
                    detailsOrder
                      .shippingAddress
                      .address
                  }
                </strong>
              </div>
            </div>

            <div className="orders-detail-products">
              <h3>
                {text(
                  locale,
                  "المنتجات",
                  "Products"
                )}
              </h3>

              {detailsOrder.products.map(
                (item, index) => (
                  <div
                    className="orders-detail-product"
                    key={`${detailsOrder._id}-${index}`}
                  >
                    <div className="orders-detail-product-info">
  <strong>
    {productName(
      item.product,
      locale
    )}
  </strong>

  {item.colorId && (
    <div
      className="orders-detail-color"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "6px",
        fontSize: "13px",
      }}
    >
      {item.colorHex && (
        <span
          aria-label={text(
            locale,
            "عينة اللون",
            "Color swatch"
          )}
          title={item.colorHex}
          style={{
            display: "inline-block",
            width: "18px",
            height: "18px",
            minWidth: "18px",
            borderRadius: "50%",
            backgroundColor:
              /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(
                item.colorHex
              )
                ? item.colorHex
                : "#cccccc",
            border: "1px solid rgba(0,0,0,0.2)",
            boxSizing: "border-box",
          }}
        />
      )}

      <span>
        {getOrderColorName(
          item,
          locale
        ) ||
          text(
            locale,
            "لون غير محدد",
            "Color not specified"
          )}
      </span>
    </div>
  )}
</div>

                    <span>
                      ×
                      {
                        item.quantity
                      }
                    </span>

                    <strong>
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

            <div className="orders-totals">
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
                    detailsOrder.subtotal,
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
                    detailsOrder.shipping,
                    locale
                  )}
                </strong>
              </div>

              <div>
                <span>
                  {text(
                    locale,
                    "الخصم",
                    "Discount"
                  )}
                </span>

                <strong>
                  -{" "}
                  {money(
                    detailsOrder.discount,
                    locale
                  )}
                </strong>
              </div>

              <div className="orders-grand-total">
                <span>
                  {text(
                    locale,
                    "الإجمالي",
                    "Total"
                  )}
                </span>

                <strong>
                  {money(
                    detailsOrder.totalPrice,
                    locale
                  )}
                </strong>
              </div>
            </div>

            <div className="orders-history-section">
              <div className="orders-history-header">
                <div>
                  <span>
                    {text(
                      locale,
                      "سجل الطلب",
                      "Order History"
                    )}
                  </span>

                  <h3>
                    {text(
                      locale,
                      "سجل التعديلات",
                      "Edit History"
                    )}
                  </h3>
                </div>

                <span className="orders-history-count">
                  {
                    detailsOrder.editHistory
                      ?.length || 0
                  }
                </span>
              </div>

              {!detailsOrder.editHistory ||
              detailsOrder.editHistory.length ===
                0 ? (
                <div className="orders-history-empty">
                  {text(
                    locale,
                    "لا توجد تعديلات مسجلة على هذا الطلب.",
                    "No changes have been recorded for this order."
                  )}
                </div>
              ) : (
                <div className="orders-history-list">
                  {[
                    ...detailsOrder.editHistory,
                  ]
                    .sort(
                      (a, b) =>
                        new Date(
                          b.createdAt
                        ).getTime() -
                        new Date(
                          a.createdAt
                        ).getTime()
                    )
                    .map(
                      (
                        history,
                        index
                      ) => (
                        <div
                          className="orders-history-item"
                          key={
                            history._id ||
                            `${history.createdAt}-${history.field}-${index}`
                          }
                        >
                          <div className="orders-history-marker">
                            <span />
                          </div>

                          <div className="orders-history-content">
                            <div className="orders-history-top">
                              <strong>
                                {getHistoryFieldLabel(
                                  history.field,
                                  locale
                                )}
                              </strong>

                              <time dir="ltr">
                                {formatOrderDate(
                                  history.createdAt,
                                  locale
                                )}
                              </time>
                            </div>

                            <div className="orders-history-admin">
                              <span>
                                {text(
                                  locale,
                                  "تم بواسطة",
                                  "Changed by"
                                )}
                              </span>

                              <strong>
                                {history.admin?.name ||
                                  history.admin?.email ||
                                  text(
                                    locale,
                                    "أدمن",
                                    "Admin"
                                  )}
                              </strong>
                            </div>

                            <div className="orders-history-values">
                              <div className="orders-history-value orders-history-new">
                                <span>
                                  {text(
                                    locale,
                                    "حالة الطلب الان",
                                    "After"
                                  )}
                                </span>

                                <p>
                                  {getHistoryValue(
                                    history.newValue,
                                    history.field,
                                    locale
                                  )}
                                </p>
                              </div>

                              <div className="orders-history-arrow">
                                <ChevronDown
                                  size={
                                    18
                                  }
                                />
                              </div>

                              <div className="orders-history-value">
                                <span>
                                  {text(
                                    locale,
                                    "الحالة السابقة",
                                    "Before"
                                  )}
                                </span>

                                <p>
                                  {getHistoryValue(
                                    history.oldValue,
                                    history.field,
                                    locale
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(showCreate ||
        editingOrder) && (
        <div
          className="orders-modal-overlay"
          onMouseDown={
            closeEditor
          }
        >
          <form
            className="orders-modal orders-editor-modal"
            onSubmit={
              handleSave
            }
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="orders-modal-header">
              <div>
                <span>
                  {editingOrder
                    ? text(
                        locale,
                        "تعديل الطلب",
                        "Edit Order"
                      )
                    : text(
                        locale,
                        "طلب جديد",
                        "New Order"
                      )}
                </span>

                <h2>
                  {editingOrder
                    ? `#${editingOrder.orderNumber}`
                    : text(
                        locale,
                        "إضافة طلب",
                        "Add Order"
                      )}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeEditor
                }
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="orders-form-error">
                {error}
              </div>
            )}

            <div className="orders-form-grid">
              <label>
                <span>
                  {text(
                    locale,
                    "العميل",
                    "Customer"
                  )}
                </span>

                <select
                  value={form.user}
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        user:
                          event.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="">
                    {text(
                      locale,
                      "زائر",
                      "Guest"
                    )}
                  </option>

                  {users.map(
                    (user) => (
                      <option
                        key={
                          user._id
                        }
                        value={
                          user._id
                        }
                      >
                        {user.name ||
                          user.email ||
                          user.phone}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "طريقة الدفع",
                    "Payment Method"
                  )}
                </span>

                <select
                  value={
                    form.paymentMethod
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        paymentMethod:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                >
                  <option value="Cash On Delivery">
                    {text(
                      locale,
                      "الدفع عند الاستلام",
                      "Cash On Delivery"
                    )}
                  </option>

                  <option value="Vodafone Cash">
                    Vodafone Cash
                  </option>
                </select>
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "الحالة",
                    "Status"
                  )}
                </span>

                <select
                  value={
                    form.status
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        status:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                >
                  {STATUSES.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {statusLabel(
                          status,
                          locale
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "الشحن",
                    "Shipping"
                  )}
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    form.shipping
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        shipping:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "الخصم",
                    "Discount"
                  )}
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    form.discount
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        discount:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "الاسم الأول",
                    "First Name"
                  )}
                </span>

                <input
                  value={
                    form.firstName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        firstName:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                />
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "اسم العائلة",
                    "Last Name"
                  )}
                </span>

                <input
                  value={
                    form.lastName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        lastName:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                />
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "رقم الهاتف",
                    "Phone"
                  )}
                </span>

                <input
                  value={
                    form.phone
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        phone:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                />
              </label>

              <label>
                <span>
                  {text(
                    locale,
                    "البريد الإلكتروني",
                    "Email"
                  )}
                </span>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        email:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                />
              </label>

              <label className="orders-field-full">
                <span>
                  {text(
                    locale,
                    "العنوان",
                    "Address"
                  )}
                </span>

                <textarea
                  value={
                    form.address
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        address:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                />
              </label>
            </div>

            <div className="orders-editor-products">
              <div className="orders-editor-products-header">
                <h3>
                  {text(
                    locale,
                    "منتجات الطلب",
                    "Order Products"
                  )}
                </h3>

                <button
                  type="button"
                  onClick={
                    addProductRow
                  }
                >
                  <Plus size={16} />

                  {text(
                    locale,
                    "إضافة منتج",
                    "Add Product"
                  )}
                </button>
              </div>

              {form.products.map(
                (
                  item,
                  index
                ) => {
            const selectedProduct =
  products.find(
    (product) =>
      product._id === item.product
  );

const selectedColors =
  selectedProduct?.colors ?? [];

                  return (
                    <div
                      className="orders-product-editor-row"
                      key={index}
                    >
                      <select
                        value={
                          item.product
                        }
                        onChange={(
                          event
                        ) =>
                          updateFormProduct(
                            index,
                            "product",
                            event
                              .target
                              .value
                          )
                        }
                        required
                      >
                        <option value="">
                          {text(
                            locale,
                            "اختر المنتج",
                            "Select product"
                          )}
                        </option>

                        {products.map(
                          (
                            product
                          ) => (
                            <option
                              key={
                                product._id
                              }
                              value={
                                product._id
                              }
                            >
                              {productName(
                                product,
                                locale
                              )}{" "}
                              —{" "}
                              {money(
                                product.price,
                                locale
                              )}
                            </option>
                          )
                        )}
                      </select>

                      {selectedColors.length >
                        0 && (
                        <select
                          value={
                            item.colorId
                          }
                          onChange={(
                            event
                          ) =>
                            updateFormProduct(
                              index,
                              "colorId",
                              event
                                .target
                                .value
                            )
                          }
                        >
                          <option value="">
                            {text(
                              locale,
                              "بدون لون",
                              "No color"
                            )}
                          </option>

                          {selectedColors.map(
                            (
                              color
                            ) => (
                              <option
                                key={
                                  color._id
                                }
                                value={
                                  color._id
                                }
                              >
                                {color
                                  .name?.[
                                  locale
                                ] ||
                                  color
                                    .name
                                    ?.ar ||
                                  color
                                    .name
                                    ?.en}
                              </option>
                            )
                          )}
                        </select>
                      )}

                      <input
                        type="number"
                        min="1"
                        value={
                          item.quantity
                        }
                        onChange={(
                          event
                        ) =>
                          updateFormProduct(
                            index,
                            "quantity",
                            event
                              .target
                              .value
                          )
                        }
                        required
                      />

                      {form.products.length >
                        1 && (
                        <button
                          type="button"
                          className="orders-remove-product"
                          onClick={() =>
                            removeProductRow(
                              index
                            )
                          }
                        >
                          <Trash2
                            size={
                              17
                            }
                          />
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div className="orders-modal-footer">
              <button
                type="button"
                className="orders-secondary-button"
                onClick={
                  closeEditor
                }
                disabled={saving}
              >
                {text(
                  locale,
                  "إلغاء",
                  "Cancel"
                )}
              </button>

              <button
                type="submit"
                className="orders-primary-button"
                disabled={saving}
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="orders-spin"
                  />
                ) : (
                  <Plus size={18} />
                )}

                {editingOrder
                  ? text(
                      locale,
                      "حفظ التعديلات",
                      "Save Changes"
                    )
                  : text(
                      locale,
                      "إنشاء الطلب",
                      "Create Order"
                    )}
              </button>
            </div>
          </form>
        </div>
      )}

      {statusChangeTarget && (
        <div
          className="orders-modal-overlay"
          onMouseDown={() =>
            !saving &&
            setStatusChangeTarget(
              null
            )
          }
        >
          <div
            className="orders-confirm-modal orders-status-confirm-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="orders-confirm-icon">
              <RefreshCw size={24} />
            </div>

            <h2>
              {text(
                locale,
                "تأكيد تغيير الحالة",
                "Confirm Status Change"
              )}
            </h2>

            <p>
              {text(
                locale,
                `هل أنت متأكد من تغيير حالة الطلب #${statusChangeTarget.order.orderNumber} من "${statusLabel(
                  statusChangeTarget.order.status,
                  locale
                )}" إلى "${statusLabel(
                  statusChangeTarget.status,
                  locale
                )}"؟`,
                `Are you sure you want to change order #${statusChangeTarget.order.orderNumber} from "${statusLabel(
                  statusChangeTarget.order.status,
                  locale
                )}" to "${statusLabel(
                  statusChangeTarget.status,
                  locale
                )}"?`
              )}
            </p>

            <div className="orders-confirm-actions">
              <button
                type="button"
                onClick={() =>
                  setStatusChangeTarget(
                    null
                  )
                }
                disabled={saving}
              >
                {text(
                  locale,
                  "إلغاء",
                  "Cancel"
                )}
              </button>

              <button
                type="button"
                className="orders-primary-button"
                onClick={
                  confirmStatusChange
                }
                disabled={saving}
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="orders-spin"
                  />
                ) : null}

                {saving
                  ? text(
                      locale,
                      "جاري التحديث...",
                      "Updating..."
                    )
                  : text(
                      locale,
                      "تأكيد التغيير",
                      "Confirm Change"
                    )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="orders-modal-overlay"
          onMouseDown={() =>
            setDeleteTarget(null)
          }
        >
          <div
            className="orders-confirm-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="orders-confirm-icon">
              <Trash2 size={24} />
            </div>

            <h2>
              {text(
                locale,
                "حذف الطلب؟",
                "Delete Order?"
              )}
            </h2>

            <p>
              {text(
                locale,
                `هل أنت متأكد من حذف الطلب #${deleteTarget.orderNumber}؟`,
                `Are you sure you want to delete order #${deleteTarget.orderNumber}?`
              )}
            </p>

            <div className="orders-confirm-actions">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
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
                className="orders-danger-button"
                onClick={
                  handleDelete
                }
                disabled={saving}
              >
                {saving
                  ? text(
                      locale,
                      "جاري الحذف...",
                      "Deleting..."
                    )
                  : text(
                      locale,
                      "نعم، احذف الطلب",
                      "Yes, Delete"
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}