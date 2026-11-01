"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  Edit3,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createProduct,
  createUploadUrl,
  deleteProduct,
  getAdminProducts,
  updateProduct,
  uploadImageToR2,
} from "@/services/api";

import "./products.css";

type Localized = {
  ar: string;
  en: string;
};

type Media = {
  type: "image";
  url: string;
  storageKey: string;
  thumbnail: string;
  alt: Localized;
  sortOrder: number;
  isPrimary: boolean;
};

type ProductColor = {
  name: Localized;
  hex: string;
  stock: number;
  serialNumber?: string;
  media: Media[];
};

type Product = {
  _id: string;
  name: Localized;
  description: Localized;
  slug: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  serialNumber?: string;
  stock: number;
  media: Media[];
  colors: ProductColor[];
  active: boolean;
  featured: boolean;
};

type StockFilter =
  | "all"
  | "available"
  | "low"
  | "out";

type FeaturedFilter =
  | "all"
  | "featured";

const LOW_STOCK_THRESHOLD = 5;

const categories = [
  ["computer-desks", "مكاتب وطاولات كمبيوتر"],
  ["chairs", "كراسي"],
  ["mesh-chairs", "كراسي شبك"],
  ["leather-chairs", "كراسي جلد"],
  ["bar-chairs", "كراسي بار"],
  ["laboratory-chairs", "كراسي معامل"],
  ["office-sofas", "انتريهات مكتبية"],
  ["work-cells", "خلايا العمل"],
  ["reception-counters", "كاونتر استقبال"],
  ["meeting-tables", "ترابيزات اجتماعات"],
  ["office-accessories", "إكسسوارات الأثاث المكتبي"],
];

const emptyLocalized = (): Localized => ({
  ar: "",
  en: "",
});

const emptyForm = () => ({
  name: emptyLocalized(),
  description: emptyLocalized(),
  slug: "",
  category: "",
  price: "",
  oldPrice: "",
  serialNumber: "",
  stock: "0",
  featured: false,
  active: true,
});

const emptyColor = (): ProductColor => ({
  name: emptyLocalized(),
  hex: "#405D3A",
  stock: 0,
  serialNumber: "",
  media: [],
});

function getCategoryLabel(category: string) {
  return (
    categories.find(([value]) => value === category)?.[1] ||
    category ||
    "غير مصنف"
  );
}

function getStockStatus(stock: number) {
  if (stock <= 0) {
    return {
      label: "نفد المخزون",
      className: "stock-badge stock-out",
    };
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return {
      label: "على وشك النفاد",
      className: "stock-badge stock-low",
    };
  }

  return {
    label: "متوفر",
    className: "stock-badge stock-good",
  };
}

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [primaryImage, setPrimaryImage] =
    useState<Media | null>(null);
  const [galleryImages, setGalleryImages] =
    useState<Media[]>([]);
  const [colors, setColors] =
    useState<ProductColor[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [stockFilter, setStockFilter] =
    useState<StockFilter>("all");
  const [featuredFilter, setFeaturedFilter] =
    useState<FeaturedFilter>("all");
  const [showForm, setShowForm] =
    useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<Product | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [uploading, setUploading] =
    useState(false);
  const [deleting, setDeleting] =
    useState(false);
  const [selectedProducts, setSelectedProducts] =
    useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] =
    useState(false);
  const [bulkDeleting, setBulkDeleting] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [messageType, setMessageType] =
    useState<"error" | "success">("error");
  const [formError, setFormError] =
    useState("");
  const modalBodyRef =
    useRef<HTMLDivElement | null>(null);

  const colorsStockTotal = useMemo(() => {
    return colors.reduce(
      (total, color) =>
        total + (Number(color.stock) || 0),
      0
    );
  }, [colors]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (showForm || deleteTarget) {
      document.body.classList.add(
        "products-modal-open"
      );
    } else {
      document.body.classList.remove(
        "products-modal-open"
      );
    }

    return () => {
      document.body.classList.remove(
        "products-modal-open"
      );
    };
  }, [showForm, deleteTarget]);

  useEffect(() => {
    if (colors.length === 0) {
      return;
    }

    setForm((current) => {
      const newStock =
        String(colorsStockTotal);

      if (current.stock === newStock) {
        return current;
      }

      return {
        ...current,
        stock: newStock,
      };
    });
  }, [colorsStockTotal, colors.length]);

  useEffect(() => {
    if (!formError) {
      return;
    }

    requestAnimationFrame(() => {
      modalBodyRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }, [formError]);

  const handleSessionExpired = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(
      new Event("touchwood-auth-change")
    );
    window.location.href = "/ar/login";
  };

  const isUnauthorizedError = (
    error: unknown
  ) => {
    if (!(error instanceof Error)) {
      return false;
    }

    const message =
      error.message.toLowerCase();

    return (
      message.includes("unauthorized") ||
      message.includes("token") ||
      message.includes("expired") ||
      message.includes("authentication") ||
      message.includes("jwt") ||
      message.includes("غير مصرح") ||
      message.includes("انتهت صلاحية") ||
      message.includes("تسجيل الدخول")
    );
  };

  const loadProducts = async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      if (!token) {
        handleSessionExpired();
        return;
      }

const data =
  await getAdminProducts(token);

setProducts(
  Array.isArray(data)
    ? data
    : data?.products || []
);} catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired();
        return;
      }

      showMessage(
        error instanceof Error
          ? error.message
          : "تعذر تحميل المنتجات",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (
    text: string,
    type: "error" | "success" = "error"
  ) => {
    setMessage(text);
    setMessageType(type);

    if (type === "error") {
      setFormError(text);
    }
  };

  const showFormError = (
    text: string
  ) => {
    setFormError(text);
    setMessage("");
  };

  const clearFormError = () => {
    setFormError("");
  };

  const filteredProducts = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !value ||
        [
          product.name?.ar,
          product.name?.en,
          product.slug,
          product.serialNumber,
        ].some((item) =>
          item
            ?.toLowerCase()
            .includes(value)
        );

      const matchesCategory =
        categoryFilter === "all" ||
        product.category ===
          categoryFilter;

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "out" &&
          product.stock <= 0) ||
        (stockFilter === "low" &&
          product.stock > 0 &&
          product.stock <=
            LOW_STOCK_THRESHOLD) ||
        (stockFilter === "available" &&
          product.stock >
            LOW_STOCK_THRESHOLD);

      const matchesFeatured =
        featuredFilter === "all" ||
        (featuredFilter === "featured" &&
          product.featured === true);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock &&
        matchesFeatured
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    stockFilter,
    featuredFilter,
  ]);

  const openCreateForm = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setPrimaryImage(null);
    setGalleryImages([]);
    setColors([]);
    setMessage("");
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (
    product: Product
  ) => {
    const mainImage =
      product.media?.find(
        (item) => item.isPrimary
      ) ||
      product.media?.[0];

    setEditingProduct(product);

    setForm({
      name:
        product.name ||
        emptyLocalized(),
      description:
        product.description ||
        emptyLocalized(),
      slug: product.slug || "",
      category:
        product.category || "",
      price:
        product.price !== undefined &&
        product.price !== null
          ? String(product.price)
          : "",
      oldPrice:
        product.oldPrice === null ||
        product.oldPrice === undefined
          ? ""
          : String(product.oldPrice),
      serialNumber:
        product.serialNumber || "",
      stock:
        product.stock !== undefined &&
        product.stock !== null
          ? String(product.stock)
          : "0",
      featured:
        Boolean(product.featured),
      active:
        product.active !== false,
    });

    setPrimaryImage(
      mainImage || null
    );

    setGalleryImages(
      (product.media || []).filter(
        (item) =>
          item.storageKey !==
          mainImage?.storageKey
      )
    );

    setColors(
      product.colors || []
    );

    setMessage("");
    setFormError("");
    setShowForm(true);
  };

