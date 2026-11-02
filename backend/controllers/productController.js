import mongoose from "mongoose";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { deleteR2Object } from "../services/r2Service.js";

const normalizeMedia = (media = []) => {
  if (!Array.isArray(media)) {
    return [];
  }

  const normalized = media.map((item, index) => ({
    type: item.type || "image",
    url: item.url || "",
    storageKey: item.storageKey || "",
    thumbnail: item.thumbnail || item.url || "",
    alt: {
      ar: item.alt?.ar || "",
      en: item.alt?.en || "",
    },
    sortOrder:
      typeof item.sortOrder === "number"
        ? item.sortOrder
        : index,
    isPrimary: Boolean(item.isPrimary),
  }));

  const firstPrimaryIndex = normalized.findIndex(
    (item) => item.isPrimary
  );

  const primaryIndex =
    firstPrimaryIndex >= 0 ? firstPrimaryIndex : 0;

  return normalized.map((item, index) => ({
    ...item,
    isPrimary:
      normalized.length > 0 &&
      index === primaryIndex,
  }));
};

const normalizeColors = (colors = []) => {
  if (!Array.isArray(colors)) {
    return [];
  }

  return colors.map((color) => ({
    name: {
      ar: color.name?.ar || "",
      en: color.name?.en || "",
    },

    hex: color.hex || "",

    stock:
      color.stock === undefined || color.stock === null
        ? 0
        : Number(color.stock),

    serialNumber: color.serialNumber || "",

    media: normalizeMedia(color.media || []),
  }));
};

const getProductStorageKeys = (product) => {
  const keys = [];

  for (const media of product.media || []) {
    if (media.storageKey) {
      keys.push(media.storageKey);
    }
  }

  for (const color of product.colors || []) {
    for (const media of color.media || []) {
      if (media.storageKey) {
        keys.push(media.storageKey);
      }
    }
  }

  return [...new Set(keys)];
};

/* =========================================================
   GET ALL PRODUCTS
========================================================= */

