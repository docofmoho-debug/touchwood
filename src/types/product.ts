export type Locale = "ar" | "en";

export type Localized = {
  ar?: string;
  en?: string;
};

export type ProductColor = {
  _id?: string;
  name?: Localized | string;
  label?: Localized | string;
  color?: string;
  value?: string;
  hex?: string;
  code?: string;
};

export type ProductMedia = {
  type?: "image" | "video";
  url: string;
  storageKey?: string;
  thumbnail?: string;
  alt?: Localized;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type ProductSpecification = {
  label: Localized;
  value: Localized;
};

export type Product = {
  _id: string;
  name: Localized;
  warrantyDuration?: Localized;
  description?: Localized;
  slug: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  serialNumber?: string;
  stock: number;
  media?: ProductMedia[];
  specifications?: ProductSpecification[];
  colors?: ProductColor[];
  rating?: number;
  reviewsCount?: number;
  featured?: boolean;
  active?: boolean;
};