
const API_URL =
  "https://touchwood-oo1l.onrender.com/api";
const PRODUCT_REVIEWS_API_URL =
  typeof window === "undefined"
    ? API_URL
    : "/api";
const apiRequest = async (
  path,
  {
    method = "GET",
    token,
    body,baseUrl = API_URL,
  } = {}
) => {
  const response = await fetch(
`${baseUrl}${path}`,    {
      method,

      headers: {
        ...(body !== undefined
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },

      ...(body !== undefined
        ? {
            body: JSON.stringify(body),
          }
        : {}),
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    response.status === 401 &&
    token &&
    typeof window !== "undefined"
  ) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(
      new CustomEvent(
        "touchwood-session-expired",
        {
          detail: {
            reason:
              data?.code ===
              "AUTH_TOKEN_EXPIRED"
                ? "expired"
                : "unauthorized",
          },
        }
      )
    );
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || "Request failed"
    );

    error.code = data?.code;

    throw error;
  }

  return data;
};

/* المنتجات */

export const getProducts = async (params = {}) => {
  const query = new URLSearchParams();

  if (params.category) {
    query.set("category", params.category);
  }

  if (params.featured !== undefined) {
    query.set(
      "featured",
      String(params.featured)
    );
  }

  if (params.active !== undefined) {
    query.set(
      "active",
      String(params.active)
    );
  }

  if (params.search?.trim()) {
    query.set(
      "search",
      params.search.trim()
    );
  }

  if (params.limit !== undefined) {
    query.set(
      "limit",
      String(params.limit)
    );
  }

  if (params.page !== undefined) {
    query.set(
      "page",
      String(params.page)
    );
  }

  const queryString = query.toString();

  /*
   * طلبات المنتجات العامة تمر عبر
   * Cloudflare Worker حتى يتم تخزينها في Cache.
   *
   * باقي الـ API يستمر في استخدام Railway
   * مباشرة كما هو.
   */
  const response = await fetch(
    `/api/products${
      queryString
        ? `?${queryString}`
        : ""
    }`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        "Failed to load products"
    );

    error.code = data?.code;

    throw error;
  }

  return data;
};

export const getProductById = async (id) => {
  return apiRequest(`/products/${id}`);
};

export const getProductBySlug = async (slug) => {
  return apiRequest(`/products/slug/${slug}`);
};

export const createProduct = async (
  token,
  productData
) => {
  return apiRequest("/products", {
    method: "POST",
    token,
    body: productData,
  });
};

export const updateProduct = async (
  token,
  productId,
  productData
) => {
  return apiRequest(`/products/${productId}`, {
    method: "PUT",
    token,
    body: productData,
  });
};

export const deleteProduct = async (
  token,
  productId
) => {
  return apiRequest(`/products/${productId}`, {
    method: "DELETE",
    token,
  });
};

/* رفع الصور */

export const createUploadUrl = async (
  token,
  fileName,
  contentType,
  folder = "products/gallery"
) => {
  return apiRequest("/uploads/presign", {
    method: "POST",
    token,
    body: {
      fileName,
      contentType,
      folder,
    },
  });
};

export const uploadImageToR2 = async (
  uploadUrl,
  fileBlob,
  contentType
) => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: fileBlob,
  });

  if (!response.ok) {
    const error = new Error(
      "Failed to upload file"
    );

    error.code =
      `UPLOAD_${response.status}`;

    throw error;
  }
};

export const deleteUpload = async (
  token,
  key
) => {
  return apiRequest("/uploads", {
    method: "DELETE",
    token,
    body: { key },
  });
};

/* المصادقة */

export const register = async (userData) => {
  return apiRequest("/user/register", {
    method: "POST",
    body: userData,
  });
};