export const getProducts = async (req, res) => {
  try {
    const {
      category,
      featured,
      active,
      search,
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category.trim();
    }

    if (featured !== undefined) {
      filter.featured = featured === "true";
    }

    if (active !== undefined) {
      filter.active = active === "true";
    }

    if (search) {
      filter.$text = {
        $search: search,
      };
    }

    const products = await Product.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

/* =========================================================
   CREATE PRODUCT
========================================================= */

export const createProduct = async (req, res) => {
  try {
    console.log("CREATE PRODUCT BODY:", req.body);

    const {
      name,
      description,warrantyDuration,
      slug,
      category,
      price,
      oldPrice,
      serialNumber,
      media,
      colors,
      stock,
      specifications,
      featured,
      badge,
      active,
    } = req.body || {};

    /* ---------- NAME ---------- */

    if (
      !name ||
      typeof name !== "object" ||
      (!name.ar?.trim?.() && !name.en?.trim?.())
    ) {
      return res.status(400).json({
        message: "Product name is required",
      });
    }

    /* ---------- DESCRIPTION ---------- */

    if (
      !description ||
      typeof description !== "object" ||
      (!description.ar?.trim?.() &&
        !description.en?.trim?.())
    ) {
      return res.status(400).json({
        message: "Product description is required",
      });
    }

    /* ---------- SLUG ---------- */

    if (
      typeof slug !== "string" ||
      !slug.trim()
    ) {
      return res.status(400).json({
        message: "Product slug is required",
      });
    }

    const normalizedSlug = slug.trim().toLowerCase();

    /* ---------- CATEGORY ---------- */

    if (
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        message: "Valid category is required",
      });
    }

    const normalizedCategory =
      category.trim().toLowerCase();

    /* ---------- PRICE ---------- */

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Price must be a valid positive number",
      });
    }

    /* ---------- SLUG DUPLICATION ---------- */

    const existingSlug = await Product.findOne({
      slug: normalizedSlug,
    });

    if (existingSlug) {
      return res.status(409).json({
        message: "Product slug already exists",
      });
    }

    /* ---------- SERIAL NUMBER ---------- */

    if (
      serialNumber !== undefined &&
      serialNumber !== null &&
      String(serialNumber).trim()
    ) {
      const normalizedSerialNumber =
        String(serialNumber).trim();

      const existingSerialNumber =
        await Product.findOne({
          serialNumber: normalizedSerialNumber,
        });

      if (existingSerialNumber) {
        return res.status(409).json({
          message:
            "Product serial number already exists",
        });
      }
    }

    /* ---------- CREATE ---------- */

    const product = await Product.create({
      name: {
        ar: name.ar?.trim?.() || "",
        en: name.en?.trim?.() || "",
      },

      description: {
        ar: description.ar?.trim?.() || "",
        en: description.en?.trim?.() || "",
      },

      slug: normalizedSlug,

      category: normalizedCategory,

      price: Number(price),

      oldPrice:
        oldPrice === undefined ||
        oldPrice === null ||
        oldPrice === ""
          ? null
          : Number(oldPrice),
warrantyDuration: {
  ar: warrantyDuration?.ar?.trim?.() || "",
  en: warrantyDuration?.en?.trim?.() || "",
},
      serialNumber:
        serialNumber !== undefined &&
        serialNumber !== null
          ? String(serialNumber).trim()
          : "",

      media: normalizeMedia(media),

      colors: normalizeColors(colors),

      stock:
        stock === undefined ||
        stock === null ||
        stock === ""
          ? 0
          : Number(stock),

      specifications:
        Array.isArray(specifications)
          ? specifications
          : [],

      featured:
        featured === undefined
          ? false
          : Boolean(featured),

      badge: badge || {
        ar: "",
        en: "",
      },

      active:
        active === undefined
          ? true
          : Boolean(active),
    });

    console.log(
      "PRODUCT CREATED:",
      product._id.toString()
    );

    return res.status(201).json({
      message: "You have added this product",
      product,
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    if (error?.code === 11000) {
      const duplicatedField =
        Object.keys(error.keyPattern || {})[0];

      if (duplicatedField === "slug") {
        return res.status(409).json({
          message: "Product slug already exists",
        });
      }

      if (duplicatedField === "serialNumber") {
        return res.status(409).json({
          message:
            "Product serial number already exists",
        });
      }

      return res.status(409).json({
        message: "Duplicate product data",
      });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        message: "Product validation failed",
        errors: Object.values(error.errors).map(
          (item) => item.message
        ),
      });
    }

    return res.status(500).json({
      message: "Failed to create product",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================================
   GET PRODUCT BY ID
========================================================= */
export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
    });

    if (!product) {
      return res.status(404).json({
        message: "المنتج غير موجود",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ في السيرفر",
    });
  }
};
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: "Product is not found",
      });
    }

    const productById = await Product.findById(id);

    if (!productById) {
      return res.status(404).json({
        message: "Product is not found",
      });
    }

    const reviews = await Review.find({
      product: id,
    })
      .populate(
        "user",
        "firstName lastName name username"
      )
      .sort({
        createdAt: -1,
      });

    const product = {
      ...productById.toObject(),
      reviews,
    };

    return res.status(200).json(product);
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};



