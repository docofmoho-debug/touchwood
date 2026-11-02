import mongoose, { Schema } from "mongoose";

const localizedSchema = new Schema(
  {
    ar: {
      type: String,
      trim: true,
      default: "",
    },
    en: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const mediaSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    storageKey: {
      type: String,
      trim: true,
      default: "",
    },

    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },

    alt: {
      type: localizedSchema,
      default: () => ({
        ar: "",
        en: "",
      }),
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const specificationSchema = new Schema(
  {
    label: {
      type: localizedSchema,
      required: true,
    },

    value: {
      type: localizedSchema,
      required: true,
    },
  },
  { _id: false }
);

const colorSchema = new Schema(
  {
    name: {
      type: localizedSchema,
      required: true,
    },

    hex: {
      type: String,
      trim: true,
      default: "",
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    serialNumber: {
      type: String,
      trim: true,
      default: "",
    },

    media: {
      type: [mediaSchema],
      default: [],
    },
  },
  { _id: true }
);

const productSchema = new Schema(
  {
    name: {
      type: localizedSchema,
      required: true,
    },
warrantyDuration: {
  type: localizedSchema,
  default: () => ({
    ar: "",
    en: "",
  }),
},
    description: {
      type: localizedSchema,
      required: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    oldPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    serialNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    media: {
      type: [mediaSchema],
      default: [],
    },

    colors: {
      type: [colorSchema],
      default: [],
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    specifications: {
      type: [specificationSchema],
      default: [],
    },

    featured: {
      type: Boolean,
      default: false,
    },

    badge: {
      type: localizedSchema,
      default: () => ({
        ar: "",
        en: "",
      }),
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({
  "name.ar": "text",
  "name.en": "text",
});

productSchema.index({ category: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ active: 1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;