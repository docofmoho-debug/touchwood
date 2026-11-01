import { getProducts as apiGetProducts, getProductBySlug as apiGetProductBySlug } from "./api";

export type ProductQuery = {
  category?: string;
  featured?: boolean;
  active?: boolean;
  search?: string;
  limit?: number;
  page?: number;
};

export async function getProducts(query: ProductQuery = {}) {
  return apiGetProducts(query);
}

export async function getProductBySlug(slug: string) {
  return apiGetProductBySlug(slug);
}