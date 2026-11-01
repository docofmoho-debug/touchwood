export type LocalizedText = {
  ar?: string;
  en?: string;
};

export type LocalProductColor = {
  _id?: string;
  name?: LocalizedText | string;
  label?: LocalizedText | string;
  color?: string;
  value?: string;
  hex?: string;
  code?: string;
};

export type LocalProduct = {
  _id: string;
  slug?: string;
  name?: LocalizedText;
  description?: LocalizedText;
  category?: string;
  price: number;
  oldPrice?: number | null;
  stock?: number;
  rating?: number;
  reviewsCount?: number;
  colors?: LocalProductColor[];
  media?: Array<{
    type?: "image" | "video";
    url: string;
    thumbnail?: string;
    alt?: LocalizedText;
    isPrimary?: boolean;
  }>;
};

export type CartColorDetails = {
  id: string;
  name?: LocalizedText | string;
  label?: LocalizedText | string;
  value: string;
};

export type CartItem = {
  product: LocalProduct;
  quantity: number;

  /**
   * معرف اللون المختار. نحتفظ به في هذا الحقل للتوافق
   * مع صفحات السلة الحالية التي تستخدم selectedColor.
   */
  selectedColor?: string | null;

  /**
   * تفاصيل اللون المختار حتى يمكن عرض الاسم والقيمة
   * في السلة وإرسالها لاحقًا إلى الطلب.
   */
  selectedColorDetails?: CartColorDetails | null;
};

export const WISHLIST_KEY = "touchwood_wishlist";
export const COMPARE_KEY = "touchwood_compare";
export const CART_KEY = "touchwood_cart";

export const LOCAL_LIST_CHANGE_EVENT =
  "touchwood-local-list-change";

export type LocalListKey =
  | typeof WISHLIST_KEY
  | typeof COMPARE_KEY
  | typeof CART_KEY;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return fallback;
    }

    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));

  window.dispatchEvent(
    new CustomEvent(LOCAL_LIST_CHANGE_EVENT, {
      detail: {
        key,
        value,
      },
    })
  );
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<CartItem>;

  return (
    !!item.product &&
    typeof item.product === "object" &&
    typeof item.product._id === "string" &&
    typeof item.quantity === "number"
  );
}

function getColorId(
  color: LocalProductColor,
  index: number
): string {
  if (typeof color._id === "string" && color._id.trim()) {
    return color._id;
  }

  const value =
    color.hex ||
    color.color ||
    color.value ||
    color.code ||
    "";

  return `${value}-${index}`;
}

function getColorDetails(
  product: LocalProduct,
  selectedColor: string | null
): CartColorDetails | null {
  if (!selectedColor || !Array.isArray(product.colors)) {
    return null;
  }

  const index = product.colors.findIndex(
    (color, colorIndex) =>
      getColorId(color, colorIndex) === selectedColor
  );

  if (index < 0) {
    return null;
  }

  const color = product.colors[index];

  const value =
    color.hex ||
    color.color ||
    color.value ||
    color.code ||
    "";

  return {
    id: selectedColor,
    ...(color.name !== undefined ? { name: color.name } : {}),
    ...(color.label !== undefined ? { label: color.label } : {}),
    value,
  };
}

export function getStoredIds(
  key: typeof WISHLIST_KEY | typeof COMPARE_KEY
): string[] {
  const stored = readStorage<unknown>(key, []);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter((item): item is string => {
      return typeof item === "string";
    })
    .map(String);
}

export function setStoredIds(
  key: typeof WISHLIST_KEY | typeof COMPARE_KEY,
  ids: string[]
): void {
  const uniqueIds = Array.from(new Set(ids));

  writeStorage(key, uniqueIds);
}

export function hasStoredId(
  key: typeof WISHLIST_KEY | typeof COMPARE_KEY,
  productId: string
): boolean {
  return getStoredIds(key).includes(productId);
}

export function getStoredIdCount(
  key: typeof WISHLIST_KEY | typeof COMPARE_KEY
): number {
  return getStoredIds(key).length;
}

export function getWishlistCount(): number {
  return getStoredIdCount(WISHLIST_KEY);
}

export function getCompareCount(): number {
  return getStoredIdCount(COMPARE_KEY);
}