export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: "Product is not found",
      });
    }

    const existingProduct =
      await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product is not found",
      });
    }

    const {
      name,
      description,
      slug,
      category,
      price,
      oldPrice,warrantyDuration,
      serialNumber,
      media,
      colors,
      stock,
      specifications,
      featured,
      badge,
      active,
    } = req.body || {};

    /* ---------- CATEGORY ---------- */

    if (
      category !== undefined &&
      (
        typeof category !== "string" ||
        !category.trim()
      )
    ) {
      return res.status(400).json({
        message: "Product category is invalid",
      });
    }

    /* ---------- SLUG ---------- */

    if (slug !== undefined) {
      if (
        typeof slug !== "string" ||
        !slug.trim()
      ) {
        return res.status(400).json({
          message: "Product slug is invalid",
        });
      }

      const normalizedSlug =
        slug.trim().toLowerCase();

      const existingSlug =
        await Product.findOne({
          slug: normalizedSlug,
          _id: {
            $ne: id,
          },
        });

      if (existingSlug) {
        return res.status(409).json({
          message: "Product slug already exists",
        });
      }
    }

    /* ---------- SERIAL NUMBER ---------- */

    if (
      serialNumber !== undefined &&
      serialNumber !== null &&
      String(serialNumber).trim()
    ) {
      const normalizedSerialNumber =
        String(serialNumber).trim();

      const existingSerialNumber =
        await Product.findOne({
          serialNumber: normalizedSerialNumber,
          _id: {
            $ne: id,
          },
        });

      if (existingSerialNumber) {
        return res.status(409).json({
          message:
            "Product serial number already exists",
        });
      }
    }

    /* ---------- UPDATE DATA ---------- */

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (slug !== undefined) {
      updateData.slug =
        slug.trim().toLowerCase();
    }
if (warrantyDuration !== undefined) {
  updateData.warrantyDuration = {
    ar: warrantyDuration?.ar?.trim?.() || "",
    en: warrantyDuration?.en?.trim?.() || "",
  };
}
    if (category !== undefined) {
      updateData.category =
        category.trim().toLowerCase();
    }

    if (price !== undefined) {
      updateData.price = Number(price);
    }

    if (oldPrice !== undefined) {
      updateData.oldPrice =
        oldPrice === null ||
        oldPrice === ""
          ? null
          : Number(oldPrice);
    }

    if (serialNumber !== undefined) {
      updateData.serialNumber =
        serialNumber === null
          ? ""
          : String(serialNumber).trim();
    }

    if (media !== undefined) {
      updateData.media =
        normalizeMedia(media);
    }

    if (colors !== undefined) {
      updateData.colors =
        normalizeColors(colors);
    }

    if (stock !== undefined) {
      updateData.stock = Number(stock);
    }

    if (specifications !== undefined) {
      updateData.specifications =
        Array.isArray(specifications)
          ? specifications
          : [];
    }

    if (featured !== undefined) {
      updateData.featured = Boolean(featured);
    }

    if (badge !== undefined) {
      updateData.badge = badge;
    }

    if (active !== undefined) {
      updateData.active = Boolean(active);
    }

    const product =
      await Product.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    return res.status(200).json({
      message: "Product has been updated",
      product,
    });
  } catch (error) {
    console.error(
      "UPDATE PRODUCT ERROR:",
      error
    );

    if (error?.code === 11000) {
      const duplicatedField =
        Object.keys(error.keyPattern || {})[0];

      if (duplicatedField === "slug") {
        return res.status(409).json({
          message:
            "Product slug already exists",
        });
      }

      if (
        duplicatedField === "serialNumber"
      ) {
        return res.status(409).json({
          message:
            "Product serial number already exists",
        });
      }

      return res.status(409).json({
        message: "Duplicate product data",
      });
    }

    return res.status(500).json({
      message: "Failed to update product",
    });
  }
};

/* =========================================================
   DELETE PRODUCT
========================================================= */

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: "Product has not been found",
      });
    }

    const deletedProduct =
      await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product has not been found",
      });
    }

    await Review.deleteMany({
      product: id,
    });

    const storageKeys =
      getProductStorageKeys(deletedProduct);

    for (const key of storageKeys) {
      try {
        await deleteR2Object(key);
      } catch (storageError) {
        console.error(
          `Failed to delete R2 object: ${key}`,
          storageError
        );
      }
    }

    return res.status(200).json({
      message: `You have deleted ${
        deletedProduct.name.ar ||
        deletedProduct.name.en
      }`,
    });
  } catch (error) {
    console.error(
      "DELETE PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
};