export const logIn = async (
  userData,
  locale = "en"
) => {
  try {
    return await apiRequest("/user/login", {
      method: "POST",
      body: userData,
    });
  } catch (error) {
    if (locale === "ar") {
      const message =
        error instanceof Error
          ? error.message.trim().toLowerCase()
          : "";

      if (
        message.includes("invalid email or password") ||
        message.includes("invalid credentials") ||
        message.includes("invalid email") ||
        message.includes("invalid password") ||
        message.includes("incorrect email or password") ||
        message.includes("incorrect password") ||
        message.includes("wrong email or password") ||
        message.includes("wrong password") ||
        message.includes("wrong email") ||
        message.includes("authentication failed") ||
        message.includes("unauthorized")
      ) {
        throw new Error(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        );
      }

      if (
        message.includes("user not found") ||
        message.includes("account not found") ||
        message.includes("email not found")
      ) {
        throw new Error(
          "لم يتم العثور على حساب بهذا البريد الإلكتروني."
        );
      }

      if (
        message.includes("email is required") ||
        message.includes("email required")
      ) {
        throw new Error(
          "البريد الإلكتروني مطلوب."
        );
      }

      if (
        message.includes("password is required") ||
        message.includes("password required")
      ) {
        throw new Error(
          "كلمة المرور مطلوبة."
        );
      }

      if (
        message.includes("too many requests") ||
        message.includes("too many attempts")
      ) {
        throw new Error(
          "تم تجاوز عدد محاولات تسجيل الدخول المسموح بها. حاول مرة أخرى لاحقًا."
        );
      }

      if (
        message.includes("network error") ||
        message.includes("failed to fetch") ||
        message.includes("fetch failed")
      ) {
        throw new Error(
          "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى."
        );
      }

      if (
        message.includes("server error") ||
        message.includes("internal server error") ||
        message.includes("500")
      ) {
        throw new Error(
          "حدث خطأ في الخادم. حاول مرة أخرى لاحقًا."
        );
      }

      if (/[a-zA-Z]/.test(message)) {
        throw new Error(
          "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى."
        );
      }
    }

    throw error;
  }
};

export const updateProfile = async (
  token,
  userData
) => {
  return apiRequest("/user/update", {
    method: "PUT",
    token,
    body: userData,
  });
};

export const changePassword = (
  token,
  currentPassword,
  newPassword
) => {
  return apiRequest("/user/password", {
    method: "PUT",
    token,
    body: {
      currentPassword,
      newPassword,
    },
  });
};

/* الطلبات */

export const getOrders = async (token) => {
  return apiRequest("/orders", { token });
};

export const getOrderById = async (
  token,
  orderId
) => {
  return apiRequest(`/orders/${orderId}`, {
    token,
  });
};

export const cancelOrder = async (
  token,
  orderId
) => {
  return apiRequest(`/orders/${orderId}`, {
    method: "PATCH",
    token,
  });
};

export const checkout = async (
  token,
  orderData
) => {
  return apiRequest("/checkout", {
    method: "POST",
    token,
    body: orderData,
  });
};

/* السلة */

export const getCart = async (token) => {
  return apiRequest("/cart", { token });
};

export const addCartItem = async (
  token,
  productId,
  quantity = 1
) => {
  return apiRequest("/cart", {
    method: "POST",
    token,
    body: {
      productId,
      quantity,
    },
  });
};

export const updateCartItem = async (
  token,
  productId,
  quantity
) => {
  return apiRequest("/cart", {
    method: "PUT",
    token,
    body: {
      productId,
      quantity,
    },
  });
};

export const removeCartItem = async (
  token,
  productId
) => {
  return apiRequest(`/cart/${productId}`, {
    method: "DELETE",
    token,
  });
};

export const clearCart = async (token) => {
  return apiRequest("/cart", {
    method: "DELETE",
    token,
  });
};

/* المفضلة */

export const getFavorites = async (token) => {
  return apiRequest("/favorites", { token });
};

export const addFavorite = async (
  token,
  productId
) => {
  return apiRequest("/favorites", {
    method: "POST",
    token,
    body: { productId },
  });
};

export const removeFavorite = async (
  token,
  productId
) => {
  return apiRequest(`/favorites/${productId}`, {
    method: "DELETE",
    token,
  });
};

/* لوحة الأدمن */