export function toggleStoredId(
  key: typeof WISHLIST_KEY | typeof COMPARE_KEY,
  productId: string
): boolean {
  const currentIds = getStoredIds(key);

  const exists = currentIds.includes(productId);

  const nextIds = exists
    ? currentIds.filter((id) => id !== productId)
    : [...currentIds, productId];

  setStoredIds(key, nextIds);

  return !exists;
}

export function getCartItems(): CartItem[] {
  const stored = readStorage<unknown>(CART_KEY, []);

  if (!Array.isArray(stored)) {
    return [];
  }

  /*
   * الصيغة الحالية:
   * [
   *   {
   *     product: {...},
   *     quantity: 1,
   *     selectedColor: "...",
   *     selectedColorDetails: { id, name, label, value }
   *   }
   * ]
   *
   * العناصر المحفوظة قبل إضافة selectedColorDetails تظل
   * صالحة؛ لأن هذا الحقل اختياري.
   */
  if (stored.every(isCartItem)) {
    return stored;
  }

  /*
   * الصيغة القديمة كانت تحفظ معرفات المنتجات فقط.
   * لا يمكن استرجاع السعر والصورة والبيانات الكاملة
   * من المعرف وحده، لذلك نتجاهل الصيغة القديمة
   * بدلًا من إنشاء بيانات ناقصة أو غير صحيحة.
   */
  return [];
}

export function setCartItems(items: CartItem[]): void {
  const normalizedItems = items
    .filter((item) => {
      return (
        item &&
        item.product &&
        typeof item.product._id === "string" &&
        item.quantity > 0
      );
    })
    .map((item) => ({
      ...item,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }));

  writeStorage(CART_KEY, normalizedItems);
}

export function addToCart(
  product: LocalProduct,
  quantity = 1,
  selectedColor: string | null = null
): CartItem[] {
  const currentItems = getCartItems();
  const selectedColorDetails = getColorDetails(product, selectedColor);

  const existingIndex = currentItems.findIndex(
    (item) =>
      item.product._id === product._id &&
      (item.selectedColor ?? null) === selectedColor
  );

  const safeQuantity = Math.max(1, Math.floor(quantity));

  if (existingIndex >= 0) {
    const nextItems = [...currentItems];

    nextItems[existingIndex] = {
      ...nextItems[existingIndex],
      // تحديث تفاصيل اللون أيضًا حتى لا تبقى بيانات قديمة.
      selectedColor,
      selectedColorDetails,
      quantity:
        nextItems[existingIndex].quantity + safeQuantity,
    };

    setCartItems(nextItems);

    return nextItems;
  }

  const nextItems: CartItem[] = [
    ...currentItems,
    {
      product,
      quantity: safeQuantity,
      selectedColor,
      selectedColorDetails,
    },
  ];

  setCartItems(nextItems);

  return nextItems;
}

export function updateCartQuantity(
  productId: string,
  quantity: number,
  selectedColor: string | null = null
): CartItem[] {
  const safeQuantity = Math.floor(quantity);
  const currentItems = getCartItems();

  const nextItems = currentItems
    .map((item) => {
      if (
        item.product._id === productId &&
        (item.selectedColor ?? null) === selectedColor
      ) {
        return {
          ...item,
          quantity: safeQuantity,
        };
      }

      return item;
    })
    .filter((item) => item.quantity > 0);

  setCartItems(nextItems);

  return nextItems;
}

export function removeFromCart(
  productId: string,
  selectedColor: string | null = null
): CartItem[] {
  const currentItems = getCartItems();

  const nextItems = currentItems.filter((item) => {
    return !(
      item.product._id === productId &&
      (item.selectedColor ?? null) === selectedColor
    );
  });

  setCartItems(nextItems);

  return nextItems;
}

export function clearCart(): void {
  setCartItems([]);
}

export function getCartItemCount(): number {
  return getCartItems().reduce(
    (total, item) => total + item.quantity,
    0
  );
}

export function getCartUniqueItemCount(): number {
  return getCartItems().length;
}

export function getCartTotal(): number {
  return getCartItems().reduce((total, item) => {
    const price = Number(item.product.price) || 0;

    return total + price * item.quantity;
  }, 0);
}