const uploadImage = async (
  file: File,
  fileData: ArrayBuffer,
  isPrimary: boolean
) => {
  const token = localStorage.getItem("token");

  if (!token) {
    handleSessionExpired();
    throw new Error(
      "انتهت جلسة تسجيل الدخول"
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(
      "يمكن رفع الصور فقط"
    );
  }

  const MAX_FILE_SIZE =
    10 * 1024 * 1024;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "حجم الصورة يجب ألا يتجاوز 10MB"
    );
  }

  try {
    const upload =
      await createUploadUrl(
        token,
        file.name,
        file.type,
        "products/gallery"
      );

    await uploadImageToR2(
      upload.uploadUrl,
      fileData,
      file.type
    );

    return {
      type: "image" as const,
      url: upload.publicUrl,
      storageKey: upload.key,
      thumbnail: upload.publicUrl,
      alt: {
        ar: form.name.ar,
        en: form.name.en,
      },
      sortOrder: 0,
      isPrimary,
    };
  } catch (error) {
    if (isUnauthorizedError(error)) {
      handleSessionExpired();
    }

    throw error;
  }
};

  const handleImageUpload = async (
  event: ChangeEvent<HTMLInputElement>,
  target: "primary" | "gallery"
) => {
  const files = Array.from(
    event.target.files || []
  );

  if (!files.length) {
    return;
  }

  try {
    setUploading(true);
    clearFormError();

    const uploadedImages: Media[] = [];

    for (const file of files) {
      const fileData = await new Promise<ArrayBuffer>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(reader.result);
            } else {
              reject(
                new Error(
                  "تعذر قراءة بيانات الصورة"
                )
              );
            }
          };

          reader.onerror = () => {
            reject(
              new Error(
                "تعذر قراءة الصورة من الجهاز"
              )
            );
          };

          reader.onabort = () => {
            reject(
              new Error(
                "تم إلغاء قراءة الصورة"
              )
            );
          };

          reader.readAsArrayBuffer(file);
        }
      );

      uploadedImages.push(
        await uploadImage(
          file,
          fileData,
          target === "primary"
        )
      );
    }

    if (target === "primary") {
      setPrimaryImage(uploadedImages[0]);

      if (uploadedImages.length > 1) {
        setGalleryImages((current) => [
          ...current,
          ...uploadedImages.slice(1),
        ]);
      }
    } else {
      setGalleryImages((current) => [
        ...current,
        ...uploadedImages,
      ]);
    }

    showMessage(
      "تم رفع الصورة بنجاح",
      "success"
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      handleSessionExpired();
      return;
    }

    showFormError(
      error instanceof Error
        ? error.message
        : "تعذر رفع الصورة"
    );
  } finally {
    setUploading(false);
    event.target.value = "";
  }
};

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    clearFormError();

    const token =
      localStorage.getItem("token");

    if (!token) {
      handleSessionExpired();
      return;
    }

    if (
      !form.name.ar.trim() ||
      !form.name.en.trim() ||
      !form.description.ar.trim() ||
      !form.description.en.trim() ||
      !form.category ||
      !form.serialNumber.trim() ||
      !form.price ||
      !primaryImage
    ) {
      showFormError(
        "يرجى إكمال جميع الحقول المطلوبة وإضافة الصورة الرئيسية"
      );
      return;
    }

    const enteredStock =
      Number(form.stock);

    if (
      !Number.isFinite(
        enteredStock
      ) ||
      enteredStock < 0 ||
      !Number.isInteger(
        enteredStock
      )
    ) {
      showFormError(
        "قيمة المخزون يجب أن تكون رقمًا صحيحًا أكبر من أو يساوي صفر"
      );
      return;
    }

    if (colors.length > 0) {
      const calculatedStock =
        colors.reduce(
          (total, color) =>
            total +
            (Number(color.stock) || 0),
          0
        );

      if (
        enteredStock !==
        calculatedStock
      ) {
        showFormError(
          `مخزون المنتج يجب أن يساوي مجموع مخزون الألوان. مجموع الألوان = ${calculatedStock} وحدة، بينما المخزون المدخل = ${enteredStock} وحدة.`
        );

        return;
      }
    }

    if (colors.length > 0) {
      const invalidColor =
        colors.some(
          (color) =>
            !color.name.ar.trim() ||
            !color.name.en.trim()
        );

      if (invalidColor) {
        showFormError(
          "يرجى إدخال اسم اللون بالعربية والإنجليزية لكل الألوان"
        );
        return;
      }
    }

    if (colors.length > 0) {
      const invalidColorStock =
        colors.some(
          (color) =>
            !Number.isFinite(
              Number(color.stock)
            ) ||
            Number(color.stock) < 0 ||
            !Number.isInteger(
              Number(color.stock)
            )
        );

      if (invalidColorStock) {
        showFormError(
          "مخزون كل لون يجب أن يكون رقمًا صحيحًا أكبر من أو يساوي صفر"
        );
        return;
      }
    }

    const generatedSlug =
      form.slug.trim() ||
      generateSlug(
        `${form.name.en} ${form.serialNumber}`
      );

    if (!generatedSlug) {
      showFormError(
        "تعذر إنشاء رابط المنتج"
      );
      return;
    }

    const media = [
      primaryImage,
      ...galleryImages,
    ].map((image, index) => ({
      ...image,
      isPrimary: index === 0,
      sortOrder: index,
      alt: {
        ar:
          image.alt?.ar ||
          form.name.ar,
        en:
          image.alt?.en ||
          form.name.en,
      },
    }));

    const productData = {
      name: form.name,
      description:
        form.description,
      slug: generatedSlug,
      category:
        form.category,
      price:
        Number(form.price),
      oldPrice:
        form.oldPrice
          ? Number(form.oldPrice)
          : null,
      serialNumber:
        form.serialNumber.trim(),
      stock:
        enteredStock,
      featured:
        form.featured,
      active:
        form.active,
      media,
      colors: colors.map(
        (color) => ({
          ...color,
          stock:
            Number(
              color.stock
            ) || 0,
          serialNumber:
            color.serialNumber?.trim() ||
            "",
        })
      ),
      specifications: [],
    };

    try {
      setSaving(true);
      clearFormError();

      if (editingProduct) {
        await updateProduct(
          token,
          editingProduct._id,
          productData
        );

        setFormError("");

        showMessage(
          "تم تحديث المنتج بنجاح",
          "success"
        );
      } else {
        await createProduct(
          token,
          productData
        );

        setFormError("");

        showMessage(
          "تمت إضافة المنتج بنجاح",
          "success"
        );
      }

      setShowForm(false);

      await loadProducts();
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired();
        return;
      }

      showFormError(
        error instanceof Error
          ? error.message
          : "تعذر حفظ المنتج"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleProductSelection = (
    productId: string
  ) => {
    setSelectedProducts((current) =>
      current.includes(productId)
        ? current.filter(
            (id) => id !== productId
          )
        : [...current, productId]
    );
  };

  const visibleProductIds =
    filteredProducts.map(
      (product) => product._id
    );

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) =>
      selectedProducts.includes(
        product._id
      )
    );

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedProducts((current) =>
        current.filter(
          (id) =>
            !visibleProductIds.includes(id)
        )
      );

      return;
    }

    setSelectedProducts((current) => [
      ...new Set([
        ...current,
        ...visibleProductIds,
      ]),
    ]);
  };

  const handleBulkDelete = async () => {
    if (!selectedProducts.length) {
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      handleSessionExpired();
      return;
    }

    try {
      setBulkDeleting(true);

      const results =
        await Promise.allSettled(
          selectedProducts.map(
            (productId) =>
              deleteProduct(
                token,
                productId
              )
          )
        );

      const unauthorized =
        results.some(
          (result) =>
            result.status ===
              "rejected" &&
            isUnauthorizedError(
              result.reason
            )
        );

      if (unauthorized) {
        handleSessionExpired();
        return;
      }

      const deletedIds =
        selectedProducts.filter(
          (_, index) =>
            results[index].status ===
            "fulfilled"
        );

      setProducts((current) =>
        current.filter(
          (product) =>
            !deletedIds.includes(
              product._id
            )
        )
      );

      setSelectedProducts((current) =>
        current.filter(
          (id) =>
            !deletedIds.includes(id)
        )
      );

      setBulkDeleteOpen(false);

      if (
        deletedIds.length ===
        selectedProducts.length
      ) {
        showMessage(
          "تم حذف المنتجات المحددة بنجاح",
          "success"
        );
      } else if (
        deletedIds.length > 0
      ) {
        showMessage(
          `تم حذف ${deletedIds.length} من أصل ${selectedProducts.length} منتجات، وتعذر حذف بعض المنتجات`,
          "error"
        );
      } else {
        showMessage(
          "تعذر حذف المنتجات المحددة",
          "error"
        );
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired();
        return;
      }

      showMessage(
        error instanceof Error
          ? error.message
          : "تعذر حذف المنتجات المحددة",
        "error"
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      handleSessionExpired();
      return;
    }

    try {
      setDeleting(true);

      await deleteProduct(
        token,
        deleteTarget._id
      );

      setProducts(
        (current) =>
          current.filter(
            (item) =>
              item._id !==
              deleteTarget._id
          )
      );

      setDeleteTarget(null);

      setSelectedProducts((current) =>
        current.filter(
          (id) =>
            id !== deleteTarget._id
        )
      );

      showMessage(
        "تم حذف المنتج بنجاح",
        "success"
      );
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired();
        return;
      }

      showMessage(
        error instanceof Error
          ? error.message
          : "تعذر حذف المنتج",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const updateColor = (
    index: number,
    changes: Partial<ProductColor>
  ) => {
    clearFormError();

    setColors(
      (current) =>
        current.map(
          (color, colorIndex) =>
            colorIndex === index
              ? {
                  ...color,
                  ...changes,
                }
              : color
        )
    );
  };

  if (loading) {
    return (
      <main
        className="products-loading"
        dir="rtl"
      >
        <Loader2
          size={30}
          className="products-spin"
        />

        <span>
          جاري تحميل المنتجات...
        </span>
      </main>
    );
  }

  return (
    <main
      className="products-page"
      dir="rtl"
    >
      <div className="products-container">
        <header className="products-header">
          <div>
            <span className="products-eyebrow">
              لوحة التحكم
            </span>

            <h1>
              إدارة المنتجات
            </h1>

            <br />

            <p>
              إدارة المنتجات والصور
              والألوان والمخزون من
              مكان واحد.
            </p>
          </div>

          <button
            className="products-primary-button"
            onClick={
              openCreateForm
            }
          >
            <Plus size={19} />
            إضافة منتج
          </button>
        </header>

        {message && (
          <div
            className={`products-message ${
              messageType ===
              "success"
                ? "message-success"
                : "message-error"
            }`}
          >
            <div>
              {messageType ===
              "success" ? (
                <Check size={18} />
              ) : (
                <X size={18} />
              )}

              <span>
                {message}
              </span>
            </div>

            <button
              onClick={() =>
                setMessage("")
              }
              aria-label="إغلاق"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="products-toolbar">
          <div className="products-search">
            <Search size={19} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="ابحث باسم المنتج أو الموديل..."
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="products-filter">
            <span>
              التصنيف
            </span>

            <div className="products-select-wrap">
              <select
                value={
                  categoryFilter
                }
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  جميع التصنيفات
                </option>

                {categories.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={16}
              />
            </div>
          </div>

          <div className="products-filter">
            <span>
              حالة المخزون
            </span>

            <div className="products-select-wrap">
              <select
                value={
                  stockFilter
                }
                onChange={(event) =>
                  setStockFilter(
                    event.target
                      .value as StockFilter
                  )
                }
              >
                <option value="all">
                  كل المنتجات
                </option>

                <option value="available">
                  متوفر
                </option>

                <option value="low">
                  على وشك النفاد
                </option>

                <option value="out">
                  نفد المخزون
                </option>
              </select>

              <ChevronDown
                size={16}
              />
            </div>
          </div>

          <div className="products-filter products-featured-filter">
            <span>
              المنتجات المميزة
            </span>

            <div className="products-select-wrap">
              <select
                value={featuredFilter}
                onChange={(event) =>
                  setFeaturedFilter(
                    event.target
                      .value as FeaturedFilter
                  )
                }
              >
                <option value="all">
                  جميع المنتجات
                </option>

                <option value="featured">
                  المنتجات المميزة فقط
                </option>
              </select>

              <ChevronDown size={16} />
            </div>
          </div>

          <div className="products-count">
            <strong>
              {
                filteredProducts.length
              }
            </strong>

            <span>
              منتج
            </span>
          </div>
        </section>

        {filteredProducts.length > 0 && (
          <div className="products-selection-toolbar">
            <label className="products-select-all">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
              />

              <span className="products-checkbox-ui">
                <Check size={14} />
              </span>

              <span>
                تحديد الكل
              </span>
            </label>

            {selectedProducts.length > 0 && (
              <div className="products-selection-actions">
                <span className="products-selected-count">
                  تم تحديد{" "}
                  <strong>
                    {selectedProducts.length}
                  </strong>{" "}
                  منتج
                </span>

                <button
                  type="button"
                  className="products-bulk-delete-button"
                  onClick={() =>
                    setBulkDeleteOpen(true)
                  }
                >
                  <Trash2 size={17} />
                  حذف المحدد
                </button>
              </div>
            )}
          </div>
        )}

        {filteredProducts.length ? (
          <section className="products-grid">
            {filteredProducts.map(
              (product) => {
                const image =
                  product.media?.find(
                    (item) =>
                      item.isPrimary
                  ) ||
                  product.media?.[0];

                const stockStatus =
                  getStockStatus(
                    Number(
                      product.stock
                    ) || 0
                  );

                return (
                  <article
                    className={`product-card ${
                      selectedProducts.includes(
                        product._id
                      )
                        ? "product-card-selected"
                        : ""
                    }`}
                    key={
                      product._id
                    }
                  >
                    <label className="product-selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(
                          product._id
                        )}
                        onChange={() =>
                          toggleProductSelection(
                            product._id
                          )
                        }
                      />

                      <span className="products-checkbox-ui">
                        <Check size={14} />
                      </span>
                    </label>

                    <div className="product-card-image">
                      {image ? (
                        <img
                          src={
                            image.url
                          }
                          alt={
                            product
                              .name
                              ?.ar ||
                            product
                              .name
                              ?.en ||
                            "Product"
                          }
                        />
                      ) : (
                        <div className="product-no-image">
                          <Package
                            size={48}
                          />

                          <span>
                            لا توجد صورة
                          </span>
                        </div>
                      )}

                      <div className="product-card-category">
                        {
                          getCategoryLabel(
                            product.category
                          )
                        }
                      </div>

                      {!product.active && (
                        <div className="product-inactive">
                          غير نشط
                        </div>
                      )}
                    </div>

                    <div className="product-card-body">
                      <div className="product-card-heading">
                        <div>
                          <h2>
                            {
                              product
                                .name
                                ?.ar ||
                              product
                                .name
                                ?.en ||
                              "بدون اسم"
                            }
                          </h2>

                          {product
                            .name
                            ?.en && (
                            <p dir="ltr">
                              {
                                product
                                  .name
                                  .en
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="product-model">
                        <span>
                          الموديل
                        </span>

                        <strong dir="ltr">
                          {
                            product
                              .serialNumber ||
                            "—"
                          }
                        </strong>
                      </div>

                      <div className="product-card-info">
                        <div className="product-info-item">
                          <span>
                            السعر
                          </span>

                          <strong>
                            {Number(
                              product.price ||
                                0
                            ).toLocaleString(
                              "ar-EG"
                            )}{" "}
                            ج.م
                          </strong>
                        </div>

                        <div className="product-info-item">
                          <span>
                            المخزون
                          </span>

                          <strong>
                            {
                              product.stock
                            }
                          </strong>
                        </div>
                      </div>

                      <div className="product-stock-row">
                        <span
                          className={
                            stockStatus.className
                          }
                        >
                          <span className="stock-dot" />

                          {
                            stockStatus.label
                          }
                        </span>

                        <span className="product-stock-number">
                          {
                            product.stock
                          }{" "}
                          وحدة
                        </span>
                      </div>

                      <div className="product-card-actions">
                        <button
                          className="product-edit-button"
                          onClick={() =>
                            openEditForm(
                              product
                            )
                          }
                        >
                          <Edit3
                            size={17}
                          />

                          تعديل
                        </button>

                        <button
                          className="product-delete-button"
                          onClick={() =>
                            setDeleteTarget(
                              product
                            )
                          }
                        >
                          <Trash2
                            size={17}
                          />

                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        ) : (
          <div className="products-empty">
            <Package
              size={55}
            />

            <h3>
              لا توجد منتجات
            </h3>

            <p>
              لم نجد منتجات تطابق
              معايير البحث الحالية.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter(
                  "all"
                );
                setStockFilter(
                  "all"
                );
                setFeaturedFilter(
                  "all"
                );
              }}
            >
              إعادة ضبط التصفية
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="product-modal-layer">
          <div
            className="product-modal-backdrop"
            onClick={() => {
              if (
                !saving &&
                !uploading
              ) {
                setShowForm(false);
              }
            }}
          />

          <form
            className="product-modal"
            onSubmit={
              handleSubmit
            }
          >
            <header className="product-modal-header">
              <div>
                <span>
                  إدارة المنتجات
                </span>

                <h2>
                  {editingProduct
                    ? "تعديل المنتج"
                    : "إضافة منتج جديد"}
                </h2>

                <p>
                  أدخل بيانات المنتج
                  والصور والمخزون
                  والألوان.
                </p>
              </div>

              <button
                type="button"
                className="product-modal-close"
                disabled={
                  saving ||
                  uploading
                }
                onClick={() =>
                  setShowForm(false)
                }
              >
                <X size={22} />
              </button>
            </header>

            {formError && (
              <div
                className="product-form-error"
                role="alert"
              >
                <div className="product-form-error-icon">
                  <X size={20} />
                </div>

                <div className="product-form-error-content">
                  <strong>
                    لا يمكن حفظ المنتج
                  </strong>

                  <p>
                    {formError}
                  </p>
                </div>

                <button
                  type="button"
                  className="product-form-error-close"
                  onClick={
                    clearFormError
                  }
                  aria-label="إغلاق رسالة الخطأ"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            <div
              className="product-modal-body"
              ref={modalBodyRef}
            >
              <section className="product-form-section">
                <div className="product-section-heading">
                  <div>
                    <span>
                      01
                    </span>

                    <div>
                      <h3>
                        المعلومات
                        الأساسية
                      </h3>

                      <p>
                        البيانات الأساسية
                        للمنتج
                      </p>
                    </div>
                  </div>
                </div>

                <div className="product-form-grid">
                  <Field
                    label="اسم المنتج بالعربية"
                    required
                  >
                    <input
                      value={
                        form.name.ar
                      }
                      onChange={(
                        event
                      ) => {
                        clearFormError();

                        setForm(
                          (current) => ({
                            ...current,
                            name: {
                              ...current.name,
                              ar: event
                                .target
                                .value,
                            },
                          })
                        );
                      }}
                      placeholder="مثال: مكتب مدير فاخر"
                    />
                  </Field>

                  <Field
                    label="اسم المنتج بالإنجليزية"
                    required
                  >
                    <input
                      dir="ltr"
                      value={
                        form.name.en
                      }
                      onChange={(
                        event
                      ) => {
                        clearFormError();

                        setForm(
                          (current) => ({
                            ...current,
                            name: {
                              ...current.name,
                              en: event
                                .target
                                .value,
                            },
                          })
                        );
                      }}
                      placeholder="Example: Executive Desk"
                    />
                  </Field>

                  <Field
                    label="الوصف بالعربية"
                    required
                    full
                  >
                    <textarea
                      value={
                        form.description
                          .ar
                      }
                      onChange={(
                        event
                      ) => {
                        clearFormError();

                        setForm(
                          (current) => ({
                            ...current,
                            description: {
                              ...current.description,
                              ar: event
                                .target
                                .value,
                            },
                          })
                        );
                      }}
                      placeholder="اكتب وصفًا واضحًا للمنتج..."
                    />
                  </Field>

                  <Field
                    label="الوصف بالإنجليزية"
                    required
                    full
                  >
                    <textarea
                      dir="ltr"
                      value={
                        form.description
                          .en
                      }
                      onChange={(
                        event
                      ) => {
                        clearFormError();

                        setForm(
                          (current) => ({
                            ...current,
                            description: {
                              ...current.description,
                              en: event
                                .target
                                .value,
                            },
                          })
                        );
                      }}
                      placeholder="Write a clear product description..."
                    />
                  </Field>

                  <Field
                    label="التصنيف"
                    required
                  >
                    <select
                      value={
                        form.category
                      }
                      onChange={(
                        event
                      ) => {
                        clearFormError();

                        setForm(
                          (current) => ({
                            ...current,
                            category:
                              event
                                .target
                                .value,
                          })
                        );
                      }}
                    >
                      <option value="">
                        اختر التصنيف
                      </option>

                      {categories.map(
                        ([
                          value,
                          label,
                        ]) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field
                    label="الموديل"
                    required
                  >
                    <input
                      dir="ltr"
                      value={
                        form.serialNumber
                      }
                      onChange={(
                        event
                      ) => {
                        clearFormError();

                        setForm(
                          (current) => ({
                            ...current,
                            serialNumber:
                              event
                                .target
                                .value,
                          })
                        );
                      }}
                      placeholder="TW-2026-001"
                    />
                  </Field>

                  <Field
                    label="السعر"
                    required
                  >
                    <div className="product-input-with-suffix">
                      <input
                        type="number"
                        min="0"
                        value={
                          form.price
                        }
                        onChange={(
                          event
                        ) => {
                          clearFormError();

                          setForm(
                            (current) => ({
                              ...current,
                              price:
                                event
                                  .target
                                  .value,
                            })
                          );
                        }}
                        placeholder="0"
                      />

                      <span>
                        ج.م
                      </span>
                    </div>
                  </Field>

                  <Field label="السعر القديم">
                    <div className="product-input-with-suffix">
                      <input
                        type="number"
                        min="0"
                        value={
                          form.oldPrice
                        }
                        onChange={(
                          event
                        ) => {
                          clearFormError();

                          setForm(
                            (current) => ({
                              ...current,
                              oldPrice:
                                event
                                  .target
                                  .value,
                            })
                          );
                        }}
                        placeholder="0"
                      />

                      <span>
                        ج.م
                      </span>
                    </div>
                  </Field>

                  <Field label="المخزون">
                    <div className="product-stock-field">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          form.stock
                        }
                        onChange={(
                          event
                        ) => {
                          clearFormError();

                          setForm(
                            (current) => ({
                              ...current,
                              stock:
                                event
                                  .target
                                  .value,
                            })
                          );
                        }}
                        placeholder="0"
                      />

                      {colors.length >
                        0 && (
                        <div className="product-stock-calculated">
                          <span>
                            إجمالي مخزون
                            الألوان
                          </span>

                          <strong>
                            {
                              colorsStockTotal
                            }{" "}
                            وحدة
                          </strong>
                        </div>
                      )}
                    </div>

                    {colors.length >
                      0 && (
                      <small className="product-stock-hint">
                        يجب أن يساوي
                        مخزون المنتج
                        مجموع مخزون جميع
                        الألوان.
                      </small>
                    )}

                    {colors.length ===
                      0 && (
                      <small className="product-stock-hint">
                        أدخل المخزون
                        الإجمالي للمنتج
                        يدويًا.
                      </small>
                    )}
                  </Field>
                </div>
              </section>

              <section className="product-form-section">
                <div className="product-section-heading">
                  <div>
                    <span>
                      02
                    </span>

                    <div>
                      <h3>
                        صور المنتج
                      </h3>

                      <p>
                        الصورة الرئيسية
                        وصور المعرض
                      </p>
                    </div>
                  </div>
                </div>

                <div className="product-images-layout">
                  <div className="product-primary-image-panel">
                    <div className="image-panel-title">
                      <div>
                        <h4>
                          الصورة
                          الرئيسية
                        </h4>

                        <span>
                          تظهر كصورة
                          المنتج الأساسية
                        </span>
                      </div>

                      <span className="required-pill">
                        مطلوبة
                      </span>
                    </div>

                    {primaryImage ? (
                      <div className="primary-image-preview">
                        <img
                          src={
                            primaryImage.url
                          }
                          alt="الصورة الرئيسية"
                        />

                        <div className="image-preview-overlay">
                          <button
                            type="button"
                            onClick={() => {
                              clearFormError();

                              setPrimaryImage(
                                null
                              );
                            }}
                          >
                            <Trash2
                              size={16}
                            />

                            إزالة
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="main-upload-zone">
                        <div className="upload-icon">
                          <ImagePlus
                            size={27}
                          />
                        </div>

                        <strong>
                          {uploading
                            ? "جاري رفع الصورة..."
                            : "اختر الصورة الرئيسية"}
                        </strong>

                        <span>
                          JPG, PNG, WEBP
                        </span>

                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          disabled={
                            uploading
                          }
                          onChange={(
                            event
                          ) =>
                            handleImageUpload(
                              event,
                              "primary"
                            )
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div className="product-gallery-panel">
                    <div className="image-panel-title">
                      <div>
                        <h4>
                          صور المعرض
                        </h4>

                        <span>
                          يمكنك إضافة أكثر
                          من صورة
                        </span>
                      </div>

                      <label className="gallery-add-button">
                        <Plus
                          size={17}
                        />

                        إضافة صور

                        <input
                          hidden
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={
                            uploading
                          }
                          onChange={(
                            event
                          ) =>
                            handleImageUpload(
                              event,
                              "gallery"
                            )
                          }
                        />
                      </label>
                    </div>

                    {galleryImages.length ? (
                      <div className="gallery-preview-grid">
                        {galleryImages.map(
                          (
                            image,
                            index
                          ) => (
                            <div
                              className="gallery-preview-item"
                              key={
                                image.storageKey
                              }
                            >
                              <img
                                src={
                                  image.url
                                }
                                alt=""
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  clearFormError();

                                  setGalleryImages(
                                    (
                                      current
                                    ) =>
                                      current.filter(
                                        (
                                          _,
                                          itemIndex
                                        ) =>
                                          itemIndex !==
                                          index
                                      )
                                  );
                                }}
                              >
                                <X
                                  size={14}
                                />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <label className="gallery-empty">
                        <ImagePlus
                          size={25}
                        />

                        <span>
                          لم تتم إضافة صور
                          للمعرض
                        </span>

                        <small>
                          اضغط لإضافة الصور
                        </small>

                        <input
                          hidden
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={
                            uploading
                          }
                          onChange={(
                            event
                          ) =>
                            handleImageUpload(
                              event,
                              "gallery"
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              </section>

              <section className="product-form-section">
                <div className="product-section-heading product-colors-heading">
                  <div>
                    <span>
                      03
                    </span>

                    <div>
                      <h3>
                        ألوان المنتج
                      </h3>

                      <p>
                        أضف الألوان المتاحة
                        والمخزون لكل لون
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="add-color-button"
                    onClick={() => {
                      clearFormError();

                      setColors(
                        (current) => [
                          ...current,
                          emptyColor(),
                        ]
                      );
                    }}
                  >
                    <Plus
                      size={17}
                    />

                    إضافة لون
                  </button>
                </div>

                {colors.length >
                  0 && (
                  <div className="colors-stock-summary">
                    <div>
                      <span>
                        إجمالي المخزون يتم
                        حسابه تلقائيًا من
                        مخزون كل لون من
                        الألوان
                      </span>

                      <br />

                      <small />
                    </div>

                    <strong>
                      {
                        colorsStockTotal
                      }{" "}
                      <span>
                        وحدة
                      </span>
                    </strong>
                  </div>
                )}

                {colors.length ? (
                  <div className="colors-list">
                    {colors.map(
                      (
                        color,
                        index
                      ) => (
                        <div
                          className="color-item"
                          key={index}
                        >
                          <div className="color-preview">
                            <input
                              type="color"
                              value={
                                color.hex
                              }
                              onChange={(
                                event
                              ) =>
                                updateColor(
                                  index,
                                  {
                                    hex:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />
                          </div>

                          <div className="color-field">
                            <label>
                              اسم اللون
                              بالعربية
                            </label>

                            <input
                              value={
                                color
                                  .name
                                  .ar
                              }
                              onChange={(
                                event
                              ) =>
                                updateColor(
                                  index,
                                  {
                                    name: {
                                      ...color.name,
                                      ar:
                                        event
                                          .target
                                          .value,
                                    },
                                  }
                                )
                              }
                              placeholder="أبيض"
                            />
                          </div>

                          <div className="color-field">
                            <label>
                              اسم اللون
                              بالإنجليزية
                            </label>

                            <input
                              dir="ltr"
                              value={
                                color
                                  .name
                                  .en
                              }
                              onChange={(
                                event
                              ) =>
                                updateColor(
                                  index,
                                  {
                                    name: {
                                      ...color.name,
                                      en:
                                        event
                                          .target
                                          .value,
                                    },
                                  }
                                )
                              }
                              placeholder="White"
                            />
                          </div>

                          <div className="color-field">
                            <label>
                              المخزون
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                color.stock
                              }
                              onChange={(
                                event
                              ) =>
                                updateColor(
                                  index,
                                  {
                                    stock:
                                      Number(
                                        event
                                          .target
                                          .value
                                      ) || 0,
                                  }
                                )
                              }
                            />
                          </div>

                          <button
                            type="button"
                            className="remove-color-button"
                            onClick={() => {
                              clearFormError();

                              setColors(
                                (
                                  current
                                ) =>
                                  current.filter(
                                    (
                                      _,
                                      colorIndex
                                    ) =>
                                      colorIndex !==
                                      index
                                  )
                              );
                            }}
                            aria-label="حذف اللون"
                          >
                            <Trash2
                              size={17}
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="colors-empty">
                    <div>
                      <Package
                        size={26}
                      />
                    </div>

                    <div>
                      <strong>
                        لا توجد ألوان
                        مضافة
                      </strong>

                      <span>
                        إذا كان المنتج
                        متاحًا بأكثر من
                        لون يمكنك
                        إضافتها هنا.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        clearFormError();

                        setColors([
                          emptyColor(),
                        ]);
                      }}
                    >
                      إضافة أول لون
                    </button>
                  </div>
                )}
              </section>

              <section className="product-form-section product-options-section">
                <label className="product-switch">
                  <input
                    type="checkbox"
                    checked={
                      form.featured
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          featured:
                            event
                              .target
                              .checked,
                        })
                      )
                    }
                  />

                  <span className="switch-ui" />

                  <div>
                    <strong>
                      منتج مميز
                    </strong>

                    <small>
                      يظهر ضمن المنتجات
                      المميزة
                    </small>
                  </div>
                </label>

                <label className="product-switch">
                  <input
                    type="checkbox"
                    checked={
                      form.active
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          active:
                            event
                              .target
                              .checked,
                        })
                      )
                    }
                  />

                  <span className="switch-ui" />

                  <div>
                    <strong>
                      المنتج نشط
                    </strong>

                    <small>
                      السماح بعرض المنتج
                      في المتجر
                    </small>
                  </div>
                </label>
              </section>
            </div>

            <footer className="product-modal-footer">
              <button
                type="button"
                className="product-cancel-button"
                disabled={
                  saving ||
                  uploading
                }
                onClick={() =>
                  setShowForm(false)
                }
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="product-save-button"
                disabled={
                  saving ||
                  uploading
                }
              >
                {saving ? (
                  <>
                    <Loader2
                      size={18}
                      className="products-spin"
                    />

                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check
                      size={18}
                    />

                    {editingProduct
                      ? "حفظ التعديلات"
                      : "إضافة المنتج"}
                  </>
                )}
              </button>
            </footer>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="delete-modal-layer">
          <div
            className="delete-modal-backdrop"
            onClick={() =>
              !deleting &&
              setDeleteTarget(null)
            }
          />

          <div className="delete-modal">
            <div className="delete-icon">
              <Trash2
                size={25}
              />
            </div>

            <h2>
              حذف المنتج؟
            </h2>

            <p>
              هل أنت متأكد أنك تريد
              حذف المنتج:
            </p>

            <strong>
              {deleteTarget.name
                ?.ar ||
                deleteTarget.name
                  ?.en}
            </strong>

            <span>
              سيتم حذف المنتج
              والصور المرتبطة به
              من النظام.
            </span>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel"
                disabled={
                  deleting
                }
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
              >
                إلغاء
              </button>

              <button
                type="button"
                className="delete-confirm"
                disabled={
                  deleting
                }
                onClick={
                  handleDelete
                }
              >
                {deleting ? (
                  <>
                    <Loader2
                      size={17}
                      className="products-spin"
                    />

                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={17}
                    />

                    نعم، حذف المنتج
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="delete-modal-layer">
          <div
            className="delete-modal-backdrop"
            onClick={() =>
              !bulkDeleting &&
              setBulkDeleteOpen(false)
            }
          />

          <div className="delete-modal">
            <div className="delete-icon">
              <Trash2 size={25} />
            </div>

            <h2>
              حذف المنتجات المحددة؟
            </h2>

            <p>
              هل أنت متأكد أنك تريد حذف
              المنتجات المحددة؟
            </p>

            <strong>
              تم تحديد{" "}
              {selectedProducts.length}{" "}
              منتج
            </strong>

            <span>
              سيتم حذف المنتجات المحددة
              والصور المرتبطة بها من النظام.
            </span>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel"
                disabled={bulkDeleting}
                onClick={() =>
                  setBulkDeleteOpen(false)
                }
              >
                إلغاء
              </button>

              <button
                type="button"
                className="delete-confirm"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
              >
                {bulkDeleting ? (
                  <>
                    <Loader2
                      size={17}
                      className="products-spin"
                    />

                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />

                    نعم، حذف المنتجات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  required = false,
  full = false,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`product-field ${
        full
          ? "product-field-full"
          : ""
      }`}
    >
      <span>
        {label}

        {required && (
          <b> *</b>
        )}
      </span>

      {children}
    </label>
  );
}