export const getAdminDashboard = async (
  token
) => {
  return apiRequest(
    "/admin/dashboard",
    {
      token,
    }
  );
};
export const getAdminOrder = async (
  token,
  orderId
) => {
  return apiRequest(
    `/admin/orders/${orderId}`,
    {
      token,
    }
  );
};
export const getAdminOrders = async (token) => {
  return apiRequest("/admin/orders", { token });
};
export const getAdminOrderById = async (
  token,
  orderId
) => {
  return apiRequest(
    `/admin/orders/${orderId}`,
    {
      token,
    }
  );
};

export const createAdminOrder = async (
  token,
  orderData
) => {
  return apiRequest(
    "/admin/orders",
    {
      method: "POST",
      token,
      body: orderData,
    }
  );
};

export const updateAdminOrder = async (
  token,
  orderId,
  orderData
) => {
  return apiRequest(
    `/admin/orders/${orderId}`,
    {
      method: "PUT",
      token,
      body: orderData,
    }
  );
};

export const deleteAdminOrder = async (
  token,
  orderId
) => {
  return apiRequest(
    `/admin/orders/${orderId}`,
    {
      method: "DELETE",
      token,
    }
  );
};
export const updateAdminOrderStatus = async (
  token,
  orderId,
  status
) => {
  return apiRequest(
    `/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      token,
      body: { status },
    }
  );
};
export const getAdminProducts = async (
  token
) => {
  return apiRequest(
    "/admin/products",
    {
      token,
    }
  );
};
export const getAdminUsers = async (token) => {
  return apiRequest("/admin/users", { token });
};

export const getAdminNotifications = async (
  token
) => {
  return apiRequest("/admin/notifications", {
    token,
  });
};

export const markAdminNotificationAsRead = async (
  token,
  notificationId
) => {
  return apiRequest(
    `/admin/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      token,
    }
  );
};

export const markAllAdminNotificationsAsRead =
  async (token) => {
    return apiRequest(
      "/admin/notifications/read-all",
      {
        method: "PATCH",
        token,
      }
    );
  };

export const deleteAdminNotification = async (
  token,
  notificationId
) => {
  return apiRequest(
    `/admin/notifications/${notificationId}`,
    {
      method: "DELETE",
      token,
    }
  );
};

/* التقييمات */
export const getDemoProductReviews = async (productId) => {
  const response = await apiRequest(
    `/demo-reviews/product/${productId}`,
    {
      baseUrl: PRODUCT_REVIEWS_API_URL,
    }
  );

  return Array.isArray(response)
    ? response
    : response?.reviews ||
        response?.data?.reviews ||
        response?.data ||
        [];
};
export const getProductReviews = async (productId) => {
  const response = await apiRequest(
    `/reviews/product/${productId}`,
    {
      baseUrl: PRODUCT_REVIEWS_API_URL,
    }
  );

  return Array.isArray(response)
    ? response
    : response?.reviews ||
        response?.data?.reviews ||
        response?.data ||
        [];
};

export const getOrderReviewStatus = async (
  token,
  orderId
) => {
  return apiRequest(
    `/reviews/order/${orderId}/status`,
    { token }
  );
};

export const createReview = async (
  token,
  reviewData
) => {
  return apiRequest("/reviews", {
    method: "POST",
    token,
    body: reviewData,
  });
};

/* المنتجات المقترحة */

export const getRelatedProducts = async (
  category,
  currentProductId
) => {
  const response = await getProducts({
    category,
    active: true,
  });

  const products = Array.isArray(response)
    ? response
    : response?.products ||
      response?.data?.products ||
      response?.data ||
      [];

  return products.filter(
    (product) =>
      product._id !== currentProductId
  );
};
export const getAdminSettings = async (
  token
) => {
  return apiRequest(
    "/admin/settings",
    {
      token,
    }
  );
};

export const updateAdminSettings = async (
  token,
  settings
) => {
  return apiRequest(
    "/admin/settings",
    {
      method: "PATCH",
      token,
      body: settings,
    }
  );
};